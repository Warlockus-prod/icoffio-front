/**
 * POST /api/admin/info/auto-translate-titles
 *
 * Batch-translate info_feeds.title → info_feeds.title_pl (and/or title_en) via OpenAI.
 *
 * v10.12.0: solves the user's original complaint — "IAB Polska shows in English
 * on PL locale" — by letting admin one-click fill missing localized titles for
 * all 121 feeds in a single ~$0.001 GPT call.
 *
 * Body (optional):
 *   { target: 'pl' | 'en' = 'pl', overwrite: false, onlyMissing: true }
 *
 * Response:
 *   { ok, updated, skipped, totalScanned, durationMs }
 *
 * Auth: admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';
import { getPool } from '@/lib/pg-pool';
import { logError } from '@/lib/error-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface TranslateBody {
  target?: 'pl' | 'en';
  overwrite?: boolean;
  onlyMissing?: boolean;
  /** v10.13.0: which table to translate. Default 'feeds' for backward-compat. */
  scope?: 'feeds' | 'blocks' | 'boards' | 'all';
}

const SCOPE_TABLES: Record<'feeds' | 'blocks' | 'boards', { table: string; titleCol: string; subtitleCol?: string }> = {
  feeds:  { table: 'info_feeds',  titleCol: 'title' },
  blocks: { table: 'info_blocks', titleCol: 'title' },
  boards: { table: 'info_boards', titleCol: 'title', subtitleCol: 'subtitle' },
};

const TARGET_COLUMN: Record<'pl' | 'en', 'title_pl' | 'title_en'> = {
  pl: 'title_pl',
  en: 'title_en',
};

const SOFT_LANG_NAME: Record<'pl' | 'en', string> = {
  pl: 'Polish',
  en: 'English',
};

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin');
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  let body: TranslateBody = {};
  try {
    body = (await request.json()) as TranslateBody;
  } catch { /* empty body OK */ }

  const target = body.target === 'en' ? 'en' : 'pl';
  const overwrite = body.overwrite === true;
  const onlyMissing = body.onlyMissing !== false; // default true
  const column = TARGET_COLUMN[target];
  const scope = body.scope || 'feeds';

  const pool = getPool();
  const startedAt = Date.now();

  // v10.13.0: when scope='all', iterate over feeds + blocks + boards
  const tablesToProcess: Array<'feeds' | 'blocks' | 'boards'> =
    scope === 'all' ? ['feeds', 'blocks', 'boards'] : [scope as 'feeds' | 'blocks' | 'boards'];

  const allResults: Array<{
    scope: string;
    updated: number;
    skipped: number;
    totalScanned: number;
  }> = [];

  try {
    for (const currentScope of tablesToProcess) {
      const tableConfig = SCOPE_TABLES[currentScope];
      const { table, titleCol } = tableConfig;

      // 1. Fetch rows that need translation
      const filterSql = overwrite
        ? '1=1'
        : onlyMissing
          ? `(${column} IS NULL OR ${column} = '' OR ${column} = ${titleCol})`
          : `${column} IS NULL OR ${column} = ''`;

      const { rows } = await pool.query(
        `SELECT id, ${titleCol} AS title FROM ${table}
          WHERE ${filterSql}
          ORDER BY id ASC`,
      );

      if (rows.length === 0) {
        allResults.push({ scope: currentScope, updated: 0, skipped: 0, totalScanned: 0 });
        continue;
      }

      const result = await translateAndUpdate(rows, table, column, target, overwrite, pool);
      allResults.push({ scope: currentScope, ...result });
    }

    // Compose response
    const totalUpdated = allResults.reduce((sum, r) => sum + r.updated, 0);
    const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
    const totalScanned = allResults.reduce((sum, r) => sum + r.totalScanned, 0);

    return NextResponse.json({
      ok: true,
      target,
      column,
      scope,
      updated: totalUpdated,
      skipped: totalSkipped,
      totalScanned,
      perScope: allResults,
      durationMs: Date.now() - startedAt,
      modelUsed: process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4.1-mini',
    });
  } catch (err: any) {
    await logError({
      level: 'error',
      source: 'auto-translate-titles',
      message: 'Handler crashed',
      error: err,
    });
    return NextResponse.json({ ok: false, error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

/**
 * Helper: translate a batch of rows via one GPT call, then update DB.
 * Extracted from the main handler in v10.13.0 to support scope=feeds|blocks|boards|all.
 */
async function translateAndUpdate(
  rows: Array<{ id: number; title: string }>,
  table: string,
  column: 'title_en' | 'title_pl',
  target: 'en' | 'pl',
  overwrite: boolean,
  pool: ReturnType<typeof getPool>,
): Promise<{ updated: number; skipped: number; totalScanned: number }> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const openaiBase = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_TRANSLATE_MODEL || 'gpt-4.1-mini';

    const numbered = rows.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
    const langName = SOFT_LANG_NAME[target];

    const prompt = `You are localizing UI labels for a news aggregator.
Translate the following item names to ${langName}. Rules:
- Keep BRAND NAMES unchanged (e.g. "BBC", "Bloomberg", "TechCrunch", "iXBT", "TASS", "RT", "IAB").
- Translate descriptive nouns ("News", "Markets", "Media", "Polskie", "European Union" etc.).
- Preserve the case style and punctuation of the original.
- One-line output per item, prefixed with the same number and a period.
- Do NOT add explanations or commentary.
- If the name is ALREADY in ${langName}, return it as-is.

Input:
${numbered}

Output (numbered, one per line):`;

    const aiResp = await fetch(`${openaiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: Math.min(4000, rows.length * 40),
        messages: [
          { role: 'system', content: 'You translate brand and label names with surgical precision.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      await logError({
        level: 'error',
        source: 'auto-translate-titles',
        message: `OpenAI ${aiResp.status}`,
        metadata: { body: errText.slice(0, 400), table },
      });
      throw new Error(`OpenAI ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || '';

    const translations = new Map<number, string>();
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*(\d+)\.\s*(.+?)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        const t = m[2].trim();
        if (n >= 1 && n <= rows.length && t) {
          translations.set(n - 1, t);
        }
      }
    }

    let updated = 0;
    let skipped = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const t = translations.get(i);
      if (!t) { skipped++; continue; }
      if (t === r.title && !overwrite) { skipped++; continue; }

      await pool.query(
        `UPDATE ${table} SET ${column} = $1 WHERE id = $2`,
        [t.slice(0, 500), r.id],
      );
      updated++;
    }

    return { updated, skipped, totalScanned: rows.length };
}
