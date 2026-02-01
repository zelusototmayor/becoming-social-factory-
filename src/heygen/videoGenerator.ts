/**
 * HeyGen Video Generator
 *
 * Orchestrates the full UGC video generation pipeline:
 * Script → Avatar Selection → HeyGen API → Download
 */

import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config.js';
import { isHeyGenAvailable, generateAndDownload } from './client.js';
import { generateScript, generateCaption, selectTheme } from './scriptGenerator.js';
import { matchAvatarToContent, getNextAvatar } from './avatars.js';
import type {
  HeyGenVideoResult,
  HeyGenVideoRequest,
  UGCScript,
  AvatarPersona,
  ContentTheme,
  ProgressCallback,
} from './types.js';

// UGC-style backgrounds (colors that look like real rooms)
const UGC_BACKGROUNDS = [
  '#F5F5DC', // Beige (living room)
  '#FFFEF2', // Cream (bedroom)
  '#E8E4E1', // Warm gray (office)
  '#FFF8F0', // Soft white (neutral)
  '#F0EBE3', // Light taupe (aesthetic)
];

/**
 * Generate a HeyGen UGC video
 */
export async function generateHeyGenVideo(options?: {
  outputDir?: string;
  filename?: string;
  theme?: ContentTheme;
  onProgress?: ProgressCallback;
}): Promise<HeyGenVideoResult> {
  const outputDir = options?.outputDir || path.join(config.outputDir, 'ugc');
  fs.mkdirSync(outputDir, { recursive: true });

  // Check availability
  const availability = isHeyGenAvailable();
  if (!availability.available) {
    return {
      success: false,
      error: availability.reason || 'HeyGen not available',
    };
  }

  try {
    // ═══════════════════════════════════════════════════════════════
    // Step 1: Generate Script
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 1/4: Generating UGC script...');
    const theme = options?.theme || selectTheme();
    const script = await generateScript({ theme });

    console.log(`   Theme: ${theme}`);
    console.log(`   Template: ${script.template}`);
    console.log(`   Hook: "${script.hook}"`);
    console.log(`   Duration: ~${script.duration}s`);

    options?.onProgress?.({
      stage: 'script',
      message: `Generated ${script.template} script`,
      script,
    });

    // ═══════════════════════════════════════════════════════════════
    // Step 2: Select Avatar
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 2/4: Selecting avatar...');
    const avatar = matchAvatarToContent(theme, script.template);

    console.log(`   Avatar: ${avatar.name} (${avatar.demographic})`);
    console.log(`   Vibe: ${avatar.vibe}`);
    console.log(`   HeyGen ID: ${avatar.heygenAvatarId}`);

    options?.onProgress?.({
      stage: 'avatar',
      message: `Selected avatar: ${avatar.name}`,
      script,
      avatar,
    });

    // ═══════════════════════════════════════════════════════════════
    // Step 3: Generate Video with HeyGen
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 3/4: Generating video with HeyGen (this may take 2-5 minutes)...');

    // Select a random UGC-style background
    const backgroundColor = UGC_BACKGROUNDS[Math.floor(Math.random() * UGC_BACKGROUNDS.length)];

    // Build the HeyGen request
    const videoRequest: HeyGenVideoRequest = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatar.heygenAvatarId,
            avatar_style: 'normal', // or 'closeUp' for more intimate feel
          },
          voice: {
            type: 'text',
            input_text: script.fullText,
            speed: 1.0, // Natural speed
          },
          background: {
            type: 'color',
            value: backgroundColor,
          },
        },
      ],
      dimension: {
        width: 720,
        height: 1280, // 9:16 vertical for social
      },
    };

    options?.onProgress?.({
      stage: 'generating',
      message: 'Generating video with HeyGen...',
      script,
      avatar,
    });

    const filename = options?.filename || `ugc_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, filename);

    const result = await generateAndDownload(videoRequest, outputPath);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Video generation failed',
        script,
        avatar,
        theme,
      };
    }

    console.log(`   Video generated: ${result.outputPath}`);

    options?.onProgress?.({
      stage: 'downloading',
      message: 'Video downloaded',
      script,
      avatar,
    });

    // ═══════════════════════════════════════════════════════════════
    // Step 4: Generate Caption and Hashtags
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 4/4: Generating caption...');
    const { caption, hashtags } = await generateCaption(script, theme);

    console.log(`   Caption: "${caption.slice(0, 50)}..."`);
    console.log(`   Hashtags: ${hashtags.join(', ')}`);

    options?.onProgress?.({
      stage: 'complete',
      message: 'Video generation complete',
      script,
      avatar,
    });

    console.log(`✅ HeyGen UGC video generated: ${outputPath}`);

    return {
      success: true,
      outputPath,
      duration: result.duration || script.duration,
      script,
      avatar,
      theme,
      caption,
      hashtags,
    };
  } catch (error) {
    console.error('❌ HeyGen video generation failed:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Check system status for HeyGen generation
 */
export async function checkHeyGenStatus(): Promise<{
  ready: boolean;
  status: {
    heygen: { available: boolean; reason?: string };
    openai: boolean;
  };
  issues: string[];
}> {
  const issues: string[] = [];

  const heygen = isHeyGenAvailable();
  if (!heygen.available) {
    issues.push(heygen.reason || 'HeyGen not available');
  }

  const openaiOk = !!config.openaiApiKey;
  if (!openaiOk) {
    issues.push('OpenAI API key not set (will use template fallback for scripts)');
  }

  return {
    ready: heygen.available,
    status: {
      heygen,
      openai: openaiOk,
    },
    issues,
  };
}

/**
 * Estimate cost for generating a HeyGen video
 * Based on HeyGen Creator plan pricing
 */
export function estimateHeyGenCost(): { heygen: number; openai: number; total: number } {
  return {
    heygen: 0.0, // Unlimited on Creator plan ($29/mo)
    openai: 0.02, // GPT-4 for script generation
    total: 0.02,
  };
}
