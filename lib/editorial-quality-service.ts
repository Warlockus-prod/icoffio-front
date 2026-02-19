import {
  getParserArtifactScore,
  hasSevereParserArtifacts,
  normalizeAiGeneratedText,
  sanitizeArticleBodyText,
  sanitizeExcerptText,
} from './utils/content-formatter';
import {
  evaluateTitlePolicy,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from './utils/title-policy';

interface EditorialReviewInput {
  title: string;
  content: string;
  excerpt?: string;
  language?: 'en' | 'pl' | string;
  maxInputChars?: number;
}

interface EditorialReviewResult {
  title: string;
  content: string;
  excerpt: string;
  qualityScore: number;
  issues: string[];
  usedAI: boolean;
}

class EditorialQualityService {
  private apiKey = process.env.OPENAI_API_KEY;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async reviewArticle(input: EditorialReviewInput): Promise<EditorialReviewResult> {
    const normalizedTitle = evaluateTitlePolicy(input.title || '', {
      fallback: 'Untitled Article',
      minLength: TITLE_MIN_LENGTH,
      maxLength: TITLE_MAX_LENGTH,
    });
    const cleanedTitle = normalizedTitle.title;
    const normalizedContent = normalizeAiGeneratedText(input.content || '');
    const deterministicContent = sanitizeArticleBodyText(normalizedContent, {
      language: input.language,
      aggressive: true,
    });
    const cleanedContent = deterministicContent || normalizedContent;
    const cleanedExcerpt = sanitizeExcerptText(
      input.excerpt || cleanedTitle || cleanedContent,
      200
    );

    if (!cleanedContent) {
      return {
        title: cleanedTitle,
        content: '',
        excerpt: cleanedExcerpt,
        qualityScore: 0,
        issues: this.uniqueIssues([
          ...normalizedTitle.issues,
          'Article body is empty after cleanup',
        ]),
        usedAI: false,
      };
    }

    if (!this.shouldRunAiReview(input.content || '', cleanedContent)) {
      return {
        title: cleanedTitle,
        content: cleanedContent,
        excerpt: cleanedExcerpt,
        qualityScore: this.estimateQuality(cleanedContent),
        issues: this.uniqueIssues([
          ...normalizedTitle.issues,
          ...(hasSevereParserArtifacts(cleanedContent)
            ? ['Parser artifacts were detected and cleaned with deterministic rules']
            : []),
        ]),
        usedAI: false,
      };
    }

    try {
      const reviewed = await this.runAiReview({
        title: cleanedTitle,
        excerpt: cleanedExcerpt,
        content: cleanedContent,
        language: input.language || 'en',
        maxInputChars: input.maxInputChars || 12000,
      });

      return reviewed;
    } catch (error) {
      console.warn('[EditorialQuality] AI review failed, using deterministic cleanup', error);
      return {
        title: cleanedTitle,
        content: cleanedContent,
        excerpt: cleanedExcerpt,
        qualityScore: this.estimateQuality(cleanedContent),
        issues: this.uniqueIssues([
          ...normalizedTitle.issues,
          'AI review failed; deterministic cleanup was applied',
        ]),
        usedAI: false,
      };
    }
  }

  private shouldRunAiReview(rawContent: string, cleanedContent: string): boolean {
    if (!this.isAvailable()) return false;

    const rawScore = getParserArtifactScore(rawContent);
    const cleanedScore = getParserArtifactScore(cleanedContent);

    if (rawScore >= 6 || cleanedScore >= 6) return true;
    if (rawContent.length > 9000) return true;
    if (cleanedContent.length > 6500) return true;
    return false;
  }

  private estimateQuality(content: string): number {
    const artifactPenalty = Math.min(45, getParserArtifactScore(content) * 2);
    const paragraphCount = content.split(/\n{2,}/).filter(Boolean).length;
    const structureBonus = Math.min(15, paragraphCount * 2);
    const lengthBonus = Math.min(18, Math.floor(content.length / 600));
    const score = 62 + structureBonus + lengthBonus - artifactPenalty;
    return Math.max(10, Math.min(98, Math.round(score)));
  }

  private async runAiReview(input: {
    title: string;
    excerpt: string;
    content: string;
    language: string;
    maxInputChars: number;
  }): Promise<EditorialReviewResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is missing');
    }

    const reviewContent =
      input.content.length > input.maxInputChars
        ? `${input.content.slice(0, input.maxInputChars).trim()}\n\n[truncated for AI review]`
        : input.content;

    const prompt = `
You are an editorial quality gate for a tech news site.

Language requirement:
- Keep the output strictly in ${input.language}.

Task:
- Remove parser garbage and template noise from article text.
- Drop advertising labels, sidebars, "read also" blocks, update tickers, tag clouds, raw URLs, and timestamps not needed for understanding.
- Keep factual meaning and article logic.
- Do NOT invent facts.
- Keep markdown-friendly structure (short paragraphs and optional ## headings).
- Return a natural, human-written news title between ${TITLE_MIN_LENGTH} and ${TITLE_MAX_LENGTH} characters.

Return ONLY JSON with this schema:
{
  "title": "clean title",
  "content": "clean article body",
  "excerpt": "clean short summary (max 200 chars)",
  "qualityScore": 0-100,
  "issues": ["issue 1", "issue 2"]
}

Input title:
${input.title}

Input excerpt:
${input.excerpt}

Input content:
${reviewContent}
`;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.1,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You clean and validate news article quality. Keep language unchanged and remove parser artifacts only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim() || '';
    const parsed = this.parseJsonPayload(rawText);

    const titlePolicy = evaluateTitlePolicy(parsed.title || input.title, {
      fallback: input.title || 'Untitled Article',
      minLength: TITLE_MIN_LENGTH,
      maxLength: TITLE_MAX_LENGTH,
    });
    const title = titlePolicy.title;
    const content = sanitizeArticleBodyText(normalizeAiGeneratedText(parsed.content || input.content), {
      language: input.language,
      aggressive: true,
    });
    const excerpt = sanitizeExcerptText(parsed.excerpt || input.excerpt || title, 200);
    const baseQualityScore = this.normalizeQualityScore(parsed.qualityScore, content);
    const qualityScore = this.applyTitlePolicyPenalty(baseQualityScore, titlePolicy.issues);
    const parsedIssues = Array.isArray(parsed.issues)
      ? parsed.issues.map((issue: unknown) => String(issue || '').trim()).filter(Boolean)
      : [];
    const issues = this.uniqueIssues([...parsedIssues, ...titlePolicy.issues]).slice(0, 8);

    return {
      title: title || input.title,
      content: content || input.content,
      excerpt: excerpt || sanitizeExcerptText(input.excerpt || input.title, 200),
      qualityScore,
      issues,
      usedAI: true,
    };
  }

  private parseJsonPayload(rawText: string): Record<string, any> {
    if (!rawText) return {};

    try {
      return JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch {
          return {};
        }
      }
      return {};
    }
  }

  private normalizeQualityScore(value: unknown, content: string): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
    return this.estimateQuality(content);
  }

  private applyTitlePolicyPenalty(score: number, titleIssues: string[]): number {
    if (!titleIssues.length) {
      return score;
    }
    return Math.max(0, score - Math.min(20, titleIssues.length * 8));
  }

  private uniqueIssues(issues: string[]): string[] {
    return Array.from(
      new Set(
        issues
          .map((issue) => String(issue || '').trim())
          .filter(Boolean)
      )
    );
  }
}

export const editorialQualityService = new EditorialQualityService();
