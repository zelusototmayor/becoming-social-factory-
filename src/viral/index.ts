/**
 * Viral Video Generator v2
 *
 * Main orchestrator for AI-powered viral video generation.
 * Pipeline: Quote (with type) -> Type-specific hook -> Voice (type-specific) -> Runway video -> Remotion
 */

import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config.js';
import { generateQuote } from '../generator/index.js';
import { generateViralHook, validateHook } from './hookGenerator.js';
import { getDynamicSceneForQuote } from './sceneMapper.js';
import { generateClip, isRunwayAvailable } from './runwayClient.js';
import { buildVoiceScript, generateScriptedVoiceNarration, isElevenLabsAvailable } from './voiceClient.js';
import { renderViralVideo, isRemotionAvailable, installRemotionDependencies } from './remotionRenderer.js';
import { compositeViralVideo, checkFFmpeg } from './compositor.js';
import { getMusicStatus, selectTrackForVideo } from './musicLibrary.js';
import { generateViralCaption } from './captionGenerator.js';
import { VOICE_MAP } from './types.js';
import type { ViralVideoResult, ViralVideoConfig, ViralHook, VoiceScript, DynamicSceneConfig, QuoteType, CtaType } from './types.js';

// CTA alternation counter (persists across calls within the same process)
let ctaCounter = 0;
function getNextCtaType(): CtaType {
  const types: CtaType[] = ['save', 'share'];
  const cta = types[ctaCounter % types.length];
  ctaCounter++;
  return cta;
}

interface GenerateOptions {
  outputDir?: string;
  filename?: string;
  useRemotionRenderer?: boolean;
  onProgress?: (stage: string, data: ProgressData) => void;
}

interface ProgressData {
  quote?: string;
  quoteType?: QuoteType;
  mood?: string;
  hook?: ViralHook;
  scene?: DynamicSceneConfig;
}

/**
 * Generate a complete viral video using the v2 pipeline
 */
export async function generateViralVideo(options: GenerateOptions = {}): Promise<ViralVideoResult> {
  const outputDir = options.outputDir || path.join(config.outputDir, 'viral');
  const clipsDir = path.join(config.outputDir, 'clips');
  const useRemotion = options.useRemotionRenderer ?? true;

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(clipsDir, { recursive: true });

  try {
    // ═══════════════════════════════════════════════════════════════
    // Step 1: Generate quote (with type: inquiry, manifesto, insight)
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 1/6: Generating quote...');
    const quoteResult = await generateQuote();
    const quote = quoteResult.text;
    const quoteType = quoteResult.type as QuoteType;
    console.log(`   Quote: "${quote}"`);
    console.log(`   Type: ${quoteType} → Voice: ${VOICE_MAP[quoteType].name}`);
    options.onProgress?.('quote', { quote, quoteType });

    // ═══════════════════════════════════════════════════════════════
    // Step 2: Generate type-specific hook
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 2/6: Generating type-specific hook...');
    const hook = await generateViralHook(quote, quoteType);
    const hookValidation = validateHook(hook);
    if (!hookValidation.valid) {
      console.warn(`   Hook validation issues: ${hookValidation.issues.join(', ')}`);
    }
    console.log(`   Hook: "${hook.text}" (${hook.pattern})`);
    options.onProgress?.('hook', { quote, quoteType, hook });

    // ═══════════════════════════════════════════════════════════════
    // Step 3: Generate dynamic scene configuration
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 3/6: Generating dynamic scene...');
    const scene = await getDynamicSceneForQuote(quote);
    console.log(`   Mood: ${scene.mood}`);
    console.log(`   Scene: ${scene.dynamicPrompt.slice(0, 80)}...`);
    options.onProgress?.('scene', { quote, quoteType, mood: scene.mood, scene });

    // ═══════════════════════════════════════════════════════════════
    // Step 4: Generate voice narration (type-specific voice)
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 4/6: Generating voice narration...');
    let voicePath: string | undefined;
    let voiceScript: VoiceScript | undefined;

    // Determine CTA type now (needed for voice script)
    const ctaType = getNextCtaType();
    console.log(`   CTA outro: "${ctaType}"`);

    const script = buildVoiceScript(hook.text, quote, ctaType);
    const voiceResult = await generateScriptedVoiceNarration({
      script,
      outputDir: clipsDir,
      quoteType, // Use type-specific voice
    });

    if (voiceResult.success && voiceResult.audioPath) {
      voicePath = voiceResult.audioPath;
      voiceScript = voiceResult.script;
      console.log(`   Voice generated: ${voicePath}`);
      console.log(`   Script: "${script.fullText.slice(0, 80)}..."`);
    } else {
      console.warn(`   Voice generation skipped: ${voiceResult.error}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // Step 5: Generate 10-second AI video clip
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 5/6: Generating 10s AI video clip (this may take 3-5 minutes)...');
    const clipResult = await generateClip({
      prompt: scene.dynamicPrompt,
      duration: 10,
      outputDir: clipsDir,
    });

    if (!clipResult.success || !clipResult.clipPath) {
      return {
        success: false,
        error: clipResult.error || 'Failed to generate video clip',
      };
    }
    console.log(`   Clip generated: ${clipResult.clipPath} (${clipResult.duration}s)`);

    // ═══════════════════════════════════════════════════════════════
    // Step 6: Render final video (Remotion or FFmpeg)
    // ═══════════════════════════════════════════════════════════════
    console.log('🎬 Step 6/6: Rendering final video...');
    const filename = options.filename || `viral_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, filename);

    const music = selectTrackForVideo(scene.musicMood, 12);

    const videoConfig: ViralVideoConfig = {
      quote,
      quoteType,
      scene: {
        ...scene,
        hookText: hook.text,
      },
      paletteId: 'palette1',
      duration: 12,
    };

    // Try Remotion first, fall back to FFmpeg
    if (useRemotion) {
      console.log('   Checking Remotion availability...');
      const remotionStatus = await isRemotionAvailable();
      console.log(`   Remotion available: ${remotionStatus.available}${remotionStatus.reason ? ` (${remotionStatus.reason})` : ''}`);

      if (remotionStatus.available) {
        console.log('   ✨ Starting Remotion renderer (text will be animated on multiple lines)...');
        const renderResult = await renderViralVideo({
          quote,
          hookText: hook.text,
          quoteType, // Pass quote type for styling
          videoPath: clipResult.clipPath,
          voicePath: voicePath || '',
          musicPath: music?.path,
          musicVolume: 0.25,
          outputPath,
          ctaType, // Pass CTA type for outro
        });

        if (renderResult.success) {
          console.log(`✅ Viral video generated with Remotion: ${outputPath}`);

          // Generate caption and hashtags (max 4)
          console.log('📝 Generating caption and hashtags...');
          const { caption, hashtags } = await generateViralCaption(quote, quoteType, hook.text);
          console.log(`   Caption: "${caption.slice(0, 50)}..."`);
          console.log(`   Hashtags: ${hashtags.join(', ')}`);

          return {
            success: true,
            outputPath,
            config: videoConfig,
            caption,
            hashtags,
            hookText: hook.text,
            ctaType,
          };
        } else {
          console.warn(`   ⚠️ Remotion render failed: ${renderResult.error}`);
          console.warn(`   Falling back to FFmpeg compositor...`);
        }
      } else {
        console.warn(`   ⚠️ Remotion not available: ${remotionStatus.reason}`);
        console.warn(`   Using FFmpeg compositor (text will be on single line)...`);
      }
    }

    // Fallback to FFmpeg compositor
    console.log('   Using FFmpeg compositor...');
    const logoPath = path.join(config.outputDir, '..', 'assets', videoConfig.paletteId, 'logo.png');

    await compositeViralVideo({
      clipPath: clipResult.clipPath,
      config: videoConfig,
      outputPath,
      logoPath: fs.existsSync(logoPath) ? logoPath : undefined,
      voicePath,
    });

    console.log(`✅ Viral video generated with FFmpeg: ${outputPath}`);
    console.warn(`   Note: FFmpeg fallback does not support CTA outro`);

    // Generate caption and hashtags (max 4)
    console.log('📝 Generating caption and hashtags...');
    const { caption, hashtags } = await generateViralCaption(quote, quoteType, hook.text);
    console.log(`   Caption: "${caption.slice(0, 50)}..."`);
    console.log(`   Hashtags: ${hashtags.join(', ')}`);

    return {
      success: true,
      outputPath,
      config: videoConfig,
      caption,
      hashtags,
      hookText: hook.text,
      ctaType, // Track intended CTA even though FFmpeg doesn't render it
    };
  } catch (error) {
    console.error('❌ Viral video generation failed:', error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Check if the viral video system is ready
 */
export async function checkViralSystemStatus(): Promise<{
  ready: boolean;
  status: {
    ffmpeg: boolean;
    remotion: { available: boolean; reason?: string };
    runway: { available: boolean; reason?: string };
    openai: boolean;
    elevenlabs: { available: boolean; reason?: string };
    music: { available: number; total: number };
  };
  issues: string[];
}> {
  const issues: string[] = [];

  const ffmpegOk = await checkFFmpeg();
  if (!ffmpegOk) {
    issues.push('FFmpeg not installed or not in PATH');
  }

  const remotion = await isRemotionAvailable();
  if (!remotion.available) {
    issues.push(`Remotion: ${remotion.reason}`);
  }

  const runway = isRunwayAvailable();
  if (!runway.available) {
    issues.push(runway.reason || 'Runway not available');
  }

  const openaiOk = !!config.openaiApiKey;
  if (!openaiOk) {
    issues.push('OpenAI API key not set (required for DALL-E and GPT)');
  }

  const elevenlabs = isElevenLabsAvailable();
  if (!elevenlabs.available) {
    issues.push('ElevenLabs not configured (videos will have no voice narration)');
  }

  const music = getMusicStatus();
  if (music.available === 0) {
    issues.push('No music tracks available (videos will have voice only)');
  }

  const ready = (ffmpegOk || remotion.available) && runway.available && openaiOk;

  return {
    ready,
    status: {
      ffmpeg: ffmpegOk,
      remotion,
      runway,
      openai: openaiOk,
      elevenlabs,
      music,
    },
    issues,
  };
}

/**
 * Estimate cost for generating a viral video
 */
export function estimateViralVideoCost(): { runway: number; openai: number; elevenlabs: number; total: number } {
  return {
    runway: 0.50,
    openai: 0.06,
    elevenlabs: 0.04,
    total: 0.60,
  };
}

/**
 * Setup Remotion for first use
 */
export async function setupRemotionRenderer(): Promise<{ success: boolean; error?: string }> {
  console.log('Setting up Remotion renderer...');
  return installRemotionDependencies();
}

// Re-export types
export type { ViralVideoResult, ViralVideoConfig, ViralHook, VoiceScript, QuoteType, CtaType } from './types.js';
export { VOICE_MAP } from './types.js';
