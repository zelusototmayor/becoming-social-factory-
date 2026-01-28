/**
 * Scene Library v2.0
 *
 * Diverse cinematic scene templates for viral videos.
 * Deliberately breaks away from repetitive patterns:
 * - No more "person centered in frame" in every shot
 * - Varied lighting (not always golden hour)
 * - Mix of environments (urban, indoor, abstract, nature)
 * - Different camera angles and movements
 * - Focus on textures, details, and unconventional compositions
 */

import type { SceneTemplate, VisualMood } from './types.js';

export const SCENE_TEMPLATES: SceneTemplate[] = [
  // ==================== QUIET DETERMINATION ====================
  {
    id: 'typewriter-keys',
    mood: 'quiet-determination',
    name: 'Typewriter Keys',
    runwayPrompt:
      'Extreme close-up of vintage typewriter keys being pressed, harsh desk lamp casting dramatic shadows, dust particles visible, deliberate methodical rhythm, black and white with slight sepia, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'typewriter',
  },
  {
    id: 'subway-commute',
    mood: 'quiet-determination',
    name: 'Subway Commute',
    runwayPrompt:
      'POV shot from inside subway car, city lights streaking past window, reflections on glass, early morning blue light, other passengers blurred in background, urban solitude, cinematic grain, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },
  {
    id: 'coffee-steam',
    mood: 'quiet-determination',
    name: 'Morning Coffee Steam',
    runwayPrompt:
      'Macro shot of steam rising from coffee cup in harsh morning sidelight, kitchen window out of focus behind, simple moment of ritual, warm tones against cool shadows, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'fade-in',
  },

  // ==================== NEW BEGINNINGS ====================
  {
    id: 'elevator-doors',
    mood: 'new-beginnings',
    name: 'Elevator Doors Opening',
    runwayPrompt:
      'Elevator doors slowly opening to reveal bright modern lobby, dramatic light spill, camera pushes forward into the light, architectural lines leading forward, clean minimalist aesthetic, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },
  {
    id: 'paint-splash',
    mood: 'new-beginnings',
    name: 'Paint Splash',
    runwayPrompt:
      'Slow motion splash of vibrant paint colors colliding and mixing, white background, abstract explosion of possibility, rich saturated colors, artistic and energetic, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'kinetic',
  },
  {
    id: 'empty-road-dawn',
    mood: 'new-beginnings',
    name: 'Empty Road at Dawn',
    runwayPrompt:
      'Low angle shot of empty desert highway stretching to horizon, first light coloring sky pink and orange, no people visible, sense of possibility, road lines leading to vanishing point, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },

  // ==================== SELF-COMPASSION ====================
  {
    id: 'hands-pottery',
    mood: 'self-compassion',
    name: 'Hands on Pottery',
    runwayPrompt:
      'Close-up of hands gently shaping wet clay on pottery wheel, soft natural light from window, meditative circular motion, texture of clay visible, warm earth tones, artisan craftwork, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'fade-in',
  },
  {
    id: 'cat-sleeping',
    mood: 'self-compassion',
    name: 'Sleeping Cat',
    runwayPrompt:
      'Intimate shot of cat sleeping peacefully in warm sunbeam, soft focus background, gentle rise and fall of breathing, cozy blanket textures, afternoon light, contentment and rest, 9:16 vertical format',
    musicMood: 'serene',
    textAnimation: 'fade-in',
  },
  {
    id: 'bath-ripples',
    mood: 'self-compassion',
    name: 'Bath Ripples',
    runwayPrompt:
      'Abstract top-down shot of finger creating ripples in bath water, soft diffused light from above, minimal and calming, water distortion effects, muted pastel tones, self-care moment, 9:16 vertical format',
    musicMood: 'serene',
    textAnimation: 'fade-in',
  },

  // ==================== STRENGTH ====================
  {
    id: 'forge-sparks',
    mood: 'strength',
    name: 'Forge Sparks',
    runwayPrompt:
      'Dramatic shot of sparks flying from blacksmith forge, orange hot metal being shaped, dark industrial environment with firelight, power and transformation, high contrast, 9:16 vertical format',
    musicMood: 'powerful',
    textAnimation: 'kinetic',
  },
  {
    id: 'concrete-crack',
    mood: 'strength',
    name: 'Flower Through Concrete',
    runwayPrompt:
      'Low angle macro shot of small plant breaking through cracked concrete, harsh midday sun creating strong shadows, urban resilience, determination in nature, gritty texture detail, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },
  {
    id: 'boxing-gym',
    mood: 'strength',
    name: 'Boxing Gym',
    runwayPrompt:
      'Speed bag being hit in rhythm, harsh overhead gym lighting, dust and sweat particles visible, raw industrial space, no face visible just motion and impact, powerful and visceral, 9:16 vertical format',
    musicMood: 'powerful',
    textAnimation: 'kinetic',
  },

  // ==================== REFLECTION ====================
  {
    id: 'record-spinning',
    mood: 'reflection',
    name: 'Vinyl Record Spinning',
    runwayPrompt:
      'Close-up of vinyl record spinning on turntable, needle in groove, warm lamp light reflecting on surface, nostalgic atmosphere, slow meditative rotation, music visible in grooves, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },
  {
    id: 'rain-taxi',
    mood: 'reflection',
    name: 'Rainy Taxi Window',
    runwayPrompt:
      'Interior shot looking out rain-covered taxi window at night city, neon lights distorted through water droplets, urban isolation, contemplative journey, blue and orange contrast, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },
  {
    id: 'empty-theater',
    mood: 'reflection',
    name: 'Empty Theater',
    runwayPrompt:
      'Single spotlight on empty theater stage, dust particles floating in light beam, rows of empty red velvet seats, dramatic darkness around edges, potential and silence, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'typewriter',
  },

  // ==================== ACTION ====================
  {
    id: 'keyboard-typing',
    mood: 'action',
    name: 'Fast Typing',
    runwayPrompt:
      'Dynamic close-up of fingers rapidly typing on modern keyboard, shallow depth of field, screen glow reflecting on keys, productive energy, slight camera shake, midnight work session, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'kinetic',
  },
  {
    id: 'subway-rush',
    mood: 'action',
    name: 'Subway Rush',
    runwayPrompt:
      'Low angle shot of feet rushing past on subway platform, motion blur, harsh fluorescent lighting, urban momentum, time-lapse feeling of movement, steel and concrete textures, 9:16 vertical format',
    musicMood: 'powerful',
    textAnimation: 'kinetic',
  },
  {
    id: 'paper-crumple',
    mood: 'action',
    name: 'Paper Crumple to Throw',
    runwayPrompt:
      'Slow motion of hand crumpling paper and throwing it, frustration turning to action, office environment with dramatic side light, restart moment, creative process, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },

  // ==================== WISDOM ====================
  {
    id: 'old-hands-book',
    mood: 'wisdom',
    name: 'Weathered Hands on Book',
    runwayPrompt:
      'Close-up of aged weathered hands turning pages of old book, warm reading lamp light, shallow depth of field, texture of skin and paper, lifetime of knowledge, intimate and quiet, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'typewriter',
  },
  {
    id: 'chess-move',
    mood: 'wisdom',
    name: 'Chess Move',
    runwayPrompt:
      'Dramatic overhead shot of hand making chess move, pieces casting long shadows, strategic thinking visible, dark wood and marble textures, decisive moment, contemplative atmosphere, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },
  {
    id: 'city-aerial-night',
    mood: 'wisdom',
    name: 'City Grid at Night',
    runwayPrompt:
      'Aerial shot of city grid at night, lights forming patterns like circuits, perspective of scale and connection, slow drone drift, urban constellation, understanding the bigger picture, 9:16 vertical format',
    musicMood: 'serene',
    textAnimation: 'fade-in',
  },

  // ==================== HOPE ====================
  {
    id: 'seedling-timelapse',
    mood: 'hope',
    name: 'Seedling Growing',
    runwayPrompt:
      'Time-lapse style of seedling pushing through dark soil, unfurling first leaves toward light, transformation in progress, life emerging, simple miracle, warm grow light, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },
  {
    id: 'tunnel-exit',
    mood: 'hope',
    name: 'Tunnel to Light',
    runwayPrompt:
      'POV walking through dark tunnel toward bright circular exit, light growing stronger with each step, architectural lines converging, transition from dark to light, hopeful emergence, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'word-by-word',
  },
  {
    id: 'balloon-release',
    mood: 'hope',
    name: 'Balloon Release',
    runwayPrompt:
      'Single red balloon floating upward against blue sky, shot from below looking up, simple and joyful, childhood wonder, letting go, endless sky above, 9:16 vertical format',
    musicMood: 'uplifting-gentle',
    textAnimation: 'reveal',
  },
  {
    id: 'first-light-curtains',
    mood: 'hope',
    name: 'First Light Through Curtains',
    runwayPrompt:
      'Soft morning light slowly filling room through sheer curtains, no people visible, gentle illumination spreading, new day beginning, peaceful awakening, subtle dust particles dancing, 9:16 vertical format',
    musicMood: 'gentle-piano',
    textAnimation: 'fade-in',
  },

  // ==================== BONUS: ABSTRACT/UNCONVENTIONAL ====================
  {
    id: 'ink-water',
    mood: 'reflection',
    name: 'Ink in Water',
    runwayPrompt:
      'Macro shot of black ink slowly dispersing in clear water, abstract flowing forms, mesmerizing organic movement, high contrast black on white, thoughts becoming form, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'fade-in',
  },
  {
    id: 'neon-puddle',
    mood: 'action',
    name: 'Neon Puddle Reflection',
    runwayPrompt:
      'Street-level shot of neon signs reflected in rain puddle, distorted colors on wet asphalt, urban night energy, abstract light painting, cyberpunk aesthetic without people, 9:16 vertical format',
    musicMood: 'powerful',
    textAnimation: 'kinetic',
  },
  {
    id: 'sand-hourglass',
    mood: 'wisdom',
    name: 'Hourglass Sand',
    runwayPrompt:
      'Extreme close-up of sand falling through hourglass, individual grains visible, time made tangible, warm amber tones, macro lens detail, meditative observation of time passing, 9:16 vertical format',
    musicMood: 'contemplative',
    textAnimation: 'typewriter',
  },
  {
    id: 'match-strike',
    mood: 'new-beginnings',
    name: 'Match Strike',
    runwayPrompt:
      'Slow motion of match being struck, first spark igniting into flame, dramatic darkness around single light source, moment of creation, fire coming to life, transformation instant, 9:16 vertical format',
    musicMood: 'epic-building',
    textAnimation: 'reveal',
  },
];

/**
 * Track recently used scenes to avoid repetition
 */
let recentlyUsedSceneIds: string[] = [];
const MAX_RECENT_SCENES = 8;

/**
 * Get scenes by mood
 */
export function getScenesByMood(mood: VisualMood): SceneTemplate[] {
  return SCENE_TEMPLATES.filter((s) => s.mood === mood);
}

/**
 * Get a random scene for a mood, avoiding recent repetition
 */
export function getRandomSceneForMood(mood: VisualMood): SceneTemplate {
  const scenes = getScenesByMood(mood);
  if (scenes.length === 0) {
    // Fallback to any scene
    const available = SCENE_TEMPLATES.filter(s => !recentlyUsedSceneIds.includes(s.id));
    const pool = available.length > 0 ? available : SCENE_TEMPLATES;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    trackSceneUsage(selected.id);
    return selected;
  }

  // Filter out recently used scenes
  const availableScenes = scenes.filter(s => !recentlyUsedSceneIds.includes(s.id));
  const pool = availableScenes.length > 0 ? availableScenes : scenes;
  
  const selected = pool[Math.floor(Math.random() * pool.length)];
  trackSceneUsage(selected.id);
  return selected;
}

/**
 * Track scene usage to prevent repetition
 */
function trackSceneUsage(sceneId: string): void {
  recentlyUsedSceneIds.push(sceneId);
  if (recentlyUsedSceneIds.length > MAX_RECENT_SCENES) {
    recentlyUsedSceneIds.shift();
  }
}

/**
 * Get scene by ID
 */
export function getSceneById(id: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES.find((s) => s.id === id);
}

/**
 * Reset the recently used tracker (useful for testing)
 */
export function resetRecentScenes(): void {
  recentlyUsedSceneIds = [];
}
