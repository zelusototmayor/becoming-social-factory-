# Becoming Social Content Factory

Automated social content creation and publishing for Becoming.

## Features

- **5 posts/day** automatically scheduled
- **Instagram**: Fully automated posting (static images)
- **TikTok**: Manual one-tap posting from queue (videos)
- **3 color palettes** with anti-repetition
- **AI-powered quotes** using the same psychology as the app
- **Template-locked design**: Only text changes
- **Viral Videos**: AI-generated cinematic micro-stories via Runway

## HeyGen AI UGC Videos (NEW - Recommended)

Generate authentic-looking UGC testimonial videos with AI avatars talking about the app.

### Why HeyGen?

- **Better performance**: UGC-style content outperforms cinematic videos on social
- **Lower cost**: ~$0.02/video vs $0.26 for Runway
- **More authentic**: Real-looking people talking about the app
- **Faster**: 2-5 minutes vs 5-10 minutes for Runway

### Features

- **5 diverse avatar personas** that rotate automatically
- **7 UGC script templates** (skeptic-believer, morning routine, friend recommendation, etc.)
- **8 content themes** (anxiety management, mindfulness, breathing exercises, etc.)
- **AI-generated scripts** with natural speech patterns
- **Automatic captions and hashtags**

### How It Works

1. Theme is selected (or random)
2. GPT generates authentic UGC script from template
3. Avatar is matched to content type
4. HeyGen renders the video with lip-sync
5. Video appears in dashboard for posting

### Setup

1. Sign up at [heygen.com](https://heygen.com) (Creator plan $29/mo)
2. Get API key from Settings > API
3. Add to `.env`:
   ```env
   HEYGEN_API_KEY=your-api-key-here
   ```
4. Test: `npx tsx src/scripts/test-heygen.ts`

### Cost

~$0.02 per video:
- HeyGen: $0.00 (unlimited on Creator plan)
- OpenAI: ~$0.02 (script generation)

**Monthly**: $29 HeyGen + ~$0.60 OpenAI = ~$30/month for daily videos

---

## Viral Video System (Legacy - Runway)

> **Note**: This system is now disabled by default. HeyGen UGC videos are recommended instead.

Generate AI-powered cinematic micro-story videos optimized for virality:

- **Hook (0-3s)**: Visual hook + teaser text
- **Build (3-8s)**: Quote revelation with animated text
- **Payoff (8-12s)**: Full message + emotional climax

### How It Works

1. Quote is generated → GPT analyzes mood
2. Scene is selected from 18 cinematic templates
3. Runway AI generates 5-second video clip
4. FFmpeg composites: clip + text animations + music + logo
5. Video appears in dashboard for manual posting

### Cost

~$0.60 per viral video:
- Runway: ~$0.50 (10-sec clip)
- OpenAI: ~$0.06 (scene mapping + voice)
- ElevenLabs: ~$0.04 (voice narration)

## Quick Start

### 1. Clone and Setup

```bash
cd becoming-social-factory
cp .env.example .env
# Edit .env with your credentials
```

### 2. Start with Docker

```bash
docker-compose up -d
```

### 3. Access Dashboard

Open http://localhost:3001 and login with your `ADMIN_PASSWORD`.

## Manual Setup (Development)

```bash
# Install dependencies
npm install

# Start Postgres and Redis
docker-compose up postgres redis -d

# Run migrations
npm run db:migrate

# Start the app
npm run dev
```

## Project Structure

```
becoming-social-factory/
├── src/
│   ├── index.ts           # Entry point
│   ├── config.ts          # Configuration
│   ├── template.ts        # Visual template config
│   ├── types.ts           # TypeScript types
│   ├── generator/         # Quote generation
│   ├── renderer/          # Image/video rendering
│   ├── publisher/         # Instagram API
│   ├── scheduler/         # Job processing
│   ├── db/                # Database
│   ├── admin/             # Dashboard
│   ├── heygen/            # HeyGen AI UGC (NEW - recommended)
│   │   ├── index.ts       # Main exports
│   │   ├── types.ts       # Type definitions
│   │   ├── client.ts      # HeyGen API wrapper
│   │   ├── avatars.ts     # Avatar personas library
│   │   ├── scriptGenerator.ts # UGC script generation
│   │   └── videoGenerator.ts  # Video orchestration
│   └── viral/             # Runway viral video (legacy)
│       ├── index.ts       # Main orchestrator
│       ├── types.ts       # Type definitions
│       ├── sceneLibrary.ts # 18 cinematic scene templates
│       ├── sceneMapper.ts # GPT mood analysis
│       ├── runwayClient.ts # Runway API integration
│       ├── compositor.ts  # FFmpeg video composition
│       └── musicLibrary.ts # Background music
├── assets/
│   ├── palette1/          # Logos, backgrounds
│   ├── palette2/
│   ├── palette3/
│   ├── music/             # Background music tracks
│   └── fonts/
├── output/
│   ├── clips/             # Runway-generated clips
│   └── viral/             # Final viral videos
├── docker-compose.yml
└── package.json
```

## Instagram Setup

### 1. Create Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com/)
2. Create a Business app
3. Add "Instagram Graph API"

### 2. Get Credentials

1. In Graph API Explorer, add permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
2. Generate User Access Token
3. Exchange for Long-Lived Token:
   ```bash
   curl "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_TOKEN}"
   ```
4. Get Instagram User ID:
   ```bash
   curl "https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}"
   ```

### 3. Update .env

```env
INSTAGRAM_ACCESS_TOKEN=your-long-lived-token
INSTAGRAM_USER_ID=your-instagram-user-id
INSTAGRAM_PAGE_ID=your-facebook-page-id
```

## Assets

Place your branded assets in:

```
assets/
├── palette1/
│   ├── background.png      # 1080x1350
│   ├── background-video.png # 1080x1920
│   └── logo.png
├── palette2/
│   └── ...
├── palette3/
│   └── ...
└── fonts/
    └── PlayfairDisplay-Regular.ttf
```

Generate placeholder backgrounds:
```bash
npm run generate:backgrounds
```

## How It Works

1. **Daily at midnight**: Creates posts for next day
2. **30 min before scheduled time**: Generates content
3. **At scheduled time**: Publishes to Instagram
4. **TikTok**: Appears in queue for manual posting

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | Login |
| `/api/logout` | POST | Logout |
| `/api/posts` | GET | Get posts for date |
| `/api/tiktok-queue` | GET | Get TikTok queue |
| `/api/stats` | GET | Queue statistics |
| `/api/posts/:id/generate` | POST | Trigger generation |
| `/api/viral` | GET | Get viral videos (both HeyGen and Runway) |
| `/api/viral/queue` | GET | Get ready viral videos |
| `/api/viral/generate` | POST | Generate new viral video |
| `/api/viral/status` | GET | Check system status |
| `/api/heygen/generate` | POST | Generate HeyGen UGC video |
| `/api/heygen/status` | GET | Check HeyGen system status |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_HOST` | Yes | Redis host |
| `OPENAI_API_KEY` | No | For AI quotes (uses fallbacks without) |
| `HEYGEN_API_KEY` | No | For HeyGen UGC videos (get from heygen.com) |
| `RUNWAY_API_KEY` | No | For viral videos - legacy (get from dev.runwayml.com) |
| `ELEVENLABS_API_KEY` | No | For voice narration in Runway videos |
| `INSTAGRAM_ACCESS_TOKEN` | No | For publishing |
| `ADMIN_PASSWORD` | No | Dashboard password (default: becoming2024) |
| `TIMEZONE` | No | Default: Europe/Lisbon |
| `DAILY_POST_COUNT` | No | Default: 5 |

## Deployment

### Railway / Render

1. Connect your repo
2. Add environment variables
3. Deploy

### VPS

```bash
# On server
git clone <repo>
cd becoming-social-factory
cp .env.example .env
# Edit .env
docker-compose up -d
```

## License

Private - Becoming App
