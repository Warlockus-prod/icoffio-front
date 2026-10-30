# AGENTS.md — icoffio-front

Entry point for any agent (Claude, Codex, others). Read this first, then [ARCHITECTURE.md](ARCHITECTURE.md) for the code map and flows, and [CHANGELOG.md](CHANGELOG.md) for what changed.

## What this is

Next.js 14 + React 18 + TypeScript + Tailwind news site with a Telegram-bot content pipeline (link → GPT rewrite → Polish translation → images → publish), an admin panel at `/admin`, an RSS info portal at `/info`, and VOX / Prebid advertising. Articles are dual-language (EN + PL) in the `published_articles` table.

- **Hosts:** `icoffio.com` and `app.icoffio.com` (main site, VOX ads) and `web.icoffio.com` (Bidio Prebid test host). One container serves all of them.
- **Production:** VPS2 `178.104.223.93` (Hetzner, `ubuntu-16gb-fsn1-1`), Docker compose. Moved from VPS1 `46.225.11.249` on 2026-04-22; icoffio is gone from VPS1 (only wine projects remain there).
- **Deploy branch:** `feature/info-portal`. `main` is not production.
- **Database:** self-hosted Postgres 16 (`icoffio-postgres`, host port 5433) through a Supabase-shaped adapter (`lib/pg-pool.ts`, `lib/pg-query-builder.ts`, `lib/pg-client.ts`). Names with "supabase" in them are historical.
- **App container:** `icoffio-front-app` on `172.17.0.1:4200`. Port 3000 on the VPS is Metabase.

## Hard rules

- **Ads are chosen per host, never per build.** `lib/ads-provider-core.ts` gives `prebid` only to `PREBID_HOSTS` (`web.icoffio.com`); everything else is `vox`. Keep `NEXT_PUBLIC_ADS_PROVIDER=vox` on the VPS (v10.21.1 set `prebid` and killed ads site-wide for a day).
- **VOX SSP is Hybrid.ai, not vox.com.** CSP in `next.config.mjs` must keep `st.hbrd.io`, `ssp.hbrd.io`, `ssp.hybrid.ai` (and `*.bidio.pl` for Prebid) in script/connect/frame-src (v10.20.0 broke ads for a month).
- **Consent first.** No ad SDK, auction or video request before advertising consent. Never fabricate TCF consent strings or `__tcfapi`. Test ad changes with the cookie banner **Accepted**.
- **Video is DSP VAST or Prebid vox video, never fake VOX video PlaceIDs** (they froze Chrome). No-fill and timeout leave no player. Supplier 204 / empty VAST cannot be fixed by fabricating creatives or tracking.
- **PlaceIDs live only in `lib/config/adPlacements.ts`**; `format` must equal the size registered in the VOX panel.
- **VOX in-image viewability is geometry:** the view pixel needs >99% of the host photo on screen for 1 s, so the article hero must fit a ~650 px laptop viewport (lead under the photo, breadcrumbs + Back on one row, desktop hero 21:9). Register each image node once through `lib/vox-ad-lifecycle.ts`.
- **Hybrid console and VOX panel are read-only for agents** unless the owner explicitly asks for a specific change. Their credentials live on the VPS; never print secret values.
- **Article titles** on the frontend always go through `resolveLocalizedTitle` in `lib/data.ts`.
- **Colours:** Info Portal uses Tailwind tokens (`info.*` in `tailwind.config.ts`); no hardcoded `text-[#...]` / `bg-[#...]`.
- **Modals:** `useFocusTrap` (`lib/hooks/useFocusTrap.ts`) + `role="dialog" aria-modal="true"`.
- **Telegram:** `reply_markup` is ONE of InlineKeyboard or ReplyKeyboard per message. `/api/telegram-simple/*` is the live bot; `/api/telegram/webhook` is a legacy shim that delegates to it.
- **Postgres:** PL/pgSQL `RETURNS TABLE` with `text` columns needs explicit `::text` casts from `varchar`.
- **Servers:** never reboot or recreate production unattended; verify from outside (`curl https://<domain>/`), not by `docker ps`.
- **Secrets** never go into git or these docs. `.env.production` lives only on the VPS (gitignored since v10.6.3).
- Language: code, comments and commit messages in English; talk to the owner in Russian.

## Where to find what

| Need | Look at |
|---|---|
| Every file, flows, tests, cron suite | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Ad setup: places ↔ VOX slots, providers per host, how to check fill | `docs/ADVERTISING.md` |
| VOX through Prebid (in-image, banners, video) for partners, PL/RU/EN | `docs/prebid-vox/README.md` |
| Ad delivery audit and supplier-side blockers | `docs/ADVERTISING_AUDIT_2026-10-22.md` |
| Consent banner design | `docs/COOKIE_CONSENT_GUIDE.md` |
| Telegram webhook (the bot) | `app/api/telegram-simple/webhook/route.ts`, `lib/telegram-simple/` |
| AI article processing | `lib/telegram-simple/content-processor.ts`, `lib/unified-article-service.ts` |
| Frontend data | `lib/data.ts` |
| Full DB schema | `supabase/init/001_schema.sql` + `supabase/migrations/` |
| Live ad diagnostics in a browser | `scripts/live-ad-debug.js` (`npm run ad:live-debug`) |
| Prebid diagnostics page | `/prebid-test` on web.icoffio.com |

## Documentation library

Current:
- `docs/ADVERTISING.md` — the single live ad document.
- `docs/ADVERTISING_AUDIT_2026-10-22.md` — dated delivery audit evidence.
- `docs/prebid-vox/README.md` (`pl.md`, `ru.md`, `en.md`) — VOX through Prebid instructions and status.
- `docs/COOKIE_CONSENT_GUIDE.md` — consent banner (note: refusal expires after 30 days).
- `docs/ARCHITECTURE_BLUEPRINT.md` — long architecture write-up (v10.5); valid for the pg adapter and VPS, older than the Prebid host split. ARCHITECTURE.md wins where they differ.
- `docs/MULTI_AGENT_PROTOCOL.md` — PM/dev/QA role protocol.
- `PRE_DEPLOY_CHECKLIST.md` — pre-deploy steps (VPS2 deploy matches this file).
- `scripts/README_TELEGRAM_RESET.md` — bot reset scripts (Russian).

History (describes an earlier state; read for background only): `docs/archive/` (everything), `VERSION_HISTORY.md`, `GITHUB_SETUP.md`, `ADMIN_PANEL_FINAL_DOCUMENTATION.md`, `ADMIN_PANEL_UX_IMPROVEMENTS.md`, `CONTENT-AUDIT-REPORT.md`, `N8N_INTEGRATION_GUIDE.md`, `TELEGRAM_SIMPLE_TESTING.md`, `security_best_practices_report.md`, `docs/MIGRATION_RUNBOOK.md`, `docs/RELEASE_NOTIFICATIONS.md`, `docs/TELEGRAM_QUICK_SETUP.md`, `docs/RELEASE_REVIEW_PACKET_2026-02-17.md`, `docs/ADMIN_PANEL_AUDIT_2026-02-15.md`, `docs/TECH_DEBT_BACKLOG.md`, `docs/ROADMAP_NEXT_PHASES.md`, `docs/COST_ANALYSIS_AND_USAGE.md`, `docs/ADMIN_IMAGE_GENERATION_GUIDE.md`, `docs/IMAGE_GENERATION_QUICK_START.md`, `docs/SMART_IMAGE_SYSTEM_v7.8.0.md`, `docs/CONTENT_PROMPTS_SYSTEM_v7.8.1.md`, `docs/AI_COPYWRITING_GUIDE.md`, `docs/v7.5.0_IMPLEMENTATION_REPORT.md`, `backups/README.md`.

Wrong today — do not follow (Vercel, Supabase cloud or WordPress era): `README.md` (says v10.7.0), `DEVELOPMENT_RULES.md` ("push = Vercel deploy"), `CONTRIBUTING.md`, `MODULE_MANAGEMENT.md` ("main is production"), `PROJECT_MASTER_DOCUMENTATION.md`, `ARCHITECTURE_ANALYSIS.md`, `ADMIN_TESTING_CHECKLIST.md`, `TELEGRAM_FULL_RESET_INSTRUCTIONS.md`, `docs/DOCKER_VPS_RUNBOOK.md` (nginx target is `172.17.0.1:4200`, not 127.0.0.1), `docs/DOMAIN_OUTAGE_RUNBOOK.md`, `docs/SOURCE_OF_TRUTH_WORKFLOW.md` (CI part), `docs/GITHUB_SECRETS_SETUP.md`, `docs/VERCEL_BUILD_MONITORING.md`, `docs/VERCEL_DEPLOYMENT_GUIDE.md`, `docs/VERCEL_USAGE_OPTIMIZATION.md`, `docs/SUPABASE_SETUP.md`, `docs/CLEANUP_PROBLEMATIC_ARTICLES.md`, `lib/README.md`, `tests/README.md`.

## Run, test, ship

Local:

```bash
npm install
npm run dev          # http://localhost:3000 (needs DATABASE_URL for real data)
npm run type-check
npm test             # vitest, __tests__/**/*.test.ts
npm run build
```

Checks run on the Mac, not on GitHub (owner rule 2026-10-29): before a push run the tests for what changed; before a deploy run `npm run type-check && npm test && npm run build`. `.github/workflows/ci.yml` still triggers on push — do not wait for it or treat it as a gate.

Deploy (from the Mac; another session may push to the same branch, so fetch and rebase first, and check that no compose build is already running on the VPS):

```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 -o ServerAliveInterval=30 root@178.104.223.93 \
  "cd /root/projects/icoffio-front && \
   git fetch origin feature/info-portal && \
   git reset --hard origin/feature/info-portal && \
   docker compose -f docker-compose.vps.yml --env-file .env.production build && \
   docker compose -f docker-compose.vps.yml --env-file .env.production up -d"
```

- Always pass `--env-file .env.production`: compose otherwise reads `.env`, and `POSTGRES_PASSWORD` fails fast.
- `NEXT_PUBLIC_*` values are baked at build time. `NEXT_PUBLIC_VIDEO_PREROLL_ENABLED=true` must reach the build for the video player.
- If a checkout has no `.env.production`, restore it from `/root/projects/icoffio-front.predeploy-*`; never commit it.
- Before deploying, tag the running image for rollback (`docker tag icoffio-front-app icoffio-front-rollback:<version>`).
- After deploying, check from outside: `https://icoffio.com/`, `https://app.icoffio.com/`, `https://web.icoffio.com/api/health`, and the ads on the changed host with consent accepted.
- DB migrations: `docker exec -i icoffio-postgres psql -U icoffio -d icoffio -v ON_ERROR_STOP=1 < supabase/migrations/<name>.sql`.
- Cron suite, watchdog and backups: see the table in ARCHITECTURE.md. When the watchdog script changes, copy it to `/usr/local/bin/` on the VPS.

## Release rule

- Bump `version` in `package.json` before every deploy.
- Every user- or ops-visible change gets a plain-language line under `## Unreleased` in `CHANGELOG.md`, in the same commit.
- On a production deploy, move the `Unreleased` lines into `## [x.y.z] - YYYY-MM-DD`.
- Adding, moving or removing a file, or changing a flow, deploy step, host or rule: update `ARCHITECTURE.md` / this file in the same commit. `__tests__/project-map.test.ts` fails when a source file is not listed in ARCHITECTURE.md or a quoted path no longer exists.
- Commits in English; the owner has pre-approved build, deploy, SSH, git push, DB queries and browser testing for this project.
