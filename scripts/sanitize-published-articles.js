#!/usr/bin/env node
/**
 * One-time Supabase content sanitizer for published_articles.
 *
 * What it does:
 * - Cleans parser artifacts in content_en/content_pl (ads/read-also/update tickers/raw URLs)
 * - Normalizes excerpts
 * - Recalculates word_count
 * - Updates only rows that look dirty and become cleaner after sanitization
 *
 * Usage:
 *   node scripts/sanitize-published-articles.js --dry-run
 *   node scripts/sanitize-published-articles.js --confirm
 *   node scripts/sanitize-published-articles.js --confirm --id=50
 *   node scripts/sanitize-published-articles.js --confirm --slug=some-slug-en
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials not configured.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseArgValue(name) {
  const full = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return full ? full.slice(name.length + 1).trim() : '';
}

function parseArgList(name) {
  const raw = parseArgValue(name);
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

const isConfirm = process.argv.includes('--confirm');
const isDryRun = !isConfirm || process.argv.includes('--dry-run');
const includeUnpublished = process.argv.includes('--all');
const limitArg = Number.parseInt(parseArgValue('--limit') || '', 10);
const maxRows = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : 2000;
const minScoreArg = Number.parseInt(parseArgValue('--min-score') || '', 10);
const minScore = Number.isFinite(minScoreArg) && minScoreArg >= 0 ? minScoreArg : 4;
const filterIds = parseArgList('--id')
  .map((raw) => Number.parseInt(raw, 10))
  .filter((value) => Number.isFinite(value));
const filterSlugs = parseArgList('--slug').map((value) => value.toLowerCase());

function normalizeAiGeneratedText(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }

  let normalized = content.replace(/\r\n/g, '\n').trim();

  normalized = normalized.replace(/\*\*([^*\n]{6,100})\*\*/g, (_match, inner) => {
    const headingText = String(inner || '').trim();
    const words = headingText.split(/\s+/).filter(Boolean).length;
    const hasHeadingEnding = /[?!]$/.test(headingText);
    const looksLikeHeading =
      words >= 2 &&
      words <= 14 &&
      (hasHeadingEnding || words >= 4) &&
      /^[A-Za-z0-9À-ž"'“”‘’(]/.test(headingText) &&
      !/[,:;.]$/.test(headingText);

    if (!looksLikeHeading) {
      return headingText;
    }
    return `\n\n## ${headingText}\n\n`;
  });

  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, '$1');

  const lineBreakCount = (normalized.match(/\n/g) || []).length;
  if (lineBreakCount < 2 && normalized.length > 500) {
    const sentenceRegex = /[^.!?]+[.!?]+|[^.!?]+$/g;
    const sentences = (normalized.match(sentenceRegex) || [])
      .map((line) => line.trim())
      .filter(Boolean);

    if (sentences.length >= 4) {
      const paragraphs = [];
      for (let i = 0; i < sentences.length; i += 2) {
        paragraphs.push(sentences.slice(i, i + 2).join(' '));
      }
      normalized = paragraphs.join('\n\n');
    }
  }

  return normalized
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

function sanitizeExcerptText(content, maxLength = 160) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  let cleaned = content.replace(/\r\n/g, '\n').trim();

  cleaned = cleaned
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  cleaned = cleaned
    .replace(/\s{0,2}#{2,6}\s*(?=\S)/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'`«»„”]+|["'`«»„”]+$/g, '')
    .trim();

  if (!cleaned) return '';

  if (maxLength > 0 && cleaned.length > maxLength) {
    const truncated = cleaned.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.substring(0, lastSpace).trim() + '...';
    }
    return truncated.trim() + '...';
  }

  return cleaned;
}

const PARSER_HARD_STOP_PATTERNS = [
  /\b(spider'?s web|google discover)\b/i,
  /\bnajnowsze\d{1,2}[:.]\d{2}/i,
  /\b(aktualizacja|updated?)\s*:\s*\d{4}-\d{2}-\d{2}t/i,
  /\btagi\s*:/i,
];

const PARSER_INLINE_NOISE_PATTERNS = [
  /\bREKLAMA\s*/g,
  /\bADVERTISEMENT\s*/gi,
  /\bADVERTISMENT\s*/gi,
  /\bSPONSORED\s*/gi,
  /\b(czytaj też|read also|read more|polecamy)\s*:?\s*/gi,
  /\b(aktualizacja|updated?)\s*:\s*\d{4}-\d{2}-\d{2}t[^\s]*/gi,
  /\bhttps?:\/\/[^\s)]+/gi,
  /\bwww\.[^\s)]+/gi,
  /\b\d{1,2}\s*[.:]\s*\d{2}\b/g,
];

const PARSER_ARTIFACT_PATTERNS = [
  { pattern: /\bREKLAMA\b/gi, weight: 4 },
  { pattern: /\bCzytaj też\b/gi, weight: 4 },
  { pattern: /\bRead also\b/gi, weight: 4 },
  { pattern: /\bAktualizacja\s*:/gi, weight: 5 },
  { pattern: /\bGoogle Discover\b/gi, weight: 3 },
  { pattern: /\bTagi\s*:/gi, weight: 3 },
  { pattern: /\b(?:\d{1,2}[:.]\d{2}\s*){3,}/g, weight: 4 },
  { pattern: /\bhttps?:\/\/[^\s)]+/gi, weight: 2 },
];

function countMatches(input, pattern) {
  const matches = String(input || '').match(pattern);
  return matches ? matches.length : 0;
}

function getParserArtifactScore(content) {
  if (!content) return 0;
  return PARSER_ARTIFACT_PATTERNS.reduce((total, entry) => {
    return total + countMatches(content, entry.pattern) * entry.weight;
  }, 0);
}

function sanitizeArticleBodyText(content, options = {}) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const minParagraphs = Number.isFinite(options.minParagraphs) ? options.minParagraphs : 2;

  let normalized = normalizeAiGeneratedText(content)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (!normalized) return '';

  const markerMatch = normalized.match(/<!--\s*ICOFFIO_MONETIZATION[\s\S]*?-->/i);
  const monetizationMarker = options.preserveMonetizationMarker === false ? '' : (markerMatch && markerMatch[0] ? markerMatch[0].trim() : '');
  normalized = normalized.replace(/<!--\s*ICOFFIO_MONETIZATION[\s\S]*?-->/gi, '').trim();

  const rawParagraphs = normalized
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cleanedParagraphs = [];
  const seenParagraphs = new Set();

  for (const rawParagraph of rawParagraphs) {
    const isHeading = /^#{1,6}\s+/.test(rawParagraph);
    let paragraph = rawParagraph;

    if (!isHeading && /(czytaj też|read also|read more|polecamy)/i.test(paragraph)) {
      continue;
    }

    const shouldStop = PARSER_HARD_STOP_PATTERNS.some((pattern) => pattern.test(paragraph));
    if (shouldStop && cleanedParagraphs.length >= minParagraphs) {
      break;
    }

    for (const pattern of PARSER_INLINE_NOISE_PATTERNS) {
      paragraph = paragraph.replace(pattern, ' ');
    }

    paragraph = paragraph
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!paragraph) continue;

    const plain = paragraph.replace(/^#{1,6}\s+/, '').trim();
    if (!plain) continue;

    const words = plain
      .split(/\s+/)
      .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, ''))
      .filter(Boolean);

    const alphaChars = (plain.match(/[\p{L}]/gu) || []).length;
    const digitChars = (plain.match(/\d/g) || []).length;
    const digitRatio = digitChars / Math.max(alphaChars + digitChars, 1);
    const updateHits = countMatches(plain, /\b(aktualizacja|updated|najnowsze|tagi)\b/gi);
    const tickerLike = /(?:\d{1,2}[:.]\d{2}\s*){2,}/.test(plain);

    if (!isHeading && words.length < 6) continue;
    if (!isHeading && digitRatio > 0.35) continue;
    if (!isHeading && (updateHits >= 2 || tickerLike)) continue;

    const dedupeKey = plain
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);

    if (!dedupeKey) continue;
    if (options.aggressive && seenParagraphs.has(dedupeKey)) continue;
    seenParagraphs.add(dedupeKey);

    cleanedParagraphs.push(paragraph);
  }

  const cleanedBody = cleanedParagraphs
    .join('\n\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

  if (!cleanedBody) return '';
  if (monetizationMarker) {
    return `${monetizationMarker}\n\n${cleanedBody}`.trim();
  }
  return cleanedBody;
}

function calcWordCount(contentEn, contentPl) {
  const target = contentEn || contentPl || '';
  const words = target
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  return words.length;
}

function hasNoiseTokens(content) {
  if (!content) return false;
  return /\b(REKLAMA|Czytaj też|Read also|Aktualizacja:|Google Discover|Tagi:|https?:\/\/|www\.)/i.test(content);
}

function shouldFilterRow(row) {
  if (filterIds.length > 0 && !filterIds.includes(Number(row.id))) {
    return false;
  }

  if (filterSlugs.length > 0) {
    const en = String(row.slug_en || '').toLowerCase();
    const pl = String(row.slug_pl || '').toLowerCase();
    const match = filterSlugs.some((slug) => slug === en || slug === pl);
    if (!match) return false;
  }

  return true;
}

async function loadArticles() {
  const rows = [];
  const pageSize = 200;
  let from = 0;

  while (rows.length < maxRows) {
    const to = Math.min(from + pageSize - 1, from + (maxRows - rows.length) - 1);

    let query = supabase
      .from('published_articles')
      .select('id,title,slug_en,slug_pl,published,content_en,content_pl,excerpt_en,excerpt_pl,word_count')
      .order('id', { ascending: true })
      .range(from, to);

    if (!includeUnpublished) {
      query = query.eq('published', true);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load articles: ${error.message}`);
    }

    if (!data || data.length === 0) break;
    rows.push(...data);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return rows.filter(shouldFilterRow);
}

async function run() {
  console.log('🧹 Supabase One-time Content Sanitizer\n');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'CONFIRM (write to DB)'}`);
  console.log(`Scope: ${includeUnpublished ? 'all rows' : 'published only'}`);
  console.log(`Limit: ${maxRows}`);
  console.log(`Min dirty score: ${minScore}`);
  if (filterIds.length > 0) console.log(`Filter IDs: ${filterIds.join(', ')}`);
  if (filterSlugs.length > 0) console.log(`Filter slugs: ${filterSlugs.join(', ')}`);
  console.log('');

  const rows = await loadArticles();
  console.log(`Loaded rows: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log('Nothing to process.');
    return;
  }

  const candidates = [];
  let dirtyRows = 0;
  let totalBeforeScore = 0;
  let totalAfterScore = 0;

  for (const row of rows) {
    const origEn = String(row.content_en || '');
    const origPl = String(row.content_pl || '');
    const origExcerptEn = String(row.excerpt_en || '');
    const origExcerptPl = String(row.excerpt_pl || '');
    const title = String(row.title || '');

    const cleanedEn =
      sanitizeArticleBodyText(origEn, { language: 'en', aggressive: true, preserveMonetizationMarker: true }) ||
      normalizeAiGeneratedText(origEn);
    const cleanedPl =
      sanitizeArticleBodyText(origPl, { language: 'pl', aggressive: true, preserveMonetizationMarker: true }) ||
      normalizeAiGeneratedText(origPl);

    const cleanedExcerptEn = sanitizeExcerptText(origExcerptEn || title || cleanedEn, 200);
    const cleanedExcerptPl = sanitizeExcerptText(origExcerptPl || title || cleanedPl || cleanedExcerptEn, 200);
    const cleanedWordCount = calcWordCount(cleanedEn, cleanedPl);

    const beforeScore = getParserArtifactScore(`${origEn}\n${origPl}`);
    const afterScore = getParserArtifactScore(`${cleanedEn}\n${cleanedPl}`);
    totalBeforeScore += beforeScore;
    totalAfterScore += afterScore;

    const dirtySignals = beforeScore >= minScore || hasNoiseTokens(origEn) || hasNoiseTokens(origPl);
    if (dirtySignals) dirtyRows += 1;

    const payload = {};
    if (cleanedEn !== origEn) payload.content_en = cleanedEn;
    if (cleanedPl !== origPl) payload.content_pl = cleanedPl;
    if (cleanedExcerptEn !== origExcerptEn) payload.excerpt_en = cleanedExcerptEn;
    if (cleanedExcerptPl !== origExcerptPl) payload.excerpt_pl = cleanedExcerptPl;

    const currentWordCount = Number(row.word_count || 0);
    if (cleanedWordCount > 0 && cleanedWordCount !== currentWordCount) {
      payload.word_count = cleanedWordCount;
    }

    const hasChanges = Object.keys(payload).length > 0;
    const qualityImproved = afterScore < beforeScore;
    const shouldUpdate = hasChanges && (dirtySignals || qualityImproved);

    if (shouldUpdate) {
      candidates.push({
        id: row.id,
        slug_en: row.slug_en,
        slug_pl: row.slug_pl,
        title,
        beforeScore,
        afterScore,
        payload,
        beforeLenEn: origEn.length,
        afterLenEn: cleanedEn.length,
        beforeLenPl: origPl.length,
        afterLenPl: cleanedPl.length,
      });
    }
  }

  console.log(`Dirty rows detected: ${dirtyRows}`);
  console.log(`Candidates for update: ${candidates.length}`);
  console.log(`Artifact score (sum): ${totalBeforeScore} -> ${totalAfterScore}\n`);

  if (candidates.length === 0) {
    console.log('No updates required.');
    return;
  }

  const preview = candidates.slice(0, 20);
  console.log('Preview (up to 20 rows):');
  preview.forEach((item, index) => {
    const fields = Object.keys(item.payload).join(', ');
    console.log(
      `${String(index + 1).padStart(2, '0')}. id=${item.id} slug_pl=${item.slug_pl || '-'} score=${item.beforeScore}->${item.afterScore} fields=[${fields}] len_pl=${item.beforeLenPl}->${item.afterLenPl}`
    );
  });
  console.log('');

  if (isDryRun) {
    console.log('Dry-run complete. Re-run with --confirm to apply updates.');
    return;
  }

  let updated = 0;
  let failed = 0;

  for (const item of candidates) {
    const { error } = await supabase
      .from('published_articles')
      .update(item.payload)
      .eq('id', item.id);

    if (error) {
      failed += 1;
      console.error(`❌ Update failed id=${item.id}: ${error.message}`);
      continue;
    }

    updated += 1;
    console.log(`✅ Updated id=${item.id} slug_pl=${item.slug_pl || '-'}`);
  }

  console.log('\nDone.');
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);
}

run().catch((error) => {
  console.error('\n❌ Script failed:', error.message || error);
  process.exit(1);
});
