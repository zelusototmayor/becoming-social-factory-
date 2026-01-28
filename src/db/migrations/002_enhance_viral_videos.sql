-- Migration: Enhance viral_videos table
-- Run: psql $DATABASE_URL < src/db/migrations/002_enhance_viral_videos.sql

-- Add quote_type column to viral_videos
ALTER TABLE viral_videos ADD COLUMN IF NOT EXISTS quote_type VARCHAR(20);

-- Add caption column to viral_videos
ALTER TABLE viral_videos ADD COLUMN IF NOT EXISTS caption TEXT;

-- Add hashtags column to viral_videos (array of text)
ALTER TABLE viral_videos ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- Update status column to allow 'published' status
ALTER TABLE viral_videos ALTER COLUMN status TYPE VARCHAR(30);
ALTER TABLE viral_videos DROP CONSTRAINT IF EXISTS viral_videos_status_check;
ALTER TABLE viral_videos ADD CONSTRAINT viral_videos_status_check
  CHECK (status IN ('pending', 'generating', 'ready', 'published', 'failed'));

-- Create index on scheduled_at for date-based queries
CREATE INDEX IF NOT EXISTS idx_viral_videos_scheduled_at ON viral_videos(scheduled_at);
