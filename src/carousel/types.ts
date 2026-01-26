/**
 * Carousel Type Definitions
 *
 * Types for TikTok carousel generation (8-slide format)
 */

export type SlideType = 'hook' | 'value' | 'payoff' | 'cta';
export type CtaType = 'save' | 'share';
export type CarouselStatus = 'pending' | 'generating' | 'ready' | 'published' | 'failed';

export interface CarouselSlide {
  slideNumber: number;
  type: SlideType;
  headline?: string;
  bodyText: string;
  valueNumber?: number;  // 1-5 for value slides
  ctaType?: CtaType;
}

export interface CarouselContent {
  topic: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
}

export interface CarouselResult {
  success: boolean;
  carouselId?: string;
  slidePaths?: string[];
  content?: CarouselContent;
  error?: string;
}

export interface Carousel {
  id: string;
  status: CarouselStatus;
  paletteId: string;
  topic?: string;
  content?: CarouselContent;
  slidePaths?: string[];
  caption?: string;
  hashtags: string[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
