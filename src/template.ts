/**
 * Template Configuration
 * Defines the visual template for all social posts
 */

import type { TemplateConfig } from './types.js';

export const template: TemplateConfig = {
  palettes: [
    {
      id: 'palette1',
      name: 'Navy',
      background: 'assets/palette1/background.png',
      backgroundVideo: 'assets/palette1/background-video.png',
      logo: 'assets/palette1/logo.png',
      textColorPrimary: '#FFFFFF',
      textColorSecondary: 'rgba(255,255,255,0.65)',
      dustColors: ['#14b8a6', '#ffa726', '#71717a'],  // Teal, orange, gray
    },
    {
      id: 'palette2',
      name: 'Peachy',
      background: 'assets/palette2/background.png',
      backgroundVideo: 'assets/palette2/background-video.png',
      logo: 'assets/palette2/logo.png',
      textColorPrimary: '#7A8B8B',
      textColorSecondary: 'rgba(122,139,139,0.65)',
      dustColors: ['#a7c7d6', '#c8b6ea', '#6a6a6a'],  // Blue, purple, gray
    },
    {
      id: 'palette3',
      name: 'Terracotta',
      background: 'assets/palette3/background.png',
      backgroundVideo: 'assets/palette3/background-video.png',
      logo: 'assets/palette3/logo.png',
      textColorPrimary: '#F5EBE0',
      textColorSecondary: 'rgba(245,235,224,0.65)',
      dustColors: ['#8db255', '#f4a442', '#71717a'],  // Green, gold, gray
    },
  ],

  layout: {
    static: {
      width: 1080,
      height: 1440,  // 3:4 aspect ratio to match template assets
      quote: {
        x: 60,
        y: 60,
        width: 960,
        height: 340,
        maxLines: 4,
        lineHeight: 1.3,
      },
      // Logo is now embedded in background asset - no separate drawing needed
      logo: {
        x: 540,
        y: 1250,
        width: 180,
        height: 60,
      },
    },
    video: {
      width: 1080,
      height: 1920,
      duration: 10,
      fps: 30,
    },
  },

  typography: {
    fontFamily: 'PlayfairDisplay-BoldItalic',
    fontPath: 'assets/fonts/PlayfairDisplay-BoldItalic.ttf',
    baseFontSize: 58,
    minFontSize: 44,
  },

  antiRepetition: {
    maxConsecutiveSamePalette: 2,
  },
};

/**
 * Get palette by ID
 */
export function getPalette(id: string) {
  return template.palettes.find(p => p.id === id);
}

/**
 * Get random palette (respecting anti-repetition rules)
 */
export function selectPalette(recentPaletteIds: string[]): typeof template.palettes[0] {
  const { maxConsecutiveSamePalette } = template.antiRepetition;

  // Check last N palettes for consecutive same
  const lastPaletteId = recentPaletteIds[0];
  const consecutiveCount = recentPaletteIds
    .slice(0, maxConsecutiveSamePalette)
    .filter(id => id === lastPaletteId).length;

  // Filter out palette if at max consecutive
  let available = template.palettes;
  if (consecutiveCount >= maxConsecutiveSamePalette) {
    available = template.palettes.filter(p => p.id !== lastPaletteId);
  }

  // Random selection from available
  return available[Math.floor(Math.random() * available.length)];
}
