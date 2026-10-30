# icoffio-front — architecture and code map

Start at [AGENTS.md](AGENTS.md) for rules, run and ship. This file is the map: where every source file lives, how requests and data flow, and which test locks which rule. One line per tracked file; `__tests__/project-map.test.ts` fails when a source file is missing here or a quoted path does not exist.

## Runtime topology

```
browser ──https──> nginx on VPS2 178.104.223.93 (icoffio.com, app.icoffio.com, web.icoffio.com, info.*)
                     └─> 172.17.0.1:4200  icoffio-front-app  (Next.js 14, Dockerfile, node user)
                                            ├─> icoffio-postgres (Postgres 16, 127.0.0.1:5433 on the host)
                                            ├─> OpenAI, Unsplash, Telegram Bot API, Vercel Blob (uploads)
                                            └─> RSS feeds and source sites (through the SSRF guard)
browser ──> ad stacks chosen per host: VOX / Hybrid (st.hbrd.io, ssp.hybrid.ai) on icoffio.com and app.icoffio.com;
            Bidio Prebid (files.bidio.pl) + VOX bidder on web.icoffio.com
VPS cron (/etc/cron.d/icoffio-*) ──> app endpoints with Bearer secrets; watchdog restarts the app container
```

- One container serves every host. The ad provider is chosen per request host (`lib/ads-provider-core.ts`), never per build.
- Compose file: `docker-compose.vps.yml`; image: `Dockerfile`. `NEXT_PUBLIC_*` values are baked at build time from `.env.production` on the host (not in git).
- The database folder is still called `supabase/`, and some modules keep Supabase names, but the database is self-hosted Postgres reached through a Supabase-shaped adapter (`lib/pg-*.ts`).

### VPS cron suite (`/etc/cron.d/icoffio-*`, verified 2026-10-30)

| Job | Schedule | Script (host path `/usr/local/bin/`) | In repo |
|---|---|---|---|
| worker | every minute | `icoffio-worker.sh` → `/api/telegram-simple/worker` | host only |
| fetch-feeds | every 30 min | `icoffio-fetch-feeds.sh` → `/api/info/fetch-feeds` | host only |
| refresh-popularity | every 15 min | `icoffio-refresh-popularity.sh` | host only |
| translate-items | hourly at :15 | `icoffio-translate-items.sh` | `scripts/icoffio-translate-items.sh` |
| cleanup-items | daily 04:00 | `icoffio-cleanup-items.sh` → `/api/info/cleanup` (30-day retention) | `scripts/icoffio-cleanup-items.sh` |
| db-backup | daily 03:30 | `icoffio-db-backup.sh` (local only) | host only |
| watchdog | every 15 min | `icoffio-watchdog.sh`: 2 failed `/api/health` checks → restart app, Telegram alert, 30-min cooldown | `scripts/icoffio-watchdog.sh` |

## Flows

1. **Telegram link → published article.** `app/api/telegram-simple/webhook/route.ts` checks the secret token, drops duplicate updates, rate-limits per chat, handles commands and buttons, and enqueues a `telegram_jobs` row (`lib/telegram-simple/job-queue.ts`). `app/api/telegram-simple/worker/route.ts` (cron every minute, plus an immediate local trigger) claims the job and runs `processSubmission`: `lib/telegram-simple/url-parser.ts` → `content-processor.ts` (GPT) → `translator.ts` (PL) → `image-generator.ts` → `publisher.ts` (EN + PL into `published_articles`) → revalidate → Telegram reply via `telegram-notifier.ts`.
2. **Article page.** `middleware.ts` adds the locale → `app/[locale]/layout.tsx` (host-based ad provider, early VOX loader, consent, ad managers) → `app/[locale]/(site)/article/[slug]/page.tsx` loads through `lib/data.ts` (`resolveLocalizedTitle`), renders `lib/markdown.ts`, places ads from `lib/config/adPlacements.ts` via `components/ArticleContentWithAd.tsx` and `components/UniversalAd.tsx`, counts the view (`components/ArticleViewTracker.tsx`), plays video (`components/VideoPlayer.tsx`). ISR 3600 s, refreshed by `app/api/revalidate/route.ts`.
3. **Ads.** VOX hosts: `components/AdManager.tsx` starts `lib/vox-ad-lifecycle.ts` after advertising consent; display slots are `UniversalAd`; video resolves through `app/api/video/preroll/route.ts`. Prebid host (web.icoffio.com): `components/PrebidManager.tsx` loads the Bidio lazy SDK after consent, marks Prebid ready, runs in-image (`lib/prebid-inimage.ts`); `UniversalAd` hands its place to `components/PrebidVoxAd.tsx` (`lib/prebid-vox.ts`), the interstitial and the video player run their own vox auctions, VAST parsed by `lib/vast.ts`. Outcomes are counted by `lib/ad-telemetry.ts` → `app/api/ads/telemetry/route.ts` → `ad_slot_daily`. Detail: `docs/ADVERTISING.md`.
4. **Admin.** `app/[locale]/admin/page.tsx` (client SPA) logs in through `app/api/admin/auth/route.ts` (rate-limited password login, session cookie). Tabs call `app/api/admin/*`, `app/api/articles/route.ts` and `app/api/info/*`; every handler checks its role itself with `requireAdminRole` (`lib/admin-auth.ts`) — there is no router-level guard. Publishing ends with a revalidate call.
5. **Info portal.** Cron calls `app/api/info/fetch-feeds/route.ts` (`lib/info/feed-fetcher.ts`, SSRF-guarded), `app/api/admin/info/translate-items-batch/route.ts` and `app/api/info/cleanup/route.ts`. Readers use public GETs and the pages under `app/[locale]/info/`.
6. **Errors and logs.** `lib/error-logger.ts` writes to console and `errors_log` (Telegram on critical); `lib/server-log-store.ts` keeps file logs; both are read by admin tabs.

## Code map

### Edge and root app files
- `middleware.ts` — adds `/en` or `/pl` by Accept-Language, sends `info.*` hosts to `/{locale}/info`, 404s `/prebid-test` off Prebid hosts.
- `app/global-error.tsx` — last-resort client error screen with retry.
- `app/robots.ts` — robots.txt: blocks `/api/`, admin and AI-training bots.
- `app/sitemap.ts` — sitemap with home, static pages, categories, info boards and articles, en/pl hreflang.
- `app/[locale]/layout.tsx` — the only `<html>` layout: locale check, per-host ad provider, early VOX loader, theme, header/footer, consent, ad managers.

### Public site pages
- `app/[locale]/(site)/page.tsx` — homepage: hero, popular and latest, category nav, two ad places; ISR 300 s.
- `app/[locale]/(site)/loading.tsx` — skeleton while a site page streams.
- `app/[locale]/(site)/articles/page.tsx` — all-articles listing.
- `app/[locale]/(site)/category/[slug]/page.tsx` — category listing (24 posts); unknown category → 404.
- `app/[locale]/(site)/article/[slug]/page.tsx` — article page: body, ad places, video, JSON-LD, view tracking, related posts.
- `app/[locale]/(site)/article/[slug]/loading.tsx` — article skeleton.
- `app/[locale]/(site)/advertising/page.tsx` — static "advertise with us" page.
- `app/[locale]/(site)/editorial/page.tsx` — static editorial policy.
- `app/[locale]/(site)/privacy/page.tsx` — privacy policy (en/pl).
- `app/[locale]/(site)/cookies/page.tsx` — cookie policy (en/pl).
- `app/[locale]/(site)/leo-simulator/page.tsx` — feature page embedding the Leo orbit simulator.
- `app/[locale]/(site)/prebid-test/page.tsx` — server guard: Prebid diagnostics only on Prebid hosts, else `notFound()`.
- `app/[locale]/(site)/prebid-test/PrebidTestClient.tsx` — client diagnostics: SDK state, consent, bids, winners, slot fill, vox display/video.

### Info portal pages
- `app/[locale]/info/layout.tsx` — metadata wrapper.
- `app/[locale]/info/page.tsx` — portal home (`InfoHome`).
- `app/[locale]/info/[boardSlug]/page.tsx` — one board; `watch` loads Market Watch.

### Admin pages
- `app/[locale]/admin/layout.tsx` — noindex for all admin pages.
- `app/[locale]/admin/page.tsx` — client admin SPA: login, session check, role-gated tabs.
- `app/[locale]/admin/info/page.tsx` — `InfoAdminPanel`; no page-level login, the APIs guard writes.
- `app/[locale]/admin/add-article/page.tsx` — standalone add-article form; noindex.

### API: Telegram bot
- `app/api/telegram-simple/webhook/route.ts` — live bot webhook (secret token, dedupe, per-chat limit, commands, enqueue); exports `processSubmission`.
- `app/api/telegram-simple/worker/route.ts` — claims queued jobs and runs `processSubmission`; cron secret.
- `app/api/telegram/webhook/route.ts` — legacy URL; pure delegate to the telegram-simple webhook.
- `app/api/telegram/settings/route.ts` — per-chat bot settings for the admin UI; admin.
- `app/api/telegram/submissions/route.ts` — recent bot submissions for the dashboard; admin.

### API: admin (role in parentheses)
- `app/api/admin/auth/route.ts` — password login, invite, set role, logout, session, members; login rate-limited.
- `app/api/admin/auth/callback/route.ts` — leftover magic-link callback; redirects to the panel. No callers.
- `app/api/admin/ad-stats/route.ts` — daily ad accounting from `ad_slot_daily` (editor).
- `app/api/admin/bulk-delete-articles/route.ts` — delete many articles (editor).
- `app/api/admin/bulk-delete-wordpress/route.ts` — stub for removed WordPress delete (admin). No callers.
- `app/api/admin/cleanup/route.ts` — test-article cleanup and stats (admin).
- `app/api/admin/delete-article/route.ts` — delete one article; used by Articles tab (editor).
- `app/api/admin/delete-supabase-article/route.ts` — delete by id; overlaps delete-article, no callers (editor).
- `app/api/admin/errors-log/route.ts` — read/clear the self-hosted error log (admin).
- `app/api/admin/feedback/route.ts` — feedback list (viewer), status (editor), delete (admin).
- `app/api/admin/generate-article-content/route.ts` — GPT article from a short prompt (editor).
- `app/api/admin/generate-image/route.ts` — AI image generation (editor).
- `app/api/admin/image-library/route.ts` — search (viewer) and save (editor) library images.
- `app/api/admin/images/route.ts` — Unsplash search (editor).
- `app/api/admin/info/auto-translate-titles/route.ts` — translate info feed titles (admin).
- `app/api/admin/info/translate-items-batch/route.ts` — translate feed item titles; admin or cron secret.
- `app/api/admin/info/translation-qc/route.ts` — compare and reset translations (admin).
- `app/api/admin/parse-url/route.ts` — extract an article from a URL, SSRF-guarded (editor).
- `app/api/admin/publish-article/route.ts` — publish to DB and revalidate; duplicates `/api/articles` publish, no callers (editor).
- `app/api/admin/regenerate-image/route.ts` — regenerate an article image (editor).
- `app/api/admin/system-logs/route.ts` — read/clear system logs (admin).
- `app/api/admin/test-content-prompt/route.ts` — test a content prompt (admin).
- `app/api/admin/translate-article/route.ts` — translate article text; no callers, UI uses `/api/translate` (editor).

### API: articles and content
- `app/api/articles/route.ts` — main article API: create from URL/text, publish, update (editor); `create-from-telegram` needs its Bearer secret. 1500+ lines.
- `app/api/articles/image-options/route.ts` — image options for the picker.
- `app/api/supabase-articles/route.ts` — public read-only article reads from `published_articles` (name is historical).
- `app/api/generate-article/route.ts` — deprecated generator; no callers.
- `app/api/translate/route.ts` — OpenAI translation; must stay authenticated (2026-06 incident).
- `app/api/check-url/route.ts` — reachability check with SSRF guard (viewer).
- `app/api/upload-image/route.ts` — image upload/delete via Vercel Blob (editor).
- `app/api/revalidate/route.ts` — revalidates up to 20 paths with a token; 503 in production without one.

### API: public telemetry, feedback, health
- `app/api/analytics/track-view/route.ts` — records an article view; public, unthrottled.
- `app/api/analytics/web-vitals/route.ts` — web-vitals beacon (rate-limited); aggregate needs viewer.
- `app/api/analytics/popular-articles/route.ts` — most-viewed articles with counts.
- `app/api/analytics/popular-posts/route.ts` — article cards by popularity, used by `ArticlesList`.
- `app/api/ads/telemetry/route.ts` — ad filled/empty beacon into `ad_slot_daily`; known PlaceIDs only, rate-limited.
- `app/api/feedback/route.ts` — visitor bug/feature report; rate-limited.
- `app/api/upload-feedback-screenshot/route.ts` — feedback screenshot upload (Vercel Blob); rate-limited.
- `app/api/health/route.ts` — DB and required tables check; used by Docker healthcheck and the watchdog.

### API: video and ad diagnostics
- `app/api/video/preroll/route.ts` — server VAST resolver for allowlisted DSP hosts; reasons filled / no_fill / timeout / unsupported wrapper.
- `app/api/ad-diagnostics/analyze/route.ts` — fetch a page and report ad scripts and issues (editor, SSRF-guarded).
- `app/api/ad-diagnostics/live-scan/route.ts` — store a browser-side scan as a log file (editor).
- `app/api/ad-diagnostics/logs/route.ts` — list, read, delete scan logs (editor).

### API: activity log
- `app/api/activity-log/route.ts` — add (editor) and list (admin) activity entries.
- `app/api/activity-log/ban/route.ts` — check, ban, unban a user (admin).
- `app/api/activity-log/stats/route.ts` — per-user stats (admin).

### API: info portal and Market Watch (reads public, writes `requireInfoAdmin`)
- `app/api/info/boards/route.ts` — boards; `?admin=1` includes inactive and needs auth.
- `app/api/info/blocks/route.ts` — blocks of a board.
- `app/api/info/feeds/route.ts` — feeds of a block.
- `app/api/info/feed-items/route.ts` — feed item count and oldest date.
- `app/api/info/settings/route.ts` — portal settings.
- `app/api/info/fetch-feeds/route.ts` — fetch RSS for one or all feeds; editor or cron secret.
- `app/api/info/cleanup/route.ts` — delete feed items past retention; editor or cron secret.
- `app/api/info/watch/topics/route.ts` — watch topics.
- `app/api/info/watch/search/route.ts` — fetch news for topics (editor).
- `app/api/info/watch/analyze/route.ts` — OpenAI topic analysis (editor).
- `app/api/info/watch/report/route.ts` — generate and read AI reports (editor).
- `app/api/info/watch/translate/route.ts` — translate watch items (editor).
- `app/api/info/watch/analytics/route.ts` — watch analytics aggregates.
- `app/api/info/watch/compare/route.ts` — period-over-period comparison.
- `app/api/info/watch/items/route.ts` — watch items with search.
- `app/api/info/watch/stats/route.ts` — topic stats and sparklines.

### API: decommissioned stubs (no callers; safe to delete)
- `app/api/n8n-webhook/route.ts` — returns 410.
- `app/api/wordpress-articles/route.ts` — returns 410.
- `app/api/debug/homepage-data/route.ts` — returns 404.

### lib: data and database adapter
- `lib/pg-pool.ts` — lazy `pg` pool from `DATABASE_URL`; throws when unset.
- `lib/pg-query-builder.ts` — Supabase-style chain turned into parameterized SQL (`.or()` strings, upsert, thenable).
- `lib/pg-client.ts` — drop-in client with `from()` and `rpc()`; `getSupabaseClient` and friends.
- `lib/supabase-client.ts` — re-export of pg-client for old imports.
- `lib/data.ts` — public site loader; `resolveLocalizedTitle` prefers the requested locale.
- `lib/local-articles.ts` — hardcoded demo articles; loaded only outside production or with `ENABLE_LOCAL_RUNTIME_ARTICLES=true`.
- `lib/local-article-storage.ts` — browser storage for admin drafts.
- `lib/supabase-analytics.ts` — view tracking, popular-articles cache, Telegram stats in Postgres.
- `lib/feature-pages.ts` — standalone feature pages injected into listings.
- `lib/articles/content-helpers.ts` — pure category, URL, placeholder-image and text helpers.
- `lib/admin/article-display-helpers.ts` — admin Articles table helpers (image class, slug de-dup, grouping).

### lib: content pipeline and AI
- `lib/unified-article-service.ts` — create, translate, copywrite, image and save an article.
- `lib/url-parser-service.ts` — cheerio extraction of title, body, images, metadata.
- `lib/translation-service.ts` — OpenAI article translation.
- `lib/copywriting-service.ts` — OpenAI rewrite with tone and audience.
- `lib/ai-copywriting-service.ts` — full article from a short description, with cost estimate.
- `lib/editorial-quality-service.ts` — draft quality scoring.
- `lib/ai-category-detector.ts` — GPT category detection; no importers.
- `lib/image-service.ts` — article images via DALL-E, Unsplash or fallback.
- `lib/image-generation-service.ts` — DALL-E and Unsplash helpers.
- `lib/image-options-generator.ts` — image option lists for the picker.
- `lib/image-keywords.ts` — keyword phrases from titles for image search.
- `lib/smart-image-prompt-generator.ts` — GPT-written image prompts.
- `lib/config/content-prompts.ts` — content prompt templates and Telegram style buttons.
- `lib/markdown.ts` — markdown to sanitized HTML.
- `lib/monetization-settings.ts` — per-article ad/video opt-outs stored as a marker comment in markdown.
- `lib/types/image-metadata.ts` — image provenance types.
- `lib/utils/content-formatter.ts` — AI text normalizing and sanitizing.
- `lib/utils/title-policy.ts` — title length policy 55–95 chars.
- `lib/utils/html-sanitizer.ts` — DOMPurify allowlist for stored article HTML.
- `lib/utils/extract-source-images.ts` — top source images without ad/tracker junk.
- `lib/utils/image-placer.ts` — spreads images through article text.
- `lib/utils/image-optimizer.ts` — client WebP resize and Blob upload; no importers.
- `lib/utils/url-guard.ts` — SSRF guard for every user-supplied fetch.

### lib: Telegram bot
- `lib/telegram-simple/types.ts` — shared bot types.
- `lib/telegram-simple/webhook-helpers.ts` — pure webhook helpers (escaping, base URL, settings).
- `lib/telegram-simple/telegram-notifier.ts` — send/edit messages, answer callbacks.
- `lib/telegram-simple/url-parser.ts` — fetch with retries and rotating UA, extract content.
- `lib/telegram-simple/content-processor.ts` — OpenAI text improvement.
- `lib/telegram-simple/translator.ts` — OpenAI EN → PL.
- `lib/telegram-simple/image-generator.ts` — images per user settings.
- `lib/telegram-simple/publisher.ts` — writes EN + PL article, canonical URLs.
- `lib/telegram-simple/settings-loader.ts` — per-user settings with defaults.
- `lib/telegram-simple/job-queue.ts` — DB job queue: enqueue, claim, recycle, complete, fail.
- `lib/telegram-simple/pending-articles.ts` — in-memory per-chat pending articles (lost on restart).

### lib: info portal
- `lib/info/types.ts` — board, block, feed, item types.
- `lib/info/data.ts` — SQL loaders for boards, blocks, feeds.
- `lib/info/feed-fetcher.ts` — RSS/Atom parse and store, SSRF-guarded.
- `lib/info/feed-locale.ts` — per-locale field pickers and UI strings.
- `lib/info/auth-guard.ts` — `requireInfoAdmin` (editor or higher).
- `lib/info/watch-types.ts` — Market Watch types.
- `lib/info/watch-data.ts` — Market Watch SQL loaders; no importers.
- `lib/info/watch-search.ts` — news fetch, scoring, dedup, sentiment, reports.

### lib: ads and consent
- `lib/ads-provider-core.ts` — per-host provider (`PREBID_HOSTS`), feature predicates; server-safe.
- `lib/ads-provider.tsx` — client context/hook, `?ads=` override on allowed hosts.
- `lib/consent-storage.ts` — consent key/version/expiry and the early `<head>` VOX loader.
- `lib/useCookieConsent.ts` — consent state hook.
- `lib/useTcfConsent.ts` — TCF CMP status hook for Prebid hosts.
- `lib/config/cmp.ts` — CMP vendor config (currently none).
- `lib/config/adPlacements.ts` — the only holder of VOX PlaceIDs, sizes and the per-place `prebid` flag.
- `lib/config/prebidPlacements.ts` — Bidio lazy SDK config and placements.
- `lib/config/video-players.ts` — DSP preroll player definitions.
- `lib/vox-ad-lifecycle.ts` — consent-scoped VOX SDK queue, per-image in-image registration, route cleanup.
- `lib/prebid-inimage.ts` — in-image through the Prebid vox bidder.
- `lib/prebid-vox.ts` — VOX banner and video through Prebid: units, auction, banner render.
- `lib/vast.ts` — inline VAST parser shared by server and player.
- `lib/ad-telemetry.ts` — reports per-place auction outcome once per container.
- `lib/ad-diagnostics-logs.ts` — file store for ad-diagnostics scans.

### lib: auth, infra, state, types
- `lib/admin-auth.ts` — roles owner > admin > editor > viewer, session cookies, `requireAdminRole`.
- `lib/internal-service-auth.ts` — Bearer secret check for internal calls.
- `lib/api-rate-limiter.ts` — per-endpoint in-memory rate limits.
- `lib/rate-limiter.ts` — small limiter used by analytics.
- `lib/error-logger.ts` — console + `errors_log` + Telegram on critical; never throws.
- `lib/server-log-store.ts` — file-based server logs.
- `lib/admin-logger.ts` — in-browser admin logger.
- `lib/activity-logger.ts` — who-did-what activity log.
- `lib/site-url.ts` — canonical base URL with `https://web.icoffio.com` fallback.
- `lib/hooks/useFocusTrap.ts` — WCAG focus trap for modals.
- `lib/hooks/useArticles.ts` — SWR article hooks; no importers.
- `lib/stores/admin-store.ts` — Zustand admin store.
- `lib/types.ts` — shared Post, Category, admin types.
- `lib/i18n.ts` — locales en/pl and UI dictionary.
- `lib/format.ts` — `slugify`; no importers.
- `lib/README.md` — stale v7.31 layout note; this file replaces it.

### components: site layout and article
- `components/Header.tsx` — top bar: logo, categories, search, theme, language, mobile menu.
- `components/Footer.tsx` — footer; opens cookie settings.
- `components/Container.tsx` — width and padding wrapper.
- `components/Hero.tsx` — homepage lead block.
- `components/ArticlesList.tsx` — homepage list with newest/popular switch.
- `components/ArticleCard.tsx` — article tile with category fallback images.
- `components/ArticleContentWithAd.tsx` — splits article HTML and inserts ad places.
- `components/ArticleViewTracker.tsx` — one view per session, analytics consent only.
- `components/BackButton.tsx` — Back control.
- `components/Breadcrumbs.tsx` — breadcrumb trail.
- `components/CategoryNav.tsx` — category pills.
- `components/CategoryIcon.tsx` — category icons and colours.
- `components/RelatedArticles.tsx` — related posts by category and tags.
- `components/LanguageSelector.tsx` — language switch with slug mapping.
- `components/LeoSimulatorEmbed.tsx` — Leo orbit simulator iframe.
- `components/LoadingSkeleton.tsx` — skeletons for loading.tsx files.
- `components/OptimizedImage.tsx` — next/image wrapper with fallbacks.
- `components/ReadingProgress.tsx` — reading progress bar.
- `components/BackToTop.tsx` — scroll-to-top button.
- `components/ThemeProvider.tsx` — light/dark/system theme.
- `components/ViewportToggle.tsx` — simulated mobile frame toggle.
- `components/ToastNotification.tsx` — public toast context.
- `components/SearchProvider.tsx` — search-open context and shortcut.
- `components/SearchModalWrapper.tsx` — lazy-loads posts for search.
- `components/AdvancedSearch.tsx` — the live search overlay (no focus trap yet).
- `components/StructuredData.tsx` — JSON-LD schemas.
- `components/Analytics.tsx` — GA loader, analytics consent only.
- `components/WebVitals.tsx` — Web Vitals to GA and `/api/analytics/web-vitals`.
- `components/TestPanel.tsx` — dev-only translation test panel; null in production.
- `components/AddArticleForm.tsx` — form for `/admin/add-article`.
- `components/ArticleHero.tsx` — dead, superseded by `Hero.tsx`.
- `components/Prose.tsx` — dead; renders unsanitized HTML, do not revive as is.
- `components/SearchModal.tsx` — dead; the live overlay is `AdvancedSearch.tsx`.
- `components/Newsletter.tsx` — dead; submit is simulated.
- `components/MassTranslation.tsx` — dead one-off bulk translate tool.

### components: ads and consent
- `components/AdManager.tsx` — VOX lifecycle and telemetry after consent; off on Prebid hosts.
- `components/UniversalAd.tsx` — VOX place with size check; hands over to `PrebidVoxAd` on Prebid hosts.
- `components/PrebidVoxAd.tsx` — one vox banner auction per place near the viewport.
- `components/PrebidAd.tsx` — Bidio placement slot (art_1…art_3).
- `components/PrebidManager.tsx` — Bidio lazy SDK after consent, Prebid ready signal, in-image, full-reload navigation.
- `components/CmpLoader.tsx` — TCF CMP on Prebid hosts (when configured).
- `components/InterstitialAd.tsx` — mobile 320×480 interstitial, once per session, only when filled.
- `components/VideoPlayer.tsx` — DSP VAST or Prebid vox video, plays once, consent only.
- `components/CookieConsent.tsx` — consent banner with focus trap.
- `components/CookieSettings.tsx` — per-category consent modal (no focus trap yet).
- `components/CookieSettingsManager.tsx` — opens settings on the global event.

### components: admin (tab id in parentheses)
- `components/admin/AdminLayout.tsx` — shell: sidebar tabs, header, toasts, mobile nav.
- `components/admin/MobileNav.tsx` — mobile admin menu.
- `components/admin/Toast.tsx` — admin toaster.
- `components/admin/UsernamePrompt.tsx` — first-login name prompt and ban check.
- `components/admin/LoadingStates.tsx` — admin skeletons.
- `components/admin/Dashboard.tsx` — (dashboard) stats overview.
- `components/admin/ArticlePopularityStats.tsx` — (dashboard) most viewed articles.
- `components/admin/TelegramStats.tsx` — (dashboard) bot activity.
- `components/admin/URLParser.tsx` — (parser) URL, text and AI article creation.
- `components/admin/URLParser/URLInput.tsx` — (parser) URL entry and check.
- `components/admin/URLParser/TextInput.tsx` — (parser) raw text entry.
- `components/admin/URLParser/AIGenerate.tsx` — (parser) article from a prompt.
- `components/admin/URLParser/ParsingQueue.tsx` — (parser) job list.
- `components/admin/ParsingProgressModal.tsx` — (parser) progress overlay.
- `components/admin/ArticleCreatorModal.tsx` — (parser) review, images and publish modal.
- `components/admin/ArticlesManager.tsx` — (articles) list, edit, delete, bulk delete.
- `components/admin/AdvancedSearchPanel.tsx` — (articles) filters.
- `components/admin/MobileArticleCard.tsx` — (articles) mobile row.
- `components/admin/PublishedArticleEditor.tsx` — (published-editor) edit EN/PL of a published article.
- `components/admin/ArticleEditor.tsx` — (editor) editor shell with autosave guard.
- `components/admin/ArticleEditor/ContentEditor.tsx` — (editor) title, body, images.
- `components/admin/ArticleEditor/ArticlePreview.tsx` — (editor) preview and publish.
- `components/admin/ArticleEditor/TranslationPanel.tsx` — (editor) translation.
- `components/admin/AICopywriter.tsx` — (editor) article from a prompt with cost.
- `components/admin/ImageMetadataEditor.tsx` — (editor) image prompts and tags.
- `components/admin/ImageSourceSelector.tsx` — (editor) Unsplash or AI image.
- `components/admin/RichTextEditor.tsx` — (editor, published-editor) TipTap editor.
- `components/admin/ImagePickerModal.tsx` — (published-editor) image picker.
- `components/admin/ImageSystem.tsx` — (images) image library.
- `components/admin/ImageSystem/AIImageGenerator.tsx` — (images) AI generation.
- `components/admin/ImageSystem/ImageGrid.tsx` — (images) grid.
- `components/admin/ImageSystem/ImagePreview.tsx` — (images) preview overlay.
- `components/admin/ImageSystem/ImageSearch.tsx` — (images) stock search.
- `components/admin/PublishingQueue.tsx` — (queue) scheduled publications.
- `components/admin/LogsViewer.tsx` — (logs) system logs.
- `components/admin/ErrorsLogViewer.tsx` — (errors) error log.
- `components/admin/AdvertisingManager.tsx` — (advertising) VOX places and fill stats.
- `components/admin/AdDiagnostics.tsx` — (ad-diagnostics) ad scan of any URL.
- `components/admin/ContentPromptManager.tsx` — (content-prompts) style prompts.
- `components/admin/ActivityLog.tsx` — (activity) activity history, ban/unban.
- `components/admin/TelegramSettings.tsx` — (telegram) bot publishing settings.
- `components/admin/FeedbackManager.tsx` — (feedback) bug report triage.
- `components/admin/TeamAccessManager.tsx` — (settings) team and roles.
- `components/admin/CleanupTool.tsx` — (settings) duplicate and orphan analysis.
- `components/admin/DualLanguageEditor.tsx` — dead, no importers.
- `components/admin/ImageOptionsConfigModal.tsx` — dead, never mounted.
- `components/admin/ImageSelectionModal.tsx` — dead, replaced by `ImagePickerModal.tsx`.

### components: info portal and feedback
- `components/info/InfoHome.tsx` — boards list.
- `components/info/InfoBoardPage.tsx` — one board with feed columns.
- `components/info/FeedColumn.tsx` — RSS item column by locale.
- `components/info/InfoWatchPage.tsx` — Market Watch analytics and reports.
- `components/info/InfoThemeToggle.tsx` — info pages theme toggle.
- `components/info/InfoAdminPanel.tsx` — (info-portal tab and `/admin/info`) boards, feeds, cleanup, translate.
- `components/info/TranslationQC.tsx` — translation spot-check.
- `components/feedback/FeedbackWidget.tsx` — admin-only feedback button.
- `components/feedback/FeedbackModal.tsx` — screenshot, annotation, submit.
- `styles/globals.css` — the only global stylesheet: Tailwind, theme, prose, `.vox-*` ad containers.

### Root config and build
- `package.json` / `package-lock.json` — dependencies and scripts (`dev`, `build`, `type-check`, `test`, `test:coverage`, `ad:live-debug`, cleanup scripts).
- `Dockerfile` — 3-stage Node 20 build; bakes `NEXT_PUBLIC_*` build args; runs as `node` on 4200 with healthcheck.
- `docker-compose.vps.yml` — `icoffio-postgres` (initdb from `supabase/init`) and `icoffio-front-app` (172.17.0.1:4200, `.env.production`).
- `.dockerignore` — keeps env files, docs and tests out of the image.
- `next.config.mjs` — image hosts, rewrites, security headers and CSP (must keep `hbrd.io`, `hybrid.ai`, `bidio.pl`).
- `tailwind.config.ts` — dark mode and `info.*` colour tokens.
- `postcss.config.js` — Tailwind/PostCSS.
- `tsconfig.json` — TypeScript config, `@/*` alias.
- `next-env.d.ts` — Next.js types.
- `vitest.config.ts` — node env, `__tests__/**/*.test.ts`, coverage gates.
- `.env.example` — env key template (placeholders; still lists legacy WordPress/Supabase keys).
- `.eslintrc.json`, `.prettierrc.json`, `.editorconfig`, `.gitignore` — tooling config.
- `.husky/pre-commit` — lint-staged and type-check on commit.
- `telegram-reset-config.example.json` — template for the Python webhook reset scripts.

### scripts
- `scripts/icoffio-watchdog.sh` — VPS cron watchdog (see cron table); deployed to `/usr/local/bin/`.
- `scripts/icoffio-cleanup-items.sh` — VPS cron: feed-item retention cleanup.
- `scripts/icoffio-translate-items.sh` — VPS cron: batch translation of feed items.
- `scripts/vps-docker-deploy.sh` — on-VPS deploy helper (env check, `compose up -d --build`, health); recreates containers.
- `scripts/rotate-openai-key.sh` — interactive key rotation locally and on the VPS; recreates the app container.
- `scripts/live-ad-debug.js` — Playwright ad audit (`npm run ad:live-debug`); read-only.
- `scripts/check-prod-health.sh` — curl health of the domains; still lists an old Vercel URL.
- `scripts/pre-deploy.sh` — local build and clean-tree check.
- `scripts/create-backup.sh` — writes `git diff` to `backups/`.
- `scripts/new-feature.sh` — old branch flow from `main`; legacy.
- `scripts/notify-release.sh`, `scripts/notify-release-simple.sh` — Telegram release message.
- `scripts/setup-telegram-menu.sh` — sets bot menu commands.
- `scripts/telegram-reset-auto.sh` — clears `telegram_jobs` and re-registers the webhook; destructive.
- `scripts/telegram-reset-interactive.py`, `scripts/telegram-reset-simple.py` — same reset in Python; destructive.
- `scripts/telegram-reset-webhook.py` — re-registers the webhook only.
- `scripts/telegram-config.example.json` — reset script config template.
- `scripts/README_TELEGRAM_RESET.md` — reset scripts guide (Russian).
- `scripts/sanitize-published-articles.js` — cleans parser artifacts; `--dry-run` default, `--confirm` updates.
- `scripts/clean-problematic-articles.js` — finds junk articles; `--confirm` deletes.
- `scripts/clean-problematic-articles.ts` — TS shim for the cleaner.
- `scripts/add-article.js` — deprecated article poster.
- `scripts/audit-content.js`, `scripts/audit-images.js` — read-only audits of `lib/local-articles.ts`.
- `scripts/seed.py` — WordPress-era seed generator; unused.
- `scripts/clean-vps-project.sh` — removes the project from the retired host 77.55.211.1; password now from env.
- `scripts/fix-dead-feeds-20260603.sql`, `scripts/deactivate-antibot-feeds-20260604.sql`, `scripts/enable-video-old-articles-20260702.sql` — applied one-off SQL fixes, kept as record.

### Database (`supabase/`, plain Postgres)
Migrations are applied by hand: `docker exec -i icoffio-postgres psql -U icoffio -d icoffio -v ON_ERROR_STOP=1 < supabase/migrations/<name>.sql`. No runner, no applied-migrations table. `supabase/init/001_schema.sql` runs only on an empty volume and lacks the info portal, Market Watch, `errors_log`, `web_vitals` and locale columns: a fresh database needs the 2026 migrations after it, in date order.
- `supabase/init/001_schema.sql` — combined init schema (v10.0.0) mounted as initdb.
- `supabase/schema.sql` — old Supabase-cloud schema; history.
- `supabase/migrations/00_BASE_SCHEMA.sql` — base `published_articles`.
- `supabase/migrations/20251030_telegram_jobs.sql` — Telegram job queue.
- `supabase/migrations/20251031_article_popularity_fix.sql` — popularity view and refresh.
- `supabase/migrations/20251031_telegram_image_library.sql` — image reuse library.
- `supabase/migrations/20251031_telegram_user_preferences.sql` — bot user preferences.
- `supabase/migrations/20251102_articles_content_storage.sql` — content columns, slug/popular/related functions.
- `supabase/migrations/20251205_activity_logs.sql` — activity log.
- `supabase/migrations/20251205_telegram_settings.sql` — bot content-style settings.
- `supabase/migrations/20260215_telegram_worker_queue_and_idempotency.sql` — worker queue fields, update idempotency.
- `supabase/migrations/20260217_admin_roles_and_access.sql` — admin roles, owner protection.
- `supabase/migrations/20260224_extend_image_library.sql` — image library columns.
- `supabase/migrations/20260225_feedback_reports.sql` — feedback reports.
- `supabase/migrations/20260401_info_portal_schema.sql` — info boards, blocks, feeds, items.
- `supabase/migrations/20260407_watch_schema.sql` — Market Watch tables.
- `supabase/migrations/20260508_errors_log.sql` — self-hosted error log.
- `supabase/migrations/20260508_published_articles_updated_at.sql` — `updated_at` and trigger.
- `supabase/migrations/20260508_schema_consistency_fixes.sql` — May 2026 audit fixes.
- `supabase/migrations/20260508_web_vitals.sql` — Web Vitals table.
- `supabase/migrations/20260520_info_blocks_boards_locale.sql` — per-locale block/board titles.
- `supabase/migrations/20260520_info_board_polska.sql` — the all-Polish board.
- `supabase/migrations/20260520_info_feed_items_locale.sql` — per-locale item titles.
- `supabase/migrations/20260520_info_feeds_lang_audit_fix.sql` — feed language backfill fix.
- `supabase/migrations/20260520_info_feeds_locale.sql` — per-locale feed titles and lang.
- `supabase/migrations/20260521_info_feed_items_description_locale.sql` — per-locale item descriptions.
- `supabase/migrations/20260617_info_feed_error_visibility.sql` — `last_error` / `consecutive_failures` on feeds.
- `supabase/migrations/20261026_ad_slot_daily.sql` — daily ad fill counters.
- `supabase/migrations/RESET_TELEGRAM_QUEUE.sql` — manual queue wipe; destructive.

### Public assets
- `public/ads.txt` — official VOX seller line; change only together with the VOX panel.
- `public/ad-scanner.js` — scanner loaded by the Ad Diagnostics tab.
- `public/cleanup.js` — legacy console snippet for admin localStorage.
- `public/architecture.html` — old (2026-02) architecture diagram page.
- `public/manifest.json`, `public/browserconfig.xml` — PWA and tile metadata.
- `public/favicon.svg`, `public/logo.svg`, `public/icon-192.png` — brand assets.
- `public/og.png` — 1-byte placeholder; the OG image is broken.

### CI and repo housekeeping
- `.github/workflows/ci.yml` — lint, type-check, tests, build on push/PR; conflicts with the local-checks rule (see AGENTS.md).
- `.github/workflows/release-notification.yml` — Telegram message on `v*` tag push.
- `.github/workflows/vercel-build-monitor.yml` — Vercel-era leftover; polls a Vercel project that no longer serves the site.
- `.github/dependabot.yml` — weekly npm and monthly actions updates to `feature/info-portal`.
- `backups/README.md` and `backups/backup-20251024-150444.patch`, `backups/backup-20251025-013742.patch`, `backups/backup-20251026-013527.patch` — Oct 2025 diff snapshots; history.
- `tests/README.md` — empty placeholder; tests live in `__tests__/`.

## Tests: which rule each one locks

Run `npm test` (vitest, node env, `__tests__/**/*.test.ts`). Coverage gates: `npm run test:coverage`.

- `__tests__/ads-provider.test.ts` — provider per host; a build-time `prebid` never kills main-site VOX (v10.21.1 incident); `?ads=` gating.
- `__tests__/vox-ad-lifecycle.test.ts` — VOX SDK only after consent, each image once, stale route callbacks dropped.
- `__tests__/consent-storage.test.ts` — consent validation and expiry; early VOX loader only with a grant.
- `__tests__/universal-ad.test.ts` — slot shown only for a real creative; no-fill reported; hidden-breakpoint slots not exposed.
- `__tests__/video-player.test.ts` — no ads before consent, one-pass tracking, no replay loop, Prebid VAST on Prebid hosts.
- `__tests__/video-preroll-route.test.ts` — DSP allowlist, 504 on timeout, no redirect around the allowlist, no-fill vs wrapper.
- `__tests__/prebid-inimage.test.ts` — in-image unit contract, one auction per photo, frame over the whole photo.
- `__tests__/prebid-vox.test.ts` — vox banner/video units (outstream video), Prebid ready order, timeout guard, banner render, VAST from a bid.
- `__tests__/ad-telemetry.test.ts` — VOX status → filled/empty, one beacon per container.
- `__tests__/ad-diagnostics-logs.test.ts` — log ids only as generated; no path traversal.
- `__tests__/monetization-settings.test.ts` — per-article ad opt-out markers round-trip.
- `__tests__/api-rate-limiter.test.ts` — buckets, headers, 429 with Retry-After.
- `__tests__/url-guard.test.ts` — SSRF guard: private ranges, protocols.
- `__tests__/html-sanitizer.test.ts` — XSS stripped, valid article HTML kept (100% coverage gate).
- `__tests__/error-logger.test.ts` — logger never throws, survives DB failure.
- `__tests__/info-auth-guard.test.ts` — info admin routes need editor.
- `__tests__/feed-parser.test.ts` — RSS/Atom parsing edge cases.
- `__tests__/title-policy.test.ts` — title trimming and 55–95 window.
- `__tests__/image-pipeline.test.ts` — image keywords; bad placeholders removed.
- `__tests__/article-content-helpers.test.ts` — temporary/placeholder image detection, truncation.
- `__tests__/article-display-helpers.test.ts` — admin image class, slug key, grouping.
- `__tests__/telegram-url-parser.test.ts` — title fallbacks, UA, retry on 5xx.
- `__tests__/telegram-webhook.test.ts` — webhook helpers and pending state.
- `__tests__/pending-articles.test.ts` — pending store TTL.
- `__tests__/webhook-helpers.test.ts` — escaping and base-URL helpers.
- `__tests__/articles-api.test.ts` — slug and action routing; tests inline copies, not the real route (weak).
- `__tests__/data.test.ts` — category normalizing and language filter; inline copies, not `lib/data.ts` (weak).
- `__tests__/project-map.test.ts` — this map: quoted paths exist, every source file is listed, `CLAUDE.md` imports `AGENTS.md`.

Not covered: the pg adapter, admin routes, the publish pipeline, middleware, cron endpoints.

## Known debt (found while mapping, 2026-10-30)

- Dead code listed above (marked "dead" / "no callers"); safe to delete in a cleanup pass.
- Cron secrets are also accepted as `?token=` on the worker, translate-items-batch and info/cleanup (land in access logs); compared with `===`.
- `app/api/analytics/track-view/route.ts` and the public info/watch GETs have no rate limit.
- `app/api/telegram-simple/worker/route.ts` imports `processSubmission` from the webhook route file; it belongs in `lib/`.
- The bot webhook accepts any chat (secret token only); `/admin` replies with the admin URL to anyone.
- Uploads use Vercel Blob although hosting is the VPS.
- Modals without focus trap: `AdvancedSearch`, `CookieSettings`, `ImagePreview`, `ParsingProgressModal`.
- `PrebidAd` label is hard-coded Polish "Reklama".
- Two `AdminRole` definitions (`lib/admin-auth.ts`, `lib/stores/admin-store.ts`) and duplicated helper constants.
