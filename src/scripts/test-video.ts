/**
 * Test script for video rendering with improved animations
 */

import { renderVideo, checkFFmpeg } from '../renderer/video.js';
import { template } from '../template.js';
import type { QuoteType } from '../types.js';

// Test quotes for each type
const testCases: Array<{ quote: string; quoteType: QuoteType; paletteIndex: number }> = [
  {
    quote: "I am becoming the person who shows up, even when it's hard.",
    quoteType: 'manifesto',
    paletteIndex: 0  // Navy
  },
  {
    quote: "What would change if you trusted yourself more today?",
    quoteType: 'inquiry',
    paletteIndex: 1  // Peachy
  },
  {
    quote: "Small steps taken consistently become the path you're looking for.",
    quoteType: 'insight',
    paletteIndex: 2  // Terracotta
  }
];

async function testVideos() {
  console.log('=== Video Render Test (Improved Animations) ===\n');

  // Check FFmpeg first
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('FFmpeg not found! Please install FFmpeg to render videos.');
    process.exit(1);
  }
  console.log('FFmpeg: OK\n');

  for (const testCase of testCases) {
    const palette = template.palettes[testCase.paletteIndex];
    const outputPath = `./output/test-video-${testCase.quoteType}.mp4`;

    console.log(`\n--- ${testCase.quoteType.toUpperCase()} ---`);
    console.log(`Palette: ${palette.name} (${palette.id})`);
    console.log(`Quote: "${testCase.quote.substring(0, 50)}..."`);
    console.log(`Output: ${outputPath}`);

    const result = await renderVideo({
      quote: testCase.quote,
      quoteType: testCase.quoteType,
      palette,
      outputPath
    });

    if (result.success) {
      console.log(`Status: SUCCESS (${result.duration}s)`);
    } else {
      console.log(`Status: FAILED - ${result.error}`);
    }
  }

  console.log('\n=== Video test complete! ===');
  console.log('Check output folder: ./output/');
  console.log('\nGenerated videos:');
  console.log('  - test-video-manifesto.mp4');
  console.log('  - test-video-inquiry.mp4');
  console.log('  - test-video-insight.mp4');
}

testVideos().catch(console.error);
