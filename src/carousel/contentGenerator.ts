/**
 * Carousel Content Generator
 *
 * Generates 8-slide carousel content using GPT-4o for TikTok carousels
 * in the personal growth/self-improvement niche.
 */

import { config } from '../config.js';
import type { CarouselContent, CarouselSlide, CtaType } from './types.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a viral content strategist creating TikTok carousel posts about personal growth and self-improvement.

STRUCTURE (8 slides total):
1. HOOK (slide 1): Curiosity gap / pattern interrupt that stops the scroll (8-15 words)
2-6. VALUE (slides 2-6): 5 actionable, specific points that deliver real value (10-20 words each)
7. PAYOFF (slide 7): The "aha" moment - emotional resonance or key insight (15-25 words)
8. CTA (slide 8): Save or share prompt based on the ctaType provided (5-10 words)

PSYCHOLOGY TRIGGERS TO USE:
- Curiosity Gap (Zeigarnik Effect): Open a loop the reader must close
- Practical Value: Make content saveable and actionable
- FOMO: Subtle urgency without being pushy
- Emotional Resonance: Connect to universal human experiences

CONTENT RULES:
- Focus on: Growth, self-improvement, mindset shifts, habits, productivity, emotional intelligence
- NO: Hustle culture, toxic positivity, shame-based motivation, cliches
- Use concrete examples over abstract advice
- Each slide should stand alone but flow naturally to the next
- Write in second person ("you") to create connection
- NO emojis in slide text

CAPTION RULES:
- Start with a hook that relates to the topic
- 200+ characters
- End with a soft CTA
- NO emojis

HASHTAG RULES:
- Exactly 4-6 relevant hashtags
- Mix of broad (selfimprovement, growth) and niche (mindsetshift, innerwork)
- Lowercase, no # symbol

Return valid JSON matching this exact structure:
{
  "topic": "Brief topic description",
  "slides": [
    {"slideNumber": 1, "type": "hook", "bodyText": "..."},
    {"slideNumber": 2, "type": "value", "bodyText": "...", "valueNumber": 1},
    {"slideNumber": 3, "type": "value", "bodyText": "...", "valueNumber": 2},
    {"slideNumber": 4, "type": "value", "bodyText": "...", "valueNumber": 3},
    {"slideNumber": 5, "type": "value", "bodyText": "...", "valueNumber": 4},
    {"slideNumber": 6, "type": "value", "bodyText": "...", "valueNumber": 5},
    {"slideNumber": 7, "type": "payoff", "bodyText": "..."},
    {"slideNumber": 8, "type": "cta", "bodyText": "...", "ctaType": "save"|"share"}
  ],
  "caption": "200+ character caption...",
  "hashtags": ["tag1", "tag2", "tag3", "tag4"]
}`;

// Fallback content when API is unavailable
const FALLBACK_CONTENT: CarouselContent = {
  topic: '5 Questions That Changed My Life',
  slides: [
    { slideNumber: 1, type: 'hook', bodyText: 'I asked myself 5 questions. Everything changed.' },
    { slideNumber: 2, type: 'value', bodyText: 'What would I do if I couldn\'t fail?', valueNumber: 1 },
    { slideNumber: 3, type: 'value', bodyText: 'What am I avoiding because it\'s uncomfortable?', valueNumber: 2 },
    { slideNumber: 4, type: 'value', bodyText: 'Who do I want to become in 5 years?', valueNumber: 3 },
    { slideNumber: 5, type: 'value', bodyText: 'What story am I telling myself that isn\'t true?', valueNumber: 4 },
    { slideNumber: 6, type: 'value', bodyText: 'What small step can I take today?', valueNumber: 5 },
    { slideNumber: 7, type: 'payoff', bodyText: 'The answers weren\'t easy. But asking was the first step toward becoming who I wanted to be.' },
    { slideNumber: 8, type: 'cta', bodyText: 'Save this for when you need it.', ctaType: 'save' },
  ],
  caption: 'These 5 questions helped me get unstuck and start moving toward the person I wanted to become. Sometimes the right question is more powerful than any answer. Which one resonates with you?',
  hashtags: ['selfimprovement', 'growth', 'mindset', 'personaldevelopment'],
};

/**
 * Generate carousel content using GPT-4o
 */
export async function generateCarouselContent(ctaType: CtaType): Promise<CarouselContent> {
  if (!config.openaiApiKey) {
    console.warn('No OpenAI API key, using fallback content');
    return { ...FALLBACK_CONTENT, slides: FALLBACK_CONTENT.slides.map(s =>
      s.type === 'cta' ? { ...s, bodyText: ctaType === 'save' ? 'Save this for when you need it.' : 'Share this with someone who needs it.', ctaType } : s
    )};
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
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Generate a viral TikTok carousel about personal growth. The CTA type should be "${ctaType}" (${ctaType === 'save' ? 'encourage saving the post for later' : 'encourage sharing with a friend'}).`,
          },
        ],
        temperature: 0.9,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error('Empty response');

    const result = JSON.parse(content) as CarouselContent;

    // Validate structure
    if (!result.slides || result.slides.length !== 8) {
      throw new Error('Invalid slide count');
    }

    if (!result.caption || result.caption.length < 200) {
      console.warn('Caption too short, using fallback caption');
      result.caption = result.caption || FALLBACK_CONTENT.caption;
    }

    if (!result.hashtags || result.hashtags.length < 4) {
      console.warn('Not enough hashtags, adding fallback hashtags');
      result.hashtags = result.hashtags || [];
      const fallbackTags = ['selfimprovement', 'growth', 'mindset', 'personaldevelopment', 'motivation', 'innerwork'];
      while (result.hashtags.length < 4) {
        const tag = fallbackTags.find(t => !result.hashtags.includes(t));
        if (tag) result.hashtags.push(tag);
        else break;
      }
    }

    // Ensure hashtags are 4-6
    if (result.hashtags.length > 6) {
      result.hashtags = result.hashtags.slice(0, 6);
    }

    // Validate and fix slide structure
    result.slides = result.slides.map((slide, index): CarouselSlide => {
      const slideNumber = index + 1;
      let type: CarouselSlide['type'];

      if (slideNumber === 1) type = 'hook';
      else if (slideNumber >= 2 && slideNumber <= 6) type = 'value';
      else if (slideNumber === 7) type = 'payoff';
      else type = 'cta';

      return {
        slideNumber,
        type,
        bodyText: slide.bodyText || '',
        ...(type === 'value' ? { valueNumber: slideNumber - 1 } : {}),
        ...(type === 'cta' ? { ctaType } : {}),
      };
    });

    return result;
  } catch (error) {
    console.error('Carousel content generation failed:', error);
    // Return fallback with correct CTA type
    return {
      ...FALLBACK_CONTENT,
      slides: FALLBACK_CONTENT.slides.map(s =>
        s.type === 'cta' ? { ...s, bodyText: ctaType === 'save' ? 'Save this for when you need it.' : 'Share this with someone who needs it.', ctaType } : s
      )
    };
  }
}
