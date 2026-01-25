/**
 * Scene Library
 *
 * Predefined cinematic scene templates for viral videos.
 * Each scene is optimized for specific emotional moods.
 */

import type { SceneTemplate, VisualMood } from './types.js';

export const SCENE_TEMPLATES: SceneTemplate[] = [
  // QUIET DETERMINATION
  {
    id: 'foggy-mountain-walk',
    mood: 'quiet-determination',
    name: 'Foggy Mountain Walk',
    runwayPrompt:
      'Cinematic shot of a solitary person walking on a misty mountain path at dawn, fog rolling through valleys, golden hour light breaking through, slow motion, atmospheric, 9:16 vertical format, film grain',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },
  {
    id: 'rain-window-reflection',
    mood: 'quiet-determination',
    name: 'Rain Window Reflection',
    runwayPrompt:
      'Close-up of rain drops on window glass, blurred city lights beyond, person silhouette visible in reflection, moody blue tones, cinematic depth of field, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },

  // NEW BEGINNINGS
  {
    id: 'sunrise-ocean',
    mood: 'new-beginnings',
    name: 'Sunrise Over Ocean',
    runwayPrompt:
      'Breathtaking sunrise over calm ocean, golden light spreading across water, silhouette of person standing at shore edge, waves gently lapping, cinematic wide shot, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },
  {
    id: 'desert-dawn',
    mood: 'new-beginnings',
    name: 'Desert Dawn',
    runwayPrompt:
      'First light hitting desert dunes, warm orange and pink gradients, lone figure walking toward horizon, sand particles floating in light beams, epic scale, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },

  // SELF-COMPASSION
  {
    id: 'soft-morning-light',
    mood: 'self-compassion',
    name: 'Soft Morning Light',
    runwayPrompt:
      'Soft morning sunlight streaming through sheer curtains into peaceful room, dust particles floating in light beams, warm golden tones, gentle and calming, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'fade-in',
  },
  {
    id: 'garden-rain',
    mood: 'self-compassion',
    name: 'Garden After Rain',
    runwayPrompt:
      'Close-up of flower petals with morning dew drops, soft bokeh background of green garden, water droplets catching light, fresh and peaceful atmosphere, 9:16 vertical format',
    musicMood: 'serene',
    textAnimation: 'typewriter',
  },

  // STRENGTH
  {
    id: 'storm-cliffs',
    mood: 'strength',
    name: 'Storm at the Cliffs',
    runwayPrompt:
      'Dramatic waves crashing against rocky cliffs, person standing firm at cliff edge, dark storm clouds with light breaking through, powerful and majestic, 9:16 vertical format',
    musicMood: 'powerful',
    textAnimation: 'kinetic',
  },
  {
    id: 'mountain-summit',
    mood: 'strength',
    name: 'Mountain Summit',
    runwayPrompt:
      'Person reaching mountain summit, arms raised in triumph, vast landscape below shrouded in clouds, golden hour light, epic achievement moment, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },

  // REFLECTION
  {
    id: 'lake-mirror',
    mood: 'reflection',
    name: 'Mirror Lake',
    runwayPrompt:
      'Still lake perfectly reflecting mountains and sky, person sitting at water edge in meditation pose, early morning mist, serene and contemplative, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },
  {
    id: 'forest-path',
    mood: 'reflection',
    name: 'Forest Path',
    runwayPrompt:
      'Sunlight filtering through dense forest canopy, person walking slowly on winding path, rays of light creating patterns, peaceful and introspective, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'typewriter',
  },

  // ACTION
  {
    id: 'city-motion',
    mood: 'action',
    name: 'City in Motion',
    runwayPrompt:
      'Time-lapse style busy city intersection at night, lights streaking, one person standing still while world moves around them, neon reflections on wet streets, 9:16 vertical format',
    musicMood: 'powerful',
    textAnimation: 'kinetic',
  },
  {
    id: 'running-dawn',
    mood: 'action',
    name: 'Running at Dawn',
    runwayPrompt:
      'Athletic person running along empty road at dawn, slow motion, breath visible in cold air, determination on face, golden light behind, cinematic, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },

  // WISDOM
  {
    id: 'ancient-library',
    mood: 'wisdom',
    name: 'Ancient Library',
    runwayPrompt:
      'Grand old library with towering bookshelves, warm lamp light, dust particles floating, person reading by window, timeless atmosphere, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'typewriter',
  },
  {
    id: 'starry-night',
    mood: 'wisdom',
    name: 'Starry Night',
    runwayPrompt:
      'Person gazing up at vast starry sky, milky way visible, silhouette against cosmic backdrop, sense of wonder and perspective, 9:16 vertical format',
    musicMood: 'serene',
    textAnimation: 'fade-in',
  },

  // HOPE
  {
    id: 'breaking-clouds',
    mood: 'hope',
    name: 'Breaking Through Clouds',
    runwayPrompt:
      'Dramatic clouds parting to reveal brilliant sunlight, rays streaming down like spotlights, aerial perspective, heavenly and hopeful atmosphere, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },
  {
    id: 'spring-bloom',
    mood: 'hope',
    name: 'Spring Bloom',
    runwayPrompt:
      'Cherry blossoms falling gently in slow motion, person looking up with peaceful expression, soft pink petals against blue sky, renewal and hope, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'fade-in',
  },
  {
    id: 'lighthouse-storm',
    mood: 'hope',
    name: 'Lighthouse in Storm',
    runwayPrompt:
      'Lighthouse beam cutting through dark stormy night, waves crashing below, beacon of hope in darkness, dramatic lighting, cinematic, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },
  {
    id: 'child-wonder',
    mood: 'hope',
    name: 'Child Wonder',
    runwayPrompt:
      'Child releasing butterfly into sunlit meadow, sense of wonder and innocence, soft focus background of wildflowers, warm afternoon light, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },
];

/**
 * Get scenes by mood
 */
export function getScenesByMood(mood: VisualMood): SceneTemplate[] {
  return SCENE_TEMPLATES.filter((s) => s.mood === mood);
}

/**
 * Get a random scene for a mood
 */
export function getRandomSceneForMood(mood: VisualMood): SceneTemplate {
  const scenes = getScenesByMood(mood);
  if (scenes.length === 0) {
    // Fallback to any scene
    return SCENE_TEMPLATES[Math.floor(Math.random() * SCENE_TEMPLATES.length)];
  }
  return scenes[Math.floor(Math.random() * scenes.length)];
}

/**
 * Get scene by ID
 */
export function getSceneById(id: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES.find((s) => s.id === id);
}
