/**
 * Remotion Renderer Bridge
 *
 * Bridges Node.js to Remotion CLI for rendering viral videos.
 * Handles passing props, executing renders, and managing output.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { QuoteType } from './types.js';
import { acquireRenderLock, sanitizeRenderError } from '../utils/renderLock.js';

const REMOTION_STUDIO_PATH = path.join(process.cwd(), 'remotion-studio');

export interface RemotionRenderOptions {
  quote: string;
  hookText: string;
  quoteType: QuoteType;
  videoPath: string;
  voicePath: string;
  musicPath?: string;
  musicVolume?: number;
  outputPath: string;
  durationInFrames?: number;
  fps?: number;
}

export interface RemotionRenderResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

/**
 * Check if Remotion is available (dependencies installed)
 */
export async function isRemotionAvailable(): Promise<{ available: boolean; reason?: string }> {
  const packageJsonPath = path.join(REMOTION_STUDIO_PATH, 'package.json');
  const nodeModulesPath = path.join(REMOTION_STUDIO_PATH, 'node_modules');

  if (!fs.existsSync(packageJsonPath)) {
    return { available: false, reason: 'remotion-studio/package.json not found' };
  }

  if (!fs.existsSync(nodeModulesPath)) {
    return { available: false, reason: 'remotion-studio/node_modules not found. Run: cd remotion-studio && npm install' };
  }

  return { available: true };
}

/**
 * Render a viral video using Remotion
 *
 * Since Remotion's headless browser doesn't support file:// URLs,
 * we copy media files to the public folder and use staticFile() paths.
 */
export async function renderViralVideo(options: RemotionRenderOptions): Promise<RemotionRenderResult> {
  // Check if Remotion is available
  const remotionStatus = await isRemotionAvailable();
  if (!remotionStatus.available) {
    return {
      success: false,
      error: remotionStatus.reason,
    };
  }

  // Acquire render lock to prevent concurrent renders (OOM protection)
  let releaseLock: (() => void) | null = null;
  try {
    releaseLock = await acquireRenderLock();
  } catch (lockError) {
    return { success: false, error: sanitizeRenderError(lockError) };
  }

  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  // Validate that input video exists
  if (!fs.existsSync(options.videoPath)) {
    console.error(`Video file does not exist: ${options.videoPath}`);
    return {
      success: false,
      error: `Video file not found: ${options.videoPath}`,
    };
  }

  // Create public folder for media files
  const publicDir = path.join(REMOTION_STUDIO_PATH, 'public', 'render-assets');
  fs.mkdirSync(publicDir, { recursive: true });

  // Copy media files to public folder (Remotion needs them served via HTTP)
  const copiedFiles: string[] = [];

  // Copy video
  const videoFileName = `video_${Date.now()}.mp4`;
  const publicVideoPath = path.join(publicDir, videoFileName);
  fs.copyFileSync(options.videoPath, publicVideoPath);
  copiedFiles.push(publicVideoPath);
  console.log(`Copied video to: ${publicVideoPath}`);

  // Copy voice if provided
  let voiceFileName = '';
  if (options.voicePath && fs.existsSync(options.voicePath)) {
    voiceFileName = `voice_${Date.now()}.mp3`;
    const publicVoicePath = path.join(publicDir, voiceFileName);
    fs.copyFileSync(options.voicePath, publicVoicePath);
    copiedFiles.push(publicVoicePath);
    console.log(`Copied voice to: ${publicVoicePath}`);
  }

  // Copy music if provided
  let musicFileName = '';
  if (options.musicPath && fs.existsSync(options.musicPath)) {
    musicFileName = `music_${Date.now()}.mp3`;
    const publicMusicPath = path.join(publicDir, musicFileName);
    fs.copyFileSync(options.musicPath, publicMusicPath);
    copiedFiles.push(publicMusicPath);
    console.log(`Copied music to: ${publicMusicPath}`);
  }

  const absoluteOutputPath = path.isAbsolute(options.outputPath)
    ? options.outputPath
    : path.resolve(process.cwd(), options.outputPath);

  // Build props object for Remotion - use staticFile paths (relative to public folder)
  const props = {
    quote: options.quote,
    hookText: options.hookText,
    quoteType: options.quoteType,
    videoPath: `render-assets/${videoFileName}`,
    voicePath: voiceFileName ? `render-assets/${voiceFileName}` : '',
    musicPath: musicFileName ? `render-assets/${musicFileName}` : '',
    musicVolume: options.musicVolume ?? 0.25,
  };

  console.log('============================================');
  console.log('REMOTION RENDER DEBUG INFO');
  console.log('============================================');
  console.log('Props:', JSON.stringify(props, null, 2));
  console.log('Output path:', absoluteOutputPath);
  console.log('============================================');

  // Serialize props to JSON
  const propsJson = JSON.stringify(props);

  // Write props to a temp file
  const propsFile = path.join(REMOTION_STUDIO_PATH, '.render-props.json');
  fs.writeFileSync(propsFile, propsJson);
  console.log(`Props written to: ${propsFile}`);

  // Build Remotion CLI command
  const args = [
    'remotion',
    'render',
    'ViralQuote',
    absoluteOutputPath,
    `--props=${propsFile}`,
  ];

  // Add optional duration/fps if provided
  if (options.durationInFrames) {
    args.push('--frames', `0-${options.durationInFrames - 1}`);
  }

  console.log('Starting Remotion render...');
  console.log(`Output: ${options.outputPath}`);

  try {
    await runRemotionCommand(args, propsFile);

    // Verify output exists
    if (!fs.existsSync(options.outputPath)) {
      // Release lock before returning
      if (releaseLock) releaseLock();
      return {
        success: false,
        error: 'Render completed but output file not found',
      };
    }

    console.log(`Remotion render complete: ${options.outputPath}`);

    // Release lock on success
    if (releaseLock) releaseLock();

    return {
      success: true,
      outputPath: options.outputPath,
      duration: 12, // Default 12 second video
    };
  } catch (error) {
    // Release lock on error
    if (releaseLock) releaseLock();

    const sanitizedError = sanitizeRenderError(error);
    return {
      success: false,
      error: sanitizedError,
    };
  } finally {
    // Clean up copied files
    for (const file of copiedFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`Cleaned up: ${file}`);
        }
      } catch (e) {
        console.warn(`Failed to clean up ${file}:`, e);
      }
    }
  }
}

/**
 * Run a Remotion CLI command
 */
function runRemotionCommand(args: string[], propsFile: string | null = null): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Running: npx ${args.join(' ')}`);

    const proc = spawn('npx', args, {
      cwd: REMOTION_STUDIO_PATH,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false, // Don't use shell to avoid escaping issues
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      // Log all stdout for debugging
      console.log(`[Remotion stdout]: ${output.trim()}`);
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      // Log all stderr for debugging
      console.log(`[Remotion stderr]: ${output.trim()}`);
    });

    proc.on('close', (code) => {
      // Clean up props file
      if (propsFile && fs.existsSync(propsFile)) {
        fs.unlinkSync(propsFile);
      }

      if (code === 0) {
        resolve();
      } else {
        console.error(`Remotion failed with code ${code}`);
        console.error(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        reject(new Error(`Remotion exited with code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on('error', (err) => {
      // Clean up props file
      if (propsFile && fs.existsSync(propsFile)) {
        fs.unlinkSync(propsFile);
      }
      reject(new Error(`Failed to start Remotion: ${err.message}`));
    });
  });
}

/**
 * Install Remotion dependencies if needed
 */
export async function installRemotionDependencies(): Promise<{ success: boolean; error?: string }> {
  const nodeModulesPath = path.join(REMOTION_STUDIO_PATH, 'node_modules');

  if (fs.existsSync(nodeModulesPath)) {
    return { success: true };
  }

  console.log('Installing Remotion dependencies...');

  return new Promise((resolve) => {
    const proc = spawn('npm', ['install'], {
      cwd: REMOTION_STUDIO_PATH,
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: `npm install failed with code ${code}` });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, error: `npm install error: ${err.message}` });
    });
  });
}
