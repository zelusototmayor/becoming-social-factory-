/**
 * Configuration
 * Centralized config loaded from environment variables
 */

import 'dotenv/config';
import { z } from 'zod';

const configSchema = z.object({
  // Database
  databaseUrl: z.string().url(),

  // Redis
  redisHost: z.string().default('localhost'),
  redisPort: z.coerce.number().default(6379),
  redisPassword: z.string().optional(),

  // OpenAI
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default('gpt-4o'),

  // Runway (AI Video Generation) - Legacy, replaced by HeyGen
  runwayApiKey: z.string().optional(),

  // HeyGen (AI UGC Video Generation)
  heygenApiKey: z.string().optional(),

  // ElevenLabs (Voice Narration)
  elevenlabsApiKey: z.string().optional(),

  // Instagram
  metaAppId: z.string().optional(),
  metaAppSecret: z.string().optional(),
  instagramAccessToken: z.string().optional(),
  instagramUserId: z.string().optional(),
  instagramPageId: z.string().optional(),

  // Admin
  adminPassword: z.string().default('becoming2024!'),
  jwtSecret: z.string().default('change-me-in-production'),
  adminPort: z.coerce.number().default(3001),

  // Scheduling
  timezone: z.string().default('Europe/Lisbon'),
  dailyPostCount: z.coerce.number().min(1).max(10).default(5),
  postWindowStart: z.string().default('09:00'),
  postWindowEnd: z.string().default('23:00'),

  // Storage
  outputDir: z.string().default('./output'),
  storageUrlBase: z.string().optional(),

  // General
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
});

function loadConfig() {
  const result = configSchema.safeParse({
    databaseUrl: process.env.DATABASE_URL,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT,
    redisPassword: process.env.REDIS_PASSWORD,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    runwayApiKey: process.env.RUNWAY_API_KEY,
    heygenApiKey: process.env.HEYGEN_API_KEY,
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    metaAppId: process.env.META_APP_ID,
    metaAppSecret: process.env.META_APP_SECRET,
    instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
    instagramUserId: process.env.INSTAGRAM_USER_ID,
    instagramPageId: process.env.INSTAGRAM_PAGE_ID,
    adminPassword: process.env.ADMIN_PASSWORD,
    jwtSecret: process.env.JWT_SECRET,
    adminPort: process.env.ADMIN_PORT,
    timezone: process.env.TIMEZONE,
    dailyPostCount: process.env.DAILY_POST_COUNT,
    postWindowStart: process.env.POST_WINDOW_START,
    postWindowEnd: process.env.POST_WINDOW_END,
    outputDir: process.env.OUTPUT_DIR,
    storageUrlBase: process.env.STORAGE_URL_BASE,
    nodeEnv: process.env.NODE_ENV,
  });

  if (!result.success) {
    console.error('❌ Invalid configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
