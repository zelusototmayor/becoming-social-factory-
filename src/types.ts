/**
 * Type Definitions
 */

// Platform types
export type Platform = 'instagram' | 'tiktok';
export type PostFormat = 'static' | 'video';
export type PostStatus = 'pending' | 'generating' | 'generated' | 'awaiting_manual_publish' | 'publishing' | 'published' | 'failed';
export type QuoteType = 'inquiry' | 'manifesto' | 'insight';

// Palette configuration
export interface Palette {
  id: string;
  name: string;
  background: string;
  backgroundVideo: string;
  logo: string;
  textColorPrimary: string;
  textColorSecondary: string;
  dustColors: string[];  // Colors for video dust particle effects (array of hex colors)
}

// Template configuration
export interface TemplateConfig {
  palettes: Palette[];
  layout: {
    static: {
      width: number;
      height: number;
      quote: {
        x: number;
        y: number;
        width: number;
        height: number;
        maxLines: number;
        lineHeight: number;
      };
      logo: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
    video: {
      width: number;
      height: number;
      duration: number;
      fps: number;
    };
  };
  typography: {
    fontFamily: string;
    fontPath: string;
    baseFontSize: number;
    minFontSize: number;
  };
  antiRepetition: {
    maxConsecutiveSamePalette: number;
  };
}

// Post data
export interface Post {
  id: string;
  platform: Platform;
  format: PostFormat;
  paletteId: string;
  scheduledAt: Date;
  status: PostStatus;
  quote: string;
  quoteType?: QuoteType;
  caption: string;
  hashtags: string[];
  altText: string;
  assetPath?: string;
  assetUrl?: string;
  platformPostId?: string;
  publishedManually?: boolean;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Generated content
export interface GeneratedQuote {
  text: string;
  type: QuoteType;
}

export interface GeneratedContent {
  quote: GeneratedQuote;
  caption: string;
  hashtags: string[];
  altText: string;
}

// Job types
export type JobType =
  | 'schedule_daily'
  | 'generate_content'
  | 'render_static'
  | 'render_video'
  | 'publish_instagram';

export interface JobData {
  postId?: string;
  platform?: Platform;
  format?: PostFormat;
}

// Settings
export interface Settings {
  timezone: string;
  dailyPostCount: number;
  postWindowStart: string;
  postWindowEnd: string;
  instagramEnabled: boolean;
  tiktokEnabled: boolean;
  autoPublishInstagram: boolean;
}

// API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
