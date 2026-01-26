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
          return '<span class="text-xs px-2 py-1 rounded tag-tt-carousel font-medium">TT Carousel</span>';
        }
        if (type === 'viral') {
          return '<span class="text-xs px-2 py-1 rounded tag-ig-viral font-medium">IG Viral</span><span class="text-xs px-2 py-1 rounded tag-tt-viral font-medium ml-1">TT Viral</span>';
        }
        // Regular posts
        if (item.platform === 'instagram') {
          if (item.format === 'static') {
            return '<span class="text-xs px-2 py-1 rounded tag-ig-photo font-medium">IG Photo</span>';
          } else {
            return '<span class="text-xs px-2 py-1 rounded tag-ig-reel font-medium">IG Reel</span>';
          }
        }
        return '<span class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">' + item.platform + '</span>';
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
        // Combine all ready-to-publish items
        const readyToPublish = [];

        // Instagram Reels awaiting manual publish
        this.instagramVideoQueue.forEach(p => {
          readyToPublish.push({ ...p, contentType: 'ig-reel', sortTime: new Date(p.scheduledAt).getTime() });
        });

        // Viral videos ready
        if (this.isAdmin) {
          this.viralVideos.filter(v => v.status === 'ready').forEach(v => {
            readyToPublish.push({ ...v, contentType: 'viral', sortTime: new Date(v.createdAt).getTime() });
          });

          // Carousels ready
          this.carousels.filter(c => c.status === 'ready').forEach(c => {
            readyToPublish.push({ ...c, contentType: 'carousel', sortTime: new Date(c.createdAt).getTime() });
          });
        }

        // Sort by time
        readyToPublish.sort((a, b) => a.sortTime - b.sortTime);

        return \`
          <div class="max-w-6xl mx-auto p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold">Becoming Social</h1>
              \${this.isAdmin ? \`
                <button id="logoutBtn" class="text-gray-500 hover:text-gray-700">Logout</button>
              \` : \`
                <button id="adminLoginBtn" class="text-blue-600 hover:text-blue-700 text-sm">Admin Login</button>
              \`}
            </div>

            \${this.stats ? \`
            <div class="grid grid-cols-4 gap-4 mb-6">
              <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-sm text-gray-500">Published</h3>
                <p class="text-2xl font-bold text-green-600">\${this.stats.published}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-sm text-gray-500">Scheduled</h3>
                <p class="text-2xl font-bold text-blue-600">\${this.stats.scheduled}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-sm text-gray-500">Awaiting Publish</h3>
                <p class="text-2xl font-bold text-yellow-600">\${this.stats.awaitingPublish}</p>
              </div>
              <div class="bg-white p-4 rounded-lg shadow">
                <h3 class="text-sm text-gray-500">Failed</h3>
                <p class="text-2xl font-bold text-red-600">\${this.stats.failed}</p>
              </div>
            </div>
            \` : ''}

            <!-- ==================== SCHEDULED POSTS ==================== -->
            <div class="bg-white p-4 rounded-lg shadow mb-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <h2 class="text-lg font-semibold">Scheduled Posts</h2>
                  <input type="date" id="dateInput" value="\${this.date}" class="border rounded p-2 text-sm">
                  <button id="todayBtn" class="text-blue-600 text-sm hover:underline">Today</button>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="px-2 py-1 rounded tag-ig-photo">IG Photo</span>
                  <span class="px-2 py-1 rounded tag-ig-reel">IG Reel</span>
                  <span class="px-2 py-1 rounded tag-ig-viral">IG Viral</span>
                  <span class="px-2 py-1 rounded tag-tt-carousel">TT Carousel</span>
                </div>
              </div>
            </div>

            <div class="space-y-3 mb-8">
              \${this.posts.length === 0 ? '<p class="text-gray-500 bg-white p-4 rounded-lg">No posts scheduled for this date</p>' : ''}
              \${this.posts.map(p => \`
                <div class="bg-white p-4 rounded-lg shadow">
                  <div class="flex justify-between items-start">
                    <div class="flex gap-4">
                      \${p.assetUrl ? (p.format === 'video' ? \`<video src="\${p.assetUrl}" class="w-16 h-24 object-cover rounded"></video>\` : \`<img src="\${p.assetUrl}" class="w-16 h-16 object-cover rounded">\`) : '<div class="w-16 h-16 bg-gray-100 rounded"></div>'}
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          \${this.getContentTypeTag(p)}
                          <span class="text-gray-500 text-sm font-mono">\${new Date(p.scheduledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span class="text-xs px-2 py-1 rounded status-\${p.status}">\${p.status.replace('_', ' ')}</span>
                        </div>
                        <p class="font-medium text-sm">\${p.quote || '<em class="text-gray-400">Pending generation...</em>'}</p>
                        \${this.truncateError(p.error, p.id)}
                      </div>
                    </div>
                    \${p.status === 'pending' || p.status === 'failed' ? \`
                      <button onclick="App.triggerGenerate('\${p.id}')" class="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Generate</button>
                    \` : ''}
                  </div>
                </div>
              \`).join('')}

              \${this.isAdmin ? \`
              <!-- Show viral videos and carousels in schedule too -->
              \${this.viralVideos.filter(v => v.status === 'generating').map(v => \`
                <div class="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
                  <div class="flex gap-4">
                    <div class="w-16 h-24 bg-purple-100 rounded flex items-center justify-center">
                      <span class="text-purple-600 text-xs">Generating</span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        \${this.getContentTypeTag(v, 'viral')}
                        <span class="text-xs px-2 py-1 rounded status-generating">generating</span>
                      </div>
                      <p class="font-medium text-sm">\${v.quote || 'Creating viral video...'}</p>
                    </div>
                  </div>
                </div>
              \`).join('')}

              \${this.carousels.filter(c => c.status === 'generating').map(c => \`
                <div class="bg-white p-4 rounded-lg shadow border-l-4 border-teal-400">
                  <div class="flex gap-4">
                    <div class="w-16 h-24 bg-teal-100 rounded flex items-center justify-center">
                      <span class="text-teal-600 text-xs">Generating</span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        \${this.getContentTypeTag(c, 'carousel')}
                        <span class="text-xs px-2 py-1 rounded status-generating">generating</span>
                      </div>
                      <p class="font-medium text-sm">\${c.topic || 'Creating carousel...'}</p>
                    </div>
                  </div>
                </div>
              \`).join('')}
              \` : ''}
            </div>

            <!-- ==================== READY TO PUBLISH ==================== -->
            <div class="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg mb-4">
              <h2 class="text-lg font-semibold">Ready to Publish</h2>
              <p class="text-sm text-gray-500">Download media and post manually</p>
            </div>

            <div class="space-y-4 mb-8">
              \${readyToPublish.length === 0 ? '<p class="text-gray-500 bg-white p-4 rounded-lg">No content ready to publish</p>' : ''}
              \${readyToPublish.map(item => {
                if (item.contentType === 'ig-reel') {
                  const videoUrl = this.isDev ? '/assets/' + item.id + '.mp4' : item.assetUrl;
                  return \`
                  <div class="bg-white p-4 rounded-lg shadow border-l-4 border-purple-400">
                    <div class="flex gap-4">
                      \${videoUrl ? \`<video src="\${videoUrl}" class="w-24 h-40 object-cover rounded" controls></video>\` : '<div class="w-24 h-40 bg-gray-100 rounded"></div>'}
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-xs px-2 py-1 rounded tag-ig-reel font-medium">IG Reel</span>
                          <span class="text-gray-500 text-sm">\${new Date(item.scheduledAt).toLocaleString()}</span>
                        </div>
                        <p class="font-medium mb-2">"\${item.quote}"</p>
                        <p class="text-sm text-gray-600 mb-2">\${item.caption || ''}</p>
                        <p class="text-sm text-blue-600 mb-3">\${(item.hashtags || []).map(h => '#' + h).join(' ')}</p>
                        <div class="flex gap-2 flex-wrap">
                          <button onclick="App.copyCaption(\${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Copy Caption</button>
                          \${videoUrl ? \`<button onclick="App.downloadVideo('\${videoUrl}', '\${item.id}.mp4')" class="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700">Download</button>\` : ''}
                          <button onclick="App.markAsPublished('\${item.id}')" class="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Mark Published</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  \`;
                } else if (item.contentType === 'viral') {
                  const viralVideoUrl = this.isDev ? '/assets/viral_' + item.id + '.mp4' : item.assetUrl;
                  return \`
                  <div class="bg-white p-4 rounded-lg shadow border-l-4 border-pink-400">
                    <div class="flex gap-4">
                      \${viralVideoUrl ? \`<video src="\${viralVideoUrl}" class="w-24 h-40 object-cover rounded" controls></video>\` : '<div class="w-24 h-40 bg-gray-100 rounded"></div>'}
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          \${this.getContentTypeTag(item, 'viral')}
                          \${item.mood ? \`<span class="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">\${item.mood}</span>\` : ''}
                        </div>
                        <p class="font-medium mb-2">"\${item.quote || ''}"</p>
                        <div class="flex gap-2 flex-wrap">
                          \${viralVideoUrl ? \`<button onclick="App.downloadVideo('\${viralVideoUrl}', 'viral_\${item.id}.mp4')" class="text-sm px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:opacity-90">Download</button>\` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  \`;
                } else if (item.contentType === 'carousel') {
                  const firstSlide = item.slidePaths && item.slidePaths[0] ? '/assets/carousels/' + item.id + '/slide_1.png' : null;
                  return \`
                  <div class="bg-white p-4 rounded-lg shadow border-l-4 border-teal-400">
                    <div class="flex gap-4">
                      \${firstSlide ? \`<img src="\${firstSlide}" class="w-24 h-40 object-cover rounded">\` : '<div class="w-24 h-40 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No slides</div>'}
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          \${this.getContentTypeTag(item, 'carousel')}
                          <span class="text-xs text-gray-500">\${item.slidePaths?.length || 0} slides</span>
                        </div>
                        <p class="font-medium mb-2">"\${item.topic || ''}"</p>
                        \${item.caption ? \`<p class="text-sm text-gray-600 mb-2">\${item.caption.slice(0, 100)}...</p>\` : ''}
                        \${item.hashtags && item.hashtags.length > 0 ? \`<p class="text-sm text-blue-600 mb-3">\${item.hashtags.map(h => '#' + h).join(' ')}</p>\` : ''}
                        <div class="flex gap-2 flex-wrap">
                          <button onclick="App.copyCarouselCaption(\${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Copy Caption</button>
                          <a href="/api/carousels/\${item.id}/download" class="text-sm px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700">Download ZIP</a>
                          <button onclick="App.markCarouselPublished('\${item.id}')" class="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Mark Published</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  \`;
                }
                return '';
              }).join('')}
            </div>

            \${this.isAdmin ? \`
            <!-- ==================== GENERATE NEW CONTENT ==================== -->
            <div class="bg-white p-4 rounded-lg shadow mb-4">
              <h2 class="text-lg font-semibold mb-4">Generate Content</h2>
              <div class="flex gap-4 flex-wrap">
                <button onclick="App.generateViralVideo()" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 font-medium">
                  New Viral Video
                  <span class="text-xs opacity-75 ml-1">~$\${this.viralCost?.total?.toFixed(2) || '0.26'}</span>
                </button>
                <button onclick="App.generateCarouselPost()" class="px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:opacity-90 font-medium">
                  New TT Carousel
                  <span class="text-xs opacity-75 ml-1">~$\${this.carouselCost?.total?.toFixed(2) || '0.03'}</span>
                </button>
              </div>
            </div>

            <!-- ==================== RECENT HISTORY ==================== -->
            <details class="bg-white rounded-lg shadow mb-8">
              <summary class="p-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50">Recent History (Viral & Carousels)</summary>
              <div class="p-4 pt-0 space-y-3">
                \${this.viralVideos.filter(v => v.status !== 'ready').slice(0, 5).map(v => \`
                  <div class="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span class="text-xs px-2 py-1 rounded tag-ig-viral">Viral</span>
                    <span class="text-xs px-2 py-1 rounded status-\${v.status}">\${v.status}</span>
                    <span class="text-sm flex-1 truncate">\${v.quote || 'No quote'}</span>
                    \${this.truncateError(v.error, 'viral-' + v.id)}
                  </div>
                \`).join('')}
                \${this.carousels.filter(c => c.status !== 'ready').slice(0, 5).map(c => \`
                  <div class="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <span class="text-xs px-2 py-1 rounded tag-tt-carousel">Carousel</span>
                    <span class="text-xs px-2 py-1 rounded status-\${c.status}">\${c.status}</span>
                    <span class="text-sm flex-1 truncate">\${c.topic || 'No topic'}</span>
                    \${this.truncateError(c.error, 'carousel-' + c.id)}
                  </div>
                \`).join('')}
              </div>
            </details>

            \${this.viralStatus ? \`
            <details class="bg-white rounded-lg shadow mb-8">
              <summary class="p-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50">System Status</summary>
              <div class="p-4 pt-0">
                <div class="flex gap-4 flex-wrap text-sm">
                  <span class="\${this.viralStatus.status.ffmpeg ? 'text-green-600' : 'text-red-600'}">
                    \${this.viralStatus.status.ffmpeg ? 'OK' : 'X'} FFmpeg
                  </span>
                  <span class="\${this.viralStatus.status.runway?.available ? 'text-green-600' : 'text-red-600'}">
                    \${this.viralStatus.status.runway?.available ? 'OK' : 'X'} Runway
                  </span>
                  <span class="\${this.viralStatus.status.openai ? 'text-green-600' : 'text-red-600'}">
                    \${this.viralStatus.status.openai ? 'OK' : 'X'} OpenAI
                  </span>
                  <span class="\${this.viralStatus.status.elevenlabs?.available ? 'text-green-600' : 'text-yellow-600'}">
                    \${this.viralStatus.status.elevenlabs?.available ? 'OK' : '!'} ElevenLabs
                  </span>
                  <span class="text-gray-600">
                    Music: \${this.viralStatus.status.music?.available || 0}/\${this.viralStatus.status.music?.total || 0}
                  </span>
                </div>
                \${this.viralStatus.issues.length > 0 ? \`
                <div class="mt-2 text-yellow-700 text-sm">\${this.viralStatus.issues.join(' | ')}</div>
                \` : ''}
              </div>
            </details>
            \` : ''}
            \` : ''}
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
