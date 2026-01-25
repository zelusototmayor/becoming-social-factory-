/**
 * Viral Video Types
 *
 * Type definitions for the AI-powered viral video generation system.
 */

// Content types (matches generator)
export type QuoteType = 'inquiry' | 'manifesto' | 'insight';

// CTA types for video outro (alternates between videos)
export type CtaType = 'save' | 'share';

// Voice configuration per content type
export interface VoiceConfig {
  voiceId: string;
  name: string;
  style: string;
}

export const VOICE_MAP: Record<QuoteType, VoiceConfig> = {
  inquiry: {
    voiceId: 'P9S3WZL3JE8uQqgYH5B7',
    name: 'James',
    style: 'Husky, Engaging and Bold',
  },
  manifesto: {
    voiceId: 'NFG5qt843uXKj4pFvR7C',
    name: 'Adam Stone',
    style: 'Smooth, Deep and Relaxed',
  },
  insight: {
    voiceId: 'NOpBlnGInO9m6vDvFkFC',
    name: 'Spuds Oxley',
    style: 'Wise and Approachable',
  },
};

// Hook patterns for viral video openings (now type-specific)
export type HookPattern =
  | 'conditional-challenge'  // Inquiry: "If you're... have you..."
  | 'bold-declaration'       // Manifesto: Strong opening statement
  | 'wisdom-setup';          // Insight: "Here's what..." or "The truth is..."

export interface ViralHook {
  text: string;
  pattern: HookPattern;
  quoteType: QuoteType;
}

export interface VoiceScript {
  hook: string;
  quote: string;
  pauseDuration: number; // milliseconds between hook and quote
  fullText: string; // Combined text for TTS with SSML pause
}

export type VisualMood =
  | 'quiet-determination'
  | 'new-beginnings'
  | 'self-compassion'
  | 'strength'
  | 'reflection'
  | 'action'
  | 'wisdom'
  | 'hope';

export type MusicMood =
  | 'epic-building'
  | 'uplifting-gentle'
  | 'contemplative'
  | 'powerful'
  | 'serene'
  | 'gentle-piano';

export type TextAnimation =
  | 'fade-in'
  | 'typewriter'
  | 'word-by-word'
  | 'kinetic'
  | 'reveal';

export interface SceneTemplate {
  id: string;
  mood: VisualMood;
  name: string;
  runwayPrompt: string;
  musicMood: MusicMood;
  textAnimation: TextAnimation;
}

export interface SceneConfig {
  mood: VisualMood;
  scenePrompt: string;
  musicMood: MusicMood;
  textAnimation: TextAnimation;
  hookText?: string;
}

export interface ViralVideoConfig {
  quote: string;
  quoteType: 'inquiry' | 'manifesto' | 'insight';
  scene: SceneConfig;
  paletteId: string;
  duration: number; // in seconds
}

export interface MusicTrack {
  id: string;
  mood: MusicMood;
  filename: string;
  duration: number; // in seconds
  bpm?: number;
}

export interface RunwayGenerationResult {
  success: boolean;
  clipPath?: string;
  error?: string;
  duration?: number;
}

export interface ViralVideoResult {
  success: boolean;
  outputPath?: string;
  config?: ViralVideoConfig;
  caption?: string;
  hashtags?: string[];
  hookText?: string;
  ctaType?: CtaType;
  error?: string;
}

// Remotion composition props
export interface ViralQuoteProps {
  quote: string;
  hookText: string;
  hookPattern: HookPattern;
  voicePath: string;
  videoPath: string;
  musicPath?: string;
  durationInFrames: number;
  fps: number;
}

// Scene analysis with dynamic prompt
export interface DynamicSceneConfig extends SceneConfig {
  dynamicPrompt: string; // AI-generated scene prompt specific to the quote
}

// Voice generation result with timing
export interface VoiceGenerationResult {
  success: boolean;
  audioPath?: string;
  duration?: number;
  error?: string;
  script?: VoiceScript;
}
