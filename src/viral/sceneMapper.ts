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

const DYNAMIC_SCENE_PROMPT = `You are a bold cinematic director creating a UNIQUE visual scene for a 10-second motivational video.

Your job is to generate FRESH, UNEXPECTED scenes that stand out from typical AI-generated content.

⚠️ AVOID THESE OVERUSED CLICHÉS (they look "AI-generated"):
- Person standing centered in frame / silhouettes
- Golden hour / sunset / sunrise lighting
- Ocean waves / beaches / lakes with reflections
- Mountains with mist/fog
- Person on cliff edge or shore
- Floating particles in light beams
- Soft ethereal glowing atmosphere
- Cherry blossoms / flowers in slow motion
- Stars/milky way with silhouette gazing up

✅ INSTEAD, TRY THESE FRESH APPROACHES:

ENVIRONMENTS (vary these!):
- Urban: subway, elevator, rooftop, neon streets, empty parking garage
- Indoor: workshop, kitchen, library corner, boxing gym, pottery studio
- Macro/texture: hands on surfaces, water droplets, fabric weave, rust patterns
- Abstract: ink dispersing, paint splashing, light refractions, shadows on walls
- Industrial: forge, factory, construction site, machinery

CAMERA ANGLES (be bold!):
- POV shot (first person perspective)
- Extreme close-up / macro (texture focus)
- Dutch angle (tilted, dynamic tension)
- Overhead / top-down (god's eye view)
- Low angle (looking up, power perspective)
- Through glass/window/reflection

LIGHTING (vary beyond golden hour!):
- Harsh midday sun with strong shadows
- Single lamp / desk light in darkness
- Neon / artificial colored light
- Backlit / rim light silhouettes
- Overcast flat light
- Fluorescent industrial
- Fire / warm artificial glow

MOVEMENT WITHIN FRAME (not just camera movement):
- Hands doing something (typing, crafting, writing)
- Objects in motion (spinning record, falling paper)
- Environmental motion (rain, steam, traffic)
- Time-lapse style changes

PRINCIPLES:
1. Visual metaphor: Scene represents the quote's deeper meaning
2. Simplicity: One strong visual idea, not cluttered
3. Texture and detail: Close-ups often work better than wide establishing shots
4. Movement: Something should be moving within the frame
5. Vertical format: 9:16 aspect ratio (mobile/TikTok/Reels)

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
  "scenePrompt": "detailed cinematic scene description for Runway (50-100 words) - BE SPECIFIC about camera angle, lighting, and what moves in frame",
  "musicMood": "one of the music options",
  "textAnimation": "one of the animation options",
  "reasoning": "brief explanation of why this scene fits the quote and how it avoids clichés"
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

  // Generate a basic scene prompt based on mood - DIVERSE fallbacks
  const moodScenes: Record<VisualMood, string> = {
    'quiet-determination': 'Extreme close-up of hands typing on vintage typewriter, harsh desk lamp casting dramatic shadows across keys, methodical rhythm of keystrokes, dust particles visible in light beam, black and white with warm lamp glow, 9:16 vertical format.',
    'new-beginnings': 'Slow motion of match being struck and igniting into flame, dramatic darkness surrounding single growing light source, sparks flying, moment of creation and transformation, warm orange against black, 9:16 vertical format.',
    'self-compassion': 'Close-up of hands gently shaping wet clay on pottery wheel, soft natural window light, meditative circular motion, texture of clay visible between fingers, warm earth tones, artisan care and patience, 9:16 vertical format.',
    'strength': 'Low angle macro shot of small green plant pushing through cracked concrete, harsh midday sun creating strong shadows, urban resilience, gritty texture detail, determination visible in nature, 9:16 vertical format.',
    'reflection': 'Close-up of vinyl record spinning on turntable, needle in groove, warm lamp light reflecting on black surface, nostalgic atmosphere, slow meditative rotation, contemplative mood, 9:16 vertical format.',
    'action': 'Dynamic close-up of fingers rapidly typing on backlit keyboard, screen glow reflecting on keys, shallow depth of field, productive energy, slight camera movement, late night work session energy, 9:16 vertical format.',
    'wisdom': 'Extreme close-up of sand falling through hourglass, individual grains visible in warm amber light, time made tangible, macro lens detail, meditative observation of time passing, 9:16 vertical format.',
    'hope': 'POV shot walking through dark tunnel toward bright circular exit, light growing stronger with each step, architectural lines converging toward brightness, transition from shadow to illumination, 9:16 vertical format.',
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
