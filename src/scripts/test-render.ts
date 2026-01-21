/**
 * Test Static Image Rendering
 *
 * Run with: npm run render:test
 */

import * as path from 'path';
import * as fs from 'fs';
import { renderStatic } from '../renderer/static.js';
import { template, getPalette } from '../template.js';

async function main() {
  console.log('=== Static Image Render Test ===\n');

  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Test quotes of varying lengths
  const testQuotes = [
    'What small choice today would your future self thank you for?',
    'You don\'t have to be ready. You just have to begin.',
    'Growth isn\'t about perfection. It\'s about presence.',
  ];

  console.log(`Output directory: ${outputDir}`);
  console.log(`Testing ${template.palettes.length} palettes with ${testQuotes.length} quotes\n`);

  for (const palette of template.palettes) {
    console.log(`\nPalette: ${palette.name} (${palette.id})`);

    const quote = testQuotes[Math.floor(Math.random() * testQuotes.length)];
    const outputPath = path.join(outputDir, `test-${palette.id}.png`);

    console.log(`  Quote: "${quote.substring(0, 50)}..."`);
    console.log(`  Output: ${outputPath}`);

    const result = await renderStatic({
      quote,
      palette,
      outputPath,
    });

    if (result.success) {
      const stats = fs.statSync(outputPath);
      console.log(`  Status: SUCCESS (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.log(`  Status: FAILED - ${result.error}`);
    }
  }

  console.log('\n=== Render test complete! ===');
  console.log(`Check output folder: ${outputDir}`);
}

main().catch(console.error);
