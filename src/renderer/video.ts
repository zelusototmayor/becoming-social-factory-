/**
 * Video Renderer
 *
 * Renders animated quote videos (1080x1920) using FFmpeg.
 * Features:
 * - Constant background (no fade)
 * - Text-only fade in/out with intro → quote transition
 * - Floating dust particle effects (circular dots that drift slowly)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { template } from '../template.js';
import type { Palette, QuoteType } from '../types.js';

const execAsync = promisify(exec);

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get intro text based on quote type
 */
function getIntroText(quoteType: QuoteType): string {
  switch (quoteType) {
    case 'manifesto':
      return 'Your Manifesto of the Day';
    case 'inquiry':
      return 'Your Inquiry of the Day';
    case 'insight':
      return 'Your Insight of the Day';
    default:
      return 'Your Thought of the Day';
  }
}

/**
 * Wrap text into lines
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= 4) break;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine && lines.length < 4) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Parse hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Particle definition matching Becoming App style
 */
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: { r: number; g: number; b: number };
  travel: number;      // Vertical travel distance (30-90px)
  duration: number;    // Animation duration in seconds (14-26s)
  drift: number;       // Horizontal drift amount (-10 to +10px)
  driftDuration: number; // Drift cycle duration (6-12s)
  minOpacity: number;  // 0.15-0.35
  maxOpacity: number;  // minOpacity + 0.2-0.5
  flickerDuration: number; // 3-8s
  phase: number;       // Random phase offset for animation
}

/**
 * Generate particles matching Becoming App style
 * Note: Reduced count for memory efficiency in containerized environments
 */
function generateParticles(
  count: number,
  width: number,
  height: number,
  dustColors: string[]
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const colorHex = dustColors[Math.floor(Math.random() * dustColors.length)];
    const minOpacity = 0.15 + Math.random() * 0.2; // 0.15-0.35

    particles.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: 5 + Math.random() * 6, // 5-11px (bigger)
      color: hexToRgb(colorHex),
      travel: 60 + Math.random() * 80, // 60-140px (more vertical movement)
      duration: 8 + Math.random() * 6, // 8-14 seconds (faster)
      drift: -25 + Math.random() * 50, // -25 to +25px (more horizontal drift)
      driftDuration: 4 + Math.random() * 4, // 4-8 seconds (faster drift)
      minOpacity,
      maxOpacity: minOpacity + 0.25 + Math.random() * 0.35, // +0.25-0.6 (slightly brighter)
      flickerDuration: 2 + Math.random() * 4, // 2-6 seconds (faster flicker)
      phase: Math.random() * Math.PI * 2, // Random start phase
    });
  }

  return particles;
}

/**
 * Calculate particle position and opacity at a given time
 */
function getParticleState(particle: Particle, time: number): { x: number; y: number; opacity: number } {
  // Vertical float (ping-pong)
  const floatProgress = (time % particle.duration) / particle.duration;
  const floatY = Math.sin(floatProgress * Math.PI * 2 + particle.phase) * particle.travel / 2;

  // Horizontal drift (sine wave)
  const driftProgress = (time % particle.driftDuration) / particle.driftDuration;
  const driftX = Math.sin(driftProgress * Math.PI * 2 + particle.phase) * particle.drift;

  // Opacity flicker
  const flickerProgress = (time % particle.flickerDuration) / particle.flickerDuration;
  const opacityRange = particle.maxOpacity - particle.minOpacity;
  const opacity = particle.minOpacity + (Math.sin(flickerProgress * Math.PI * 2 + particle.phase) * 0.5 + 0.5) * opacityRange;

  return {
    x: particle.x + driftX,
    y: particle.y + floatY,
    opacity: Math.max(0, Math.min(1, opacity)),
  };
}

/**
 * Generate a single frame of particle overlay
 */
async function generateParticleFrame(
  particles: Particle[],
  time: number,
  width: number,
  height: number,
  outputPath: string
): Promise<void> {
  const sharp = (await import('sharp')).default;

  // Create SVG with particles
  const particleSvg = particles.map(particle => {
    const state = getParticleState(particle, time);
    const { r, g, b } = particle.color;

    // Skip if particle is outside visible area
    if (state.x < -20 || state.x > width + 20 || state.y < -20 || state.y > height + 20) {
      return '';
    }

    return `<circle cx="${state.x}" cy="${state.y}" r="${particle.size / 2}" fill="rgba(${r},${g},${b},${state.opacity.toFixed(3)})" />`;
  }).join('\n    ');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${particleSvg}
</svg>`;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    }])
    .png()
    .toFile(outputPath);
}

/**
 * Generate particle overlay video frames
 */
async function generateParticleOverlay(
  outputDir: string,
  width: number,
  height: number,
  duration: number,
  fps: number,
  dustColors: string[],
  timestamp: number
): Promise<string> {
  // Reduced from 18 to 12 particles for better memory efficiency in containers
  const particles = generateParticles(12, width, height, dustColors);
  const totalFrames = Math.ceil(duration * fps);
  const frameDir = path.join(outputDir, `particles_${timestamp}`);

  // Create frame directory
  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir, { recursive: true });
  }

  console.log(`  Generating ${totalFrames} particle frames...`);

  // Generate frames in smaller batches to avoid memory issues in containers
  const batchSize = 15;
  for (let i = 0; i < totalFrames; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(i + batchSize, totalFrames); j++) {
      const time = j / fps;
      const framePath = path.join(frameDir, `frame_${String(j).padStart(5, '0')}.png`);
      batch.push(generateParticleFrame(particles, time, width, height, framePath));
    }
    await Promise.all(batch);
  }

  // Convert frames to video
  const particleVideo = path.join(outputDir, `temp_particles_${timestamp}.mov`);
  const framePattern = path.join(frameDir, 'frame_%05d.png');

  // Use qtrle codec (Animation/RLE) - much more memory-efficient than PNG while supporting alpha
  await execAsync(
    `ffmpeg -y -framerate ${fps} -i "${framePattern}" -c:v qtrle "${particleVideo}"`,
    { maxBuffer: 100 * 1024 * 1024 }
  );

  // Clean up frame directory
  const frames = fs.readdirSync(frameDir);
  frames.forEach(f => fs.unlinkSync(path.join(frameDir, f)));
  fs.rmdirSync(frameDir);

  return particleVideo;
}

/**
 * Generate a transparent text overlay image
 */
async function generateTextOverlay(
  text: string,
  textColor: string,
  outputPath: string,
  options: {
    fontSize?: number;
    yPosition?: number;
    maxCharsPerLine?: number;
    width: number;
    height: number;
  }
): Promise<void> {
  const sharp = (await import('sharp')).default;

  const {
    fontSize = 48,
    yPosition = 850,
    maxCharsPerLine = 22,
    width,
    height
  } = options;

  const lines = wrapText(text, maxCharsPerLine);
  const lineHeight = fontSize * 1.35;
  const centerX = width / 2;

  // Create SVG with text only (transparent background)
  const textElements = lines.map((line, i) => {
    const y = yPosition + i * lineHeight;
    const escapedLine = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Shadow for depth
    const shadow = `<text x="${centerX + 2}" y="${y + 2}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" font-style="italic" fill="rgba(0,0,0,0.2)">${escapedLine}</text>`;
    const mainText = `<text x="${centerX}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" font-style="italic" fill="${textColor}">${escapedLine}</text>`;
    return shadow + '\n    ' + mainText;
  }).join('\n    ');

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${textElements}
</svg>`;

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    }])
    .png()
    .toFile(outputPath);
}

/**
 * Render video with constant background, text-only fades, and floating dust particles
 */
export async function renderVideo(options: {
  quote: string;
  quoteType?: QuoteType;
  palette: Palette;
  outputPath: string;
}): Promise<{ success: boolean; error?: string; duration?: number }> {
  const { quote, quoteType = 'manifesto', palette, outputPath } = options;
  const { video: videoLayout } = template.layout;
  const { width, height, fps } = videoLayout;

  // Check FFmpeg
  if (!(await checkFFmpeg())) {
    return { success: false, error: 'FFmpeg not installed' };
  }

  const tempDir = path.dirname(outputPath);
  const timestamp = Date.now();

  // Temp file paths
  const introTextOverlay = path.join(tempDir, `temp_intro_text_${timestamp}.png`);
  const quoteTextOverlay = path.join(tempDir, `temp_quote_text_${timestamp}.png`);
  let particleVideo = '';

  const tempFiles = [introTextOverlay, quoteTextOverlay];

  try {
    // Ensure output directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const backgroundPath = path.resolve(palette.backgroundVideo);
    const introText = getIntroText(quoteType);

    console.log(`Rendering video: ${quote.substring(0, 40)}...`);
    console.log(`  Quote type: ${quoteType}`);
    console.log(`  Intro: "${introText}"`);
    console.log(`  Dust colors: ${palette.dustColors.join(', ')}`);

    // Timing
    const introDuration = 2.5;
    const quoteDuration = 6.5;
    const totalDuration = introDuration + quoteDuration;
    const fadeTime = 0.5;

    // Generate text overlays
    await generateTextOverlay(introText, palette.textColorPrimary, introTextOverlay, {
      fontSize: 46,
      yPosition: 920,
      maxCharsPerLine: 40,
      width,
      height
    });

    await generateTextOverlay(quote, palette.textColorPrimary, quoteTextOverlay, {
      fontSize: 48,
      yPosition: 750,
      maxCharsPerLine: 22,
      width,
      height
    });

    // Generate particle overlay video
    particleVideo = await generateParticleOverlay(
      tempDir, width, height, totalDuration, fps, palette.dustColors, timestamp
    );
    tempFiles.push(particleVideo);

    // Build FFmpeg filter for layered composition
    const introFadeIn = 0;
    const introFadeOut = introDuration - fadeTime;

    // Complex filter graph
    const filterComplex = [
      // Input 0: Background image -> loop for duration
      `[0:v]loop=loop=${totalDuration * fps}:size=1:start=0,setpts=N/${fps}/TB,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[bg]`,

      // Input 1: Intro text overlay with fade
      `[1:v]format=rgba,fade=t=in:st=${introFadeIn}:d=${fadeTime}:alpha=1,fade=t=out:st=${introFadeOut}:d=${fadeTime}:alpha=1[intro]`,

      // Input 2: Quote text overlay with fade (starts after intro)
      `[2:v]format=rgba,fade=t=in:st=0:d=${fadeTime}:alpha=1,fade=t=out:st=${quoteDuration - fadeTime}:d=${fadeTime}:alpha=1,setpts=PTS+${introDuration}/TB[quote]`,

      // Input 3: Particle overlay
      `[3:v]format=rgba[particles]`,

      // Composite layers: bg + particles + intro text + quote text
      `[bg][particles]overlay=0:0:format=auto[v1]`,
      `[v1][intro]overlay=0:0:enable='between(t,0,${introDuration})'[v2]`,
      `[v2][quote]overlay=0:0:enable='gte(t,${introDuration})'[vout]`
    ].join(';');

    // FFmpeg command with thread and memory limits for container environments
    const ffmpegCmd = [
      'ffmpeg -y',
      '-threads 2',  // Limit threads to reduce memory usage
      `-loop 1 -i "${backgroundPath}"`,
      `-loop 1 -t ${introDuration} -i "${introTextOverlay}"`,
      `-loop 1 -t ${quoteDuration} -i "${quoteTextOverlay}"`,
      `-i "${particleVideo}"`,
      `-filter_complex "${filterComplex}"`,
      '-map "[vout]"',
      `-t ${totalDuration}`,
      '-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -threads 2',
      `-r ${fps}`,
      `"${outputPath}"`
    ].join(' ');

    await execAsync(ffmpegCmd, { maxBuffer: 100 * 1024 * 1024 });

    // Cleanup temp files
    tempFiles.forEach(f => {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    });

    console.log(`Video rendered: ${outputPath}`);
    return { success: true, duration: totalDuration };
  } catch (error) {
    // Cleanup on error
    tempFiles.forEach(f => {
      if (fs.existsSync(f)) {
        try { fs.unlinkSync(f); } catch {}
      }
    });
    console.error('Video render failed:', error);
    return { success: false, error: String(error) };
  }
}
