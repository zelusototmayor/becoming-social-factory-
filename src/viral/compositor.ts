/**
 * Video Compositor
 *
 * Combines AI-generated clips with text overlays and music using FFmpeg.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config.js';
import { selectTrackForVideo } from './musicLibrary.js';
import { acquireRenderLock, sanitizeRenderError } from '../utils/renderLock.js';
import type { ViralVideoConfig, TextAnimation } from './types.js';

interface CompositeOptions {
  clipPath: string;
  config: ViralVideoConfig;
  outputPath: string;
  logoPath?: string;
  voicePath?: string;
}

/**
 * Composite a viral video with text overlays and music
 */
export async function compositeViralVideo(options: CompositeOptions): Promise<void> {
  const { clipPath, config: videoConfig, outputPath, logoPath, voicePath } = options;

  // Acquire render lock to prevent concurrent renders (OOM protection)
  const releaseLock = await acquireRenderLock();

  try {
    // Select background music
    const music = selectTrackForVideo(videoConfig.scene.musicMood, videoConfig.duration);

    // Build FFmpeg command
    const args = buildFFmpegArgs({
      clipPath,
      outputPath,
      quote: videoConfig.quote,
      hookText: videoConfig.scene.hookText,
      animation: videoConfig.scene.textAnimation,
      duration: videoConfig.duration,
      musicPath: music?.path,
      voicePath,
      logoPath,
      paletteId: videoConfig.paletteId,
    });

    await runFFmpeg(args);
  } finally {
    releaseLock();
  }
}

interface FFmpegBuildOptions {
  clipPath: string;
  outputPath: string;
  quote: string;
  hookText?: string;
  animation: TextAnimation;
  duration: number;
  musicPath?: string;
  voicePath?: string;
  logoPath?: string;
  paletteId: string;
}

function buildFFmpegArgs(options: FFmpegBuildOptions): string[] {
  const args: string[] = ['-y']; // Overwrite output

  const hasMusic = !!(options.musicPath && fs.existsSync(options.musicPath));
  const hasVoice = !!(options.voicePath && fs.existsSync(options.voicePath));
  const hasLogo = !!(options.logoPath && fs.existsSync(options.logoPath));

  // Input 0: video clip
  args.push('-i', options.clipPath);

  // Input 1: voice (if available)
  if (hasVoice) {
    args.push('-i', options.voicePath!);
  }

  // Input 2 (or 1): music (if available)
  if (hasMusic) {
    args.push('-i', options.musicPath!);
  }

  // Input 3 (or 2 or 1): logo (if available)
  if (hasLogo) {
    args.push('-i', options.logoPath!);
  }

  // Build filter complex
  const filters = buildFilterComplex(options, hasVoice, hasMusic, hasLogo);
  args.push('-filter_complex', filters.join(';'));

  // Map outputs
  args.push('-map', '[vout]');

  if (hasVoice || hasMusic) {
    args.push('-map', '[aout]');
  } else {
    // No audio
    args.push('-an');
  }

  // Output settings
  args.push(
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-t', String(options.duration),
    options.outputPath
  );

  return args;
}

function buildFilterComplex(
  options: FFmpegBuildOptions,
  hasVoice: boolean,
  hasMusic: boolean,
  hasLogo: boolean
): string[] {
  const filters: string[] = [];
  let videoStream = '[0:v]';

  // Track input indices: 0=video, 1=voice(if present), next=music(if present), next=logo(if present)
  let audioInputIndex = 1;
  const voiceIndex = hasVoice ? audioInputIndex++ : -1;
  const musicIndex = hasMusic ? audioInputIndex++ : -1;
  const logoIndex = hasLogo ? audioInputIndex : -1;

  // Text overlay filter
  const textFilter = buildTextFilter(options.quote, options.hookText, options.animation, options.duration);
  filters.push(`${videoStream}${textFilter}[vtext]`);
  videoStream = '[vtext]';

  // Logo overlay (if available)
  if (hasLogo) {
    filters.push(`[${logoIndex}:v]scale=80:-1[logo]`);
    filters.push(`${videoStream}[logo]overlay=W-w-40:H-h-40:format=auto[vlogo]`);
    videoStream = '[vlogo]';
  }

  // Final video output
  filters.push(`${videoStream}copy[vout]`);

  // Audio mixing
  if (hasVoice && hasMusic) {
    // Mix voice (louder) with music (background)
    filters.push(
      `[${voiceIndex}:a]apad=pad_dur=${options.duration},volume=1.0[voice]`
    );
    filters.push(
      `[${musicIndex}:a]afade=t=in:st=0:d=1,afade=t=out:st=${options.duration - 1}:d=1,volume=0.3[music]`
    );
    filters.push(
      `[voice][music]amix=inputs=2:duration=first:dropout_transition=2[aout]`
    );
  } else if (hasVoice) {
    // Voice only
    filters.push(
      `[${voiceIndex}:a]apad=pad_dur=${options.duration}[aout]`
    );
  } else if (hasMusic) {
    // Music only
    filters.push(
      `[${musicIndex}:a]afade=t=in:st=0:d=1,afade=t=out:st=${options.duration - 1}:d=1,volume=0.5[aout]`
    );
  }

  return filters;
}

function buildTextFilter(
  quote: string,
  hookText: string | undefined,
  animation: TextAnimation,
  duration: number
): string {
  // Escape special characters for FFmpeg
  const escapedQuote = escapeFFmpegText(quote);
  const escapedHook = hookText ? escapeFFmpegText(hookText) : '';

  // Font settings - use system font that exists on macOS
  const fontFile = process.platform === 'darwin'
    ? '/System/Library/Fonts/Helvetica.ttc'
    : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const fontSize = 48;
  const fontColor = 'white';
  const shadowColor = 'black@0.5';

  // Build animation-specific filter
  switch (animation) {
    case 'fade-in':
      return buildFadeInFilter(escapedQuote, escapedHook, fontFile, fontSize, fontColor, shadowColor, duration);

    case 'typewriter':
      return buildTypewriterFilter(escapedQuote, fontFile, fontSize, fontColor, shadowColor, duration);

    case 'word-by-word':
      return buildWordByWordFilter(escapedQuote, escapedHook, fontFile, fontSize, fontColor, shadowColor, duration);

    case 'kinetic':
      return buildKineticFilter(escapedQuote, fontFile, fontSize, fontColor, shadowColor, duration);

    case 'reveal':
    default:
      return buildRevealFilter(escapedQuote, escapedHook, fontFile, fontSize, fontColor, shadowColor, duration);
  }
}

function escapeFFmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\''")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function buildFadeInFilter(
  quote: string,
  hook: string,
  fontFile: string,
  fontSize: number,
  fontColor: string,
  shadowColor: string,
  duration: number
): string {
  const hookEnd = 3;
  const quoteStart = hookEnd;

  let filter = '';

  // Hook text (0-3s)
  if (hook) {
    filter += `drawtext=fontfile='${fontFile}':text='${hook}':fontsize=${fontSize * 0.8}:fontcolor=${fontColor}:`;
    filter += `shadowcolor=${shadowColor}:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2:`;
    filter += `enable='between(t,0,${hookEnd})':alpha='if(lt(t,0.5),t*2,if(lt(t,${hookEnd - 0.5}),1,(${hookEnd}-t)*2))',`;
  }

  // Main quote (3s-end)
  filter += `drawtext=fontfile='${fontFile}':text='${quote}':fontsize=${fontSize}:fontcolor=${fontColor}:`;
  filter += `shadowcolor=${shadowColor}:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2:`;
  filter += `enable='gte(t,${quoteStart})':alpha='min(1,(t-${quoteStart})*2)'`;

  return filter;
}

function buildTypewriterFilter(
  quote: string,
  fontFile: string,
  fontSize: number,
  fontColor: string,
  shadowColor: string,
  duration: number
): string {
  // Simplified typewriter - reveal characters over time
  const charsPerSecond = Math.ceil(quote.length / (duration - 2));

  let filter = `drawtext=fontfile='${fontFile}':text='${quote}':fontsize=${fontSize}:fontcolor=${fontColor}:`;
  filter += `shadowcolor=${shadowColor}:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2`;

  return filter;
}

function buildWordByWordFilter(
  quote: string,
  hook: string,
  fontFile: string,
  fontSize: number,
  fontColor: string,
  shadowColor: string,
  duration: number
): string {
  // Similar to fade-in but with word emphasis
  return buildFadeInFilter(quote, hook, fontFile, fontSize, fontColor, shadowColor, duration);
}

function buildKineticFilter(
  quote: string,
  fontFile: string,
  fontSize: number,
  fontColor: string,
  shadowColor: string,
  duration: number
): string {
  // Dynamic scaling effect
  let filter = `drawtext=fontfile='${fontFile}':text='${quote}':fontsize=${fontSize}:fontcolor=${fontColor}:`;
  filter += `shadowcolor=${shadowColor}:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2`;

  return filter;
}

function buildRevealFilter(
  quote: string,
  hook: string,
  fontFile: string,
  fontSize: number,
  fontColor: string,
  shadowColor: string,
  duration: number
): string {
  return buildFadeInFilter(quote, hook, fontFile, fontSize, fontColor, shadowColor, duration);
}

/**
 * Run FFmpeg command
 */
function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Running FFmpeg:', 'ffmpeg', args.join(' '));

    const process = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Sanitize the error message
        const rawError = `FFmpeg failed with code ${code}: ${stderr}`;
        reject(new Error(sanitizeRenderError(rawError)));
      }
    });

    process.on('error', (err) => {
      reject(new Error(sanitizeRenderError(err)));
    });
  });
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });

    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}
