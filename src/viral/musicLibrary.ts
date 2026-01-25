/**
 * Music Library
 *
 * Manages background music tracks for viral videos.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config.js';
import type { MusicTrack, MusicMood } from './types.js';

// Predefined music tracks (you'll add actual files)
const MUSIC_TRACKS: MusicTrack[] = [
  // Epic Building
  { id: 'epic-rise-01', mood: 'epic-building', filename: 'epic-rise-01.mp3', duration: 60 },
  { id: 'cinematic-build-01', mood: 'epic-building', filename: 'cinematic-build-01.mp3', duration: 45 },

  // Uplifting Gentle
  { id: 'morning-hope-01', mood: 'uplifting-gentle', filename: 'morning-hope-01.mp3', duration: 60 },
  { id: 'new-day-01', mood: 'uplifting-gentle', filename: 'new-day-01.mp3', duration: 45 },

  // Contemplative
  { id: 'deep-thought-01', mood: 'contemplative', filename: 'deep-thought-01.mp3', duration: 60 },
  { id: 'reflection-01', mood: 'contemplative', filename: 'reflection-01.mp3', duration: 45 },

  // Powerful
  { id: 'triumph-01', mood: 'powerful', filename: 'triumph-01.mp3', duration: 60 },

  // Serene
  { id: 'peaceful-01', mood: 'serene', filename: 'peaceful-01.mp3', duration: 60 },

  // Gentle Piano
  { id: 'soft-piano-01', mood: 'gentle-piano', filename: 'soft-piano-01.mp3', duration: 60 },
  { id: 'reflective-keys-01', mood: 'gentle-piano', filename: 'reflective-keys-01.mp3', duration: 45 },
];

/**
 * Get the music directory path
 */
function getMusicDir(): string {
  return path.join(config.outputDir, '..', 'assets', 'music');
}

/**
 * Check if a music file exists
 */
function trackExists(track: MusicTrack): boolean {
  const filePath = path.join(getMusicDir(), track.filename);
  return fs.existsSync(filePath);
}

/**
 * Get available tracks for a mood
 */
export function getAvailableTracksForMood(mood: MusicMood): MusicTrack[] {
  return MUSIC_TRACKS.filter((t) => t.mood === mood && trackExists(t));
}

/**
 * Get all available tracks
 */
export function getAllAvailableTracks(): MusicTrack[] {
  return MUSIC_TRACKS.filter(trackExists);
}

/**
 * Select a track for a video
 */
export function selectTrackForVideo(
  mood: MusicMood,
  videoDuration: number
): { track: MusicTrack; path: string } | null {
  const tracks = getAvailableTracksForMood(mood);

  if (tracks.length === 0) {
    // Try any available track
    const anyTracks = getAllAvailableTracks();
    if (anyTracks.length === 0) {
      return null;
    }
    const track = anyTracks[Math.floor(Math.random() * anyTracks.length)];
    return {
      track,
      path: path.join(getMusicDir(), track.filename),
    };
  }

  // Prefer tracks longer than video duration
  const suitableTracks = tracks.filter((t) => t.duration >= videoDuration);
  const selectedTracks = suitableTracks.length > 0 ? suitableTracks : tracks;

  const track = selectedTracks[Math.floor(Math.random() * selectedTracks.length)];
  return {
    track,
    path: path.join(getMusicDir(), track.filename),
  };
}

/**
 * Get music library status
 */
export function getMusicStatus(): { available: number; total: number; moods: Record<string, number> } {
  const available = getAllAvailableTracks();
  const moodCounts: Record<string, number> = {};

  for (const track of available) {
    moodCounts[track.mood] = (moodCounts[track.mood] || 0) + 1;
  }

  return {
    available: available.length,
    total: MUSIC_TRACKS.length,
    moods: moodCounts,
  };
}
