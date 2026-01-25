/**
 * Runway API Client
 *
 * Handles communication with Runway ML for AI video generation.
 * Uses DALL-E to generate a starting frame, then Runway for animation.
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { config } from '../config.js';
import type { RunwayGenerationResult } from './types.js';

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

interface RunwayTask {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  output?: string[];
  failure?: string;
}

/**
 * Generate a starting frame image using DALL-E
 */
async function generateStartingFrame(prompt: string): Promise<string | null> {
  if (!config.openaiApiKey) {
    console.warn('OpenAI not configured, cannot generate starting frame');
    return null;
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  // Adapt prompt for still image generation
  const imagePrompt = `Cinematic still frame, vertical 9:16 aspect ratio, ${prompt}. High quality, photorealistic, dramatic lighting, suitable as first frame for video.`;

  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: imagePrompt,
      n: 1,
      size: '1024x1792', // Vertical for social
      quality: 'standard',
    });

    return response.data?.[0]?.url || null;
  } catch (error) {
    console.error('Failed to generate starting frame:', error);
    return null;
  }
}

// Default to 10 seconds for viral videos (Gen-3 supports 5 or 10)
const DEFAULT_DURATION = 10;

/**
 * Generate a video clip using Runway
 */
export async function generateClip(options: {
  prompt: string;
  duration?: number; // 5 or 10 seconds (Gen-3 Alpha supports both)
  outputDir: string;
}): Promise<RunwayGenerationResult> {
  const apiKey = config.runwayApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: 'Runway API key not configured',
    };
  }

  // Validate duration (Gen-3 supports 5 or 10 seconds)
  const duration = options.duration || DEFAULT_DURATION;
  if (duration !== 5 && duration !== 10) {
    console.warn(`Invalid duration ${duration}, defaulting to ${DEFAULT_DURATION}s`);
  }
  const validDuration = duration === 5 ? 5 : 10;

  try {
    // Step 1: Generate starting frame with DALL-E
    console.log('Generating starting frame with DALL-E...');
    const startingFrameUrl = await generateStartingFrame(options.prompt);

    if (!startingFrameUrl) {
      return {
        success: false,
        error: 'Failed to generate starting frame image',
      };
    }
    console.log('Starting frame generated');

    // Step 2: Create Runway generation task
    console.log(`Creating Runway task for ${validDuration}s video...`);
    const createResponse = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        model: 'gen3a_turbo',
        promptImage: startingFrameUrl,
        promptText: options.prompt,
        duration: validDuration,
        ratio: '768:1280',
        watermark: false,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return {
        success: false,
        error: `Runway API error: ${createResponse.status} - ${errorText}`,
      };
    }

    const task = (await createResponse.json()) as RunwayTask;
    console.log(`Runway task created: ${task.id}`);

    // Poll for completion
    const result = await pollForCompletion(task.id, apiKey);

    if (!result.success || !result.output?.[0]) {
      const errorMsg = result.failure || 'No output generated';
      console.error(`Runway generation failed: ${errorMsg}`);
      return {
        success: false,
        error: `Runway: ${errorMsg}`,
      };
    }

    // Download the video
    const videoUrl = result.output[0];
    const outputPath = path.join(options.outputDir, `clip_${task.id}.mp4`);

    await downloadVideo(videoUrl, outputPath);

    return {
      success: true,
      clipPath: outputPath,
      duration: validDuration,
    };
  } catch (error) {
    return {
      success: false,
      error: `Runway generation failed: ${error}`,
    };
  }
}

/**
 * Poll for task completion
 * 10s videos take longer to generate, so we allow more time
 */
async function pollForCompletion(
  taskId: string,
  apiKey: string,
  maxAttempts = 90, // 7.5 minutes with 5s intervals (10s videos take longer)
  interval = 5000
): Promise<RunwayTask & { success: boolean }> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const task = (await response.json()) as RunwayTask;
    console.log(`Task ${taskId} status: ${task.status}`);

    if (task.status === 'SUCCEEDED') {
      return { ...task, success: true };
    }

    if (task.status === 'FAILED') {
      console.error(`Runway task failed: ${task.failure || 'Unknown reason'}`);
      return { ...task, success: false };
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    id: taskId,
    status: 'FAILED',
    failure: 'Timeout waiting for video generation',
    success: false,
  };
}

/**
 * Download video from URL
 */
async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(buffer));

  console.log(`Video downloaded: ${outputPath}`);
}

/**
 * Check if Runway is configured and available
 */
export function isRunwayAvailable(): { available: boolean; reason?: string } {
  if (!config.runwayApiKey) {
    return { available: false, reason: 'RUNWAY_API_KEY not set' };
  }
  return { available: true };
}
