/**
 * Quote Generator
 *
 * Generates motivational quotes using the same psychology as the Becoming app.
 * Uses OpenAI for generation with fallback to curated quotes.
 */

import { config } from '../config.js';
import type { GeneratedQuote, GeneratedContent, QuoteType } from '../types.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Psychology-driven system prompt
const SYSTEM_PROMPT = `You craft brief motivational quotes for social media—moments of wisdom that help people connect to their best selves.

TONE: Aspirational & Universal
- Speak to the universal human experience of growth
- Warm, wise, and gently provocative
- Mix of Self-Compassion (Kristin Neff), Identity-Based Habits (James Clear), and Stoic wisdom
- Inspire quiet determination, not hype

QUOTE TYPES (rotate between):
1. "inquiry" (~40%): Evocative questions that open reflection
2. "manifesto" (~35%): Identity affirmations about becoming
3. "insight" (~25%): Wisdom bridges connecting intention to action

RULES:
- Maximum 100 characters
- Grammatically flawless
- NO clichés ("You've got this!", "Believe in yourself!")
- NO shame, guilt, or fear-based motivation
- NO hashtags, emojis, or internet slang
- Feel like timeless wisdom, not trendy content

Return JSON: {"text": "...", "type": "inquiry"|"manifesto"|"insight"}`;

// Fallback quotes when AI is unavailable
const FALLBACK_QUOTES: Record<QuoteType, string[]> = {
  inquiry: [
    'What small choice today would your future self thank you for?',
    'Who are you becoming with each decision you make?',
    'What would you attempt if doubt wasn\'t in the room?',
    'What does this moment ask of you?',
    'How would you show up if you already were who you want to become?',
  ],
  manifesto: [
    'You don\'t have to be ready. You just have to begin.',
    'Every small choice is a vote for who you\'re becoming.',
    'Growth isn\'t about perfection. It\'s about presence.',
    'You are already in motion. Trust the direction.',
    'The person you want to be is built one moment at a time.',
  ],
  insight: [
    'Before you react, pause. Ask: is this who I want to be?',
    'When doubt speaks loudly, act anyway—quietly.',
    'Progress hides in the ordinary moments.',
    'The obstacle reveals the next step. Look closer.',
    'Character is built in the choices no one else sees.',
  ],
};

/**
 * Check if quote is too similar to recent ones
 */
function isTooSimilar(newQuote: string, recentQuotes: string[]): boolean {
  const newWords = new Set(newQuote.toLowerCase().split(/\s+/));

  for (const recent of recentQuotes) {
    const recentWords = new Set(recent.toLowerCase().split(/\s+/));
    const intersection = [...newWords].filter(w => recentWords.has(w)).length;
    const union = new Set([...newWords, ...recentWords]).size;

    if (intersection / union > 0.5) return true;
  }
  return false;
}

/**
 * Get a fallback quote
 */
function getFallbackQuote(recentQuotes: string[] = []): GeneratedQuote {
  const types: QuoteType[] = ['inquiry', 'manifesto', 'insight'];
  const weights = [0.4, 0.35, 0.25];

  // Weighted random type selection
  const rand = Math.random();
  let cumulative = 0;
  let selectedType: QuoteType = 'inquiry';
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      selectedType = types[i];
      break;
    }
  }

  // Find a quote that's not too similar
  const candidates = FALLBACK_QUOTES[selectedType].filter(
    q => !isTooSimilar(q, recentQuotes)
  );

  const pool = candidates.length > 0 ? candidates : FALLBACK_QUOTES[selectedType];
  const text = pool[Math.floor(Math.random() * pool.length)];

  return { text, type: selectedType };
}

/**
 * Select a quote type using weighted random
 */
function selectQuoteType(): QuoteType {
  const types: QuoteType[] = ['inquiry', 'manifesto', 'insight'];
  const weights = [0.4, 0.35, 0.25];

  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < types.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      return types[i];
    }
  }
  return 'inquiry';
}

/**
 * Generate a quote using OpenAI
 */
export async function generateQuote(recentQuotes: string[] = []): Promise<GeneratedQuote> {
  if (!config.openaiApiKey) {
    console.warn('No OpenAI API key, using fallback quote');
    return getFallbackQuote(recentQuotes);
  }

  // Pre-select quote type to ensure variety
  const targetType = selectQuoteType();
  const typeDescriptions: Record<QuoteType, string> = {
    inquiry: 'an INQUIRY quote - an evocative question that opens reflection (e.g., "What would you attempt if doubt wasn\'t in the room?")',
    manifesto: 'a MANIFESTO quote - an identity affirmation about becoming (e.g., "You don\'t have to be ready. You just have to begin.")',
    insight: 'an INSIGHT quote - a wisdom bridge connecting intention to action (e.g., "Before you react, pause. Ask: is this who I want to be?")',
  };

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: recentQuotes.length > 0
              ? `Generate ${typeDescriptions[targetType]}. Must be different from:\n${recentQuotes.slice(0, 5).map(q => `- "${q}"`).join('\n')}`
              : `Generate ${typeDescriptions[targetType]}.`,
          },
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty response');

    const result = JSON.parse(content);

    // Validate
    if (!result.text || result.text.length > 120 || result.text.length < 20) {
      throw new Error('Invalid quote length');
    }

    if (isTooSimilar(result.text, recentQuotes)) {
      console.warn('Quote too similar, using fallback');
      return getFallbackQuote(recentQuotes);
    }

    return {
      text: result.text,
      type: targetType, // Use our pre-selected type, not AI's classification
    };
  } catch (error) {
    console.error('Quote generation failed:', error);
    return getFallbackQuote(recentQuotes);
  }
}

/**
 * Generate caption, hashtags, and alt text
 */
export async function generateMetadata(quote: string): Promise<{
  caption: string;
  hashtags: string[];
  altText: string;
}> {
  // Default metadata
  const defaults = {
    caption: `${quote}\n\n✨ What small choice will you make today?`,
    hashtags: ['becoming', 'growth', 'mindset', 'motivation', 'selfgrowth', 'dailyreminder', 'inspiration', 'personaldevelopment'],
    altText: `Motivational quote on gradient background: "${quote}"`,
  };

  if (!config.openaiApiKey) {
    return defaults;
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Generate Instagram post metadata for a motivational quote.

CAPTION: Start with the quote, add 1-2 lines of engaging commentary, end with subtle CTA. Keep authentic.
HASHTAGS: 8-12 relevant tags, mix popular and niche, lowercase, no #.
ALT_TEXT: Describe for accessibility, under 200 chars.

Return JSON: {"caption": "...", "hashtags": ["tag1", "tag2"], "altText": "..."}`,
          },
          { role: 'user', content: `Quote: "${quote}"` },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    const result = JSON.parse(content);
    return {
      caption: result.caption || defaults.caption,
      hashtags: result.hashtags || defaults.hashtags,
      altText: result.altText || defaults.altText,
    };
  } catch (error) {
    console.error('Metadata generation failed:', error);
    return defaults;
  }
}

/**
 * Generate complete post content
 */
export async function generateContent(recentQuotes: string[] = []): Promise<GeneratedContent> {
  const quote = await generateQuote(recentQuotes);
  const metadata = await generateMetadata(quote.text);

  return {
    quote,
    ...metadata,
  };
}
