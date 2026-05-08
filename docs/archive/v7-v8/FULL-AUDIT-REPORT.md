# FULL CODEBASE & SITE AUDIT — icoffio v8.6.48
**Date:** 2026-02-18
**Branch:** `codex/wp-decommission-dockerize`
**Commit:** `7dc347a`
**VPS:** `web.icoffio.com` / Vercel: `app.icoffio.com`

---

## DASHBOARD

| Area | Health | Issues |
|------|--------|--------|
| **TypeScript** | ✅ 0 errors | Clean |
| **Tests** | ✅ 64/64 passed | 375ms |
| **Build** | ✅ Passes | 35 routes |
| **npm audit** | ⚠️ 4 vulnerabilities | 1 high, 3 moderate |
| **ESLint** | ❌ Not configured | No `.eslintrc` |
| **Prettier** | ❌ Not configured | No `.prettierrc` |
| **Security** | ⚠️ 3 HIGH issues | See below |
| **Content** | ⚠️ 7 bugs | See CONTENT-AUDIT-REPORT.md |
| **Performance** | ✅ Acceptable | 508MB build |

---

## PART 1: PROJECT STRUCTURE

```
icoffio-front/                   Size
├── app/                         568K   ✅ Next.js App Router
│   ├── [locale]/(site)/                  Pages (article, category, etc.)
│   ├── [locale]/admin/                   Admin panel
│   └── api/                              45 API routes
├── components/                  1.0M   ✅ 86 React components
│   ├── admin/                            Admin-specific components
│   └── (root)                            Shared components
├── lib/                         764K   ✅ 51 utility modules
│   ├── config/                           Ad, video, content config
│   └── utils/                            Formatters, sanitizers
├── public/                       28K   ✅ Static assets
├── styles/                      8.0K   ✅ Global CSS + Tailwind
├── scripts/                     344K   ⚠️ 46 scripts (8 dangerous delete scripts)
├── docs/                        500K   ✅ 35 documentation files
├── __tests__/                          ✅ 5 test suites (64 tests)
├── supabase/                           ✅ Migrations
├── backups/                            🗑️ Removable (Oct 2025 patches)
├── reports/                            🗑️ Removable (generated reports)
├── node_modules/                419M
└── .next/                       508M   Build output
```

**Verdict:** Structure is well-organized. Remove `/backups` and `/reports`.

---

## PART 2: SECURITY AUDIT

### 🔴 HIGH SEVERITY (3 issues)

#### SEC-1: Admin Password in NEXT_PUBLIC Variable
**File:** `lib/admin-auth.ts:98`
```typescript
const configured = (process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '').trim();
```
**Risk:** `NEXT_PUBLIC_*` vars are bundled into client JavaScript — password leaks to all users.
**Fix:** Remove `NEXT_PUBLIC_ADMIN_PASSWORD` fallback entirely.

#### SEC-2: Debug Endpoint Exposed in Production
**File:** `app/api/debug/homepage-data/route.ts`
**Risk:** Exposes internal architecture and data source status. Token comparison isn't constant-time.
**Fix:** Return 403 in production unconditionally, or require admin role.

#### SEC-3: Next.js 14.2.35 Has Known CVEs
- **GHSA-h25m-26qc-wcjf** — HTTP request deserialization DoS (HIGH)
- **GHSA-9g9p-9gw9-jx7f** — Image Optimizer DoS (MODERATE)
- **Fix:** Upgrade to Next.js 15.0.8+ (breaking change, plan needed)

### 🟡 MEDIUM SEVERITY (5 issues)

| # | Issue | File | Fix |
|---|-------|------|-----|
| SEC-4 | `PublishingQueue.tsx` uses `marked()` without sanitization on `dangerouslySetInnerHTML` | `components/admin/PublishingQueue.tsx:596` | Use `renderContent()` instead |
| SEC-5 | Webhook token comparison not constant-time | `app/api/vercel-webhook/route.ts:58` | Use `safeStringEqual()` from admin-auth |
| SEC-6 | No rate limiting on 15+ API routes | All public API routes | Add Redis-based rate limiter |
| SEC-7 | No request body size limits | Article creation endpoints | Add 10MB limit middleware |
| SEC-8 | No CSP header configured | `next.config.mjs` | Add Content-Security-Policy |

### 🟢 LOW SEVERITY

| # | Issue | Fix |
|---|-------|-----|
| SEC-9 | HSTS missing `includeSubDomains; preload` | Add to next.config headers |
| SEC-10 | Image domain uses IP `185.41.68.62` instead of hostname | Replace with hostname |
| SEC-11 | Revalidate secret uses `===` not constant-time | Use `safeStringEqual()` |

---

## PART 3: DEPENDENCY AUDIT

### npm audit Results
```
4 vulnerabilities (1 high, 3 moderate)

HIGH:   next@14.2.35 — 2 CVEs (DoS)
MODERATE: markdown-it — ReDoS
MODERATE: undici (via @vercel/blob) — unbounded decompression
```

### Outdated Dependencies
| Package | Current | Latest | Gap |
|---------|---------|--------|-----|
| next | 14.2.35 | 16.1.6 | 2 major |
| react | 18.3.1 | 19.2.4 | 1 major |
| @supabase/supabase-js | 2.76.1 | 2.96.0 | 20 minor |
| @tiptap/* | 3.7.2 | 3.19.0 | 12 minor |
| openai | 5.23.2 | 6.22.0 | 1 major |
| tailwindcss | 3.4.17 | 4.1.18 | 1 major |

**Immediate fix:** `npm audit fix` (fixes markdown-it and undici)
**Planned fix:** Next.js 15+ upgrade (breaking change, needs separate sprint)

---

## PART 4: COMPONENTS AUDIT

### Quality Scores
| Category | Score | Details |
|----------|-------|---------|
| TypeScript Types | 10/10 | Zero `any` types in components |
| Event Cleanup | 10/10 | All useEffect listeners properly cleaned |
| Memory Leaks | 9/10 | AdManager/VideoPlayer refs properly managed |
| Accessibility | 7/10 | Missing aria-labels on video elements |
| Performance | 6/10 | No memo on list items, no virtualization |
| Code Complexity | 5/10 | 8 components exceed 300 lines |

### Components Exceeding 300 Lines (refactoring needed)
| Component | Lines | Recommendation |
|-----------|-------|----------------|
| ArticlesManager.tsx | 1592 | Split into sub-components + virtualization |
| ArticleCreatorModal.tsx | 1525 | Split into wizard steps |
| VideoPlayer.tsx | 803 | Split: PrerollOverlay, OutstreamContainer, InstreamContainer |
| LogsViewer.tsx | 640 | Add virtualization for large tables |
| PublishingQueue.tsx | 635 | Extract queue item component |
| ImageSelectionModal.tsx | 622 | Separate gallery from modal |
| ContentEditor.tsx | 551 | Extract toolbar component |

### Console Logs to Remove
| File | Line | Type |
|------|------|------|
| AdManager.tsx | 126-128 | `console.log` — VOX init debug |
| VideoPlayer.tsx | 430 | `console.log` — autoplay prevented |
| UniversalAd.tsx | 140 | `console.log` — ad dimension mismatch |
| ContentPromptManager.tsx | 204 | `console.log` — TODO debug code |

### TODO/FIXME in Code
| File | Line | Content |
|------|------|---------|
| ContentPromptManager.tsx | 203-204 | `// В продакшене здесь будет update функция` |

### Missing Components
- ❌ No `error.tsx` global error boundary
- ❌ No `not-found.tsx` custom 404 page
- ⚠️ `loading.tsx` only in 2 locations

---

## PART 5: API ROUTES AUDIT

### All 45 Endpoints

#### Monolithic Files (must refactor)
| Route | Lines | Issue |
|-------|-------|-------|
| `/api/telegram-simple/webhook` | 2383 | **Unmaintainable** — webhook + parsing + publishing + queue |
| `/api/articles` (POST) | 1493 | Multiple concerns mixed |
| `/api/admin/regenerate-image` | 533 | Single feature, too complex |

#### Response Format Inconsistency
| Pattern | Routes Using It |
|---------|----------------|
| `{ success: true, data: ... }` | supabase-articles, articles |
| `{ error: "message" }` | admin/auth, revalidate |
| `{ ok: true }` | vercel-webhook |
| `NextResponse.json({ ... })` | Most routes |

**Fix:** Standardize all routes to `{ success: boolean, data?: any, error?: string }`.

#### Missing Input Validation
Most routes accept JSON body without schema validation.
**Fix:** Add Zod schemas for all POST endpoints.

#### Deprecated Routes to Remove
| Route | Reason |
|-------|--------|
| `/api/n8n-webhook` | Marked deprecated, still fully functional |
| `/api/wordpress-articles` | WordPress decommissioned |

---

## PART 6: DATA LAYER AUDIT (`lib/data.ts`)

### Architecture
```
Supabase DB → data.ts → transformSupabaseArticleToPost() → Post objects → Pages
                ↓
            API routes → JSON responses → Client fetch
```

### Issues Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| DATA-1 | P0 | PL titles always English in list views | `data.ts:113` |
| DATA-2 | P0 | API param mismatch (lang vs locale) | `route.ts:94` |
| DATA-3 | P1 | No caching — every request hits Supabase | All query functions |
| DATA-4 | P1 | Error handling inconsistent (silent fails) | `getAllPosts`, `getPostsByCategory` |
| DATA-5 | P2 | Deduplication scores by content length (not quality) | `data.ts:70` |
| DATA-6 | P2 | No Supabase response schema validation | All transforms |
| DATA-7 | P2 | Category normalization accepts `unknown` type | `data.ts:27` |

**Full content audit details:** See `CONTENT-AUDIT-REPORT.md`

---

## PART 7: CONFIGURATION AUDIT

### ✅ Well Configured
- `tsconfig.json` — strict mode, path aliases, incremental
- `tailwind.config.ts` — dark mode, typography plugin, system font
- `postcss.config.js` — Tailwind + Autoprefixer
- `vitest.config.ts` — node env, global APIs, aliases
- `next.config.mjs` — security headers, image domains, HSTS
- `.gitignore` — comprehensive coverage

### ❌ Missing
| Config | Impact | Fix |
|--------|--------|-----|
| `.eslintrc.*` | No linting rules enforced | Create with Next.js strict preset |
| `.prettierrc` | No code formatting standard | Add Prettier config |
| Bundle analyzer | Can't track bundle bloat | Add `@next/bundle-analyzer` |
| `robots.txt` | SEO missing robots meta | Verify in public/ |
| CSP header | XSS protection gap | Add to next.config headers |

### ⚠️ Scripts Directory (46 files)
**Dangerous scripts (data deletion):**
- `FINAL_DELETE_RUSSIAN_ARTICLES.js`
- `delete-one-by-one.js`
- `delete-production-articles.js`
- `delete-russian-articles-direct.js`
- `clean-wordpress-articles.js` (x3 variants)

**Risk:** These permanently delete production data.
**Fix:** Add confirmation prompts, require `--yes` flag, log all operations.

---

## PART 8: BUILD & TEST HEALTH

### TypeScript
```
✅ tsc --noEmit: 0 errors
```

### Tests
```
✅ 5 test files, 64 tests, all passed (375ms)

  articles-api.test.ts      17 tests ✅
  data.test.ts              20 tests ✅
  telegram-webhook.test.ts  17 tests ✅
  title-policy.test.ts       6 tests ✅
  image-pipeline.test.ts     4 tests ✅
```

### Test Coverage Gaps
| Area | Coverage | Risk |
|------|----------|------|
| API route handlers | ❌ None | HIGH — 45 untested routes |
| React components | ❌ None | MEDIUM — 86 untested components |
| Admin auth flow | ❌ None | HIGH — security-critical |
| Data transforms | ✅ Partial | OK for now |
| Content sanitization | ❌ None | MEDIUM — XSS risk |
| Polish title extraction | ❌ None | HIGH — known bug area |

---

## PART 9: SEO & ACCESSIBILITY

### SEO
| Check | Status | Notes |
|-------|--------|-------|
| Metadata generation | ✅ | generateMetadata() on all pages |
| OG tags | ✅ | Title, description, image |
| Structured data | ✅ | JSON-LD for Article, Website, Organization |
| Canonical URLs | ✅ | Set via metadata |
| Sitemap | ⚠️ | Verify exists |
| robots.txt | ⚠️ | Verify exists |
| hreflang tags | ⚠️ | Not verified |
| imageAlt on articles | ❌ | 0% of articles have alt text |

### Accessibility
| Check | Status | Notes |
|-------|--------|-------|
| ARIA labels | ⚠️ | Missing on video player elements |
| Keyboard navigation | ✅ | Search modal has ⌘K shortcut |
| Color contrast | ✅ | Dark mode properly implemented |
| Cookie consent | ✅ | Excellent ARIA implementation |
| Skip navigation | ❌ | Not implemented |
| Screen reader support | ⚠️ | Partial — structured data helps |

### Polish Text Issues
- Typo in StructuredData.tsx: "Strona glowna" should be "Strona główna"

---

## PART 10: VPS vs VERCEL STATUS

| Aspect | VPS (web.icoffio.com) | Vercel (app.icoffio.com) |
|--------|----------------------|-------------------------|
| Commit | 7dc347a (v8.6.48) | 7dc347a (v8.6.48) |
| Status | ✅ Online | ✅ Online |
| SSL | ✅ certbot | ✅ Automatic |
| Process | PM2 (port 4200) | Serverless |
| Auto-deploy | ❌ Manual pull | ✅ On push to main |

### Pending VPS Tasks
- [ ] Create `vercel-freeze` branch (agreed, not done)
- [ ] DNS cutover preparation (SSL for app/www)
- [ ] HSTS header fix (add includeSubDomains)

---

## MASTER ACTION PLAN

### 🔴 IMMEDIATE (today/tomorrow)

| # | Action | File | Est. |
|---|--------|------|------|
| 1 | Remove `NEXT_PUBLIC_ADMIN_PASSWORD` fallback | `lib/admin-auth.ts:98` | 5min |
| 2 | Disable debug endpoint in production | `app/api/debug/homepage-data/route.ts` | 5min |
| 3 | Run `npm audit fix` | Terminal | 2min |
| 4 | Unpublish 2 test articles in Supabase | Supabase dashboard | 5min |
| 5 | Unpublish 6 duplicate Garmin articles | Supabase dashboard | 10min |
| 6 | Unpublish 1 duplicate VK Play article | Supabase dashboard | 5min |

### 🟡 THIS WEEK

| # | Action | Files | Est. |
|---|--------|-------|------|
| 7 | Fix PL title extraction in list views | `lib/data.ts`, `route.ts` | 2h |
| 8 | Fix API param mismatch (locale/pageSize) | `route.ts:94` | 30min |
| 9 | Strip empty `![]()` image refs | `lib/utils/content-formatter.ts` | 30min |
| 10 | Add imageAlt fallback to title | `lib/data.ts` | 15min |
| 11 | Remove console.logs from production | 4 component files | 30min |
| 12 | Fix PublishingQueue.tsx sanitization | `components/admin/PublishingQueue.tsx:596` | 15min |
| 13 | Create `vercel-freeze` branch | Git | 10min |
| 14 | Create `.eslintrc.json` with strict preset | Root | 30min |

### 🟢 NEXT SPRINT

| # | Action | Est. |
|---|--------|------|
| 15 | Add Zod schema validation to POST routes | 1 day |
| 16 | Add rate limiting middleware | 1 day |
| 17 | Standardize API response format | 1 day |
| 18 | Add error.tsx and not-found.tsx pages | 2h |
| 19 | Split monolithic routes (telegram webhook, articles) | 2 days |
| 20 | Add CSP header to next.config | 2h |
| 21 | Add React.memo to list components | 2h |
| 22 | Strip monetization comments in API | 30min |
| 23 | Add constant-time comparison to webhooks | 30min |

### 🔵 LONG-TERM

| # | Action | Est. |
|---|--------|------|
| 24 | Upgrade Next.js 14→15+ | 1 week |
| 25 | Add `title_pl` column to Supabase | 2h |
| 26 | Add Redis caching layer | 2 days |
| 27 | Implement request body size limits | 1 day |
| 28 | Expand test coverage (API routes, components) | 1 week |
| 29 | Split large components (VideoPlayer, ArticlesManager) | 3 days |
| 30 | Add bundle analyzer | 1h |
| 31 | Remove deprecated routes (n8n-webhook, wordpress) | 2h |
| 32 | Implement proper tag system | 1 day |

---

## OVERALL SCORE

| Area | Grade | Notes |
|------|-------|-------|
| Architecture | **B+** | Well-structured, some monolithic files |
| Security | **B-** | Good base, 3 high issues to fix |
| Code Quality | **B** | Clean TS, but large components |
| Testing | **C** | 64 tests pass, but low coverage |
| SEO | **B+** | Good metadata, missing imageAlt |
| Performance | **B** | No major issues, missing caching |
| Documentation | **A** | 35 docs, comprehensive |
| Content | **C-** | 7 systemic bugs, duplicates, junk |
| DevOps | **B+** | Docker, PM2, Vercel all working |
| **Overall** | **B** | **Solid foundation, fix P0s this week** |

---

---

## PART 11: TELEGRAM BOT DEEP AUDIT

### Architecture
```
User sends message → Telegram API → /api/telegram-simple/webhook (2383 lines)
  → isDuplicateTelegramUpdate() → processSubmission()
  → OR → enqueueSubmission() → Supabase job queue
                                    ↓
Vercel Cron (*/1 min) → /api/telegram-simple/worker (167 lines)
  → fetchPendingJobs() → processSubmission()
  → publisher.ts → Supabase published_articles
```

### P1 Issues (4)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| TG-1 | **In-memory dedup unreliable on serverless** — `processedUpdateIds` Map resets on cold start. Supabase fallback exists but silently degrades. | `webhook/route.ts:38-414` | Duplicate article processing |
| TG-2 | **Race condition in submission status** — No DB lock between check and update. Concurrent requests can overwrite each other. | `webhook/route.ts:982-999` | Duplicate processing |
| TG-3 | **sendProgressMessage logic inconsistent** — Default differs between direct call (undefined→true via `!== false`) and queue payload (`?? true`). | `webhook/route.ts:69-70, 882, 1382` | Unpredictable user notifications |
| TG-4 | **Worker auth bypassed in dev** — Returns 200 without any auth check when `NODE_ENV !== 'production'`. Same in webhook handler. | `worker/route.ts:37-46, webhook:468-471` | Open endpoint in staging |

### P2 Issues (4)

| # | Issue | Location |
|---|-------|----------|
| TG-5 | processedUpdateIds Map grows unbounded — O(n) cleanup on every call | `webhook/route.ts:402-414` |
| TG-6 | Catch-all error handler returns 500 for all errors — Telegram retries everything | `webhook/route.ts:2364-2373` |
| TG-7 | 12+ console.log statements with emojis in webhook | Throughout webhook handler |
| TG-8 | Job queue failures store only error string, not type/stack/context | `job-queue.ts:200-244` |

### P3 Issues (3)

| # | Issue | Location |
|---|-------|----------|
| TG-9 | Slug generation lacks Cyrillic transliteration (unlike unified-article-service) | `publisher.ts:237-249` |
| TG-10 | PL title stored in tags[0] instead of dedicated field | `publisher.ts:141-166` |
| TG-11 | No per-user rate limiting on URL batch processing | `webhook:34, 231-238` |

### What Works Well
- ✅ Persistent Supabase dedup (backup for in-memory)
- ✅ Good URL extraction with batch support
- ✅ content-processor.ts is clean (194 lines)
- ✅ settings-loader.ts is clean (113 lines)
- ✅ types.ts properly typed (58 lines)
- ✅ Recent changes (v8.6.46-48) properly canonicalize URLs
- ✅ WordPress publish fully removed

---

## PART 12: API ROUTES DEEP AUDIT

### 45 Routes — Full Assessment

#### 🔴 New Security Findings

| # | Issue | File | Severity |
|---|-------|------|----------|
| API-1 | **Revalidate token passed in URL query string** — Leaks in logs, referer headers | `articles/route.ts:601,605,729,733` | HIGH |
| API-2 | **Health-check exposes API key presence** — `openaiKey: !!process.env.OPENAI_API_KEY` | `articles/route.ts:790-792` | HIGH |
| API-3 | **Hardcoded owner email fallback** — `getOwnerEmails()[0] \|\| 'ag@voxexchange.io'` | `admin/auth/route.ts:316` | HIGH |
| API-4 | **N8N webhook deprecated but active** — Still processes requests | `n8n-webhook/route.ts:54` | MEDIUM |
| API-5 | **Supabase error messages exposed** — `Supabase query failed: ${error.message}` | `supabase-articles/route.ts:169,337` | MEDIUM |
| API-6 | **Vercel webhook: 3 auth methods** — Bearer OR header OR query param | `vercel-webhook/route.ts:53-62` | MEDIUM |
| API-7 | **WordPress code not fully removed** — `ENABLE_WORDPRESS_PUBLISH = false` constant and handlers still exist | `articles/route.ts:40-41,275` | MEDIUM |

#### Console.log Count by Route
| Route | Count |
|-------|-------|
| `articles/route.ts` | **27** |
| `telegram-simple/webhook` | **12** |
| `supabase-articles/route.ts` | **4** |
| Other admin routes | ~10 |
| **Total** | **53+** |

#### Routes to Remove/Disable
| Route | Action | Reason |
|-------|--------|--------|
| `/api/debug/homepage-data` | **DELETE** | Debug endpoint in production |
| `/api/n8n-webhook` | **Return 410** | Deprecated, still processing |
| `/api/wordpress-articles` | Already returns 410 | ✅ Done |

---

## PART 13: COMPONENTS DEEP AUDIT

### XSS Risk Assessment

| Component | Risk | Details |
|-----------|------|---------|
| `Prose.tsx:12` | ⚠️ MEDIUM | `dangerouslySetInnerHTML={{ __html: html }}` — relies on backend sanitization |
| `ArticleContentWithAd.tsx:105,119` | ⚠️ MEDIUM | `dangerouslySetInnerHTML={{ __html: content/segment }}` — same pattern |
| `ArticlePreview.tsx:191` | ⚠️ MEDIUM | `marked()` output without DOMPurify — XSS if admin content is compromised |
| `PublishingQueue.tsx:596` | ⚠️ MEDIUM | `marked()` + dangerouslySetInnerHTML without sanitization |

**Mitigation:** Backend `sanitizeArticleBodyText()` + `sanitizeHtml()` run before content reaches frontend. But admin panel components bypass this pipeline.

**Fix needed:** Add DOMPurify to all `marked()` → `dangerouslySetInnerHTML` chains.

### Console.log in Components (complete list)
| File | Line | Content | Action |
|------|------|---------|--------|
| AdManager.tsx | 126-128 | VOX init debug | REMOVE |
| VideoPlayer.tsx | 430 | Autoplay prevented | REMOVE |
| PublishingQueue.tsx | 189,232-234 | Publishing debug with emojis | REMOVE |
| ImageMetadataEditor.tsx | 98 | Regenerating image debug | REMOVE |

### Admin Components — Type Safety
| File | Issue |
|------|-------|
| PublishingQueue.tsx:74 | `parsed.map((s: any) =>` |
| ImageMetadataEditor.tsx:76 | `const requestBody: any =` |
| ArticleCreatorModal.tsx | Various `any` types |

### What Works Well
- ✅ All useEffect cleanups properly implemented
- ✅ All key props on list renders present
- ✅ No missing ARIA labels on interactive elements
- ✅ Cookie consent GDPR compliant (multilingual)
- ✅ StructuredData JSON-LD all valid
- ✅ ArticleCard image fallback excellent (20 Unsplash + hash distribution)
- ✅ MutationObserver lifecycle properly managed
- ✅ Timer cleanup consistent across all components

---

## PART 14: LIB/ DEEP AUDIT

### 64 Files, 14,100 Lines

#### Security Findings

| # | Issue | File | Line |
|---|-------|------|------|
| LIB-1 | **NEXT_PUBLIC_ADMIN_PASSWORD** (confirmed, same as SEC-1) | `admin-auth.ts` | 98 |
| LIB-2 | **Hardcoded owner emails in code** | `admin-auth.ts` | 49 |
| LIB-3 | **4 placeholder VOX PlaceIDs** with TODO comments | `config/video-players.ts` | 55,68,83,95 |
| LIB-4 | **DSP preroll ad tag hardcoded as fallback** (long token URL) | `config/video-players.ts` | 34-36 |
| LIB-5 | **Duplicate mobile ad PlaceID** — mobile-1 and mobile-2 share same ID | `config/adPlacements.ts` | 98-126 |
| LIB-6 | **Bootstrap race condition** — concurrent requests can both create admin | `admin-auth.ts` | 579-582 |
| LIB-7 | **localStorage parsed without validation** | `config/adPlacements.ts` | 184-202 |

#### Type Safety — 50+ `any` instances

| File | Count |
|------|-------|
| `data.ts` | 11 |
| `queue-service.ts` | 16+ |
| `unified-article-service.ts` | 11 |
| `supabase-analytics.ts` | 9 |
| `admin-auth.ts` | 5+ |
| Other services | 10+ |

#### Content Sanitization Gaps
| Issue | File:Line |
|-------|-----------|
| Case-insensitive `javascript:` check incomplete | `content-formatter.ts:359,461` |
| No SVG `<base>` `<meta>` tag protection | `content-formatter.ts:422-480` |
| Regex DoS potential in attribute parsing | `content-formatter.ts:451` |

#### Performance
| Issue | File |
|-------|------|
| No caching on `getCategories()` — fresh Supabase query every call | `data.ts:503` |
| Dedup runs after LIMIT — may return fewer results than requested | `data.ts:275-291` |
| Two separate deduplication passes on same data | `data.ts:275-291` |

#### What Works Well
- ✅ No circular dependencies — clean DAG
- ✅ Minimal duplicate functionality — good separation of concerns
- ✅ Content sanitization centralized in content-formatter.ts
- ✅ Title policy well-implemented (title-policy.ts)
- ✅ Supabase client is singleton (supabase-client.ts)
- ✅ Safe string comparison for passwords
- ✅ Graceful degradation when Supabase is unavailable
- ✅ PL title resolution uses proper fallback chain in `resolveLocalizedTitle()`

---

## UPDATED MASTER ACTION PLAN

### 🔴 IMMEDIATE (today/tomorrow) — 8 items

| # | Action | File | Est. |
|---|--------|------|------|
| 1 | Remove `NEXT_PUBLIC_ADMIN_PASSWORD` fallback | `lib/admin-auth.ts:98` | 5min |
| 2 | Disable/remove debug endpoint | `app/api/debug/homepage-data/route.ts` | 5min |
| 3 | Run `npm audit fix` | Terminal | 2min |
| 4 | Move revalidate token from URL to header | `app/api/articles/route.ts:601,605,729,733` | 30min |
| 5 | Remove health-check API key exposure | `app/api/articles/route.ts:790-792` | 5min |
| 6 | Remove hardcoded owner email fallback | `app/api/admin/auth/route.ts:316` | 5min |
| 7 | Unpublish test articles (2) + duplicate Garmin (6) + VK Play (1) | Supabase | 15min |
| 8 | Fix duplicate mobile ad PlaceID | `lib/config/adPlacements.ts:98-126` | 5min |

### 🟡 THIS WEEK — 12 items

| # | Action | Est. |
|---|--------|------|
| 9 | Fix PL title extraction in API list views | 2h |
| 10 | Fix API param mismatch (locale/pageSize) | 30min |
| 11 | Strip empty `![]()` image refs in sanitizer | 30min |
| 12 | Add imageAlt fallback to title | 15min |
| 13 | Remove 53+ console.logs from production code | 2h |
| 14 | Add DOMPurify to admin marked() chains | 1h |
| 15 | Disable N8N webhook (return 410) | 15min |
| 16 | Remove WordPress dead code | 1h |
| 17 | Fix Telegram worker auth (require secret in all envs) | 30min |
| 18 | Create `vercel-freeze` branch | 10min |
| 19 | Create `.eslintrc.json` | 30min |
| 20 | Strip Supabase error details from API responses | 30min |

### 🟢 NEXT SPRINT — 15 items

| # | Action | Est. |
|---|--------|------|
| 21 | Add Zod schema validation to POST routes | 1 day |
| 22 | Add rate limiting middleware | 1 day |
| 23 | Standardize API response format | 1 day |
| 24 | Add error.tsx and not-found.tsx pages | 2h |
| 25 | Add CSP header | 2h |
| 26 | Fix Telegram in-memory dedup → use Supabase only | 2h |
| 27 | Fix Telegram submission race condition (DB lock) | 2h |
| 28 | Fix sendMessage logic consistency | 1h |
| 29 | Add request body size limits | 1h |
| 30 | Fix content sanitization gaps (case-insensitive checks) | 2h |
| 31 | Add React.memo to list components | 2h |
| 32 | Strip monetization comments in API | 30min |
| 33 | Add constant-time comparison to all webhooks | 30min |
| 34 | Fix localStorage validation in adPlacements | 30min |
| 35 | Fix admin bootstrap race condition | 2h |

### 🔵 LONG-TERM — 10 items

| # | Action | Est. |
|---|--------|------|
| 36 | Upgrade Next.js 14→15+ | 1 week |
| 37 | Add `title_pl` column to Supabase | 2h |
| 38 | Add Redis caching layer | 2 days |
| 39 | Expand test coverage (API routes, components) | 1 week |
| 40 | Split monolithic files (webhook 2383 lines, articles 1493 lines) | 3 days |
| 41 | Split large components (ArticlesManager 1592, ArticleCreator 1525) | 3 days |
| 42 | Add bundle analyzer | 1h |
| 43 | Implement proper tag system | 1 day |
| 44 | Reduce `any` type usage (50+ instances) | 1 day |
| 45 | Add structured logging (replace console.log/warn/error) | 2 days |

---

## UPDATED OVERALL SCORE

| Area | Grade | Notes |
|------|-------|-------|
| Architecture | **B+** | Well-structured, some monolithic files (webhook 2383 lines) |
| Security | **B-** | Good base; 8 issues need immediate fix (password exposure, debug endpoint, token in URL) |
| Code Quality | **B** | Clean TS (0 errors), but 50+ `any` types and 53+ console.logs |
| Testing | **C** | 64/64 pass, but only 5 test files for 45 API routes + 86 components |
| SEO | **B+** | Good metadata + JSON-LD, missing imageAlt and hreflang verification |
| Performance | **B** | Acceptable, needs caching layer and query optimization |
| Documentation | **A** | 35 docs, comprehensive migration log |
| Content | **C-** | 7 systemic bugs, duplicates, junk articles in production |
| Telegram Bot | **B-** | Works well but serverless dedup fragile, race conditions |
| DevOps | **B+** | Docker + PM2 + Vercel all operational |
| **Overall** | **B** | **Solid foundation. Fix 8 security items this week.** |

---

## TOTAL ISSUES FOUND

| Severity | Count |
|----------|-------|
| 🔴 P0 / Critical | 8 (security: password leak, debug endpoint, token in URL, etc.) |
| 🟡 P1 / High | 16 (Telegram race conditions, XSS in admin, no rate limiting, etc.) |
| 🟠 P2 / Medium | 22 (console.logs, type safety, caching, error responses) |
| 🟢 P3 / Low | 9 (slug generation, config cleanup, documentation) |
| **Total** | **55** |

---

*Full audit report generated by Claude Code — 2026-02-18 (updated with deep audit)*
*Content audit details: see `CONTENT-AUDIT-REPORT.md`*
