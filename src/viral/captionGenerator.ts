/**
 * Caption Generator for Viral Videos
 *
 * Generates Instagram-optimized captions and hashtags (max 4) for viral videos.
 */

import { config } from '../config.js';
import type { QuoteType } from './types.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface ViralCaption {
  caption: string;
  hashtags: string[];
}

/**
 * Generate caption and hashtags for a viral video
 */
export async function generateViralCaption(
  quote: string,
  quoteType: QuoteType,
  hookText: string
): Promise<ViralCaption> {
  // Default fallback
  const defaults: ViralCaption = {
    caption: `${quote}\n\n✨ Sometimes the journey matters more than the destination.`,
    hashtags: ['becoming', 'growth', 'mindset', 'wisdom'],
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
            content: `Generate an Instagram Reels caption for a motivational video.

VIDEO CONTEXT:
- Hook (opening): The video starts with a compelling hook to grab attention
- Quote (main message): The core motivational message
- Type: ${quoteType} (inquiry=question, manifesto=declaration, insight=wisdom)

CAPTION STYLE:
- Start with the quote itself (or a variant)
- Add 1-2 lines of engaging commentary that adds value
- End with a subtle call-to-action (save, share, or reflection prompt)
- Keep it authentic and warm, not salesy
- Total length: 100-200 characters ideal

HASHTAGS:
- EXACTLY 4 hashtags (no more, no less)
- Mix of broad reach (#motivation) and niche (#innerwork)
- Lowercase, no # symbol in response
- Relevant to personal growth and self-improvement

Return JSON: {"caption": "...", "hashtags": ["tag1", "tag2", "tag3", "tag4"]}`,
          },
          {
            role: 'user',
            content: `Hook: "${hookText}"\nQuote: "${quote}"\nType: ${quoteType}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response');
    }

    const result = JSON.parse(content);

    // Ensure exactly 4 hashtags
    let hashtags = result.hashtags || defaults.hashtags;
    if (hashtags.length > 4) {
      hashtags = hashtags.slice(0, 4);
    } else if (hashtags.length < 4) {
      // Pad with defaults if needed
      const fallbackTags = ['becoming', 'growth', 'mindset', 'wisdom', 'motivation'];
      while (hashtags.length < 4) {
        const tag = fallbackTags.find((t) => !hashtags.includes(t));
        if (tag) hashtags.push(tag);
        else break;
      }
    }

    return {
      caption: result.caption || defaults.caption,
      hashtags,
    };
  } catch (error) {
    console.error('Viral caption generation failed:', error);
    return defaults;
  }
}
