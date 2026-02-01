/**
 * Test HeyGen Video Generation
 *
 * Run with: npx tsx src/scripts/test-heygen.ts
 */

import { generateHeyGenVideo, checkHeyGenStatus, testConnection, listAvatars } from '../heygen/index.js';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('               HeyGen UGC Video Generator Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Check status
  console.log('📋 Step 1: Checking system status...\n');
  const status = await checkHeyGenStatus();
  console.log('Status:', JSON.stringify(status, null, 2));

  if (!status.ready) {
    console.log('\n⚠️  HeyGen is not ready. Issues:');
    status.issues.forEach((issue) => console.log(`   - ${issue}`));
    console.log('\n📝 To set up HeyGen:');
    console.log('   1. Sign up at https://heygen.com (Creator plan $29/mo)');
    console.log('   2. Get your API key from Settings > API');
    console.log('   3. Set HEYGEN_API_KEY in your .env file');
    console.log('   4. Run this test again\n');
    return;
  }

  // Step 2: Test connection
  console.log('\n📋 Step 2: Testing API connection...\n');
  const connectionTest = await testConnection();
  console.log('Connection:', connectionTest);

  if (!connectionTest.success) {
    console.log('\n❌ API connection failed:', connectionTest.message);
    return;
  }

  // Step 3: List available avatars
  console.log('\n📋 Step 3: Listing available avatars...\n');
  const avatars = await listAvatars();
  if (avatars.error) {
    console.log('Error listing avatars:', avatars.error);
  } else {
    console.log(`Found ${avatars.data.avatars.length} avatars. First 5:`);
    avatars.data.avatars.slice(0, 5).forEach((a) => {
      console.log(`   - ${a.avatar_id}: ${a.avatar_name} (${a.gender})`);
    });
  }

  // Step 4: Generate a test video
  console.log('\n📋 Step 4: Generating test video...\n');
  console.log('This may take 2-5 minutes. Please wait...\n');

  const result = await generateHeyGenVideo({
    outputDir: './output/test',
    filename: `test_heygen_${Date.now()}.mp4`,
    theme: 'anxiety-management',
    onProgress: (data) => {
      console.log(`   [${data.stage}] ${data.message}`);
    },
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (result.success) {
    console.log('✅ SUCCESS! Video generated:');
    console.log(`   Path: ${result.outputPath}`);
    console.log(`   Duration: ${result.duration}s`);
    console.log(`   Avatar: ${result.avatar?.name}`);
    console.log(`   Theme: ${result.theme}`);
    console.log(`   Template: ${result.script?.template}`);
    console.log(`\n   Caption: ${result.caption}`);
    console.log(`   Hashtags: ${result.hashtags?.join(' ')}`);
    console.log(`\n   Script:\n   "${result.script?.fullText}"`);
  } else {
    console.log('❌ FAILED:', result.error);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
