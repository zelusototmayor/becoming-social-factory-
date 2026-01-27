/**
 * Admin Dashboard Server
 *
 * Simple Express server with embedded HTML dashboard.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as path from 'path';
import { config } from '../config.js';
import * as db from '../db/index.js';
import { getStats, triggerDaily, triggerContent, triggerViralVideo } from '../scheduler/index.js';
import { checkViralSystemStatus, estimateViralVideoCost } from '../viral/index.js';
import { generateCarousel, estimateCarouselCost } from '../carousel/index.js';
import archiver from 'archiver';
import * as fs from 'fs';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));

// Serve static output files
app.use('/assets', express.static(path.resolve(config.outputDir)));

const PASSWORD_HASH = bcrypt.hashSync(config.adminPassword, 10);
const COOKIE_NAME = 'session';

// Auth middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
}

// Login
app.post('/api/login', async (req, res) => {
  const { password } = req.body;

  if (!password || !bcrypt.compareSync(password, PASSWORD_HASH)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ admin: true }, config.jwtSecret, { expiresIn: '24h' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ success: true });
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

// Check auth status (public - returns whether user is logged in)
app.get('/api/auth-status', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.json({ authenticated: false });
  }
  try {
    jwt.verify(token, config.jwtSecret);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

// ==================== PUBLIC ENDPOINTS (no auth required) ====================

// Get posts for date (public, read-only)
app.get('/api/public/posts', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const settings = await db.getSettings();
  const posts = await db.getPostsForDate(date, settings.timezone);
  res.json({ posts, date });
});

// Get post statistics (public)
app.get('/api/public/stats', async (req, res) => {
  const stats = await db.getPostStats();
  res.json({ stats });
});

// Get Instagram videos awaiting publish (public, read-only)
app.get('/api/public/instagram-video-queue', async (req, res) => {
  const posts = await db.getInstagramVideosAwaitingPublish();
  res.json({ posts });
});

// Get TikTok queue (public, read-only)
app.get('/api/public/tiktok-queue', async (req, res) => {
  const posts = await db.getTikTokQueue();
  res.json({ posts });
});

// ==================== PROTECTED ENDPOINTS (auth required) ====================

// Get posts for date
app.get('/api/posts', requireAuth, async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const settings = await db.getSettings();
  const posts = await db.getPostsForDate(date, settings.timezone);
  res.json({ posts, date });
});

// Get TikTok queue
app.get('/api/tiktok-queue', requireAuth, async (req, res) => {
  const posts = await db.getTikTokQueue();
  res.json({ posts });
});

// Get Instagram video queue (awaiting manual publish)
app.get('/api/instagram-video-queue', requireAuth, async (req, res) => {
  const posts = await db.getInstagramVideosAwaitingPublish();
  res.json({ posts });
});

// Mark post as manually published
app.post('/api/posts/:id/mark-published', requireAuth, async (req, res) => {
  const post = await db.markAsManuallyPublished(req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found or not awaiting manual publish' });
  }
  res.json({ success: true, post });
});

// Get stats
app.get('/api/stats', requireAuth, async (req, res) => {
  const stats = await getStats();
  res.json({ stats });
});

// Trigger daily schedule
app.post('/api/trigger-daily', requireAuth, async (req, res) => {
  await triggerDaily();
  res.json({ success: true });
});

// Trigger content generation
app.post('/api/posts/:id/generate', requireAuth, async (req, res) => {
  await triggerContent(req.params.id);
  res.json({ success: true });
});

// ==================== VIRAL VIDEO ENDPOINTS ====================

// Get viral videos
app.get('/api/viral', requireAuth, async (req, res) => {
  const videos = await db.getViralVideos(20);
  const status = await checkViralSystemStatus();
  const cost = estimateViralVideoCost();
  res.json({ videos, systemStatus: status, costEstimate: cost });
});

// Get viral video queue (ready to post)
app.get('/api/viral/queue', requireAuth, async (req, res) => {
  const videos = await db.getViralVideoQueue();
  res.json({ videos });
});

// Trigger viral video generation (runs directly, not through queue)
app.post('/api/viral/generate', requireAuth, async (req, res) => {
  console.log('🎬 /api/viral/generate endpoint called');

  // Start generation in background
  triggerViralVideo().catch(error => {
    console.error('Viral video generation error:', error);
  });

  // Respond immediately
  res.json({ success: true, message: 'Viral video generation started' });
});

// Get viral system status
app.get('/api/viral/status', requireAuth, async (req, res) => {
  const status = await checkViralSystemStatus();
  const cost = estimateViralVideoCost();
  res.json({ status, cost });
});

// ==================== CAROUSEL ENDPOINTS ====================

// Get carousels
app.get('/api/carousels', requireAuth, async (req, res) => {
  const carousels = await db.getCarousels(20);
  const cost = estimateCarouselCost();
  res.json({ carousels, costEstimate: cost });
});

// Get carousel queue (ready to post)
app.get('/api/carousels/queue', requireAuth, async (req, res) => {
  const carousels = await db.getCarouselQueue();
  res.json({ carousels });
});

// Trigger carousel generation
app.post('/api/carousels/generate', requireAuth, async (req, res) => {
  console.log('Carousel /api/carousels/generate endpoint called');

  // Start generation in background
  generateCarousel().catch(error => {
    console.error('Carousel generation error:', error);
  });

  // Respond immediately
  res.json({ success: true, message: 'Carousel generation started' });
});

// Download carousel as ZIP
app.get('/api/carousels/:id/download', requireAuth, async (req, res) => {
  const carousel = await db.getCarousel(req.params.id);
  if (!carousel) {
    return res.status(404).json({ error: 'Carousel not found' });
  }

  if (!carousel.slidePaths || carousel.slidePaths.length === 0) {
    return res.status(400).json({ error: 'No slides available' });
  }

  try {
    // Set headers for ZIP download
    const filename = `carousel_${carousel.id.slice(0, 8)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    // Add each slide to the ZIP
    for (let i = 0; i < carousel.slidePaths.length; i++) {
      const slidePath = carousel.slidePaths[i];
      if (fs.existsSync(slidePath)) {
        archive.file(slidePath, { name: `slide_${i + 1}.png` });
      }
    }

    // Add caption.txt with caption and hashtags
    const captionContent = `${carousel.caption || ''}\n\n${(carousel.hashtags || []).map(h => '#' + h).join(' ')}`;
    archive.append(captionContent, { name: 'caption.txt' });

    await archive.finalize();
  } catch (error) {
    console.error('ZIP creation failed:', error);
    res.status(500).json({ error: 'Failed to create ZIP' });
  }
});

// Dismiss viral video (remove from ready queue)
app.post('/api/viral/:id/dismiss', requireAuth, async (req, res) => {
  const result = await db.updateViralVideo(req.params.id, { status: 'published' });
  if (!result) {
    return res.status(404).json({ error: 'Viral video not found' });
  }
  res.json({ success: true });
});

// Mark carousel as published
app.post('/api/carousels/:id/mark-published', requireAuth, async (req, res) => {
  const carousel = await db.markCarouselAsPublished(req.params.id);
  if (!carousel) {
    return res.status(404).json({ error: 'Carousel not found or not ready' });
  }
  res.json({ success: true, carousel });
});

// Download video proxy (forces download instead of opening in browser)
app.get('/api/download', requireAuth, async (req, res) => {
  const url = req.query.url as string;
  const filename = req.query.filename as string || 'video.mp4';

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch video' });
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// Dashboard HTML
const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Becoming Social - Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .status-pending { background: #f3f4f6; color: #374151; }
    .status-generating { background: #dbeafe; color: #1e40af; }
    .status-generated { background: #d1fae5; color: #065f46; }
    .status-awaiting_manual_publish { background: #fef3c7; color: #92400e; }
    .status-awaiting { background: #fef3c7; color: #92400e; }
    .status-publishing { background: #fef3c7; color: #92400e; }
    .status-published { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    .status-ready { background: #d1fae5; color: #065f46; }
    .tag-ig-photo { background: #fce7f3; color: #9d174d; }
    .tag-ig-reel { background: #f3e8ff; color: #7c3aed; }
    .tag-ig-viral { background: linear-gradient(135deg, #9333ea, #ec4899); color: white; }
    .tag-tt-viral { background: #000; color: white; }
    .tag-tt-carousel { background: linear-gradient(135deg, #14b8a6, #06b6d4); color: white; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
    .error-text {
      max-height: 3em;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .error-text.expanded {
      max-height: none;
    }
    .dismiss-btn {
      color: #d1d5db;
      transition: color 0.15s;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
      padding: 0.25rem;
      border: none;
      background: none;
    }
    .dismiss-btn:hover { color: #ef4444; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; display: inline-block; }
    .section-label {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #9ca3af;
    }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div id="app"></div>
  <script>
    const App = {
      isAdmin: false,
      showLoginModal: false,
      pendingAction: null,
      posts: [],
      tiktokQueue: [],
      instagramVideoQueue: [],
      viralVideos: [],
      viralStatus: null,
      viralCost: null,
      carousels: [],
      carouselCost: null,
      stats: null,
      date: new Date().toISOString().split('T')[0],
      isDev: ${config.nodeEnv === 'development'},

      async init() {
        this.render();
        // Load public data immediately
        await this.loadPublicData();
        // Check if user is already authenticated
        await this.checkAuth();
      },

      async checkAuth() {
        try {
          const res = await fetch('/api/auth-status', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            this.isAdmin = data.authenticated;
            // Load viral and carousel data if authenticated
            if (this.isAdmin) {
              await Promise.all([this.loadViralData(), this.loadCarouselData()]);
            }
          }
        } catch {}
        this.render();
      },

      async login(password) {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
          credentials: 'include',
        });
        if (res.ok) {
          this.isAdmin = true;
          this.showLoginModal = false;
          // Execute pending action if any
          if (this.pendingAction) {
            const action = this.pendingAction;
            this.pendingAction = null;
            await action();
          }
        } else {
          alert('Invalid password');
        }
        this.render();
      },

      async logout() {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        this.isAdmin = false;
        this.render();
      },

      requireAuth(action) {
        if (this.isAdmin) {
          action();
        } else {
          this.pendingAction = action;
          this.showLoginModal = true;
          this.render();
        }
      },

      closeLoginModal() {
        this.showLoginModal = false;
        this.pendingAction = null;
        this.render();
      },

      async loadPublicData() {
        const [postsRes, queueRes, igVideoQueueRes, statsRes] = await Promise.all([
          fetch('/api/public/posts?date=' + this.date),
          fetch('/api/public/tiktok-queue'),
          fetch('/api/public/instagram-video-queue'),
          fetch('/api/public/stats'),
        ]);
        if (postsRes.ok) this.posts = (await postsRes.json()).posts;
        if (queueRes.ok) this.tiktokQueue = (await queueRes.json()).posts;
        if (igVideoQueueRes.ok) this.instagramVideoQueue = (await igVideoQueueRes.json()).posts;
        if (statsRes.ok) this.stats = (await statsRes.json()).stats;

        // Load viral videos and carousels if admin
        if (this.isAdmin) {
          await Promise.all([this.loadViralData(), this.loadCarouselData()]);
        }
        this.render();
      },

      async loadViralData() {
        try {
          const viralRes = await fetch('/api/viral', { credentials: 'include' });
          if (viralRes.ok) {
            const viralData = await viralRes.json();
            this.viralVideos = viralData.videos;
            this.viralStatus = viralData.systemStatus;
            this.viralCost = viralData.costEstimate;
          }
        } catch {}
      },

      async loadCarouselData() {
        try {
          const carouselRes = await fetch('/api/carousels', { credentials: 'include' });
          if (carouselRes.ok) {
            const carouselData = await carouselRes.json();
            this.carousels = carouselData.carousels;
            this.carouselCost = carouselData.costEstimate;
          }
        } catch {}
      },

      async triggerGenerate(postId) {
        this.requireAuth(async () => {
          await fetch('/api/posts/' + postId + '/generate', { method: 'POST', credentials: 'include' });
          setTimeout(() => this.loadPublicData(), 1000);
        });
      },

      async copyCaption(post) {
        this.requireAuth(async () => {
          const text = post.caption + '\\n\\n' + post.hashtags.map(h => '#' + h).join(' ');
          await navigator.clipboard.writeText(text);
          alert('Caption copied!');
        });
      },

      async downloadVideo(url, filename) {
        this.requireAuth(async () => {
          // Use server proxy to force download (works on mobile and cross-origin)
          const downloadUrl = '/api/download?url=' + encodeURIComponent(url) + '&filename=' + encodeURIComponent(filename);
          window.location.href = downloadUrl;
        });
      },

      async generateViralVideo() {
        console.log('generateViralVideo called, isAdmin:', this.isAdmin);
        this.requireAuth(async () => {
          console.log('Inside requireAuth callback');
          try {
            console.log('Calling /api/viral/generate...');
            const res = await fetch('/api/viral/generate', { method: 'POST', credentials: 'include' });
            console.log('Response:', res.status);
            alert('Viral video generation started! This may take 2-3 minutes.');
            setTimeout(() => this.loadViralData().then(() => this.render()), 5000);
          } catch (err) {
            console.error('Fetch error:', err);
            alert('Error: ' + err);
          }
        });
      },

      async generateCarouselPost() {
        this.requireAuth(async () => {
          try {
            const res = await fetch('/api/carousels/generate', { method: 'POST', credentials: 'include' });
            alert('Carousel generation started!');
            setTimeout(() => this.loadCarouselData().then(() => this.render()), 3000);
          } catch (err) {
            alert('Error: ' + err);
          }
        });
      },

      async copyCarouselCaption(carousel) {
        this.requireAuth(async () => {
          const text = carousel.caption + '\\n\\n' + carousel.hashtags.map(h => '#' + h).join(' ');
          await navigator.clipboard.writeText(text);
          alert('Caption copied!');
        });
      },

      async markCarouselPublished(carouselId) {
        this.requireAuth(async () => {
          if (!confirm('Mark this carousel as published on TikTok?')) return;
          const res = await fetch('/api/carousels/' + carouselId + '/mark-published', {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            alert('Carousel marked as published!');
            await this.loadCarouselData();
            this.render();
          } else {
            alert('Failed to mark as published');
          }
        });
      },

      async markAsPublished(postId) {
        this.requireAuth(async () => {
          if (!confirm('Mark this video as published?')) return;
          const res = await fetch('/api/posts/' + postId + '/mark-published', {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            await this.loadPublicData();
          } else {
            alert('Failed to mark as published');
          }
        });
      },

      async dismissItem(id, contentType) {
        this.requireAuth(async () => {
          let url;
          if (contentType === 'ig-reel') {
            url = '/api/posts/' + id + '/mark-published';
          } else if (contentType === 'viral') {
            url = '/api/viral/' + id + '/dismiss';
          } else if (contentType === 'carousel') {
            url = '/api/carousels/' + id + '/mark-published';
          }
          if (url) {
            await fetch(url, { method: 'POST', credentials: 'include' });
            await this.loadPublicData();
          }
        });
      },

      changeDate(newDate) {
        this.date = newDate;
        this.loadPublicData();
      },

      toggleError(id) {
        const el = document.getElementById('error-' + id);
        if (el) el.classList.toggle('expanded');
      },

      truncateError(error, id) {
        if (!error) return '';
        const maxLen = 80;
        if (error.length <= maxLen) {
          return '<p class="text-red-600 text-sm mt-1">' + error + '</p>';
        }
        return '<div class="mt-1"><p id="error-' + id + '" class="error-text text-red-600 text-sm">' + error + '</p><button onclick="App.toggleError(\\'' + id + '\\')" class="text-xs text-red-400 hover:text-red-600 mt-1">Show more/less</button></div>';
      },

      getContentTypeTag(item, type) {
        if (type === 'carousel') {
          return '<span class="text-xs px-2 py-0.5 rounded tag-tt-carousel font-medium">TT Carousel</span>';
        }
        if (type === 'viral') {
          return '<span class="text-xs px-2 py-0.5 rounded tag-ig-viral font-medium">IG Viral</span><span class="text-xs px-2 py-0.5 rounded tag-tt-viral font-medium ml-1">TT Viral</span>';
        }
        if (item.platform === 'instagram') {
          if (item.format === 'static') {
            return '<span class="text-xs px-2 py-0.5 rounded tag-ig-photo font-medium">IG Photo</span>';
          } else {
            return '<span class="text-xs px-2 py-0.5 rounded tag-ig-reel font-medium">IG Reel</span>';
          }
        }
        return '<span class="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">' + item.platform + '</span>';
      },

      renderReadyCard(item) {
        const time = item.displayTime || '';
        const dismissBtn = '<button onclick="App.dismissItem(\\'' + item.id + '\\', \\'' + item.contentType + '\\')" class="dismiss-btn shrink-0" title="Dismiss">&times;</button>';

        if (item.contentType === 'ig-reel') {
          const videoUrl = this.isDev ? '/assets/' + item.id + '.mp4' : item.assetUrl;
          return '<div class="bg-white rounded-lg p-3 shadow-sm border-l-4 border-purple-400">' +
            '<div class="flex items-start gap-3">' +
            (videoUrl ? '<video src="' + videoUrl + '" class="w-16 h-24 object-cover rounded shrink-0" preload="metadata"></video>' : '<div class="w-16 h-24 bg-gray-100 rounded shrink-0"></div>') +
            '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 mb-1">' +
            '<span class="text-xs px-2 py-0.5 rounded tag-ig-reel font-medium">IG Reel</span>' +
            '<span class="text-xs text-gray-400 font-mono">' + time + '</span>' +
            '</div>' +
            '<p class="text-sm font-medium truncate mb-2">&quot;' + (item.quote || '') + '&quot;</p>' +
            '<div class="flex gap-1.5 flex-wrap">' +
            '<button onclick="App.copyCaption(' + JSON.stringify(item).replace(/"/g, '&quot;') + ')" class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Copy</button>' +
            (videoUrl ? '<button onclick="App.downloadVideo(\\'' + videoUrl + '\\', \\'' + item.id + '.mp4\\')" class="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Download</button>' : '') +
            '<button onclick="App.markAsPublished(\\'' + item.id + '\\')" class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Published</button>' +
            '</div></div>' + dismissBtn + '</div></div>';
        }

        if (item.contentType === 'viral') {
          const viralVideoUrl = this.isDev ? '/assets/viral_' + item.id + '.mp4' : item.assetUrl;
          return '<div class="bg-white rounded-lg p-3 shadow-sm border-l-4 border-pink-400">' +
            '<div class="flex items-start gap-3">' +
            (viralVideoUrl ? '<video src="' + viralVideoUrl + '" class="w-16 h-24 object-cover rounded shrink-0" preload="metadata"></video>' : '<div class="w-16 h-24 bg-gray-100 rounded shrink-0"></div>') +
            '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 mb-1">' +
            this.getContentTypeTag(item, 'viral') +
            (item.mood ? '<span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">' + item.mood + '</span>' : '') +
            '<span class="text-xs text-gray-400 font-mono">' + time + '</span>' +
            '</div>' +
            '<p class="text-sm font-medium truncate mb-2">&quot;' + (item.quote || '') + '&quot;</p>' +
            '<div class="flex gap-1.5 flex-wrap">' +
            (viralVideoUrl ? '<button onclick="App.downloadVideo(\\'' + viralVideoUrl + '\\', \\'viral_' + item.id + '.mp4\\')" class="text-xs px-2 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:opacity-90">Download</button>' : '') +
            '</div></div>' + dismissBtn + '</div></div>';
        }

        if (item.contentType === 'carousel') {
          const firstSlide = item.slidePaths && item.slidePaths[0] ? '/assets/carousels/' + item.id + '/slide_1.png' : null;
          return '<div class="bg-white rounded-lg p-3 shadow-sm border-l-4 border-teal-400">' +
            '<div class="flex items-start gap-3">' +
            (firstSlide ? '<img src="' + firstSlide + '" class="w-16 h-24 object-cover rounded shrink-0">' : '<div class="w-16 h-24 bg-gray-100 rounded shrink-0 flex items-center justify-center text-gray-400 text-xs">No slides</div>') +
            '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-2 mb-1">' +
            this.getContentTypeTag(item, 'carousel') +
            '<span class="text-xs text-gray-500">' + (item.slidePaths?.length || 0) + ' slides</span>' +
            '<span class="text-xs text-gray-400 font-mono">' + time + '</span>' +
            '</div>' +
            '<p class="text-sm font-medium truncate mb-2">&quot;' + (item.topic || '') + '&quot;</p>' +
            '<div class="flex gap-1.5 flex-wrap">' +
            '<button onclick="App.copyCarouselCaption(' + JSON.stringify(item).replace(/"/g, '&quot;') + ')" class="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Copy</button>' +
            '<a href="/api/carousels/' + item.id + '/download" class="text-xs px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 inline-block">ZIP</a>' +
            '<button onclick="App.markCarouselPublished(\\'' + item.id + '\\')" class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Published</button>' +
            '</div></div>' + dismissBtn + '</div></div>';
        }

        return '';
      },

      render() {
        document.getElementById('app').innerHTML = this.dashboardView() + (this.showLoginModal ? this.loginModalView() : '');
        this.bindEvents();
      },

      loginModalView() {
        return \`
          <div class="modal-overlay" id="loginModal">
            <div class="bg-white p-8 rounded-xl shadow-lg w-96 relative">
              <button id="closeModalBtn" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              <h2 class="text-xl font-bold text-center mb-2">Admin Access Required</h2>
              <p class="text-gray-500 text-center text-sm mb-6">Enter password to perform this action</p>
              <input type="password" id="modalPassword" placeholder="Enter password..." class="w-full p-3 border rounded mb-4">
              <button id="modalLoginBtn" class="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700">Login</button>
            </div>
          </div>
        \`;
      },

      dashboardView() {
        // Build ready-to-publish items with display time
        const readyToPublish = [];
        const fmtDateTime = (d) => { const dt = new Date(d); return dt.toLocaleDateString([], {day:'numeric', month:'short'}) + ' ' + dt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); };
        this.instagramVideoQueue.forEach(p => {
          readyToPublish.push({ ...p, contentType: 'ig-reel', sortTime: new Date(p.scheduledAt).getTime(), displayTime: fmtDateTime(p.scheduledAt) });
        });
        if (this.isAdmin) {
          this.viralVideos.filter(v => v.status === 'ready').forEach(v => {
            readyToPublish.push({ ...v, contentType: 'viral', sortTime: new Date(v.createdAt).getTime(), displayTime: fmtDateTime(v.createdAt) });
          });
          this.carousels.filter(c => c.status === 'ready').forEach(c => {
            readyToPublish.push({ ...c, contentType: 'carousel', sortTime: new Date(c.createdAt).getTime(), displayTime: fmtDateTime(c.createdAt) });
          });
        }
        readyToPublish.sort((a, b) => a.sortTime - b.sortTime);

        // Group by today / tomorrow / older
        const now = new Date();
        const todayStr = now.toDateString();
        const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
        const tomorrowStr = tmrw.toDateString();
        const todayItems = readyToPublish.filter(i => new Date(i.sortTime).toDateString() === todayStr);
        const tomorrowItems = readyToPublish.filter(i => new Date(i.sortTime).toDateString() === tomorrowStr);
        const olderItems = readyToPublish.filter(i => { const d = new Date(i.sortTime).toDateString(); return d !== todayStr && d !== tomorrowStr; });

        // Build unified schedule for sidebar
        const schedule = [];
        this.posts.forEach(p => {
          schedule.push({ time: new Date(p.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), sortTime: new Date(p.scheduledAt).getTime(), type: p.format === 'static' ? 'IG Photo' : 'IG Reel', typeClass: p.format === 'static' ? 'tag-ig-photo' : 'tag-ig-reel', status: p.status, label: p.quote || '', id: p.id, isPending: p.status === 'pending' || p.status === 'failed' });
        });
        if (this.isAdmin) {
          const selDate = this.date;
          this.viralVideos.filter(v => new Date(v.createdAt).toISOString().split('T')[0] === selDate).forEach(v => {
            schedule.push({ time: new Date(v.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), sortTime: new Date(v.createdAt).getTime(), type: 'Viral', typeClass: 'tag-ig-viral', status: v.status, label: v.quote || '', id: v.id });
          });
          this.carousels.filter(c => new Date(c.createdAt).toISOString().split('T')[0] === selDate).forEach(c => {
            schedule.push({ time: new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), sortTime: new Date(c.createdAt).getTime(), type: 'TT Carousel', typeClass: 'tag-tt-carousel', status: c.status, label: c.topic || '', id: c.id });
          });
        }
        schedule.sort((a, b) => a.sortTime - b.sortTime);

        // Generating items
        const generating = [];
        if (this.isAdmin) {
          this.viralVideos.filter(v => v.status === 'generating').forEach(v => generating.push({ type: 'Viral', typeClass: 'tag-ig-viral', label: v.quote || 'Creating viral video...' }));
          this.carousels.filter(c => c.status === 'generating').forEach(c => generating.push({ type: 'Carousel', typeClass: 'tag-tt-carousel', label: c.topic || 'Creating carousel...' }));
        }

        return \`
          <div class="max-w-7xl mx-auto p-6">
            <!-- Header -->
            <div class="flex justify-between items-center mb-6">
              <div>
                <h1 class="text-2xl font-bold text-gray-900">Becoming Social</h1>
                <p class="text-xs text-gray-400">Content Dashboard</p>
              </div>
              \${this.isAdmin ? \`
                <button id="logoutBtn" class="text-sm text-gray-500 hover:text-gray-700">Logout</button>
              \` : \`
                <button id="adminLoginBtn" class="text-blue-600 hover:text-blue-700 text-sm">Admin Login</button>
              \`}
            </div>

            <!-- Stats -->
            \${this.stats ? \`
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-white p-3 rounded-lg shadow-sm">
                <p class="text-xs text-gray-400 uppercase tracking-wide">Published</p>
                <p class="text-xl font-bold text-green-600">\${this.stats.published}</p>
              </div>
              <div class="bg-white p-3 rounded-lg shadow-sm">
                <p class="text-xs text-gray-400 uppercase tracking-wide">Scheduled</p>
                <p class="text-xl font-bold text-blue-600">\${this.stats.scheduled}</p>
              </div>
              <div class="bg-white p-3 rounded-lg shadow-sm">
                <p class="text-xs text-gray-400 uppercase tracking-wide">Awaiting</p>
                <p class="text-xl font-bold text-yellow-600">\${this.stats.awaitingPublish}</p>
              </div>
              <div class="bg-white p-3 rounded-lg shadow-sm">
                <p class="text-xs text-gray-400 uppercase tracking-wide">Failed</p>
                <p class="text-xl font-bold text-red-600">\${this.stats.failed}</p>
              </div>
            </div>
            \` : ''}

            <!-- Two-column layout -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <!-- LEFT COLUMN: Ready to Publish -->
              <div class="lg:col-span-2">
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <h2 class="text-lg font-bold text-gray-900">Ready to Publish</h2>
                  <p class="text-xs text-gray-500">Download media and post manually</p>
                </div>

                <!-- Today -->
                \${todayItems.length > 0 ? \`
                  <div class="mb-4">
                    <p class="section-label mb-2 flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Today
                    </p>
                    <div class="space-y-2">
                      \${todayItems.map(item => this.renderReadyCard(item)).join('')}
                    </div>
                  </div>
                \` : \`
                  <p class="text-gray-400 text-sm bg-white rounded-lg p-4 shadow-sm mb-4">Nothing ready to publish today</p>
                \`}

                <!-- Tomorrow (collapsible) -->
                \${tomorrowItems.length > 0 ? \`
                  <details class="mb-4">
                    <summary class="section-label mb-2 cursor-pointer hover:text-gray-600">
                      Tomorrow (\${tomorrowItems.length})
                    </summary>
                    <div class="space-y-2 mt-2">
                      \${tomorrowItems.map(item => this.renderReadyCard(item)).join('')}
                    </div>
                  </details>
                \` : ''}

                <!-- Other days -->
                \${olderItems.length > 0 ? \`
                  <details class="mb-4">
                    <summary class="section-label mb-2 cursor-pointer hover:text-gray-600">
                      Other Days (\${olderItems.length})
                    </summary>
                    <div class="space-y-2 mt-2">
                      \${olderItems.map(item => this.renderReadyCard(item)).join('')}
                    </div>
                  </details>
                \` : ''}
              </div>

              <!-- RIGHT COLUMN: Sidebar -->
              <div class="lg:col-span-1 space-y-4">

                <!-- Content Factory -->
                \${this.isAdmin ? \`
                <div class="bg-white rounded-lg shadow-sm p-4">
                  <h3 class="font-semibold text-gray-900 text-sm mb-3">Content Factory</h3>
                  <div class="space-y-2">
                    <button onclick="App.generateViralVideo()" class="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 text-sm font-medium flex items-center justify-between">
                      <span>New Viral Video</span>
                      <span class="text-xs opacity-75">~$\${this.viralCost?.total?.toFixed(2) || '0.26'}</span>
                    </button>
                    <button onclick="App.generateCarouselPost()" class="w-full px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:opacity-90 text-sm font-medium flex items-center justify-between">
                      <span>New TT Carousel</span>
                      <span class="text-xs opacity-75">~$\${this.carouselCost?.total?.toFixed(2) || '0.03'}</span>
                    </button>
                  </div>
                  \${generating.length > 0 ? \`
                  <div class="mt-3 pt-3 border-t">
                    <p class="section-label mb-2">Generating</p>
                    \${generating.map(g => \`
                      <div class="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm mb-1">
                        <span class="animate-spin text-blue-500">&#x21bb;</span>
                        <span class="text-xs px-1.5 py-0.5 rounded font-medium \${g.typeClass}">\${g.type}</span>
                        <span class="text-gray-600 truncate text-xs">\${g.label}</span>
                      </div>
                    \`).join('')}
                  </div>
                  \` : ''}
                </div>
                \` : ''}

                <!-- Schedule -->
                <div class="bg-white rounded-lg shadow-sm p-4">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="font-semibold text-gray-900 text-sm">Schedule</h3>
                    <div class="flex items-center gap-2">
                      <input type="date" id="dateInput" value="\${this.date}" class="border rounded px-2 py-1 text-xs w-32">
                      <button id="todayBtn" class="text-blue-600 text-xs hover:underline">Today</button>
                    </div>
                  </div>
                  <div class="space-y-0.5">
                    \${schedule.length === 0 ? '<p class="text-gray-400 text-sm py-2">No content scheduled</p>' : ''}
                    \${schedule.map(s => \`
                      <div class="flex items-center gap-2 py-1.5 px-2 rounded \${s.status === 'failed' ? 'bg-red-50' : 'hover:bg-gray-50'}">
                        <span class="text-xs font-mono text-gray-400 w-11 shrink-0">\${s.time}</span>
                        <span class="text-xs px-1.5 py-0.5 rounded font-medium \${s.typeClass} shrink-0">\${s.type}</span>
                        <span class="text-xs px-1.5 py-0.5 rounded status-\${s.status} shrink-0">\${s.status.replace(/_/g, ' ')}</span>
                        \${s.isPending ? \`<button onclick="App.triggerGenerate('\${s.id}')" class="text-xs text-blue-600 hover:underline shrink-0">Gen</button>\` : ''}
                      </div>
                    \`).join('')}
                  </div>
                </div>

                <!-- Recent History -->
                \${this.isAdmin ? \`
                <details class="bg-white rounded-lg shadow-sm">
                  <summary class="p-4 cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">Recent History</summary>
                  <div class="px-4 pb-4 space-y-2">
                    \${this.viralVideos.filter(v => v.status !== 'ready').slice(0, 5).map(v => \`
                      <div class="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                        <span class="px-1.5 py-0.5 rounded tag-ig-viral font-medium">Viral</span>
                        <span class="px-1.5 py-0.5 rounded status-\${v.status}">\${v.status}</span>
                        <span class="flex-1 truncate text-gray-600">\${v.quote || 'No quote'}</span>
                      </div>
                    \`).join('')}
                    \${this.carousels.filter(c => c.status !== 'ready').slice(0, 5).map(c => \`
                      <div class="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                        <span class="px-1.5 py-0.5 rounded tag-tt-carousel font-medium">Carousel</span>
                        <span class="px-1.5 py-0.5 rounded status-\${c.status}">\${c.status}</span>
                        <span class="flex-1 truncate text-gray-600">\${c.topic || 'No topic'}</span>
                      </div>
                    \`).join('')}
                  </div>
                </details>

                \${this.viralStatus ? \`
                <details class="bg-white rounded-lg shadow-sm">
                  <summary class="p-4 cursor-pointer text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg">System Status</summary>
                  <div class="px-4 pb-4">
                    <div class="flex gap-3 flex-wrap text-xs">
                      <span class="\${this.viralStatus.status.ffmpeg ? 'text-green-600' : 'text-red-600'}">\${this.viralStatus.status.ffmpeg ? '&#10003;' : '&#10007;'} FFmpeg</span>
                      <span class="\${this.viralStatus.status.runway?.available ? 'text-green-600' : 'text-red-600'}">\${this.viralStatus.status.runway?.available ? '&#10003;' : '&#10007;'} Runway</span>
                      <span class="\${this.viralStatus.status.openai ? 'text-green-600' : 'text-red-600'}">\${this.viralStatus.status.openai ? '&#10003;' : '&#10007;'} OpenAI</span>
                      <span class="\${this.viralStatus.status.elevenlabs?.available ? 'text-green-600' : 'text-yellow-600'}">\${this.viralStatus.status.elevenlabs?.available ? '&#10003;' : '!'} ElevenLabs</span>
                    </div>
                    \${this.viralStatus.issues.length > 0 ? \`<p class="mt-2 text-yellow-700 text-xs">\${this.viralStatus.issues.join(' | ')}</p>\` : ''}
                  </div>
                </details>
                \` : ''}
                \` : ''}
              </div>
            </div>
          </div>
        \`;
      },

      bindEvents() {
        // Login modal events
        document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeLoginModal());
        document.getElementById('modalLoginBtn')?.addEventListener('click', () => {
          this.login(document.getElementById('modalPassword').value);
        });
        document.getElementById('modalPassword')?.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.login(e.target.value);
        });
        document.getElementById('loginModal')?.addEventListener('click', (e) => {
          if (e.target.id === 'loginModal') this.closeLoginModal();
        });

        // Admin login button (for non-logged in users)
        document.getElementById('adminLoginBtn')?.addEventListener('click', () => {
          this.showLoginModal = true;
          this.render();
        });

        // Dashboard events
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('dateInput')?.addEventListener('change', (e) => {
          this.changeDate(e.target.value);
        });
        document.getElementById('todayBtn')?.addEventListener('click', () => {
          this.date = new Date().toISOString().split('T')[0];
          document.getElementById('dateInput').value = this.date;
          this.loadPublicData();
        });
      }
    };

    App.init();
  </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.send(dashboardHtml);
});

export function startAdmin(): void {
  app.listen(config.adminPort, () => {
    console.log(`Admin dashboard: http://localhost:${config.adminPort}`);
  });
}

export { app };
