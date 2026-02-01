/**
 * Avatar Personas
 *
 * Diverse avatar library for rotating UGC content.
 * Each persona has specific demographics and vibes for authentic-feeling content.
 *
 * NOTE: Avatar IDs are placeholders - you'll need to update these with actual
 * HeyGen avatar IDs from your account after signing up.
 */

import type { AvatarPersona, ContentTheme } from './types.js';

// Avatar personas for The Becoming App
// These match the research recommendations for wellness app UGC
export const AVATAR_PERSONAS: AvatarPersona[] = [
  {
    id: 'maya',
    heygenAvatarId: 'Anna_public_3_20240108', // Update with actual ID
    name: 'Maya',
    demographic: 'Woman, 25-30, creative professional',
    vibe: 'Artsy, calm, thoughtful',
    bestFor: ['mindfulness', 'self-compassion', 'daily-reflection'],
  },
  {
    id: 'jake',
    heygenAvatarId: 'josh_lite3_20230714', // Update with actual ID
    name: 'Jake',
    demographic: 'Man, 30-35, busy professional',
    vibe: 'Energetic but wellness-aware',
    bestFor: ['morning-routine', 'stress-relief', 'breathing-exercises'],
  },
  {
    id: 'sonia',
    heygenAvatarId: 'Kristin_public_2_20240108', // Update with actual ID
    name: 'Sonia',
    demographic: 'Woman, 20-25, student/young professional',
    vibe: 'Relatable, honest about struggles',
    bestFor: ['anxiety-management', 'emotional-awareness', 'stress-relief'],
  },
  {
    id: 'marcus',
    heygenAvatarId: 'Wayne_20240711', // Update with actual ID
    name: 'Marcus',
    demographic: 'Man, 40-45, parent/executive',
    vibe: 'Grounded, seeking balance',
    bestFor: ['morning-routine', 'breathing-exercises', 'daily-reflection'],
  },
  {
    id: 'zoe',
    heygenAvatarId: 'Daisy-inskirt-20220818', // Update with actual ID
    name: 'Zoe',
    demographic: 'Woman, 35-40, wellness enthusiast',
    vibe: 'Authentic, warm, experienced',
    bestFor: ['mindfulness', 'self-compassion', 'emotional-awareness'],
  },
];

// Track last used avatars to avoid repetition
let recentAvatarIds: string[] = [];
const AVOID_REPEAT_COUNT = 3; // Don't repeat same avatar within 3 videos

/**
 * Get the next avatar in rotation, avoiding recent ones
 */
export function getNextAvatar(preferredTheme?: ContentTheme): AvatarPersona {
  // Find avatars that match the theme (if specified) and haven't been used recently
  const availableAvatars = AVATAR_PERSONAS.filter(
    (avatar) =>
      !recentAvatarIds.slice(-AVOID_REPEAT_COUNT).includes(avatar.id) &&
      (!preferredTheme || avatar.bestFor.includes(preferredTheme))
  );

  // If all matching avatars were recently used, just pick any non-recent one
  const candidates =
    availableAvatars.length > 0
      ? availableAvatars
      : AVATAR_PERSONAS.filter(
          (a) => !recentAvatarIds.slice(-AVOID_REPEAT_COUNT).includes(a.id)
        );

  // If somehow all avatars are recent (very small list), just pick randomly
  const finalCandidates = candidates.length > 0 ? candidates : AVATAR_PERSONAS;

  // Random selection from candidates
  const selected = finalCandidates[Math.floor(Math.random() * finalCandidates.length)];

  // Track this selection
  recentAvatarIds.push(selected.id);
  if (recentAvatarIds.length > 10) {
    recentAvatarIds = recentAvatarIds.slice(-10);
  }

  return selected;
}

/**
 * Get a specific avatar by ID
 */
export function getAvatarById(id: string): AvatarPersona | undefined {
  return AVATAR_PERSONAS.find((a) => a.id === id);
}

/**
 * Get all avatars that match a theme
 */
export function getAvatarsForTheme(theme: ContentTheme): AvatarPersona[] {
  return AVATAR_PERSONAS.filter((a) => a.bestFor.includes(theme));
}

/**
 * Reset the rotation (useful for testing)
 */
export function resetAvatarRotation(): void {
  recentAvatarIds = [];
}

/**
 * Map content theme to best matching avatars
 * Returns avatars sorted by relevance
 */
export function matchAvatarToContent(
  theme: ContentTheme,
  scriptTemplate: string
): AvatarPersona {
  // Score each avatar based on theme match and variety
  const scored = AVATAR_PERSONAS.map((avatar) => {
    let score = 0;

    // Theme match (primary factor)
    if (avatar.bestFor.includes(theme)) {
      score += 10;
    }

    // Variety bonus (prefer less recently used)
    const lastUsedIndex = recentAvatarIds.lastIndexOf(avatar.id);
    if (lastUsedIndex === -1) {
      score += 5; // Never used recently
    } else {
      score += Math.min(recentAvatarIds.length - lastUsedIndex, 5);
    }

    // Template-specific matching
    if (scriptTemplate === 'skeptic-believer' && avatar.vibe.includes('honest')) {
      score += 3;
    }
    if (scriptTemplate === 'morning-routine' && avatar.bestFor.includes('morning-routine')) {
      score += 3;
    }
    if (scriptTemplate === 'therapist-recommended' && avatar.vibe.includes('professional')) {
      score += 3;
    }

    return { avatar, score };
  });

  // Sort by score and pick the best
  scored.sort((a, b) => b.score - a.score);
  const selected = scored[0].avatar;

  // Track selection
  recentAvatarIds.push(selected.id);
  if (recentAvatarIds.length > 10) {
    recentAvatarIds = recentAvatarIds.slice(-10);
  }

  return selected;
}
