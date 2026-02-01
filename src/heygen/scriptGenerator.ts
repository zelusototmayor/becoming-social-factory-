/**
 * UGC Script Generator
 *
 * Generates authentic-sounding UGC scripts about The Becoming App.
 * Uses templates from the AI UGC research with variations.
 */

import OpenAI from 'openai';
import { config } from '../config.js';
import type { UGCScript, ScriptTemplate, ContentTheme } from './types.js';

// Script templates based on research
const SCRIPT_TEMPLATES: Record<ScriptTemplate, { structure: string; example: string }> = {
  'skeptic-believer': {
    structure: 'Hook (skepticism) → Pain (past failures) → Discovery → Benefit → CTA',
    example: `Okay I was SO skeptical about meditation apps but...
I've tried like 5 different ones and they all felt so... corporate?
But then I found The Becoming App and the approach is just different.
It's not about forcing yourself to be calm, it's about understanding why you're anxious in the first place.
Link in bio if you're like me and need something that actually works.`,
  },
  'morning-routine': {
    structure: 'Hook (pain) → Problem → Discovery → Result → CTA',
    example: `My morning anxiety used to run my whole day.
I'd wake up with my heart racing before I even checked my phone.
Started using this app for just 5 minutes before getting out of bed.
Now I actually feel like I'm in control of my mornings again.
Seriously, try it - it's called The Becoming App.`,
  },
  'friend-recommendation': {
    structure: 'Hook (authority) → Context → Feature → Result → CTA',
    example: `My therapist actually recommended this to me.
I've been working on anxiety management and she told me about this app.
The guided breathing exercises are actually based on real therapy techniques.
It's become part of my daily toolkit now.
Thought I'd share in case anyone else is working on the same stuff.`,
  },
  transformation: {
    structure: 'Hook (before) → Past self → Discovery → Transformation → CTA',
    example: `This was me three months ago... completely burnt out.
I was anxious all the time, couldn't sleep, constantly overwhelmed.
A friend kept telling me to try this mindfulness app and I finally caved.
Now it's like... I actually have tools to handle stress when it comes up.
Download The Becoming App - seriously changed how I deal with everything.`,
  },
  'pov-discovery': {
    structure: 'Hook (POV) → Problem → Discovery → Benefit → CTA',
    example: `POV: You finally found an app that doesn't make you feel broken.
Like I'm not trying to "fix" my anxiety, I'm trying to understand it.
The Becoming App actually gets that distinction.
The exercises feel like conversations, not commands.
Check it out if traditional meditation apps made you feel like a failure.`,
  },
  'one-habit': {
    structure: 'Hook (promise) → Problem → The habit → How it helps → CTA',
    example: `The one habit that changed everything for me.
I used to spiral every time something stressed me out.
Now I do this 3-minute breathing exercise from The Becoming App.
It's like hitting a reset button on my nervous system.
Save this for when you need it - link in bio.`,
  },
  'therapist-recommended': {
    structure: 'Hook (credibility) → Context → Feature → Endorsement → CTA',
    example: `As someone who's been in therapy for years...
Finding tools that actually complement the work is hard.
The Becoming App uses techniques my therapist has actually taught me.
It's not replacing therapy, it's supporting it.
If you're doing the work, this might help. Link in bio.`,
  },
};

// Content themes and associated keywords
const THEME_KEYWORDS: Record<ContentTheme, string[]> = {
  'anxiety-management': ['anxiety', 'anxious', 'worried', 'stress', 'nervous', 'overwhelmed'],
  'morning-routine': ['morning', 'wake up', 'start the day', 'before work', 'first thing'],
  'self-compassion': ['kind to yourself', 'self-love', 'inner critic', 'gentle', 'acceptance'],
  mindfulness: ['present moment', 'awareness', 'meditation', 'focus', 'mindful'],
  'breathing-exercises': ['breathe', 'breathing', 'inhale', 'exhale', 'calm', 'nervous system'],
  'daily-reflection': ['reflect', 'journal', 'thoughts', 'end of day', 'check in'],
  'stress-relief': ['stress', 'decompress', 'unwind', 'release', 'tension'],
  'emotional-awareness': ['feelings', 'emotions', 'what I feel', 'understand', 'process'],
};

// Duration estimates by template
const TEMPLATE_DURATIONS: Record<ScriptTemplate, number> = {
  'skeptic-believer': 35,
  'morning-routine': 30,
  'friend-recommendation': 28,
  transformation: 35,
  'pov-discovery': 30,
  'one-habit': 28,
  'therapist-recommended': 32,
};

/**
 * Get a random template, optionally weighted by theme
 */
function selectTemplate(theme?: ContentTheme): ScriptTemplate {
  const templates = Object.keys(SCRIPT_TEMPLATES) as ScriptTemplate[];

  // Theme-based weighting
  const weights: Record<ScriptTemplate, number> = {
    'skeptic-believer': 1,
    'morning-routine': theme === 'morning-routine' ? 3 : 1,
    'friend-recommendation': theme === 'anxiety-management' ? 2 : 1,
    transformation: 1,
    'pov-discovery': theme === 'mindfulness' ? 2 : 1,
    'one-habit': theme === 'breathing-exercises' ? 3 : 1,
    'therapist-recommended': theme === 'emotional-awareness' ? 2 : 1,
  };

  // Weighted random selection
  const totalWeight = templates.reduce((sum, t) => sum + weights[t], 0);
  let random = Math.random() * totalWeight;

  for (const template of templates) {
    random -= weights[template];
    if (random <= 0) {
      return template;
    }
  }

  return templates[0];
}

/**
 * Select a random content theme
 */
function selectTheme(): ContentTheme {
  const themes = Object.keys(THEME_KEYWORDS) as ContentTheme[];
  return themes[Math.floor(Math.random() * themes.length)];
}

/**
 * Generate a UGC script using AI
 */
export async function generateScript(options?: {
  theme?: ContentTheme;
  template?: ScriptTemplate;
}): Promise<UGCScript> {
  const theme = options?.theme || selectTheme();
  const template = options?.template || selectTemplate(theme);
  const templateInfo = SCRIPT_TEMPLATES[template];

  console.log(`Generating ${template} script about ${theme}...`);

  // If OpenAI is not configured, use a template-based fallback
  if (!config.openaiApiKey) {
    console.warn('OpenAI not configured, using template fallback');
    return generateFallbackScript(theme, template);
  }

  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const prompt = `Generate a UGC-style video script for The Becoming App, a mindfulness and mental wellness mobile app.

THEME: ${theme}
TEMPLATE STRUCTURE: ${templateInfo.structure}

EXAMPLE SCRIPT (for reference, don't copy exactly):
${templateInfo.example}

REQUIREMENTS:
1. Sound like a real person talking to their phone (casual, conversational)
2. Include natural speech patterns (um, like, you know) sparingly
3. Be specific about benefits (not generic marketing speak)
4. The Becoming App helps with: anxiety management, breathing exercises, mindfulness, daily reflection, emotional awareness
5. Keep it 25-40 seconds when spoken (about 75-110 words)
6. End with a natural CTA mentioning "The Becoming App"

OUTPUT FORMAT (JSON):
{
  "hook": "Opening line that stops the scroll",
  "painPoint": "Relatable problem they've experienced",
  "discovery": "How they found/started using the app",
  "benefit": "Specific benefit they've experienced",
  "cta": "Natural call to action"
}

Generate a fresh, authentic-sounding script. Make it feel like a real testimonial, not an ad.`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openaiModel || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9, // Higher creativity for variety
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    const parsed = JSON.parse(content) as {
      hook: string;
      painPoint: string;
      discovery: string;
      benefit: string;
      cta: string;
    };

    // Combine into full script
    const fullText = `${parsed.hook} ${parsed.painPoint} ${parsed.discovery} ${parsed.benefit} ${parsed.cta}`;

    return {
      hook: parsed.hook,
      painPoint: parsed.painPoint,
      discovery: parsed.discovery,
      benefit: parsed.benefit,
      cta: parsed.cta,
      fullText,
      template,
      duration: TEMPLATE_DURATIONS[template],
    };
  } catch (error) {
    console.error('Script generation failed, using fallback:', error);
    return generateFallbackScript(theme, template);
  }
}

/**
 * Generate a fallback script from templates (no AI)
 */
function generateFallbackScript(theme: ContentTheme, template: ScriptTemplate): UGCScript {
  // Use the example as a base and do light variations
  const templateInfo = SCRIPT_TEMPLATES[template];
  const lines = templateInfo.example.split('\n').filter((l) => l.trim());

  // The example follows the structure, so we can map it
  const [hook, painPoint, discovery, benefit, cta] = lines;

  return {
    hook: hook || 'Okay so I have to share this...',
    painPoint: painPoint || "I've been dealing with anxiety for years.",
    discovery: discovery || 'Started using The Becoming App a few weeks ago.',
    benefit: benefit || 'And it actually helps me feel more in control.',
    cta: cta || 'Check it out if you need something that actually works.',
    fullText: templateInfo.example,
    template,
    duration: TEMPLATE_DURATIONS[template],
  };
}

/**
 * Generate caption and hashtags for the video
 */
export async function generateCaption(script: UGCScript, theme: ContentTheme): Promise<{
  caption: string;
  hashtags: string[];
}> {
  // Simple caption based on hook
  const caption = `${script.hook.replace(/\.\.\.$/, '')} 💭\n\n#mentalhealth #wellness #thebecomingapp`;

  // Theme-based hashtags (max 4 for authenticity)
  const baseHashtags = ['mentalhealth', 'wellness'];
  const themeHashtags: Record<ContentTheme, string[]> = {
    'anxiety-management': ['anxietyrelief', 'anxietytips'],
    'morning-routine': ['morningroutine', 'morningmindset'],
    'self-compassion': ['selflove', 'selfcare'],
    mindfulness: ['mindfulness', 'presentmoment'],
    'breathing-exercises': ['breathwork', 'breathingtechniques'],
    'daily-reflection': ['journaling', 'dailyreflection'],
    'stress-relief': ['stressrelief', 'decompress'],
    'emotional-awareness': ['emotionalhealth', 'mentalwellness'],
  };

  const extraHashtags = themeHashtags[theme] || [];
  const hashtags = [...baseHashtags, ...extraHashtags.slice(0, 2)];

  return {
    caption,
    hashtags,
  };
}

// Export theme and template types for external use
export { SCRIPT_TEMPLATES, THEME_KEYWORDS, selectTheme, selectTemplate };
