/**
 * Type-Specific Hook Generator
 *
 * Generates compelling opening hooks based on content type.
 * Each type has its own pattern for maximum engagement.
 */

import OpenAI from 'openai';
import { config } from '../config.js';
import type { ViralHook, HookPattern, QuoteType } from './types.js';

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

// Type-specific hook generation prompts
const HOOK_PROMPTS: Record<QuoteType, string> = {
  inquiry: `Generate a CONDITIONAL CHALLENGE hook for this reflective question.

PATTERN: "If you're [relatable context]... [provocative setup]"
The hook creates tension that the question resolves.

EXAMPLES:
- Quote: "What would you attempt if doubt wasn't in the room?"
  Hook: "If you've ever held back... ask yourself this."

- Quote: "Who are you becoming with each decision you make?"
  Hook: "If you made a choice today... consider this."

- Quote: "What does this moment ask of you?"
  Hook: "If you're alive right now... pause and think."

RULES:
- Start with "If you..." to create personal connection
- 8-12 words maximum
- Create anticipation for the question
- Conversational, not preachy

Return JSON: {"text": "your hook", "pattern": "conditional-challenge"}`,

  manifesto: `Generate a BOLD DECLARATION hook for this identity affirmation.

PATTERN: Strong, grounded opening that commands attention.
The hook establishes authority before the manifesto.

EXAMPLES:
- Quote: "You don't have to be ready. You just have to begin."
  Hook: "Here's the truth about starting."

- Quote: "Every small choice is a vote for who you're becoming."
  Hook: "Your choices are speaking. Listen."

- Quote: "Growth isn't about perfection. It's about presence."
  Hook: "Stop chasing perfect."

RULES:
- Declarative, confident tone
- 4-8 words maximum
- No questions - this is a statement
- Creates weight and gravitas

Return JSON: {"text": "your hook", "pattern": "bold-declaration"}`,

  insight: `Generate a WISDOM SETUP hook for this insight.

PATTERN: "Here's what..." or "The truth is..." or setup that promises revelation.
The hook positions the insight as valuable knowledge.

EXAMPLES:
- Quote: "Before you react, pause. Ask: is this who I want to be?"
  Hook: "Here's what changes everything."

- Quote: "Progress hides in the ordinary moments."
  Hook: "Most people miss this."

- Quote: "The obstacle reveals the next step. Look closer."
  Hook: "What looks like a wall... isn't."

RULES:
- Wise, approachable tone
- 4-8 words maximum
- Promise valuable insight
- Gentle but compelling

Return JSON: {"text": "your hook", "pattern": "wisdom-setup"}`,
};

/**
 * Generate a type-specific hook for a quote
 */
export async function generateViralHook(quote: string, quoteType: QuoteType): Promise<ViralHook> {
  if (!openai) {
    return fallbackHookGeneration(quote, quoteType);
  }

  try {
    const response = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: HOOK_PROMPTS[quoteType] },
        { role: 'user', content: `Generate a hook for this ${quoteType}:\n\n"${quote}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 100,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Map pattern based on type
    const patternMap: Record<QuoteType, HookPattern> = {
      inquiry: 'conditional-challenge',
      manifesto: 'bold-declaration',
      insight: 'wisdom-setup',
    };

    return {
      text: result.text || fallbackHookGeneration(quote, quoteType).text,
      pattern: patternMap[quoteType],
      quoteType,
    };
  } catch (error) {
    console.error('Hook generation failed, using fallback:', error);
    return fallbackHookGeneration(quote, quoteType);
  }
}

/**
 * Fallback hook generation based on quote type
 */
function fallbackHookGeneration(quote: string, quoteType: QuoteType): ViralHook {
  const fallbacks: Record<QuoteType, { text: string; pattern: HookPattern }[]> = {
    inquiry: [
      { text: "If you're still breathing... ask yourself this.", pattern: 'conditional-challenge' },
      { text: "If you woke up today... consider this.", pattern: 'conditional-challenge' },
      { text: "If you've ever wondered... here's the question.", pattern: 'conditional-challenge' },
      { text: "If you're on a path... pause and think.", pattern: 'conditional-challenge' },
    ],
    manifesto: [
      { text: "Here's the truth.", pattern: 'bold-declaration' },
      { text: "Let this sink in.", pattern: 'bold-declaration' },
      { text: "Read this twice.", pattern: 'bold-declaration' },
      { text: "This changes everything.", pattern: 'bold-declaration' },
    ],
    insight: [
      { text: "Here's what most people miss.", pattern: 'wisdom-setup' },
      { text: "The truth is simpler than you think.", pattern: 'wisdom-setup' },
      { text: "What if I told you...", pattern: 'wisdom-setup' },
      { text: "Here's the shift.", pattern: 'wisdom-setup' },
    ],
  };

  const options = fallbacks[quoteType];
  const selected = options[Math.floor(Math.random() * options.length)];

  return {
    ...selected,
    quoteType,
  };
}

/**
 * Validate a hook meets the requirements
 */
export function validateHook(hook: ViralHook): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  const wordCount = hook.text.split(/\s+/).length;

  // Type-specific word limits
  const limits: Record<QuoteType, { min: number; max: number }> = {
    inquiry: { min: 4, max: 12 },
    manifesto: { min: 3, max: 8 },
    insight: { min: 3, max: 10 },
  };

  const { min, max } = limits[hook.quoteType];

  if (wordCount < min) {
    issues.push(`Hook too short (minimum ${min} words for ${hook.quoteType})`);
  }
  if (wordCount > max) {
    issues.push(`Hook too long (maximum ${max} words for ${hook.quoteType})`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
