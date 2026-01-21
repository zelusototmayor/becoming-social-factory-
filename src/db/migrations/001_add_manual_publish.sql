-- Migration: Add awaiting_manual_publish status and published_manually column
-- Run: psql $DATABASE_URL < src/db/migrations/001_add_manual_publish.sql

-- Increase status column size for longer status values
ALTER TABLE posts ALTER COLUMN status TYPE VARCHAR(30);

-- Add new status value (need to drop and recreate the constraint)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('pending', 'generating', 'generated', 'awaiting_manual_publish', 'publishing', 'published', 'failed'));

-- Add manual publish tracking column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_manually BOOLEAN DEFAULT FALSE;
