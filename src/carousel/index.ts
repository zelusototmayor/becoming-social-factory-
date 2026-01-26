/**
 * Carousel Generator
 *
 * Main orchestrator for generating TikTok carousels.
 * Creates 8-slide carousel posts for the growth/self-improvement niche.
 */

import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { selectPalette } from '../template.js';
import * as db from '../db/index.js';
import { generateCarouselContent } from './contentGenerator.js';
import { renderFullCarousel } from './slideRenderer.js';
import type { CarouselResult, CtaType } from './types.js';

// Track last CTA type to alternate
let lastCtaType: CtaType = 'share';

/**
 * Get the next CTA type (alternates between save and share)
 */
function getNextCtaType(): CtaType {
  lastCtaType = lastCtaType === 'save' ? 'share' : 'save';
  return lastCtaType;
}

/**
 * Generate a complete carousel
 */
export async function generateCarousel(options?: {
  outputDir?: string;
  onProgress?: (stage: string, data: unknown) => void;
}): Promise<CarouselResult> {
  const outputDir = options?.outputDir || config.outputDir;
  const onProgress = options?.onProgress || (() => {});
  const carouselId = uuidv4();

  console.log(`\nStarting carousel generation: ${carouselId}`);

  try {
    // Create carousel record in database
    onProgress('creating_record', { carouselId });
    const carousel = await db.createCarousel({ status: 'generating' });
    const dbCarouselId = carousel.id;

    // Select palette (respecting anti-repetition)
    onProgress('selecting_palette', {});
    const recentPalettes = await db.getRecentCarouselPalettes(5);
    const palette = selectPalette(recentPalettes);
    console.log(`Selected palette: ${palette.name} (${palette.id})`);

    await db.updateCarousel(dbCarouselId, { paletteId: palette.id });

    // Determine CTA type (alternating save/share)
    const ctaType = getNextCtaType();
    console.log(`CTA type: ${ctaType}`);

    // Generate content
    onProgress('generating_content', { ctaType });
    console.log('Generating carousel content...');
    const content = await generateCarouselContent(ctaType);
    console.log(`Generated topic: "${content.topic}"`);

    await db.updateCarousel(dbCarouselId, {
      topic: content.topic,
      content,
    });

    // Render slides
    onProgress('rendering_slides', { slideCount: 8 });
    console.log('Rendering slides...');
    const renderResult = await renderFullCarousel(content, palette, outputDir, dbCarouselId);

    if (!renderResult.success) {
      throw new Error(renderResult.error || 'Render failed');
    }

    // Build asset URLs
    const slidePaths = renderResult.slidePaths!;

    // Update database with final result
    await db.updateCarousel(dbCarouselId, {
      status: 'ready',
      slidePaths,
      caption: content.caption,
      hashtags: content.hashtags,
    });

    onProgress('complete', { carouselId: dbCarouselId });
    console.log(`\nCarousel generation complete: ${dbCarouselId}`);
    console.log(`Slides saved to: ${outputDir}/carousels/${dbCarouselId}/`);

    return {
      success: true,
      carouselId: dbCarouselId,
      slidePaths,
      content,
    };
  } catch (error) {
    console.error('Carousel generation failed:', error);

    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * Estimate cost for carousel generation
 */
export function estimateCarouselCost(): { gpt: number; total: number } {
  // GPT-4o pricing: ~$0.02-0.05 per carousel (1 call)
  const gpt = 0.03;
  return { gpt, total: gpt };
}

// CLI entry point for testing
if (process.argv[1]?.includes('carousel/index')) {
  generateCarousel()
    .then(result => {
      if (result.success) {
        console.log('\n=== Carousel Generated Successfully ===');
        console.log(`ID: ${result.carouselId}`);
        console.log(`Topic: ${result.content?.topic}`);
        console.log(`Slides: ${result.slidePaths?.length}`);
        console.log(`Caption: ${result.content?.caption?.slice(0, 100)}...`);
        console.log(`Hashtags: ${result.content?.hashtags?.join(', ')}`);
      } else {
        console.error('\n=== Carousel Generation Failed ===');
        console.error(result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
