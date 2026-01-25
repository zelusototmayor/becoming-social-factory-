/**
 * Test Viral Video V2 Pipeline
 *
 * Run with: npx tsx src/scripts/test-viral-v2.ts
 */

import { checkViralSystemStatus, generateViralVideo, estimateViralVideoCost, setupRemotionRenderer } from '../viral/index.js';

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('         VIRAL VIDEO V2 PIPELINE TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Check system status
  console.log('📋 Checking system status...\n');
  const status = await checkViralSystemStatus();

  console.log('System Components:');
  console.log(`  ✓ FFmpeg:      ${status.status.ffmpeg ? '✅ Available' : '❌ Missing'}`);
  console.log(`  ✓ Remotion:    ${status.status.remotion.available ? '✅ Available' : `❌ ${status.status.remotion.reason}`}`);
  console.log(`  ✓ Runway:      ${status.status.runway.available ? '✅ Available' : `❌ ${status.status.runway.reason}`}`);
  console.log(`  ✓ OpenAI:      ${status.status.openai ? '✅ Configured' : '❌ Missing API key'}`);
  console.log(`  ✓ ElevenLabs:  ${status.status.elevenlabs.available ? '✅ Configured' : `⚠️  ${status.status.elevenlabs.reason}`}`);
  console.log(`  ✓ Music:       ${status.status.music.available}/${status.status.music.total} tracks`);
  console.log();

  if (status.issues.length > 0) {
    console.log('⚠️  Issues:');
    status.issues.forEach(issue => console.log(`   - ${issue}`));
    console.log();
  }

  console.log(`System Ready: ${status.ready ? '✅ YES' : '❌ NO'}\n`);

  // Step 2: Show cost estimate
  const cost = estimateViralVideoCost();
  console.log('💰 Estimated Cost per Video:');
  console.log(`   Runway (10s):    $${cost.runway.toFixed(2)}`);
  console.log(`   OpenAI:          $${cost.openai.toFixed(2)}`);
  console.log(`   ElevenLabs:      $${cost.elevenlabs.toFixed(2)}`);
  console.log(`   ─────────────────────`);
  console.log(`   Total:           $${cost.total.toFixed(2)}`);
  console.log();

  if (!status.ready) {
    console.log('❌ System not ready. Please fix the issues above before generating videos.\n');
    process.exit(1);
  }

  // Step 3: Ask user if they want to proceed
  const args = process.argv.slice(2);
  const forceGenerate = args.includes('--generate');

  if (!forceGenerate) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('To generate a test video, run:');
    console.log('  npx tsx src/scripts/test-viral-v2.ts --generate');
    console.log('═══════════════════════════════════════════════════════════\n');
    return;
  }

  // Step 4: Generate video
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎬 Starting Video Generation...');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  const result = await generateViralVideo({
    onProgress: (stage, data) => {
      console.log(`   [Progress] Stage: ${stage}`);
      if (data.quote) console.log(`             Quote: "${data.quote.slice(0, 50)}..."`);
      if (data.mood) console.log(`             Mood: ${data.mood}`);
      if (data.hook) console.log(`             Hook: "${data.hook.text}" (${data.hook.pattern})`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log();
  console.log('═══════════════════════════════════════════════════════════');
  if (result.success) {
    console.log(`✅ VIDEO GENERATED SUCCESSFULLY`);
    console.log(`   Output: ${result.outputPath}`);
    console.log(`   Time:   ${elapsed}s`);
    if (result.config) {
      console.log(`   Quote:  "${result.config.quote.slice(0, 60)}..."`);
      console.log(`   Mood:   ${result.config.scene.mood}`);
    }
  } else {
    console.log(`❌ VIDEO GENERATION FAILED`);
    console.log(`   Error: ${result.error}`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
