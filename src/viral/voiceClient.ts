/**
 * ElevenLabs Voice Client
 *
 * Generates voice narration for viral videos using ElevenLabs API.
 * Supports hook-first narration with pause before quote.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config.js';
import type { VoiceScript, VoiceGenerationResult, QuoteType } from './types.js';
import { VOICE_MAP } from './types.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// Fallback voice if type not specified
const DEFAULT_VOICE_ID = 'NFG5qt843uXKj4pFvR7C'; // Adam Stone

// Pause duration between hook and quote (milliseconds)
const DEFAULT_PAUSE_DURATION = 500;

/**
 * Get the voice ID for a specific content type
 */
export function getVoiceForType(quoteType: QuoteType): string {
  return VOICE_MAP[quoteType]?.voiceId || DEFAULT_VOICE_ID;
}

/**
 * Get voice settings optimized for each content type
 */
function getVoiceSettings(quoteType: QuoteType): { stability: number; similarityBoost: number; style: number } {
  switch (quoteType) {
    case 'inquiry':
      // James: Bold, engaging - slightly lower stability for expression
      return { stability: 0.35, similarityBoost: 0.8, style: 0.6 };
    case 'manifesto':
      // Adam Stone: Deep, relaxed - more stability for gravitas
      return { stability: 0.5, similarityBoost: 0.85, style: 0.4 };
    case 'insight':
      // Spuds Oxley: Wise, approachable - balanced
      return { stability: 0.45, similarityBoost: 0.8, style: 0.5 };
    default:
      return { stability: 0.45, similarityBoost: 0.8, style: 0.5 };
  }
}

/**
 * Build a voice script with hook, pause, and quote
 */
export function buildVoiceScript(hook: string, quote: string, pauseDuration = DEFAULT_PAUSE_DURATION): VoiceScript {
  // Use SSML-like pause syntax that ElevenLabs understands
  // ElevenLabs uses <break time="Xms"/> for pauses
  const pauseMs = pauseDuration;

  // Build the full text with a natural pause
  // ElevenLabs interprets "..." as a brief pause, and we add extra spacing
  const fullText = `${hook}... ... ${quote}`;

  return {
    hook,
    quote,
    pauseDuration: pauseMs,
    fullText,
  };
}

/**
 * Generate voice narration for a script (hook + quote)
 * Automatically selects the right voice based on quote type
 */
export async function generateScriptedVoiceNarration(options: {
  script: VoiceScript;
  outputDir: string;
  quoteType: QuoteType;
  voiceId?: string; // Override if needed
}): Promise<VoiceGenerationResult> {
  const apiKey = config.elevenlabsApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: 'ElevenLabs API key not configured',
    };
  }

  // Use type-specific voice or override
  const voiceId = options.voiceId || getVoiceForType(options.quoteType);
  const voiceSettings = getVoiceSettings(options.quoteType);
  const voiceName = VOICE_MAP[options.quoteType]?.name || 'Default';

  console.log(`   Using voice: ${voiceName} (${options.quoteType})`);

  try {
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: options.script.fullText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `ElevenLabs API error: ${response.status} - ${errorText}`,
      };
    }

    // Save audio file
    const audioBuffer = await response.arrayBuffer();
    const filename = `voice_${Date.now()}.mp3`;
    const outputPath = path.join(options.outputDir, filename);

    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

    console.log(`Voice narration generated: ${outputPath}`);

    return {
      success: true,
      audioPath: outputPath,
      script: options.script,
    };
  } catch (error) {
    return {
      success: false,
      error: `Voice generation failed: ${error}`,
    };
  }
}

/**
 * Generate voice narration for a simple text (backwards compatible)
 */
export async function generateVoiceNarration(options: {
  text: string;
  outputDir: string;
  voiceId?: string;
}): Promise<VoiceGenerationResult> {
  const apiKey = config.elevenlabsApiKey;

  if (!apiKey) {
    return {
      success: false,
      error: 'ElevenLabs API key not configured',
    };
  }

  const voiceId = options.voiceId || DEFAULT_VOICE_ID;

  try {
    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: options.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `ElevenLabs API error: ${response.status} - ${errorText}`,
      };
    }

    // Save audio file
    const audioBuffer = await response.arrayBuffer();
    const filename = `voice_${Date.now()}.mp3`;
    const outputPath = path.join(options.outputDir, filename);

    fs.mkdirSync(options.outputDir, { recursive: true });
    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

    console.log(`Voice narration generated: ${outputPath}`);

    return {
      success: true,
      audioPath: outputPath,
    };
  } catch (error) {
    return {
      success: false,
      error: `Voice generation failed: ${error}`,
    };
  }
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsAvailable(): { available: boolean; reason?: string } {
  if (!config.elevenlabsApiKey) {
    return { available: false, reason: 'ELEVENLABS_API_KEY not set' };
  }
  return { available: true };
}
