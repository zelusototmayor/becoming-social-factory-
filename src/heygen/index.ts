/**
 * HeyGen AI UGC Module
 *
 * Replaces Runway viral videos with HeyGen-generated AI UGC content.
 * Creates authentic-looking testimonial videos with AI avatars.
 *
 * Pipeline: Theme → Script → Avatar → HeyGen → Video
 *
 * @example
 * ```typescript
 * import { generateHeyGenVideo, checkHeyGenStatus } from './heygen';
 *
 * // Check if ready
 * const status = await checkHeyGenStatus();
 * if (!status.ready) {
 *   console.log('Issues:', status.issues);
 *   return;
 * }
 *
 * // Generate a video
 * const result = await generateHeyGenVideo({
 *   theme: 'anxiety-management',
 *   onProgress: (data) => console.log(data.message),
 * });
 *
 * if (result.success) {
 *   console.log('Video:', result.outputPath);
 *   console.log('Caption:', result.caption);
 * }
 * ```
 */

// Main exports
export {
  generateHeyGenVideo,
  checkHeyGenStatus,
  estimateHeyGenCost,
} from './videoGenerator.js';

// Client exports (for direct API access)
export {
  isHeyGenAvailable,
  listAvatars,
  listVoices,
  testConnection,
} from './client.js';

// Script generation exports
export {
  generateScript,
  generateCaption,
  selectTheme,
  selectTemplate,
  SCRIPT_TEMPLATES,
  THEME_KEYWORDS,
} from './scriptGenerator.js';

// Avatar exports
export {
  AVATAR_PERSONAS,
  getNextAvatar,
  getAvatarById,
  getAvatarsForTheme,
  matchAvatarToContent,
  resetAvatarRotation,
} from './avatars.js';

// Type exports
export type {
  AvatarPersona,
  UGCScript,
  ScriptTemplate,
  ContentTheme,
  HeyGenVideoRequest,
  HeyGenVideoResponse,
  HeyGenVideoStatus,
  HeyGenVideoResult,
  ProgressData,
  ProgressCallback,
} from './types.js';
