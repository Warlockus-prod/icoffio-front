# CONTENT AUDIT REPORT — icoffio v8.6.48
**Date:** 2026-02-17
**Audited domain:** web.icoffio.com
**API endpoint:** /api/supabase-articles
**Total articles found:** PL=35, EN=14 (same Supabase rows, dual-language)

---

## EXECUTIVE SUMMARY

The content pipeline has **7 systemic bugs** and the article database contains **junk/duplicate data** that must be cleaned before production DNS cutover. The two most critical issues are:

1. **All Polish article titles are displayed in English** — the `title` field in Supabase stores only the English title; the API list view never extracts the Polish title.
2. **7 duplicate Garmin articles + 2 test articles** pollute both PL and EN feeds.

---

## BUG #1 — PL TITLES ALWAYS ENGLISH (P0 — CRITICAL)

### Problem
Every PL article displays its English title in list views (homepage, category pages, related articles). The Supabase table `published_articles` has only **one `title` field** — always English.

### Root cause — 3 locations
| File | Line | Code | Issue |
|------|------|------|-------|
| `lib/data.ts` | 113 | `title: article.title \|\| "Untitled"` | `transformSupabaseArticleToPost()` used by `getAllPosts`, `getPostsByCategory`, `getRelated` — always returns EN title |
| `app/api/supabase-articles/route.ts` | 187 | `title: article.title` | GET handler list transform — always returns EN title |
| `app/api/supabase-articles/route.ts` | 347 | `title: article.title` | Related articles transform — always returns EN title |

### Where Polish title IS extracted (single article view only)
| File | Line | Logic |
|------|------|-------|
| `lib/data.ts` | 285-296 | `getPostBySlug()` extracts PL title from `content_pl` H1 heading or falls back to `excerpt_pl` |
| `app/api/supabase-articles/route.ts` | ~256-268 | POST `get-by-slug` handler — same logic |

### Where Polish titles are stored in Supabase
| Source type | Where PL title lives | Reliability |
|-------------|---------------------|-------------|
| `telegram-simple` articles | `tags[0]` — full Polish title as first tag element | HIGH — always present |
| `imported` articles | `content_pl` H1 heading (`# Tytuł...`) | MEDIUM — present on ~60% |
| Fallback | `excerpt_pl` first sentence (≤140 chars) | LOW — approximation only |

### Fix required
Add PL title extraction to all 3 list-view transforms. Recommended approach:
```typescript
function extractPolishTitle(article: any): string {
  // 1. Try tags[0] if it contains Polish characters
  if (Array.isArray(article.tags) && article.tags.length > 0) {
    const firstTag = article.tags[0];
    if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(firstTag) && firstTag.length > 10) {
      return firstTag;
    }
  }
  // 2. Try content_pl H1 heading
  const heading = (article.content_pl || '').match(/^#\s+(.+)$/m);
  if (heading) return heading[1];
  // 3. Fall back to excerpt_pl
  const excerpt = (article.excerpt_pl || '').trim();
  if (excerpt && excerpt.length <= 140) return excerpt;
  // 4. Last resort: English title
  return article.title || 'Untitled';
}
```

### Long-term fix
Add `title_pl` column to `published_articles` table in Supabase and populate it in the Telegram bot pipeline.

---

## BUG #2 — API PARAM MISMATCH (P0 — CRITICAL)

### Problem
The API route uses `lang` and `limit` params, but frontend components may send `locale` and `pageSize`, causing Polish users to receive English content (defaults to `lang=en`).

### Root cause
```typescript
// app/api/supabase-articles/route.ts, line 94
const language = searchParams.get('lang') || 'en';   // ← ignores "locale"
const limit = parseInt(searchParams.get('limit') || '100');  // ← ignores "pageSize"
```

### Fix required
Accept both parameter names:
```typescript
const language = searchParams.get('lang') || searchParams.get('locale') || 'en';
const limit = parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '100');
```

Also verify all frontend `fetch()` calls to this endpoint use consistent param names.

---

## BUG #3 — DUPLICATE ARTICLES (P1)

### Garmin Fenix 7 Pro — 7 copies (keep 1, delete 6)

| # | Slug (EN) | Slug (PL) |
|---|-----------|-----------|
| 1 | `this-garmin-was-800-pln-more-expensive-not-long-ago-the-feni-en` | `-pl` |
| 2 | `this-garmin-was-800-pln-more-expensive-just-a-while-ago-feni-en` | `-pl` |
| 3 | `this-garmin-was-800-pln-more-expensive-just-a-while-ago-the--en` | `-pl` |
| 4 | `this-garmin-was-800-pln-more-expensive-just-a-moment-ago-the-en` | `-pl` |
| 5 | `this-garmin-was-800-pln-more-expensive-fenix-7-pro-is-now-a--en` | `-pl` |
| 6 | `this-garmin-was-800-pln-more-expensive-a-while-ago-fenix-7-p-en` | `-pl` |
| 7 | `this-garmin-was-800-pln-more-expensive-fenix-7-pro-now-offer-en` | `-pl` |

**Action:** Keep #1 or best quality version, set `published=false` on the rest.

### VK Play — 2 copies (keep 1, delete 1)

| Slug (EN) |
|-----------|
| `vk-play-to-integrate-with-the-steam-game-catalog-en` |
| `vk-play-to-integrate-with-steam-game-catalog-en` |

**Root cause:** The Telegram bot pipeline lacks deduplication — the same source article processed multiple times creates separate rows with slightly different slug suffixes.

**Fix required in bot pipeline:** Before inserting, check if a similar `title` already exists (fuzzy match or Levenshtein distance ≤ 5).

---

## BUG #4 — TEST/JUNK ARTICLES IN PRODUCTION (P1)

### Articles to delete/unpublish

| Title | Slug EN | Slug PL | Content |
|-------|---------|---------|---------|
| `flow probe article` | `flow-probe-article-en` | `flow-probe-article-pl` | 15-20 chars (`# flow probe article`) |
| `manual publish image check` | `manual-publish-image-check-en` | `manual-publish-image-check-pl` | 11-28 chars |

**Action:** Set `published=false` in Supabase immediately.

---

## BUG #5 — IMAGE ISSUES (P1)

### 5a. No hero image — 16/35 PL articles (46%), 8/14 EN articles (57%)

Articles with empty `image_url` show a fallback Unsplash image on the article page, but in card/list views may render with no image at all.

**Fix:** Add image generation to the bot pipeline, or assign a category-based default image.

### 5b. Broken inline image refs — 18/35 PL (51%), 12/14 EN (86%)

Content contains empty markdown images: `![alt text]()` which render as broken image icons.

**Fix:** Add content sanitizer to strip `![...]()`  empty refs:
```typescript
content = content.replace(/!\[[^\]]*\]\(\s*\)/g, '');
```

### 5c. No `imageAlt` — 35/35 PL (100%), 14/14 EN (100%)

Every article has `imageAlt = null/empty`. Bad for SEO and accessibility.

**Fix:** Set `imageAlt = title` as fallback, or generate alt text in the bot pipeline.

### 5d. Unsplash hotlinks — 11/35 PL, 3/14 EN

Images link directly to `images.unsplash.com`. These URLs may change, get rate-limited, or violate Unsplash ToS for hotlinking.

**Fix:** Download and re-host images in Vercel Blob Storage or Supabase Storage.

---

## BUG #6 — TAGS MISUSED AS TITLES (P2)

### Problem
For `telegram-simple` articles, `tags` contains **one element: the full Polish title** (60-120 chars).
For `imported` articles, `tags` = `['ai-processed', 'imported']`.

No article has proper keyword tags (e.g., `['garmin', 'smartwatch', 'sale']`).

### Impact
- Tag-based navigation/filtering is broken
- SEO tag clouds are useless
- The PL title stored in `tags[0]` is the ONLY source for Polish titles in some articles

### Fix required
1. Extract Polish title from `tags[0]` before overwriting tags
2. Generate proper keyword tags in the bot pipeline
3. Store Polish title in a dedicated `title_pl` column

---

## BUG #7 — MONETIZATION COMMENTS LEAK INTO CONTENT (P2)

### Problem
Some articles contain raw `<!-- ICOFFIO_MONETIZATION ... -->` HTML comments that may be visible in certain rendering modes or RSS feeds.

### Affected articles (confirmed)
- `whatsapp-with-a-long-awaited-change-it-will-work-on-your-old-pl`
- `gaming-week-god-of-war-trilogy-remake-john-wick-action-trail-pl`

### Fix
Already handled by `extractMonetizationSettingsFromContent()` in article page, but ensure the API route also strips these before returning content. Add to `prepareArticleContentForFrontend()`:
```typescript
content = content.replace(/<!--\s*ICOFFIO_MONETIZATION[\s\S]*?-->/g, '');
```

---

## ADDITIONAL ISSUES

### Russian-language article
- Title: "VK Play получит интеграцию с каталогом игр Steam"
- This has English and Polish versions but the source content/title is Russian
- **Action:** Verify content quality, consider flagging non-EN/PL source articles

### Slug structure
- All slugs are English-based (derived from English title), even for PL versions (just adds `-pl` suffix)
- This is acceptable for now but not ideal for PL SEO
- **Long-term:** Generate PL slugs from PL titles

### Article count mismatch
- API returns 35 PL / 14 EN articles
- After deduplication of Garmin (6 removed) + VK Play (1 removed) + test articles (2 removed):
  - Expected: 26 PL / 5 EN unique articles
  - This is a very small content base

---

## DEVELOPER ACTION CHECKLIST

### Immediate (before DNS cutover)

- [ ] **Supabase:** Set `published=false` on 2 test articles (`flow-probe-article`, `manual-publish-image-check`)
- [ ] **Supabase:** Set `published=false` on 6 duplicate Garmin articles (keep best one)
- [ ] **Supabase:** Set `published=false` on 1 duplicate VK Play article

### Code fixes — P0

- [ ] **`lib/data.ts` line 113:** Add `extractPolishTitle()` to `transformSupabaseArticleToPost()` — use for PL locale
- [ ] **`app/api/supabase-articles/route.ts` line 187:** Add PL title extraction to GET list transform
- [ ] **`app/api/supabase-articles/route.ts` line ~347:** Add PL title extraction to related articles transform
- [ ] **`app/api/supabase-articles/route.ts` line 94:** Accept both `lang`/`locale` and `limit`/`pageSize` params

### Code fixes — P1

- [ ] **Content sanitizer:** Strip empty markdown images `![...]()`  in `prepareArticleContentForFrontend()`
- [ ] **`lib/data.ts`:** Set `imageAlt` fallback to `title` when `image_url` exists but no alt text
- [ ] **Content sanitizer:** Strip `<!-- ICOFFIO_MONETIZATION -->` comments in API responses

### Code fixes — P2

- [ ] **Tags normalization:** Extract PL title from `tags[0]` before using as display tags
- [ ] **Tags pipeline (Telegram bot):** Generate proper keyword tags instead of storing full title

### Database schema (long-term)

- [ ] Add `title_pl` column to `published_articles` table
- [ ] Add `image_alt` column to `published_articles` table
- [ ] Backfill `title_pl` from existing `tags[0]` / `content_pl` H1 headings
- [ ] Add deduplication check in Telegram bot publish pipeline (fuzzy title match)

---

## FILES TO MODIFY

| File | Changes needed |
|------|---------------|
| `lib/data.ts` | Add `extractPolishTitle()`, update `transformSupabaseArticleToPost()`, add imageAlt fallback |
| `app/api/supabase-articles/route.ts` | PL title extraction in GET + related transforms, accept locale/pageSize params, strip monetization comments |
| `lib/sanitize.ts` or `lib/markdown.ts` | Strip empty `![]()` image refs |
| Telegram bot pipeline | Add deduplication, proper tags, title_pl storage |
| Supabase schema | Add `title_pl`, `image_alt` columns |

---

*Report generated by Claude Code content audit — 2026-02-17*
