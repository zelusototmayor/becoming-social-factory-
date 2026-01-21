/**
 * Test Live Publish to Instagram
 *
 * Run with: npx tsx src/scripts/test-publish.ts
 */

import { generateContent } from '../generator/index.js';
import { renderVideo } from '../renderer/video.js';
import { publishVideo, validateCredentials } from '../publisher/instagram.js';
import { template, selectPalette } from '../template.js';
import { config } from '../config.js';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  console.log('=== Live Instagram Publish Test ===\n');

  // Step 1: Check credentials
  console.log('Step 1: Validating Instagram credentials...');
  const credentials = {
    accessToken: config.instagramAccessToken || '',
    userId: config.instagramUserId || '',
    pageId: config.instagramPageId || '',
  };

  if (!credentials.accessToken || !credentials.userId) {
    console.error('Instagram credentials not configured in .env');
    process.exit(1);
  }

  const validation = await validateCredentials(credentials);
  if (!validation.valid) {
    console.error(`Credentials invalid: ${validation.error}`);
    process.exit(1);
  }
  console.log('Credentials: OK\n');

  // Step 2: Generate content
  console.log('Step 2: Generating content...');
  const content = await generateContent();
  console.log(`  Quote Type: ${content.quote.type}`);
  console.log(`  Quote: "${content.quote.text}"`);
  console.log(`  Caption: ${content.caption.substring(0, 80)}...`);
  console.log();

  // Step 3: Select palette and render video
  console.log('Step 3: Rendering video...');
  const palette = selectPalette([]);
  const timestamp = Date.now();
  const filename = `live-test-${timestamp}.mp4`;
  const outputPath = path.resolve(config.outputDir, filename);

  // Ensure output directory exists
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const renderResult = await renderVideo({
    quote: content.quote.text,
    quoteType: content.quote.type,
    palette,
    outputPath,
  });

  if (!renderResult.success) {
    console.error(`Render failed: ${renderResult.error}`);
    process.exit(1);
  }
  console.log(`  Video rendered: ${outputPath}`);
  console.log(`  Duration: ${renderResult.duration}s`);
  console.log();

  // Step 4: Build public URL
  const videoUrl = config.storageUrlBase
    ? `${config.storageUrlBase}${filename}`
    : null;

  if (!videoUrl) {
    console.error('STORAGE_URL_BASE not configured - cannot publish');
    console.log(`Video saved locally at: ${outputPath}`);
    console.log('Please upload to a public URL and publish manually.');
    process.exit(1);
  }

  console.log('Step 4: Public URL');
  console.log(`  URL: ${videoUrl}`);
  console.log();

  // Step 5: Verify file is accessible
  console.log('Step 5: Verifying public URL accessibility...');
  try {
    const checkRes = await fetch(videoUrl, { method: 'HEAD' });
    if (!checkRes.ok) {
      console.error(`File not accessible at URL (status ${checkRes.status})`);
      console.log('Make sure the output directory is served at STORAGE_URL_BASE');
      process.exit(1);
    }
    console.log('  URL accessible: OK\n');
  } catch (error) {
    console.error(`Cannot reach URL: ${error}`);
    console.log('Make sure the output directory is served at STORAGE_URL_BASE');
    process.exit(1);
  }

  // Step 6: Publish to Instagram
  console.log('Step 6: Publishing to Instagram...');
  const publishResult = await publishVideo(credentials, {
    videoUrl,
    caption: content.caption,
    hashtags: content.hashtags,
  });

  if (!publishResult.success) {
    console.error(`Publish failed: ${publishResult.error}`);
    process.exit(1);
  }

  console.log();
  console.log('=== SUCCESS ===');
  console.log(`Instagram Post ID: ${publishResult.postId}`);
  console.log(`Video URL: ${videoUrl}`);
}

main().catch(console.error);
