/**
 * AI COPYWRITING SERVICE
 * 
 * Generates full-length, high-quality articles from short descriptions
 * using OpenAI GPT-4o (latest and most cost-effective model)
 * 
 * Features:
 * - 1-2 sentences → 500-1000 word article
 * - Professional tech journalism style
 * - SEO-optimized content
 * - Proper markdown formatting
 * - Multiple language support (EN, PL)
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

export interface ArticleGenerationRequest {
  prompt: string; // 1-2 sentences describing the article
  title?: string; // Optional suggested title
  category?: string; // Article category (AI, Tech, Games, etc.)
  language?: 'en' | 'pl'; // Target language
  targetWords?: number; // Target word count (default: 600)
  style?: 'professional' | 'casual' | 'technical'; // Writing style
}

export interface ArticleGenerationResult {
  success: boolean;
  title: string;
  excerpt: string;
  content: string; // Full markdown content
  wordCount: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  error?: string;
}

/**
 * Generate a full article from a short prompt using GPT-4o
 */
export async function generateArticleContent(
  request: ArticleGenerationRequest
): Promise<ArticleGenerationResult> {
  try {
    const openai = getOpenAIClient();
    
    const {
      prompt,
      title,
      category = 'Technology',
      language = 'en',
      targetWords = 600,
      style = 'professional'
    } = request;

    // Build system prompt
    const systemPrompt = buildSystemPrompt(language, style, category);
    
    // Build user prompt
    const userPrompt = buildUserPrompt(prompt, title, targetWords, language);

    // Call GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // Latest, fastest, most cost-effective
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2500, // ~1500-2000 words
      top_p: 0.9,
    });

    const generatedText = completion.choices[0]?.message?.content || '';
    
    if (!generatedText) {
      throw new Error('No content generated');
    }

    // Parse the generated content
    const parsed = parseGeneratedArticle(generatedText);
    
    // Calculate cost (GPT-4o pricing: $0.005/1K input, $0.015/1K output)
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = completion.usage?.total_tokens || 0;
    const estimatedCost = (inputTokens * 0.005 / 1000) + (outputTokens * 0.015 / 1000);

    return {
      success: true,
      title: parsed.title || title || 'Untitled Article',
      excerpt: parsed.excerpt,
      content: parsed.content,
      wordCount: parsed.wordCount,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost
      }
    };

  } catch (error: any) {
    console.error('AI Copywriting Error:', error);
    return {
      success: false,
      title: '',
      excerpt: '',
      content: '',
      wordCount: 0,
      error: error.message || 'Failed to generate article'
    };
  }
}

/**
 * Build system prompt based on language and style
 */
function buildSystemPrompt(
  language: 'en' | 'pl',
  style: string,
  category: string
): string {
  const basePrompts = {
    en: `You are a professional tech journalist writing for icoffio.com, a leading technology news and analysis platform.

Your writing style:
- Professional yet engaging tone
- Technical accuracy with accessibility
- SEO-optimized content with natural keyword integration
- Clear structure with proper headings and subheadings
- Data-driven insights with examples and statistics
- Authoritative voice similar to TechCrunch, The Verge, Ars Technica

Category focus: ${category}

Always use proper markdown formatting:
- H1 for main title (# Title)
- H2 for major sections (## Section)
- H3 for subsections (### Subsection)
- Bold (**text**) for emphasis
- Bullet lists for key points
- Code blocks for technical examples when relevant`,

    pl: `Jesteś profesjonalnym dziennikarzem technologicznym piszącym dla icoffio.com, wiodącej platformy z wiadomościami i analizami technologicznymi.

Twój styl pisania:
- Profesjonalny, ale angażujący ton
- Dokładność techniczna z przystępnością
- Treści zoptymalizowane pod SEO
- Jasna struktura z właściwymi nagłówkami
- Spostrzeżenia oparte na danych z przykładami i statystykami
- Autorytatywny głos podobny do TechCrunch, The Verge, Ars Technica

Kategoria: ${category}

Zawsze używaj właściwego formatowania markdown:
- H1 dla głównego tytułu (# Tytuł)
- H2 dla głównych sekcji (## Sekcja)
- H3 dla podsekcji (### Podsekcja)
- Pogrubienie (**tekst**) dla akcentu
- Listy punktowane dla kluczowych punktów
- Bloki kodu dla przykładów technicznych gdy są istotne`
  };

  return basePrompts[language];
}

/**
 * Build user prompt with article requirements
 */
function buildUserPrompt(
  prompt: string,
  title: string | undefined,
  targetWords: number,
  language: 'en' | 'pl'
): string {
  const instructions = {
    en: `Write a comprehensive article based on the following:

Topic: ${prompt}
${title ? `Suggested title: ${title}` : ''}
Target length: ${targetWords} words (aim for ${targetWords - 50} to ${targetWords + 50})

Requirements:
1. Start with an H1 title that's catchy and SEO-friendly (50-70 characters)
2. Write a compelling 2-3 sentence introduction (100-150 characters for excerpt)
3. Create 4-6 major sections with H2 headings
4. Include 2-3 H3 subsections per major section
5. Use bullet points for lists and key takeaways
6. Add relevant examples, statistics, and real-world applications
7. Include a conclusion that summarizes key points and looks forward
8. Use professional technical language but remain accessible
9. Ensure SEO optimization with natural keyword usage

Format: Return ONLY the article content in markdown format. Start with the H1 title.`,

    pl: `Napisz kompleksowy artykuł na podstawie:

Temat: ${prompt}
${title ? `Sugerowany tytuł: ${title}` : ''}
Docelowa długość: ${targetWords} słów (celuj w ${targetWords - 50} do ${targetWords + 50})

Wymagania:
1. Zacznij od tytułu H1, który jest chwytliwy i przyjazny SEO (50-70 znaków)
2. Napisz przekonujące wprowadzenie 2-3 zdania (100-150 znaków na excerpt)
3. Stwórz 4-6 głównych sekcji z nagłówkami H2
4. Dodaj 2-3 podsekcje H3 na główną sekcję
5. Używaj punktów wypunktowanych dla list i kluczowych wniosków
6. Dodaj odpowiednie przykłady, statystyki i zastosowania w rzeczywistości
7. Dołącz podsumowanie, które zawiera kluczowe punkty i patrzy w przyszłość
8. Używaj profesjonalnego języka technicznego, ale pozostań przystępny
9. Zapewnij optymalizację SEO z naturalnym użyciem słów kluczowych

Format: Zwróć TYLKO treść artykułu w formacie markdown. Zacznij od tytułu H1.`
  };

  return instructions[language];
}

/**
 * Parse generated article and extract components
 */
function parseGeneratedArticle(text: string): {
  title: string;
  excerpt: string;
  content: string;
  wordCount: number;
} {
  // Extract title (first H1)
  const titleMatch = text.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract first paragraph as excerpt (after title, before first H2)
  const afterTitle = text.substring(text.indexOf('\n', text.indexOf('#')) + 1);
  const beforeFirstH2 = afterTitle.split(/^##\s/m)[0];
  const firstParagraph = beforeFirstH2
    .split('\n\n')
    .find(p => p.trim() && !p.startsWith('#'));
  
  const excerpt = firstParagraph
    ? firstParagraph.trim().substring(0, 160)
    : '';

  // Clean content
  const content = text.trim();

  // Count words
  const wordCount = content
    .replace(/[#*`\[\]()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .length;

  return {
    title,
    excerpt,
    content,
    wordCount
  };
}

/**
 * Estimate cost for article generation
 */
export function estimateGenerationCost(
  promptLength: number,
  targetWords: number
): number {
  // Rough token estimation
  const inputTokens = Math.ceil(promptLength / 4) + 500; // Prompt + system
  const outputTokens = Math.ceil(targetWords * 1.5); // Words to tokens
  
  // GPT-4o pricing: $0.005/1K input, $0.015/1K output
  const cost = (inputTokens * 0.005 / 1000) + (outputTokens * 0.015 / 1000);
  
  return Math.round(cost * 100) / 100; // Round to 2 decimals
}

