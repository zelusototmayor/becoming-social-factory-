/**
 * Test Quote Generation
 *
 * Run with: npm run generate:test
 */

import { generateQuote, generateContent } from '../generator/index.js';
import { config } from '../config.js';

async function main() {
  console.log('=== Quote Generation Test ===\n');

  if (!config.openaiApiKey) {
    console.log('OpenAI API key not configured - using fallback quotes\n');
  } else {
    console.log('OpenAI API key configured - will use AI generation\n');
  }

  // Test 1: Generate single quote
  console.log('Test 1: Generate single quote');
  const quote1 = await generateQuote();
  console.log(`  Type: ${quote1.type}`);
  console.log(`  Text: "${quote1.text}"`);
  console.log();

  // Test 2: Generate with recent quotes (anti-repetition)
  console.log('Test 2: Generate with anti-repetition');
  const quote2 = await generateQuote([quote1.text]);
  console.log(`  Type: ${quote2.type}`);
  console.log(`  Text: "${quote2.text}"`);
  console.log();

  // Test 3: Generate full content (quote + metadata)
  console.log('Test 3: Generate full content (quote + caption + hashtags)');
  const content = await generateContent();
  console.log(`  Quote Type: ${content.quote.type}`);
  console.log(`  Quote: "${content.quote.text}"`);
  console.log(`  Caption: ${content.caption.substring(0, 100)}...`);
  console.log(`  Hashtags: #${content.hashtags.slice(0, 5).join(' #')}...`);
  console.log(`  Alt Text: ${content.altText}`);
  console.log();

  console.log('=== All tests passed! ===');
}

main().catch(console.error);
