/**
 * Database Client
 */

import pg from 'pg';
import { config } from '../config.js';
import type { Post, PostStatus, Platform, PostFormat, Settings, QuoteType } from '../types.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

// ==================== POSTS ====================

export async function createPost(data: {
  platform: Platform;
  format: PostFormat;
  paletteId: string;
  scheduledAt: Date;
}): Promise<Post> {
  const result = await pool.query(
    `INSERT INTO posts (platform, format, palette_id, scheduled_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.platform, data.format, data.paletteId, data.scheduledAt]
  );
  return mapPost(result.rows[0]);
}

export async function getPost(id: string): Promise<Post | null> {
  const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return result.rows[0] ? mapPost(result.rows[0]) : null;
}

export async function updatePost(
  id: string,
  data: Partial<{
    status: PostStatus;
    quote: string;
    quoteType: QuoteType;
    caption: string;
    hashtags: string[];
    altText: string;
    assetPath: string;
    assetUrl: string;
    platformPostId: string;
    publishedManually: boolean;
    error: string;
  }>
): Promise<Post | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.status !== undefined) { sets.push(`status = $${i++}`); values.push(data.status); }
  if (data.quote !== undefined) { sets.push(`quote = $${i++}`); values.push(data.quote); }
  if (data.quoteType !== undefined) { sets.push(`quote_type = $${i++}`); values.push(data.quoteType); }
  if (data.caption !== undefined) { sets.push(`caption = $${i++}`); values.push(data.caption); }
  if (data.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); values.push(data.hashtags); }
  if (data.altText !== undefined) { sets.push(`alt_text = $${i++}`); values.push(data.altText); }
  if (data.assetPath !== undefined) { sets.push(`asset_path = $${i++}`); values.push(data.assetPath); }
  if (data.assetUrl !== undefined) { sets.push(`asset_url = $${i++}`); values.push(data.assetUrl); }
  if (data.platformPostId !== undefined) { sets.push(`platform_post_id = $${i++}`); values.push(data.platformPostId); }
  if (data.publishedManually !== undefined) { sets.push(`published_manually = $${i++}`); values.push(data.publishedManually); }
  if (data.error !== undefined) { sets.push(`error = $${i++}`); values.push(data.error); }

  if (sets.length === 0) return getPost(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE posts SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ? mapPost(result.rows[0]) : null;
}

export async function getPostsForDate(date: string, timezone: string): Promise<Post[]> {
  const result = await pool.query(
    `SELECT * FROM posts
     WHERE DATE(scheduled_at AT TIME ZONE $2) = $1
     ORDER BY scheduled_at`,
    [date, timezone]
  );
  return result.rows.map(mapPost);
}

export async function getRecentPalettes(limit = 10): Promise<string[]> {
  const result = await pool.query(
    `SELECT palette_id FROM posts ORDER BY scheduled_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(r => r.palette_id);
}

export async function getPendingPosts(): Promise<Post[]> {
  const result = await pool.query(
    `SELECT * FROM posts
     WHERE status = 'pending'
       AND scheduled_at <= NOW() + INTERVAL '30 minutes'
     ORDER BY scheduled_at`
  );
  return result.rows.map(mapPost);
}

export async function getReadyToPublish(platform: Platform): Promise<Post[]> {
  const result = await pool.query(
    `SELECT * FROM posts
     WHERE platform = $1
       AND status = 'generated'
       AND scheduled_at <= NOW()
     ORDER BY scheduled_at`,
    [platform]
  );
  return result.rows.map(mapPost);
}

export async function getTikTokQueue(): Promise<Post[]> {
  const result = await pool.query(
    `SELECT * FROM posts
     WHERE platform = 'tiktok'
       AND status = 'generated'
     ORDER BY scheduled_at`
  );
  return result.rows.map(mapPost);
}

export async function getInstagramVideosAwaitingPublish(): Promise<Post[]> {
  const result = await pool.query(
    `SELECT * FROM posts
     WHERE platform = 'instagram'
       AND format = 'video'
       AND status = 'awaiting_manual_publish'
     ORDER BY scheduled_at`
  );
  return result.rows.map(mapPost);
}

export async function markAsManuallyPublished(id: string): Promise<Post | null> {
  const result = await pool.query(
    `UPDATE posts
     SET status = 'published', published_manually = TRUE
     WHERE id = $1 AND status = 'awaiting_manual_publish'
     RETURNING *`,
    [id]
  );
  return result.rows[0] ? mapPost(result.rows[0]) : null;
}

export async function postsExistForDate(date: string, timezone: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT EXISTS(
      SELECT 1 FROM posts WHERE DATE(scheduled_at AT TIME ZONE $2) = $1
    ) as exists`,
    [date, timezone]
  );
  return result.rows[0].exists;
}

export async function getPostStats(): Promise<{
  published: number;
  scheduled: number;
  failed: number;
  awaitingPublish: number;
}> {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'published') as published,
      COUNT(*) FILTER (WHERE status IN ('pending', 'generating', 'generated')) as scheduled,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'awaiting_manual_publish') as awaiting_publish
    FROM posts
  `);
  return {
    published: parseInt(result.rows[0].published),
    scheduled: parseInt(result.rows[0].scheduled),
    failed: parseInt(result.rows[0].failed),
    awaitingPublish: parseInt(result.rows[0].awaiting_publish),
  };
}

// ==================== QUOTE HISTORY ====================

export async function addQuoteToHistory(quote: string, type: QuoteType, postId?: string): Promise<void> {
  await pool.query(
    `INSERT INTO quote_history (quote_text, quote_type, post_id) VALUES ($1, $2, $3)`,
    [quote, type, postId || null]
  );
}

export async function getRecentQuotes(days = 60): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT quote_text FROM quote_history
     WHERE created_at > NOW() - INTERVAL '${days} days'`
  );
  return result.rows.map(r => r.quote_text);
}

// ==================== SETTINGS ====================

export async function getSettings(): Promise<Settings> {
  const result = await pool.query('SELECT * FROM settings WHERE id = 1');
  if (result.rows.length === 0) {
    return {
      timezone: 'Europe/Lisbon',
      dailyPostCount: 5,
      postWindowStart: '09:00',
      postWindowEnd: '23:00',
      instagramEnabled: true,
      tiktokEnabled: true,
      autoPublishInstagram: true,
    };
  }
  const row = result.rows[0];
  return {
    timezone: row.timezone,
    dailyPostCount: row.daily_post_count,
    postWindowStart: row.post_window_start,
    postWindowEnd: row.post_window_end,
    instagramEnabled: row.instagram_enabled,
    tiktokEnabled: row.tiktok_enabled,
    autoPublishInstagram: row.auto_publish_instagram,
  };
}

// ==================== INSTAGRAM ====================

export async function getInstagramCredentials(): Promise<{
  accessToken: string;
  userId: string;
  pageId: string;
} | null> {
  const result = await pool.query('SELECT * FROM instagram_credentials WHERE id = 1');
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    accessToken: row.access_token,
    userId: row.user_id,
    pageId: row.page_id,
  };
}

export async function saveInstagramCredentials(data: {
  accessToken: string;
  userId: string;
  pageId: string;
  username?: string;
  expiresAt?: Date;
}): Promise<void> {
  await pool.query(
    `INSERT INTO instagram_credentials (id, access_token, user_id, page_id, username, expires_at)
     VALUES (1, $1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       access_token = $1, user_id = $2, page_id = $3, username = $4, expires_at = $5`,
    [data.accessToken, data.userId, data.pageId, data.username || null, data.expiresAt || null]
  );
}

// ==================== VIRAL VIDEOS ====================

export interface ViralVideo {
  id: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  quote?: string;
  mood?: string;
  sceneId?: string;
  assetPath?: string;
  assetUrl?: string;
  error?: string;
  scheduledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function createViralVideo(data: {
  status?: string;
  scheduledAt?: Date;
}): Promise<ViralVideo> {
  const result = await pool.query(
    `INSERT INTO viral_videos (status, scheduled_at)
     VALUES ($1, $2)
     RETURNING *`,
    [data.status || 'pending', data.scheduledAt || new Date()]
  );
  return mapViralVideo(result.rows[0]);
}

export async function getViralVideo(id: string): Promise<ViralVideo | null> {
  const result = await pool.query('SELECT * FROM viral_videos WHERE id = $1', [id]);
  return result.rows[0] ? mapViralVideo(result.rows[0]) : null;
}

export async function updateViralVideo(
  id: string,
  data: Partial<{
    status: string;
    quote: string;
    mood: string;
    sceneId: string;
    assetPath: string;
    assetUrl: string;
    error: string;
  }>
): Promise<ViralVideo | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.status !== undefined) { sets.push(`status = $${i++}`); values.push(data.status); }
  if (data.quote !== undefined) { sets.push(`quote = $${i++}`); values.push(data.quote); }
  if (data.mood !== undefined) { sets.push(`mood = $${i++}`); values.push(data.mood); }
  if (data.sceneId !== undefined) { sets.push(`scene_id = $${i++}`); values.push(data.sceneId); }
  if (data.assetPath !== undefined) { sets.push(`asset_path = $${i++}`); values.push(data.assetPath); }
  if (data.assetUrl !== undefined) { sets.push(`asset_url = $${i++}`); values.push(data.assetUrl); }
  if (data.error !== undefined) { sets.push(`error = $${i++}`); values.push(data.error); }

  if (sets.length === 0) return getViralVideo(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);
  const result = await pool.query(
    `UPDATE viral_videos SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ? mapViralVideo(result.rows[0]) : null;
}

export async function getViralVideos(limit = 20): Promise<ViralVideo[]> {
  const result = await pool.query(
    `SELECT * FROM viral_videos ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapViralVideo);
}

export async function getViralVideoQueue(): Promise<ViralVideo[]> {
  const result = await pool.query(
    `SELECT * FROM viral_videos
     WHERE status = 'ready'
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapViralVideo);
}

/**
 * Create a post record for a viral video, ready for manual publish
 */
export async function createViralPost(data: {
  quote: string;
  quoteType: QuoteType;
  caption: string;
  hashtags: string[];
  assetPath: string;
  assetUrl: string;
  viralVideoId?: string;
}): Promise<Post> {
  const result = await pool.query(
    `INSERT INTO posts (
      platform, format, palette_id, scheduled_at, status,
      quote, quote_type, caption, hashtags, alt_text, asset_path, asset_url
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      'instagram',
      'video',
      'viral', // Special palette ID for viral videos
      new Date(), // Scheduled now
      'awaiting_manual_publish',
      data.quote,
      data.quoteType,
      data.caption,
      data.hashtags,
      `AI-generated viral video with quote: "${data.quote.slice(0, 100)}"`,
      data.assetPath,
      data.assetUrl,
    ]
  );
  return mapPost(result.rows[0]);
}

// ==================== CAROUSELS ====================

export interface Carousel {
  id: string;
  status: 'pending' | 'generating' | 'ready' | 'published' | 'failed';
  paletteId?: string;
  topic?: string;
  content?: unknown;
  slidePaths?: string[];
  caption?: string;
  hashtags: string[];
  error?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function createCarousel(data: {
  status?: string;
}): Promise<Carousel> {
  const result = await pool.query(
    `INSERT INTO carousels (status)
     VALUES ($1)
     RETURNING *`,
    [data.status || 'pending']
  );
  return mapCarousel(result.rows[0]);
}

export async function getCarousel(id: string): Promise<Carousel | null> {
  const result = await pool.query('SELECT * FROM carousels WHERE id = $1', [id]);
  return result.rows[0] ? mapCarousel(result.rows[0]) : null;
}

export async function updateCarousel(
  id: string,
  data: Partial<{
    status: string;
    paletteId: string;
    topic: string;
    content: unknown;
    slidePaths: string[];
    caption: string;
    hashtags: string[];
    error: string;
  }>
): Promise<Carousel | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.status !== undefined) { sets.push(`status = $${i++}`); values.push(data.status); }
  if (data.paletteId !== undefined) { sets.push(`palette_id = $${i++}`); values.push(data.paletteId); }
  if (data.topic !== undefined) { sets.push(`topic = $${i++}`); values.push(data.topic); }
  if (data.content !== undefined) { sets.push(`content = $${i++}`); values.push(JSON.stringify(data.content)); }
  if (data.slidePaths !== undefined) { sets.push(`slide_paths = $${i++}`); values.push(data.slidePaths); }
  if (data.caption !== undefined) { sets.push(`caption = $${i++}`); values.push(data.caption); }
  if (data.hashtags !== undefined) { sets.push(`hashtags = $${i++}`); values.push(data.hashtags); }
  if (data.error !== undefined) { sets.push(`error = $${i++}`); values.push(data.error); }

  if (sets.length === 0) return getCarousel(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);
  const result = await pool.query(
    `UPDATE carousels SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return result.rows[0] ? mapCarousel(result.rows[0]) : null;
}

export async function getCarousels(limit = 20): Promise<Carousel[]> {
  const result = await pool.query(
    `SELECT * FROM carousels ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapCarousel);
}

export async function getCarouselQueue(): Promise<Carousel[]> {
  const result = await pool.query(
    `SELECT * FROM carousels
     WHERE status = 'ready'
     ORDER BY created_at DESC`
  );
  return result.rows.map(mapCarousel);
}

export async function markCarouselAsPublished(id: string): Promise<Carousel | null> {
  const result = await pool.query(
    `UPDATE carousels
     SET status = 'published', published_at = NOW()
     WHERE id = $1 AND status = 'ready'
     RETURNING *`,
    [id]
  );
  return result.rows[0] ? mapCarousel(result.rows[0]) : null;
}

export async function getRecentCarouselPalettes(limit = 5): Promise<string[]> {
  const result = await pool.query(
    `SELECT palette_id FROM carousels
     WHERE palette_id IS NOT NULL
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows.map(r => r.palette_id);
}

function mapCarousel(row: Record<string, unknown>): Carousel {
  return {
    id: row.id as string,
    status: row.status as 'pending' | 'generating' | 'ready' | 'published' | 'failed',
    paletteId: row.palette_id as string | undefined,
    topic: row.topic as string | undefined,
    content: row.content as unknown,
    slidePaths: row.slide_paths as string[] | undefined,
    caption: row.caption as string | undefined,
    hashtags: (row.hashtags as string[]) || [],
    error: row.error as string | undefined,
    publishedAt: row.published_at ? new Date(row.published_at as string) : undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function mapViralVideo(row: Record<string, unknown>): ViralVideo {
  return {
    id: row.id as string,
    status: row.status as 'pending' | 'generating' | 'ready' | 'failed',
    quote: row.quote as string | undefined,
    mood: row.mood as string | undefined,
    sceneId: row.scene_id as string | undefined,
    assetPath: row.asset_path as string | undefined,
    assetUrl: row.asset_url as string | undefined,
    error: row.error as string | undefined,
    scheduledAt: new Date(row.scheduled_at as string),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// ==================== HELPERS ====================

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as string,
    platform: row.platform as Platform,
    format: row.format as PostFormat,
    paletteId: row.palette_id as string,
    scheduledAt: new Date(row.scheduled_at as string),
    status: row.status as PostStatus,
    quote: row.quote as string,
    quoteType: row.quote_type as QuoteType | undefined,
    caption: row.caption as string,
    hashtags: (row.hashtags as string[]) || [],
    altText: row.alt_text as string,
    assetPath: row.asset_path as string | undefined,
    assetUrl: row.asset_url as string | undefined,
    platformPostId: row.platform_post_id as string | undefined,
    publishedManually: row.published_manually as boolean | undefined,
    error: row.error as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export { pool };
