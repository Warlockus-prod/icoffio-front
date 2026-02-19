/**
 * AI CATEGORY DETECTOR
 * 
 * Automatically detects the most appropriate category for an article
 * based on its content using GPT-4o
 */

import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

// Available categories on icoffio
export const AVAILABLE_CATEGORIES = [
  'AI',
  'Technology',
  'Games',
  'Apple',
  'Digital',
  'News'
] as const;

export type CategoryType = typeof AVAILABLE_CATEGORIES[number];

export interface CategoryDetectionResult {
  category: CategoryType;
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Detect category from article text using AI
 */
export async function detectCategory(
  text: string,
  title?: string
): Promise<CategoryDetectionResult> {
  try {
    const openai = getOpenAIClient();

    const prompt = `Analyze the following text and determine the most appropriate category from this list:
- AI (artificial intelligence, machine learning, neural networks, AGI, LLMs)
- Technology (general tech, innovations, gadgets, software, hardware)
- Games (gaming, esports, game development, gaming industry)
- Apple (Apple products, iOS, macOS, iPhone, iPad, Mac)
- Digital (digital transformation, online services, web, internet)
- News (breaking news, current events, industry news)

${title ? `Title: ${title}\n\n` : ''}Text: ${text.substring(0, 500)}...

Respond with ONLY the category name (one word: AI, Technology, Games, Apple, Digital, or News).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a content categorization expert. Analyze text and assign the most appropriate category.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.trim() || 'Technology';
    
    // Validate response
    const detectedCategory = AVAILABLE_CATEGORIES.find(
      cat => cat.toLowerCase() === response.toLowerCase()
    );

    return {
      category: detectedCategory || 'Technology',
      confidence: detectedCategory ? 0.9 : 0.5,
      reasoning: detectedCategory ? 'AI detected category' : 'Fallback to Technology'
    };

  } catch (error) {
    console.error('[Category Detector] Error:', error);
    // Fallback to Technology on error
    return {
      category: 'Technology',
      confidence: 0.5,
      reasoning: 'Error, using default category'
    };
  }
}

/**
 * Quick category detection based on keywords (fallback if AI fails)
 */
export function detectCategoryByKeywords(text: string): CategoryType {
  const lowerText = text.toLowerCase();

  // AI keywords
  if (/(artificial intelligence|machine learning|neural network|deep learning|llm|gpt|ai\s|agi|chatgpt|openai)/i.test(lowerText)) {
    return 'AI';
  }

  // Games keywords
  if (/(game|gaming|esports|playstation|xbox|nintendo|steam|gameplay|gamer)/i.test(lowerText)) {
    return 'Games';
  }

  // Apple keywords
  if (/(iphone|ipad|mac|apple|ios|macos|macbook|airpods|apple watch|tim cook)/i.test(lowerText)) {
    return 'Apple';
  }

  // Digital keywords
  if (/(digital transformation|online|web|internet|cloud|saas|platform|digital)/i.test(lowerText)) {
    return 'Digital';
  }

  // News keywords
  if (/(breaking|announced|launches|released|reports|according to)/i.test(lowerText)) {
    return 'News';
  }

  // Default
  return 'Technology';
}

/**
 * Generate SEO-friendly title using AI
 */
export async function generateOptimizedTitle(
  text: string,
  category: string
): Promise<string> {
  try {
    const openai = getOpenAIClient();

    const prompt = `Create a catchy, SEO-friendly title for an article about:

${text.substring(0, 300)}

Requirements:
- 50-70 characters
- Engaging and clickable
- Include relevant keywords
- Professional tone
- Category: ${category}

Respond with ONLY the title (no quotes, no extra text).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert SEO copywriter. Create engaging, optimized titles.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const title = completion.choices[0]?.message?.content?.trim() || '';
    
    // Clean up title (remove quotes if present)
    return title.replace(/^["']|["']$/g, '').substring(0, 100);

  } catch (error) {
    console.error('[Title Generator] Error:', error);
    // Fallback: use first sentence
    return text.split(/[.!?]/)[0].substring(0, 70).trim();
  }
}












