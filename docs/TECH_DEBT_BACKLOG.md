# Tech Debt Backlog

Last updated: 2026-02-15
Scope: actionable `TODO/FIXME/HACK` in production code paths.

## Priority model
- `P1` blocks reliability, data correctness, or admin UX.
- `P2` improves product quality and monetization quality.
- `P3` cleanup or process-only improvements.

## Completed items
1. `P1` Persist regenerated image metadata and load real article data
   - Status:
     - Completed on 2026-02-15 (`v8.6.10`).
   - Files:
     - `app/api/admin/regenerate-image/route.ts:218`
     - `app/api/admin/regenerate-image/route.ts:270`
   - Problem:
     - Regeneration response is returned, but metadata is not persisted and article data is mocked.
   - Impact:
     - Regenerated image state can be lost and may diverge from published article state.
   - Acceptance:
     - Save metadata to DB (Supabase/target source), remove dummy article loader, add API test for persisted metadata.
   - Result:
     - Article data now resolves from `published_articles` by `id/slug` with request fallback for drafts.
     - Metadata is persisted in `activity_logs.metadata` and hero image updates `published_articles.image_url` when available.

2. `P1` Show user-visible error on text-to-article queue failures
   - Status:
     - Completed on 2026-02-15 (`v8.6.10`).
   - File:
     - `components/admin/URLParser/TextInput.tsx:41`
   - Problem:
     - Failure is logged to console only; user receives no actionable feedback.
   - Impact:
     - Users retry blindly and perceive queue as unstable.
   - Acceptance:
     - Render inline error or toast, preserve input values, provide retry hint.
   - Result:
     - UI now shows inline submit error.
     - Store propagates text processing failures to caller and keeps detailed job error in queue state.

## Open prioritized items
3. `P2` Replace date-based fallback in "Popular" sorting with real view metrics
   - File:
     - `components/ArticlesList.tsx:20`
   - Problem:
     - "Popular" currently sorts by publish date, not by views.
   - Impact:
     - Misleading ranking and low trust in analytics.
   - Acceptance:
     - Integrate tracked views source, add deterministic tie-breaker, keep date fallback when metrics unavailable.

4. `P2` Replace placeholder VOX Place IDs with production-managed config
   - File:
     - `lib/config/video-players.ts:35`
     - `lib/config/video-players.ts:47`
     - `lib/config/video-players.ts:61`
     - `lib/config/video-players.ts:73`
   - Problem:
     - Hardcoded placeholder IDs still present in video player config.
   - Impact:
     - Potential wrong ad fill and hard-to-audit monetization setup.
   - Acceptance:
     - Move IDs to environment/config source, validate on startup, document fallback behavior.

## Deferred / not actionable
- `scripts/new-feature.sh` TODO mentions are template scaffolding and not production debt.
