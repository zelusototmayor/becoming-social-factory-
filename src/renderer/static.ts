/**
 * Static Image Renderer
 *
 * Renders quote images using sharp with SVG text overlay.
 * Template-locked: only the quote text changes.
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { template } from '../template.js';
import type { Palette } from '../types.js';

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
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length >= maxLines) {
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate font size based on text length
 */
function calculateFontSize(text: string, baseFontSize: number, minFontSize: number): number {
  const length = text.length;
  // Reduce font size for longer text
  if (length > 80) return minFontSize;
  if (length > 60) return Math.floor(baseFontSize * 0.85);
  if (length > 40) return Math.floor(baseFontSize * 0.95);
  return baseFontSize;
}

/**
 * Render static image
 */
export async function renderStatic(options: {
  quote: string;
  palette: Palette;
  outputPath: string;
}): Promise<{ success: boolean; error?: string }> {
  const { quote, palette, outputPath } = options;
  const { layout, typography } = template;
  const { static: staticLayout } = layout;

  try {
    // Calculate font size and wrap text
    const fontSize = calculateFontSize(quote, typography.baseFontSize, typography.minFontSize);
    // Shorter lines to ensure text doesn't overflow - ~28 chars per line at base size
    const maxCharsPerLine = Math.floor(28 * (typography.baseFontSize / fontSize));
    const lines = wrapText(quote, maxCharsPerLine, staticLayout.quote.maxLines);

    console.log(`Rendering: fontSize=${fontSize}px, lines=${lines.length}`);

    // Calculate text positioning - position at top with padding
    const lineHeight = fontSize * staticLayout.quote.lineHeight;
    const padding = 60;  // Side padding
    const startY = 140 + fontSize;  // Start slightly lower, closer to logo
    const centerX = staticLayout.width / 2;

    // Create SVG text overlay with drop shadow for better visibility
    const textElements = lines.map((line, i) => {
      const y = startY + i * lineHeight;
      // Add subtle shadow for depth
      const shadow = `<text x="${centerX + 2}" y="${y + 2}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" font-style="italic" fill="rgba(0,0,0,0.15)">${escapeXml(line)}</text>`;
      const text = `<text x="${centerX}" y="${y}" text-anchor="middle" font-family="Georgia, serif" font-size="${fontSize}" font-weight="bold" font-style="italic" fill="${palette.textColorPrimary}">${escapeXml(line)}</text>`;
      return shadow + '\n    ' + text;
    }).join('\n    ');

    const svgOverlay = `
<svg width="${staticLayout.width}" height="${staticLayout.height}">
    ${textElements}
</svg>`;

    // Load background and composite text
    const backgroundPath = path.resolve(palette.background);

    await sharp(backgroundPath)
      .resize(staticLayout.width, staticLayout.height, { fit: 'cover' })
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`Rendered: ${outputPath}`);
    return { success: true };
  } catch (error) {
    console.error('Render failed:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if quote fits the template (always returns true for sharp renderer)
 */
export function checkQuoteFit(quote: string): boolean {
  // With sharp renderer, text will always fit (we wrap and resize)
  return quote.length <= 200;
}
