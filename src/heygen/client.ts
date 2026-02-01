/**
 * HeyGen API Client
 *
 * Wrapper for HeyGen's video generation API.
 * Documentation: https://docs.heygen.com/reference/create-an-avatar-video-v2
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config.js';
import type {
  HeyGenVideoRequest,
  HeyGenVideoResponse,
  HeyGenVideoStatus,
  HeyGenAvatarList,
  HeyGenVoiceList,
} from './types.js';

const HEYGEN_API_BASE = 'https://api.heygen.com';

/**
 * Get API key from config
 */
function getApiKey(): string | undefined {
  return (config as any).heygenApiKey;
}

/**
 * Check if HeyGen is configured and available
 */
export function isHeyGenAvailable(): { available: boolean; reason?: string } {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { available: false, reason: 'HEYGEN_API_KEY not set' };
  }
  return { available: true };
}

/**
 * List available avatars from HeyGen
 */
export async function listAvatars(): Promise<HeyGenAvatarList> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: 'API key not configured', data: { avatars: [] } };
  }

  const response = await fetch(`${HEYGEN_API_BASE}/v2/avatars`, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `API error: ${response.status} - ${errorText}`, data: { avatars: [] } };
  }

  return response.json();
}

/**
 * List available voices from HeyGen
 */
export async function listVoices(): Promise<HeyGenVoiceList> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: 'API key not configured', data: { voices: [] } };
  }

  const response = await fetch(`${HEYGEN_API_BASE}/v2/voices`, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { error: `API error: ${response.status} - ${errorText}`, data: { voices: [] } };
  }

  return response.json();
}

/**
 * Create a video generation task
 */
export async function createVideo(
  request: HeyGenVideoRequest
): Promise<HeyGenVideoResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { error: 'API key not configured', data: { video_id: '' } };
  }

  console.log('Creating HeyGen video with request:', JSON.stringify(request, null, 2));

  const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('HeyGen API error:', response.status, errorText);
    return { error: `API error: ${response.status} - ${errorText}`, data: { video_id: '' } };
  }

  const result = await response.json();
  console.log('HeyGen video created:', result);
  return result;
}

/**
 * Check video generation status
 */
export async function getVideoStatus(videoId: string): Promise<HeyGenVideoStatus> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      error: 'API key not configured',
      data: { video_id: videoId, status: 'failed' },
    };
  }

  const response = await fetch(`${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      error: `API error: ${response.status} - ${errorText}`,
      data: { video_id: videoId, status: 'failed' },
    };
  }

  return response.json();
}

/**
 * Poll for video completion
 */
export async function waitForVideo(
  videoId: string,
  maxAttempts = 60, // 10 minutes with 10s intervals
  interval = 10000
): Promise<HeyGenVideoStatus> {
  console.log(`Waiting for HeyGen video ${videoId} to complete...`);

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getVideoStatus(videoId);
    console.log(`Video ${videoId} status: ${status.data.status}`);

    if (status.error) {
      return status;
    }

    if (status.data.status === 'completed') {
      console.log(`Video ${videoId} completed: ${status.data.video_url}`);
      return status;
    }

    if (status.data.status === 'failed') {
      console.error(`Video ${videoId} failed`);
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    error: 'Timeout waiting for video generation',
    data: { video_id: videoId, status: 'failed' },
  };
}

/**
 * Download video from URL
 */
export async function downloadVideo(url: string, outputPath: string): Promise<void> {
  console.log(`Downloading video from ${url}`);

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
 * Generate a video and wait for completion
 * Returns the video URL or throws an error
 */
export async function generateAndDownload(
  request: HeyGenVideoRequest,
  outputPath: string
): Promise<{ success: boolean; outputPath?: string; duration?: number; error?: string }> {
  // Create the video
  const createResult = await createVideo(request);

  if (createResult.error || !createResult.data.video_id) {
    return {
      success: false,
      error: createResult.error || 'No video ID returned',
    };
  }

  const videoId = createResult.data.video_id;
  console.log(`Video generation started: ${videoId}`);

  // Wait for completion
  const status = await waitForVideo(videoId);

  if (status.error || status.data.status !== 'completed' || !status.data.video_url) {
    return {
      success: false,
      error: status.error || `Video status: ${status.data.status}`,
    };
  }

  // Download the video
  await downloadVideo(status.data.video_url, outputPath);

  return {
    success: true,
    outputPath,
    duration: status.data.duration,
  };
}

/**
 * Test the API connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  const availability = isHeyGenAvailable();
  if (!availability.available) {
    return { success: false, message: availability.reason || 'Not available' };
  }

  try {
    // Try listing avatars as a simple API test
    const avatars = await listAvatars();
    if (avatars.error) {
      return { success: false, message: avatars.error };
    }

    return {
      success: true,
      message: `Connected! ${avatars.data.avatars.length} avatars available`,
    };
  } catch (error) {
    return { success: false, message: String(error) };
  }
}
