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
import { getStats, triggerDaily, triggerContent } from '../scheduler/index.js';

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

// Dashboard HTML
const dashboardHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Becoming Social - Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .status-pending { background: #f3f4f6; color: #374151; }
    .status-generating { background: #dbeafe; color: #1e40af; }
    .status-generated { background: #d1fae5; color: #065f46; }
    .status-publishing { background: #fef3c7; color: #92400e; }
    .status-published { background: #d1fae5; color: #065f46; }
    .status-failed { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div id="app"></div>
  <script>
    const App = {
      loggedIn: false,
      posts: [],
      tiktokQueue: [],
      stats: null,
      date: new Date().toISOString().split('T')[0],

      async init() {
        this.render();
        await this.checkAuth();
      },

      async checkAuth() {
        try {
          const res = await fetch('/api/stats', { credentials: 'include' });
          if (res.ok) {
            this.loggedIn = true;
            await this.loadData();
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
          this.loggedIn = true;
          await this.loadData();
        } else {
          alert('Invalid password');
        }
        this.render();
      },

      async logout() {
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        this.loggedIn = false;
        this.render();
      },

      async loadData() {
        const [postsRes, queueRes, statsRes] = await Promise.all([
          fetch('/api/posts?date=' + this.date, { credentials: 'include' }),
          fetch('/api/tiktok-queue', { credentials: 'include' }),
          fetch('/api/stats', { credentials: 'include' }),
        ]);
        if (postsRes.ok) this.posts = (await postsRes.json()).posts;
        if (queueRes.ok) this.tiktokQueue = (await queueRes.json()).posts;
        if (statsRes.ok) this.stats = (await statsRes.json()).stats;
        this.render();
      },

      async triggerGenerate(postId) {
        await fetch('/api/posts/' + postId + '/generate', { method: 'POST', credentials: 'include' });
        setTimeout(() => this.loadData(), 1000);
      },

      async copyCaption(post) {
        const text = post.caption + '\\n\\n' + post.hashtags.map(h => '#' + h).join(' ');
        await navigator.clipboard.writeText(text);
        alert('Caption copied!');
      },

      render() {
        document.getElementById('app').innerHTML = this.loggedIn ? this.dashboardView() : this.loginView();
        this.bindEvents();
      },

      loginView() {
        return \`
          <div class="min-h-screen flex items-center justify-center">
            <div class="bg-white p-8 rounded-xl shadow-lg w-96">
              <h1 class="text-2xl font-bold text-center mb-6">Becoming Social</h1>
              <input type="password" id="password" placeholder="Admin password" class="w-full p-3 border rounded mb-4">
              <button id="loginBtn" class="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700">Login</button>
            </div>
          </div>
        \`;
      },

      dashboardView() {
        return \`
          <div class="max-w-6xl mx-auto p-6">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-2xl font-bold">Becoming Social Admin</h1>
              <button id="logoutBtn" class="text-gray-500 hover:text-gray-700">Logout</button>
            </div>

            \${this.stats ? \`
            <div class="grid grid-cols-4 gap-4 mb-6">
              \${Object.entries(this.stats).map(([name, s]) => \`
                <div class="bg-white p-4 rounded-lg shadow">
                  <h3 class="text-sm text-gray-500 capitalize">\${name}</h3>
                  <div class="text-xs mt-2">
                    <span class="text-blue-600">\${s.waiting} waiting</span> ·
                    <span class="text-yellow-600">\${s.active} active</span> ·
                    <span class="text-red-600">\${s.failed} failed</span>
                  </div>
                </div>
              \`).join('')}
            </div>
            \` : ''}

            <div class="bg-white p-4 rounded-lg shadow mb-6">
              <div class="flex items-center gap-4">
                <label class="text-sm font-medium">Date:</label>
                <input type="date" id="dateInput" value="\${this.date}" class="border rounded p-2">
                <button id="todayBtn" class="text-blue-600 text-sm">Today</button>
              </div>
            </div>

            <h2 class="text-lg font-semibold mb-4">Schedule</h2>
            <div class="space-y-4 mb-8">
              \${this.posts.length === 0 ? '<p class="text-gray-500">No posts for this date</p>' : ''}
              \${this.posts.map(p => \`
                <div class="bg-white p-4 rounded-lg shadow">
                  <div class="flex justify-between items-start">
                    <div class="flex gap-4">
                      \${p.assetUrl ? \`<img src="\${p.assetUrl}" class="w-16 h-16 object-cover rounded">\` : ''}
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-xs px-2 py-1 rounded \${p.platform === 'instagram' ? 'bg-pink-100 text-pink-800' : 'bg-gray-900 text-white'}">\${p.platform}</span>
                          <span class="text-gray-500 text-sm">\${new Date(p.scheduledAt).toLocaleTimeString()}</span>
                          <span class="text-xs px-2 py-1 rounded status-\${p.status}">\${p.status}</span>
                        </div>
                        <p class="font-medium">\${p.quote || '<em class="text-gray-400">Not generated</em>'}</p>
                        \${p.error ? \`<p class="text-red-600 text-sm mt-1">\${p.error}</p>\` : ''}
                      </div>
                    </div>
                    \${p.status === 'pending' || p.status === 'failed' ? \`
                      <button onclick="App.triggerGenerate('\${p.id}')" class="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Generate</button>
                    \` : ''}
                  </div>
                </div>
              \`).join('')}
            </div>

            <h2 class="text-lg font-semibold mb-4">TikTok Queue</h2>
            <div class="space-y-4">
              \${this.tiktokQueue.length === 0 ? '<p class="text-gray-500">No videos ready</p>' : ''}
              \${this.tiktokQueue.map(p => \`
                <div class="bg-white p-4 rounded-lg shadow">
                  <div class="flex gap-4">
                    \${p.assetUrl ? \`<video src="\${p.assetUrl}" class="w-24 h-40 object-cover rounded" controls></video>\` : ''}
                    <div class="flex-1">
                      <p class="font-medium mb-2">"\${p.quote}"</p>
                      <p class="text-sm text-gray-600 mb-2">\${p.caption}</p>
                      <p class="text-sm text-blue-600 mb-4">\${p.hashtags.map(h => '#' + h).join(' ')}</p>
                      <div class="flex gap-2">
                        <button onclick="App.copyCaption(\${JSON.stringify(p).replace(/"/g, '&quot;')})" class="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Copy Caption</button>
                        \${p.assetUrl ? \`<a href="\${p.assetUrl}" download class="text-sm px-3 py-1 bg-black text-white rounded hover:bg-gray-800">Download</a>\` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      },

      bindEvents() {
        document.getElementById('loginBtn')?.addEventListener('click', () => {
          this.login(document.getElementById('password').value);
        });
        document.getElementById('password')?.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.login(e.target.value);
        });
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('dateInput')?.addEventListener('change', (e) => {
          this.date = e.target.value;
          this.loadData();
        });
        document.getElementById('todayBtn')?.addEventListener('click', () => {
          this.date = new Date().toISOString().split('T')[0];
          document.getElementById('dateInput').value = this.date;
          this.loadData();
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
