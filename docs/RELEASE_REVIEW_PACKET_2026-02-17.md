# Release Review Packet (2026-02-17)

## Branch / Deployment Safety

- `main` contains VPS-focused updates and still triggers Vercel auto-deploy by default.
- Freeze branch created for Vercel pinning:
  - `codex/vercel-freeze` (points to stable commit `7dc347a`)
- Recommendation:
  - Set Vercel Production Branch to `codex/vercel-freeze`
  - Keep VPS deploys from `main` via manual `git pull` on server.

## Release Summary

### 8.6.46 (`21af5a1`)
- Removed mock fallback data from search flow.
- Search modal switched to `GET /api/supabase-articles?lang=...`.
- Hardened `AdManager` against mutation-init loops (debounce/throttle/cleanup).
- WordPress publication placed behind feature flag:
  - `ENABLE_WORDPRESS_PUBLISH`

### 8.6.47 (`025edcd`)
- Fixed VOX bootstrap race:
  - ensure `window._tx.cmds` exists before loading `https://st.hbrd.io/ssp.js`
- Resolved runtime error:
  - `Cannot read properties of undefined (reading 'cmds')`
- Result:
  - ad containers initialize correctly on VPS.

### 8.6.48 (`7dc347a`)
- Disabled local seed article feed in production/runtime.
- Seed content remains available only for local dev or explicit flag:
  - `ENABLE_LOCAL_SEED_ARTICLES=true`
- Production article feed now uses real Supabase + runtime-created articles only.

## Extra Ops Completed

- VPS deployed and running:
  - app version: `8.6.48`
  - process: `pm2 icoffio-front` (online)
- Supabase cleanup:
  - removed test rows: `123-test-en`, `123-test-pl`
- WordPress publication on VPS:
  - `ENABLE_WORDPRESS_PUBLISH=false`

## Test Checklist (QA)

1. Open homepage:
   - `https://web.icoffio.com/en`
   - `https://web.icoffio.com/pl`
2. Open at least 3 articles per locale and verify:
   - title/excerpt/content readable
   - no markdown artifacts in rendered body
3. Ads check:
   - desktop: inline + sidebar blocks visible
   - mobile/tablet: mobile placement visible, desktop placements hidden
4. Admin flow:
   - create from URL
   - create from text
   - publish
   - verify appears in All Articles with correct image/slug/link
5. Parser quality:
   - no URLs/dates garbage in final content paragraphs
6. API smoke:
   - `GET /api/supabase-articles?lang=en`
   - `GET /api/supabase-articles?lang=pl`

## Known Non-Blocker

- `AdManager` has a short `readyPoll` fallback (250ms) for already-in-DOM script tags.
- If SDK readiness appears later than that one-shot poll, next route/mutation cycle still re-inits safely.

