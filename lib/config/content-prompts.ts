/**
 * CONTENT PROCESSING PROMPTS SYSTEM v7.8.1
 * 
 * Система управления промптами для обработки текста статей
 * Поддерживает preset шаблоны и кастомные промпты
 * 
 * @version 7.8.1
 * @date 2025-10-30
 */

export type ContentProcessingStyle = 
  | 'journalistic'      // Публицистический стиль
  | 'as-is'            // Оставить как есть (без изменений)
  | 'seo-optimized'    // SEO оптимизация
  | 'academic'         // Академический стиль
  | 'casual'           // Разговорный стиль
  | 'technical'        // Технический стиль
  | 'custom';          // Кастомный промпт

export interface ContentPromptTemplate {
  id: string;
  name: string;
  description: string;
  style: ContentProcessingStyle;
  systemPrompt: string;
  icon: string;
  enabled: boolean;
  isDefault?: boolean;
}

/**
 * Preset шаблоны промптов для обработки контента
 */
export const CONTENT_PROMPT_TEMPLATES: ContentPromptTemplate[] = [
  {
    id: 'journalistic',
    name: 'Journalistic Style',
    description: 'Rewrite text in journalistic style for wide audience',
    style: 'journalistic',
    icon: '📰',
    enabled: true,
    isDefault: true,
    systemPrompt: `You are a professional journalist and content writer.

Your task is to rewrite the provided text in a journalistic style that is:
- Engaging and captivating for a wide audience
- Clear, concise, and easy to understand
- Well-structured with proper paragraphs
- Using active voice and compelling language
- Maintaining factual accuracy
- Adding context where necessary
- Including relevant examples or analogies

Keep the main message and key points, but make it more readable and professional.
Write in the same language as the input text.`
  },
  {
    id: 'as-is',
    name: 'Keep As Is',
    description: 'Do not change text, use as is',
    style: 'as-is',
    icon: '✋',
    enabled: true,
    systemPrompt: `You are a content processor that preserves the original text.

Your task is to:
- Return the text EXACTLY as provided
- Do NOT make any changes to style, structure, or content
- Do NOT add or remove any information
- Do NOT rewrite or rephrase anything
- Only ensure proper formatting (paragraphs, line breaks)

This is a pass-through mode - preserve the author's original voice and style completely.`
  },
  {
    id: 'seo-optimized',
    name: 'SEO Optimized',
    description: 'Optimize text for search engines',
    style: 'seo-optimized',
    icon: '🔍',
    enabled: true,
    systemPrompt: `You are an SEO expert and content optimizer.

Your task is to rewrite the text with SEO best practices:
- Use relevant keywords naturally (avoid keyword stuffing)
- Create compelling headlines and subheadings (H2, H3)
- Write in a scannable format with short paragraphs
- Include clear calls-to-action where appropriate
- Add semantic variations of main keywords
- Maintain readability (Flesch reading ease 60+)
- Use bullet points and lists for better structure
- Write meta-friendly content (good for snippets)

Keep the content valuable and user-focused, not just search engine-focused.
Write in the same language as the input text.`
  },
  {
    id: 'academic',
    name: 'Academic Style',
    description: 'Rewrite in academic/scientific style',
    style: 'academic',
    icon: '🎓',
    enabled: true,
    systemPrompt: `You are an academic writer and researcher.

Your task is to rewrite the text in an academic style:
- Use formal, scholarly language
- Include proper terminology and definitions
- Structure with clear thesis and supporting arguments
- Use logical flow and transitions
- Cite concepts appropriately (even if sources are not provided)
- Maintain objectivity and avoid bias
- Use passive voice where appropriate
- Include nuanced analysis and critical thinking

Make it suitable for an educated audience while remaining accessible.
Write in the same language as the input text.`
  },
  {
    id: 'casual',
    name: 'Casual Style',
    description: 'Rewrite in light conversational style',
    style: 'casual',
    icon: '💬',
    enabled: true,
    systemPrompt: `You are a friendly content writer who connects with readers.

Your task is to rewrite the text in a casual, conversational style:
- Use simple, everyday language
- Address the reader directly (use "you")
- Include relatable examples and analogies
- Add personality and warmth
- Use contractions (it's, you're, etc.)
- Keep sentences short and punchy
- Make it feel like a friendly conversation
- Use humor where appropriate (but stay professional)

Make the content approachable and easy to relate to.
Write in the same language as the input text.`
  },
  {
    id: 'technical',
    name: 'Technical Style',
    description: 'Rewrite in technical style for specialists',
    style: 'technical',
    icon: '⚙️',
    enabled: true,
    systemPrompt: `You are a technical writer for specialized audiences.

Your task is to rewrite the text in a technical style:
- Use precise technical terminology
- Include specific details and specifications
- Structure logically with clear sections
- Add technical context and explanations
- Use industry-standard conventions
- Include relevant technical considerations
- Be concise and information-dense
- Assume reader has domain knowledge

Make it suitable for professionals and specialists in the field.
Write in the same language as the input text.`
  },
  {
    id: 'custom',
    name: 'Custom Prompt',
    description: 'Use your own custom prompt',
    style: 'custom',
    icon: '✨',
    enabled: true,
    systemPrompt: `You are a versatile content writer following custom instructions.

Follow the specific instructions provided by the user.
If no custom instructions are provided, maintain the original text style and improve clarity.

Write in the same language as the input text.`
  }
];

/**
 * Получить шаблон промпта по ID
 */
export function getPromptTemplateById(id: string): ContentPromptTemplate | undefined {
  return CONTENT_PROMPT_TEMPLATES.find(t => t.id === id);
}

/**
 * Получить шаблон промпта по стилю
 */
export function getPromptTemplateByStyle(style: ContentProcessingStyle): ContentPromptTemplate | undefined {
  return CONTENT_PROMPT_TEMPLATES.find(t => t.style === style);
}

/**
 * Получить дефолтный шаблон
 */
export function getDefaultPromptTemplate(): ContentPromptTemplate {
  return CONTENT_PROMPT_TEMPLATES.find(t => t.isDefault) || CONTENT_PROMPT_TEMPLATES[0];
}

/**
 * Получить все активные шаблоны
 */
export function getActivePromptTemplates(): ContentPromptTemplate[] {
  return CONTENT_PROMPT_TEMPLATES.filter(t => t.enabled);
}

/**
 * Построить финальный промпт с учетом кастомных инструкций
 */
export function buildContentPrompt(
  templateId: string,
  customPrompt?: string,
  additionalContext?: string
): string {
  const template = getPromptTemplateById(templateId);
  
  if (!template) {
    return getDefaultPromptTemplate().systemPrompt;
  }

  let prompt = template.systemPrompt;

  // Для кастомного промпта используем пользовательский текст
  if (template.style === 'custom' && customPrompt) {
    prompt = `${prompt}\n\nCustom instructions:\n${customPrompt}`;
  }

  // Добавляем дополнительный контекст если есть
  if (additionalContext) {
    prompt = `${prompt}\n\nAdditional context:\n${additionalContext}`;
  }

  return prompt;
}

/**
 * Telegram кнопки для выбора стиля обработки
 */
export function getTelegramStyleButtons(): Array<{
  text: string;
  callback_data: string;
  style: ContentProcessingStyle;
}> {
  return [
    {
      text: '📰 Journalistic',
      callback_data: 'style:journalistic',
      style: 'journalistic'
    },
    {
      text: '✋ Keep As Is',
      callback_data: 'style:as-is',
      style: 'as-is'
    },
    {
      text: '✨ Custom Prompt',
      callback_data: 'style:custom',
      style: 'custom'
    }
  ];
}

/**
 * Расширенные Telegram кнопки (все стили)
 */
export function getTelegramStyleButtonsExtended(): Array<{
  text: string;
  callback_data: string;
  style: ContentProcessingStyle;
}> {
  return getActivePromptTemplates()
    .filter(t => t.style !== 'custom') // Custom prompt separately
    .map(t => ({
      text: `${t.icon} ${t.name}`,
      callback_data: `style:${t.id}`,
      style: t.style
    }))
    .concat([
      {
        text: '✨ Custom Prompt',
        callback_data: 'style:custom',
        style: 'custom'
      }
    ]);
}

