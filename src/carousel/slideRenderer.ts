/**
 * Carousel Slide Renderer
 *
 * Renders carousel slides using Sharp with SVG text overlay.
 * Uses 1080x1920 (9:16) format with existing backgroundVideo assets.
 */

import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import type { Palette } from '../types.js';
import type { CarouselSlide, CarouselContent } from './types.js';

// Carousel dimensions (9:16 TikTok format)
const WIDTH = 1080;
const HEIGHT = 1920;

// Dust particle settings
const DUST_CONFIG = {
  particleCount: 35,
  minSize: 3,
  maxSize: 12,
  minOpacity: 0.08,
  maxOpacity: 0.25,
  // Avoid text areas - particles mostly in corners and edges
  safeZoneY: { min: 500, max: 1100 },
  safeZoneMargin: 150,
};

// Typography settings per slide type
const TYPOGRAPHY = {
  hook: {
    fontSize: 68,
    lineHeight: 1.35,
    maxCharsPerLine: 22,
    yPosition: 720,
    textAnchor: 'middle' as const,
    xPosition: WIDTH / 2,
  },
  value: {
    fontSize: 52,
    lineHeight: 1.4,
    maxCharsPerLine: 28,
    yPosition: 700,
    textAnchor: 'start' as const,
    xPosition: 80,
    numberFontSize: 280,
    numberOpacity: 0.08,
  },
  payoff: {
    fontSize: 58,
    lineHeight: 1.4,
    maxCharsPerLine: 26,
    yPosition: 720,
    textAnchor: 'middle' as const,
    xPosition: WIDTH / 2,
  },
  cta: {
    fontSize: 54,
    lineHeight: 1.4,
    maxCharsPerLine: 24,
    yPosition: 900,
    textAnchor: 'middle' as const,
    xPosition: WIDTH / 2,
  },
};

/**
 * Seeded random number generator for consistent dust per slide
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Generate dust particles SVG overlay
 */
function generateDustParticles(dustColors: string[], slideNumber: number): string {
  const { particleCount, minSize, maxSize, minOpacity, maxOpacity, safeZoneY, safeZoneMargin } = DUST_CONFIG;
  const random = seededRandom(slideNumber * 12345);

  let particles = '';

  for (let i = 0; i < particleCount; i++) {
    // Random position, avoiding the text safe zone in the middle
    let x: number, y: number;
    const attempts = 10;

    for (let attempt = 0; attempt < attempts; attempt++) {
      x = random() * WIDTH;
      y = random() * HEIGHT;

      // Check if in safe zone (middle area where text appears)
      const inSafeZone = y > safeZoneY.min && y < safeZoneY.max &&
                         x > safeZoneMargin && x < WIDTH - safeZoneMargin;

      if (!inSafeZone || attempt === attempts - 1) break;
    }

    const size = minSize + random() * (maxSize - minSize);
    const opacity = minOpacity + random() * (maxOpacity - minOpacity);
    const color = dustColors[Math.floor(random() * dustColors.length)];

    // Add some blur effect via filter for softer particles
    const blur = random() > 0.7 ? 'filter="url(#dustBlur)"' : '';

    particles += `
      <circle cx="${x!}" cy="${y!}" r="${size}" fill="${color}" opacity="${opacity}" ${blur}/>
    `;
  }

  return `
    <defs>
      <filter id="dustBlur" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
      </filter>
    </defs>
    ${particles}
  `;
}

/**
 * Escape XML special characters for SVG
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap text into lines based on character count
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
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Create SVG icon for CTA slides
 */
function createCtaIcon(ctaType: 'save' | 'share', color: string): string {
  if (ctaType === 'save') {
    // Bookmark icon
    return `
      <g transform="translate(${WIDTH / 2 - 40}, 700)">
        <path d="M0 0 h80 v100 l-40 -30 l-40 30 z" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round"/>
      </g>
    `;
  } else {
    // Share/arrow icon
    return `
      <g transform="translate(${WIDTH / 2 - 40}, 700)">
        <path d="M40 0 L80 40 L60 40 L60 100 L20 100 L20 40 L0 40 Z" fill="none" stroke="${color}" stroke-width="4" stroke-linejoin="round"/>
      </g>
    `;
  }
}

/**
 * Render a single carousel slide
 */
export async function renderCarouselSlide(
  slide: CarouselSlide,
  palette: Palette,
  outputPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const typo = TYPOGRAPHY[slide.type];
    const lines = wrapText(slide.bodyText, typo.maxCharsPerLine);

    // Calculate total text height for vertical centering
    const totalTextHeight = lines.length * typo.fontSize * typo.lineHeight;

    // Build SVG elements
    let svgElements = '';

    // Add large watermark number for value slides
    if (slide.type === 'value' && slide.valueNumber) {
      svgElements += `
        <text x="${WIDTH - 120}" y="${HEIGHT - 200}"
          text-anchor="end"
          font-family="Georgia, serif"
          font-size="${TYPOGRAPHY.value.numberFontSize}"
          font-weight="bold"
          fill="${palette.textColorPrimary}"
          opacity="${TYPOGRAPHY.value.numberOpacity}">${slide.valueNumber}</text>
      `;
    }

    // Add CTA icon
    if (slide.type === 'cta' && slide.ctaType) {
      svgElements += createCtaIcon(slide.ctaType, palette.textColorPrimary);
    }

    // Create text elements with drop shadow
    const startY = typo.yPosition - totalTextHeight / 2 + typo.fontSize;

    for (let i = 0; i < lines.length; i++) {
      const y = startY + i * typo.fontSize * typo.lineHeight;
      const line = escapeXml(lines[i]);

      // Drop shadow
      svgElements += `
        <text x="${typo.xPosition + 2}" y="${y + 2}"
          text-anchor="${typo.textAnchor}"
          font-family="Georgia, serif"
          font-size="${typo.fontSize}"
          font-weight="bold"
          font-style="italic"
          fill="rgba(0,0,0,0.15)">${line}</text>
      `;

      // Main text
      svgElements += `
        <text x="${typo.xPosition}" y="${y}"
          text-anchor="${typo.textAnchor}"
          font-family="Georgia, serif"
          font-size="${typo.fontSize}"
          font-weight="bold"
          font-style="italic"
          fill="${palette.textColorPrimary}">${line}</text>
      `;
    }

    // Add slide number indicator at bottom (small dots)
    const dotRadius = 6;
    const dotSpacing = 24;
    const totalDotsWidth = 8 * dotSpacing - dotSpacing + dotRadius * 2;
    const dotsStartX = (WIDTH - totalDotsWidth) / 2;
    const dotsY = HEIGHT - 120;

    for (let i = 0; i < 8; i++) {
      const isActive = i === slide.slideNumber - 1;
      const cx = dotsStartX + i * dotSpacing + dotRadius;
      svgElements += `
        <circle cx="${cx}" cy="${dotsY}" r="${dotRadius}"
          fill="${palette.textColorPrimary}"
          opacity="${isActive ? 1 : 0.3}"/>
      `;
    }

    // Generate dust particles
    const dustParticles = generateDustParticles(palette.dustColors, slide.slideNumber);

    const svgOverlay = `
<svg width="${WIDTH}" height="${HEIGHT}">
  ${dustParticles}
  ${svgElements}
</svg>`;

    // Load background and composite text
    const backgroundPath = path.resolve(palette.backgroundVideo);

    await sharp(backgroundPath)
      .resize(WIDTH, HEIGHT, { fit: 'cover' })
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`Rendered slide ${slide.slideNumber}: ${outputPath}`);
    return { success: true };
  } catch (error) {
    console.error(`Render failed for slide ${slide.slideNumber}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Render all 8 carousel slides
 */
export async function renderFullCarousel(
  content: CarouselContent,
  palette: Palette,
  outputDir: string,
  carouselId: string
): Promise<{ success: boolean; slidePaths?: string[]; error?: string }> {
  try {
    // Ensure output directory exists
    const carouselDir = path.join(outputDir, 'carousels', carouselId);
    if (!fs.existsSync(carouselDir)) {
      fs.mkdirSync(carouselDir, { recursive: true });
    }

    const slidePaths: string[] = [];

    for (const slide of content.slides) {
      const outputPath = path.join(carouselDir, `slide_${slide.slideNumber}.png`);
      const result = await renderCarouselSlide(slide, palette, outputPath);

      if (!result.success) {
        return { success: false, error: `Failed to render slide ${slide.slideNumber}: ${result.error}` };
      }

      slidePaths.push(outputPath);
    }

    console.log(`Rendered full carousel: ${carouselDir}`);
    return { success: true, slidePaths };
  } catch (error) {
    console.error('Full carousel render failed:', error);
    return { success: false, error: String(error) };
  }
}
