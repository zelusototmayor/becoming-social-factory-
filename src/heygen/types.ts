/**
 * HeyGen Types
 *
 * Type definitions for HeyGen AI UGC video generation.
 */

// Avatar personas for rotating UGC content
export interface AvatarPersona {
  id: string;
  heygenAvatarId: string; // HeyGen avatar ID
  name: string;
  demographic: string;
  vibe: string;
  bestFor: string[];
  voiceId?: string; // HeyGen voice ID (if different from default)
}

// UGC script structure
export interface UGCScript {
  hook: string;
  painPoint: string;
  discovery: string;
  benefit: string;
  cta: string;
  fullText: string;
  template: string;
  duration: number; // estimated seconds
}

// Script template types
export type ScriptTemplate =
  | 'skeptic-believer'
  | 'morning-routine'
  | 'friend-recommendation'
  | 'transformation'
  | 'pov-discovery'
  | 'one-habit'
  | 'therapist-recommended';

// Content themes for The Becoming App
export type ContentTheme =
  | 'anxiety-management'
  | 'morning-routine'
  | 'self-compassion'
  | 'mindfulness'
  | 'breathing-exercises'
  | 'daily-reflection'
  | 'stress-relief'
  | 'emotional-awareness';

// HeyGen API types
export interface HeyGenVideoRequest {
  video_inputs: HeyGenVideoInput[];
  dimension?: {
    width: number;
    height: number;
  };
  aspect_ratio?: string; // "9:16" for vertical
  test?: boolean;
}

export interface HeyGenVideoInput {
  character: {
    type: 'avatar';
    avatar_id: string;
    avatar_style?: 'normal' | 'circle' | 'closeUp';
  };
  voice: {
    type: 'text';
    input_text: string;
    voice_id?: string;
    speed?: number; // 0.5 - 1.5
    pitch?: number; // -50 to 50
  };
  background?: {
    type: 'color' | 'image' | 'video';
    value: string; // hex color, URL, or video URL
  };
}

export interface HeyGenVideoResponse {
  error: null | string;
  data: {
    video_id: string;
  };
}

export interface HeyGenVideoStatus {
  error: null | string;
  data: {
    video_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    callback_id?: string;
    gif_url?: string;
  };
}

export interface HeyGenAvatarList {
  error: null | string;
  data: {
    avatars: HeyGenAvatar[];
  };
}

export interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender: string;
  preview_image_url: string;
  preview_video_url: string;
}

export interface HeyGenVoiceList {
  error: null | string;
  data: {
    voices: HeyGenVoice[];
  };
}

export interface HeyGenVoice {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  preview_audio: string;
}

// Generation result
export interface HeyGenVideoResult {
  success: boolean;
  outputPath?: string;
  videoUrl?: string;
  duration?: number;
  error?: string;
  script?: UGCScript;
  avatar?: AvatarPersona;
  theme?: ContentTheme;
  caption?: string;
  hashtags?: string[];
}

// Progress callback
export interface ProgressData {
  stage: 'script' | 'avatar' | 'generating' | 'downloading' | 'complete';
  message: string;
  script?: UGCScript;
  avatar?: AvatarPersona;
}

export type ProgressCallback = (data: ProgressData) => void | Promise<void>;
