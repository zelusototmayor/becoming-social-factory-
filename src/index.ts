/**
 * Becoming Social Content Factory
 *
 * Automated content creation and publishing for Instagram and TikTok.
 */

import { config } from './config.js';
import * as scheduler from './scheduler/index.js';
import { startAdmin } from './admin/server.js';
import * as db from './db/index.js';

console.log('🚀 Starting Becoming Social Content Factory...');
console.log(`   Environment: ${config.nodeEnv}`);
console.log(`   Timezone: ${config.timezone}`);
console.log(`   Daily posts: ${config.dailyPostCount}`);

// Graceful shutdown
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n📴 Received ${signal}, shutting down...`);
  await scheduler.shutdown();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start
async function main() {
  try {
    // Check required config
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is required');
    }

    // Warnings
    if (!config.openaiApiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set - using fallback quotes');
    }
    if (!config.instagramAccessToken) {
      console.warn('⚠️  Instagram not configured - publishing disabled');
    }

    // Sync Instagram credentials from env to database
    if (config.instagramAccessToken && config.instagramUserId && config.instagramPageId) {
      const existingCreds = await db.getInstagramCredentials();
      if (!existingCreds || existingCreds.accessToken !== config.instagramAccessToken) {
        console.log('📱 Syncing Instagram credentials to database...');
        await db.saveInstagramCredentials({
          accessToken: config.instagramAccessToken,
          userId: config.instagramUserId,
          pageId: config.instagramPageId,
        });
        console.log('✅ Instagram credentials saved');
      }
    }

    // Initialize scheduler
    await scheduler.init();

    // Start admin dashboard
    startAdmin();

    console.log('\n✅ Factory running!');
    console.log('   Dashboard: http://localhost:' + config.adminPort);
    console.log('   Password: (set via ADMIN_PASSWORD env var)\n');

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

main();
