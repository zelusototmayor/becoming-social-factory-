/**
 * Scene Mapper
 *
 * Uses GPT to analyze quotes and generate dynamic, cinematic scene prompts.
 * Creates tailored visual scenes for each quote rather than using fixed templates.
 */

import OpenAI from 'openai';
import { config } from '../config.js';
import { getRandomSceneForMood } from './sceneLibrary.js';
import type { VisualMood, SceneConfig, DynamicSceneConfig, MusicMood, TextAnimation } from './types.js';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

interface QuoteAnalysis {
  mood: VisualMood;
  hookText: string;
  reasoning: string;
}

interface DynamicSceneAnalysis {
  mood: VisualMood;
  scenePrompt: string;
  musicMood: MusicMood;
  textAnimation: TextAnimation;
  reasoning: string;
}

const MOOD_MAPPING_PROMPT = `You are analyzing a motivational quote to determine the best visual mood for a cinematic video.

Available moods:
- quiet-determination: For quotes about perseverance, patience, slow progress
- new-beginnings: For quotes about fresh starts, change, transformation
- self-compassion: For quotes about self-love, acceptance, gentleness
- strength: For quotes about power, resilience, overcoming
- reflection: For quotes about introspection, mindfulness, awareness
- action: For quotes about taking steps, doing, momentum
- wisdom: For quotes about knowledge, understanding, perspective
- hope: For quotes about optimism, future, possibility

Also create a short "hook text" (3-5 words) that teases the quote without giving it away.

Respond in JSON format:
{
  "mood": "mood-name",
  "hookText": "short teaser",
  "reasoning": "brief explanation"
}`;

const DYNAMIC_SCENE_PROMPT = `You are a cinematic director creating a visual scene for a 10-second motivational video.

Given a quote, generate a dynamic, cinematic scene prompt for AI video generation (Runway Gen-3).

SCENE PRINCIPLES:
1. Visual metaphor: The scene should visually represent the quote's message
2. Subtle movement: Runway works best with slow, deliberate camera movements
3. Emotional resonance: The atmosphere should match the quote's emotional tone
4. Vertical format: 9:16 aspect ratio (mobile/TikTok/Reels)
5. Professional quality: Cinematic lighting, dramatic composition

CAMERA MOVEMENTS (pick one that fits):
- Slow dolly forward: Creates intimacy, moving toward revelation
- Gentle parallax: Subtle depth, contemplative feeling
- Slow tilt up: Reveals hope, possibility, growth
- Static with subtle movement: Let the subject's motion tell the story
- Slow orbit: 360 contemplation, examining from all angles

LIGHTING STYLES:
- Golden hour: Warm, hopeful, new beginnings
- Blue hour: Contemplative, serene, introspective
- Dramatic side light: Contrast, strength, determination
- Soft diffused: Gentle, compassionate, accepting
- Rim light silhouette: Mystery, power, emergence

SCENE ELEMENTS to consider:
- Natural elements (water, light, sky, trees, mountains)
- Human silhouettes (when appropriate)
- Abstract elements (light rays, particles, fog)
- Architectural elements (paths, doorways, horizons)

Music mood options:
- epic-building: For powerful, crescendo moments
- uplifting-gentle: For hopeful, soft inspiration
- contemplative: For deep, reflective content
- powerful: For strength and determination
- serene: For calm, peaceful messages
- gentle-piano: For intimate, personal content

Text animation options:
- fade-in: Gentle appearance
- typewriter: Letter by letter reveal
- word-by-word: Each word appears sequentially
- kinetic: Dynamic movement
- reveal: Dramatic unveiling

Respond in JSON format:
{
  "mood": "one of the mood options",
  "scenePrompt": "detailed cinematic scene description for Runway (50-100 words)",
  "musicMood": "one of the music options",
  "textAnimation": "one of the animation options",
  "reasoning": "brief explanation of choices"
}`;

/**
 * Analyze a quote and determine the best visual mood (legacy function)
 */
export async function analyzeQuote(quote: string): Promise<QuoteAnalysis> {
  if (!openai) {
    return fallbackAnalysis(quote);
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: MOOD_MAPPING_PROMPT },
        { role: 'user', content: `Analyze this quote: "${quote}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 200,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    return {
      mood: result.mood || 'hope',
      hookText: result.hookText || 'What if...',
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('GPT analysis failed, using fallback:', error);
    return fallbackAnalysis(quote);
  }
}

/**
 * Generate a dynamic scene configuration with AI-generated scene prompt
 */
export async function generateDynamicScene(quote: string): Promise<DynamicSceneAnalysis> {
  if (!openai) {
    return fallbackDynamicScene(quote);
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: DYNAMIC_SCENE_PROMPT },
        { role: 'user', content: `Create a cinematic scene for this quote:\n\n"${quote}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Higher creativity for visual scenes
      max_tokens: 400,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate and normalize values
    const validMoods: VisualMood[] = ['quiet-determination', 'new-beginnings', 'self-compassion', 'strength', 'reflection', 'action', 'wisdom', 'hope'];
    const validMusicMoods: MusicMood[] = ['epic-building', 'uplifting-gentle', 'contemplative', 'powerful', 'serene', 'gentle-piano'];
    const validAnimations: TextAnimation[] = ['fade-in', 'typewriter', 'word-by-word', 'kinetic', 'reveal'];

    return {
      mood: validMoods.includes(result.mood) ? result.mood : 'hope',
      scenePrompt: result.scenePrompt || fallbackDynamicScene(quote).scenePrompt,
      musicMood: validMusicMoods.includes(result.musicMood) ? result.musicMood : 'uplifting-gentle',
      textAnimation: validAnimations.includes(result.textAnimation) ? result.textAnimation : 'fade-in',
      reasoning: result.reasoning || '',
    };
  } catch (error) {
    console.error('Dynamic scene generation failed, using fallback:', error);
    return fallbackDynamicScene(quote);
  }
}

/**
 * Fallback dynamic scene generation
 */
function fallbackDynamicScene(quote: string): DynamicSceneAnalysis {
  const analysis = fallbackAnalysis(quote);

  // Generate a basic scene prompt based on mood
  const moodScenes: Record<VisualMood, string> = {
    'quiet-determination': 'Cinematic shot of a lone figure walking along a misty mountain path at dawn. Slow dolly forward. Golden hour light breaks through clouds. Dramatic shadows and volumetric lighting. 9:16 vertical format.',
    'new-beginnings': 'Sunrise over a calm ocean, golden light reflecting on water. Camera slowly tilts up to reveal expansive sky. Warm, hopeful atmosphere. Lens flare and soft particles in air. Vertical mobile format.',
    'self-compassion': 'Soft morning light streaming through window curtains. Gentle dust particles floating in air. Slow subtle camera movement. Warm, intimate atmosphere. Soft focus and diffused lighting.',
    'strength': 'Dramatic silhouette against stormy sky. Lightning illuminates clouds in background. Powerful rim lighting. Slow camera orbit. Epic cinematic atmosphere. Vertical format.',
    'reflection': 'Person sitting by still lake at blue hour. Mirror-like water reflection. Subtle fog rising. Contemplative atmosphere. Slow parallax camera movement. Serene and peaceful.',
    'action': 'Dynamic low angle shot of feet running on wet pavement. Slow motion water splashes. Dramatic side lighting. Energy and momentum. Urban environment at golden hour.',
    'wisdom': 'Ancient tree in ethereal forest. Rays of light piercing through canopy. Mystical atmosphere with floating particles. Slow upward tilt. Nature and timelessness.',
    'hope': 'Hands reaching toward bright light from darkness. Dramatic god rays. Transition from shadow to illumination. Powerful emotional moment. Vertical cinematic composition.',
  };

  const moodMusic: Record<VisualMood, MusicMood> = {
    'quiet-determination': 'contemplative',
    'new-beginnings': 'uplifting-gentle',
    'self-compassion': 'gentle-piano',
    'strength': 'powerful',
    'reflection': 'contemplative',
    'action': 'epic-building',
    'wisdom': 'serene',
    'hope': 'uplifting-gentle',
  };

  return {
    mood: analysis.mood,
    scenePrompt: moodScenes[analysis.mood],
    musicMood: moodMusic[analysis.mood],
    textAnimation: 'fade-in',
    reasoning: 'Fallback scene generation based on keyword analysis',
  };
}

/**
 * Fallback keyword-based mood analysis
 */
function fallbackAnalysis(quote: string): QuoteAnalysis {
  const lowerQuote = quote.toLowerCase();

  const moodKeywords: Record<VisualMood, string[]> = {
    'quiet-determination': ['persist', 'patience', 'steady', 'step by step', 'slowly'],
    'new-beginnings': ['begin', 'start', 'change', 'transform', 'fresh', 'new'],
    'self-compassion': ['gentle', 'kind', 'accept', 'love yourself', 'forgive'],
    strength: ['strong', 'power', 'overcome', 'resilient', 'courage', 'brave'],
    reflection: ['think', 'consider', 'aware', 'mindful', 'present', 'notice'],
    action: ['do', 'act', 'move', 'take', 'create', 'build', 'make'],
    wisdom: ['know', 'understand', 'learn', 'wisdom', 'truth', 'realize'],
    hope: ['hope', 'possible', 'future', 'dream', 'believe', 'tomorrow'],
  };

  let bestMood: VisualMood = 'hope';
  let maxMatches = 0;

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    const matches = keywords.filter((kw) => lowerQuote.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMood = mood as VisualMood;
    }
  }

  // Generate simple hook text
  const words = quote.split(' ').slice(0, 3);
  const hookText = words.length >= 2 ? `${words[0]} ${words[1]}...` : 'What if...';

  return {
    mood: bestMood,
    hookText,
    reasoning: 'Keyword-based analysis',
  };
}

/**
 * Get a complete scene configuration for a quote (legacy function)
 */
export async function getSceneForQuote(quote: string): Promise<SceneConfig> {
  const analysis = await analyzeQuote(quote);
  const scene = getRandomSceneForMood(analysis.mood);

  return {
    mood: analysis.mood,
    scenePrompt: scene.runwayPrompt,
    musicMood: scene.musicMood,
    textAnimation: scene.textAnimation,
    hookText: analysis.hookText,
  };
}

/**
 * Get a dynamic scene configuration with AI-generated prompt
 */
export async function getDynamicSceneForQuote(quote: string): Promise<DynamicSceneConfig> {
  const analysis = await generateDynamicScene(quote);

  return {
    mood: analysis.mood,
    scenePrompt: analysis.scenePrompt,
    musicMood: analysis.musicMood,
    textAnimation: analysis.textAnimation,
    dynamicPrompt: analysis.scenePrompt,
  };
}
