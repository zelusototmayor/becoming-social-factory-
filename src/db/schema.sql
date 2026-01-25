-- Becoming Social Factory Database Schema
-- Run: psql $DATABASE_URL < src/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
    format VARCHAR(20) NOT NULL CHECK (format IN ('static', 'video')),
    palette_id VARCHAR(50) NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'generated', 'awaiting_manual_publish', 'publishing', 'published', 'failed')),
    published_manually BOOLEAN DEFAULT FALSE,
    quote TEXT NOT NULL DEFAULT '',
    quote_type VARCHAR(20) CHECK (quote_type IN ('inquiry', 'manifesto', 'insight')),
    caption TEXT DEFAULT '',
    hashtags TEXT[] DEFAULT '{}',
    alt_text TEXT DEFAULT '',
    asset_path TEXT,
    asset_url TEXT,
    platform_post_id TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote history for deduplication
CREATE TABLE IF NOT EXISTS quote_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_text TEXT NOT NULL,
    quote_type VARCHAR(20),
    post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row
    timezone VARCHAR(50) NOT NULL DEFAULT 'Europe/Lisbon',
    daily_post_count INTEGER NOT NULL DEFAULT 5,
    post_window_start VARCHAR(5) NOT NULL DEFAULT '09:00',
    post_window_end VARCHAR(5) NOT NULL DEFAULT '23:00',
    instagram_enabled BOOLEAN DEFAULT TRUE,
    tiktok_enabled BOOLEAN DEFAULT TRUE,
    auto_publish_instagram BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Instagram credentials
CREATE TABLE IF NOT EXISTS instagram_credentials (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row
    access_token TEXT NOT NULL,
    user_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    username TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Viral videos (AI-generated cinematic micro-stories)
CREATE TABLE IF NOT EXISTS viral_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
    quote TEXT,
    mood VARCHAR(50),
    scene_id VARCHAR(100),
    asset_path TEXT,
    asset_url TEXT,
    error TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_quote_history_created ON quote_history(created_at);
CREATE INDEX IF NOT EXISTS idx_viral_videos_status ON viral_videos(status);
CREATE INDEX IF NOT EXISTS idx_viral_videos_created ON viral_videos(created_at);

-- Insert default settings
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS viral_videos_updated_at ON viral_videos;
CREATE TRIGGER viral_videos_updated_at
    BEFORE UPDATE ON viral_videos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
