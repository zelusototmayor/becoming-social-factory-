/**
 * Job Scheduler
 *
 * Uses BullMQ for reliable job processing.
 */

import { Queue, Worker, Job } from 'bullmq';
import * as path from 'path';
import { config } from '../config.js';
import * as db from '../db/index.js';
import { generateContent } from '../generator/index.js';
import { renderStatic, renderVideo, checkQuoteFit } from '../renderer/index.js';
import { publishImage, publishVideo } from '../publisher/instagram.js';
import { template, selectPalette, getPalette } from '../template.js';
import type { JobData, Platform } from '../types.js';

// Redis connection config for BullMQ
const connection = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword,
  maxRetriesPerRequest: null,
};

// Queues
const schedulerQueue = new Queue('scheduler', { connection });
const contentQueue = new Queue('content', { connection });
const renderQueue = new Queue('render', { connection });
const publishQueue = new Queue('publish', { connection });

// Workers
let schedulerWorker: Worker;
let contentWorker: Worker;
let renderWorker: Worker;
let publishWorker: Worker;

/**
 * Initialize scheduler
 */
export async function init(): Promise<void> {
  console.log('Initializing scheduler...');

  // Scheduler worker - creates daily posts
  schedulerWorker = new Worker('scheduler', async (job: Job) => {
    if (job.name === 'daily') {
      await scheduleDailyPosts();
    }
  }, { connection });

  // Content worker - generates quotes and metadata
  contentWorker = new Worker('content', async (job: Job<JobData>) => {
    await processContentJob(job.data.postId!);
  }, { connection, concurrency: 2 });

  // Render worker - creates images/videos
  renderWorker = new Worker('render', async (job: Job<JobData>) => {
    await processRenderJob(job.data.postId!);
  }, { connection, concurrency: 1 });

  // Publish worker - publishes to Instagram
  publishWorker = new Worker('publish', async (job: Job<JobData>) => {
    if (job.name === 'check') {
      await checkAndPublish();
    } else {
      await processPublishJob(job.data.postId!);
    }
  }, { connection, concurrency: 1 });

  // Error handlers
  [schedulerWorker, contentWorker, renderWorker, publishWorker].forEach(w => {
    w.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err.message));
    w.on('completed', (job) => console.log(`Job ${job.id} completed`));
  });

  // Schedule recurring jobs
  // Daily schedule at midnight
  await schedulerQueue.add('daily', {}, {
    repeat: { pattern: '0 0 * * *', tz: config.timezone },
    jobId: 'daily-schedule',
  });

  // Check for posts to publish every 5 minutes
  await publishQueue.add('check', {}, {
    repeat: { pattern: '*/5 * * * *' },
    jobId: 'publish-check',
  });

  console.log('Scheduler initialized');
}

/**
 * Schedule daily posts
 */
async function scheduleDailyPosts(): Promise<void> {
  const settings = await db.getSettings();

  // Get tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // Check idempotency
  if (await db.postsExistForDate(dateStr, settings.timezone)) {
    console.log(`Posts already exist for ${dateStr}`);
    return;
  }

  console.log(`Scheduling posts for ${dateStr}`);

  // Calculate post times
  const times = calculateTimes(
    settings.dailyPostCount,
    settings.postWindowStart,
    settings.postWindowEnd
  );

  // Get recent palettes for anti-repetition
  const recentPalettes = await db.getRecentPalettes(10);

  // Alternate between static and video formats for Instagram
  // This ensures a mix of content types throughout the day
  const formats: Array<'static' | 'video'> = [];
  const halfCount = Math.floor(times.length / 2);
  for (let i = 0; i < times.length; i++) {
    // Alternate: static, video, static, video, etc.
    formats.push(i % 2 === 0 ? 'static' : 'video');
  }

  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    const format = formats[i];
    const scheduledAt = new Date(`${dateStr}T${time}:00`);

    // Select palette
    const palette = selectPalette(recentPalettes);
    recentPalettes.unshift(palette.id);

    // Create Instagram post (static image or reel)
    if (settings.instagramEnabled) {
      const post = await db.createPost({
        platform: 'instagram',
        format,
        paletteId: palette.id,
        scheduledAt,
      });
      await contentQueue.add('generate', { postId: post.id });
    }

    // TikTok disabled for now - can be re-enabled when ready
    // if (settings.tiktokEnabled) {
    //   const post = await db.createPost({
    //     platform: 'tiktok',
    //     format: 'video',
    //     paletteId: palette.id,
    //     scheduledAt,
    //   });
    //   await contentQueue.add('generate', { postId: post.id });
    // }
  }

  console.log(`Scheduled ${times.length} Instagram posts (mixed static/video) for ${dateStr}`);
}

/**
 * Process content generation
 */
async function processContentJob(postId: string): Promise<void> {
  console.log(`Generating content for ${postId}`);

  await db.updatePost(postId, { status: 'generating' });

  try {
    const recentQuotes = await db.getRecentQuotes();

    // Generate quote with retry
    let content;
    let attempts = 0;
    do {
      content = await generateContent(recentQuotes);
      attempts++;
    } while (!checkQuoteFit(content.quote.text) && attempts < 5);

    if (!checkQuoteFit(content.quote.text)) {
      throw new Error('Could not generate quote that fits');
    }

    // Save to DB
    await db.updatePost(postId, {
      quote: content.quote.text,
      quoteType: content.quote.type,
      caption: content.caption,
      hashtags: content.hashtags,
      altText: content.altText,
    });

    await db.addQuoteToHistory(content.quote.text, content.quote.type, postId);

    // Queue render
    await renderQueue.add('render', { postId });

    console.log(`Content generated: "${content.quote.text.substring(0, 40)}..."`);
  } catch (error) {
    console.error(`Content generation failed:`, error);
    await db.updatePost(postId, { status: 'failed', error: String(error) });
    throw error;
  }
}

/**
 * Process rendering
 */
async function processRenderJob(postId: string): Promise<void> {
  console.log(`Rendering ${postId}`);

  const post = await db.getPost(postId);
  if (!post) throw new Error('Post not found');

  const palette = getPalette(post.paletteId);
  if (!palette) throw new Error('Palette not found');

  const outputDir = path.resolve(config.outputDir);
  const filename = `${postId}.${post.format === 'static' ? 'png' : 'mp4'}`;
  const outputPath = path.join(outputDir, filename);

  try {
    let result;
    if (post.format === 'static') {
      result = await renderStatic({ quote: post.quote, palette, outputPath });
    } else {
      result = await renderVideo({ quote: post.quote, palette, outputPath });
    }

    if (!result.success) {
      throw new Error(result.error);
    }

    // Build asset URL
    const assetUrl = config.storageUrlBase
      ? `${config.storageUrlBase}${filename}`
      : `file://${outputPath}`;

    await db.updatePost(postId, {
      status: 'generated',
      assetPath: outputPath,
      assetUrl,
    });

    console.log(`Rendered: ${outputPath}`);
  } catch (error) {
    console.error(`Render failed:`, error);
    await db.updatePost(postId, { status: 'failed', error: String(error) });
    throw error;
  }
}

/**
 * Check for posts ready to publish
 */
async function checkAndPublish(): Promise<void> {
  const settings = await db.getSettings();

  if (settings.instagramEnabled && settings.autoPublishInstagram) {
    const ready = await db.getReadyToPublish('instagram');
    for (const post of ready) {
      await publishQueue.add('publish', { postId: post.id });
    }
  }
}

/**
 * Process publishing
 */
async function processPublishJob(postId: string): Promise<void> {
  console.log(`Publishing ${postId}`);

  const post = await db.getPost(postId);
  if (!post || post.status !== 'generated') return;

  await db.updatePost(postId, { status: 'publishing' });

  try {
    const credentials = await db.getInstagramCredentials();
    if (!credentials) {
      throw new Error('Instagram credentials not configured');
    }

    if (!post.assetUrl || post.assetUrl.startsWith('file://')) {
      throw new Error('Asset must be uploaded to public URL');
    }

    let result;
    if (post.format === 'static') {
      result = await publishImage(credentials, {
        imageUrl: post.assetUrl,
        caption: post.caption,
        hashtags: post.hashtags,
      });
    } else {
      result = await publishVideo(credentials, {
        videoUrl: post.assetUrl,
        caption: post.caption,
        hashtags: post.hashtags,
      });
    }

    if (!result.success) {
      throw new Error(result.error);
    }

    await db.updatePost(postId, {
      status: 'published',
      platformPostId: result.postId,
    });

    console.log(`Published: ${result.postId}`);
  } catch (error) {
    console.error(`Publish failed:`, error);
    await db.updatePost(postId, { status: 'failed', error: String(error) });
    throw error;
  }
}

/**
 * Calculate evenly spaced times
 */
function calculateTimes(count: number, start: string, end: string): string[] {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const range = endMinutes - startMinutes;

  const times: string[] = [];
  const interval = count > 1 ? range / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    const minutes = Math.round(startMinutes + interval * i);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  return times;
}

/**
 * Manual trigger for testing
 */
export async function triggerDaily(): Promise<void> {
  await schedulerQueue.add('daily', {}, { jobId: `manual-${Date.now()}` });
}

export async function triggerContent(postId: string): Promise<void> {
  await contentQueue.add('generate', { postId });
}

/**
 * Get queue stats
 */
export async function getStats() {
  const getQueueStats = async (queue: Queue) => ({
    waiting: await queue.getWaitingCount(),
    active: await queue.getActiveCount(),
    completed: await queue.getCompletedCount(),
    failed: await queue.getFailedCount(),
  });

  return {
    scheduler: await getQueueStats(schedulerQueue),
    content: await getQueueStats(contentQueue),
    render: await getQueueStats(renderQueue),
    publish: await getQueueStats(publishQueue),
  };
}

/**
 * Shutdown
 */
export async function shutdown(): Promise<void> {
  console.log('Shutting down scheduler...');
  await Promise.all([
    schedulerWorker?.close(),
    contentWorker?.close(),
    renderWorker?.close(),
    publishWorker?.close(),
  ]);
  console.log('Scheduler stopped');
}
