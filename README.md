# Becoming Social Content Factory

Automated social content creation and publishing for Becoming.

## Features

- **5 posts/day** automatically scheduled
- **Instagram**: Fully automated posting (static images)
- **TikTok**: Manual one-tap posting from queue (videos)
- **3 color palettes** with anti-repetition
- **AI-powered quotes** using the same psychology as the app
- **Template-locked design**: Only text changes

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
│   └── admin/             # Dashboard
├── assets/                # Logos, backgrounds, fonts
├── output/                # Generated assets
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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_HOST` | Yes | Redis host |
| `OPENAI_API_KEY` | No | For AI quotes (uses fallbacks without) |
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
