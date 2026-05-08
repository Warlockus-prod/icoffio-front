# CLAUDE.md — icoffio-front

## Project

Next.js 14 + React 18 + TypeScript + Tailwind CSS news aggregation platform with Telegram bot integration, AI content processing, and admin panel.

- **Domain:** https://web.icoffio.com
- **Branch:** `feature/info-portal` (active)
- **Version:** check `package.json` (current 10.6.x line)

## Architecture

- **Database:** Self-hosted PostgreSQL 16 (container `icoffio-postgres`, port 5433→5432)
- **App container:** `icoffio-front-app` (port 4200, NOT 3000 which is Metabase)
- **DB adapter:** Supabase-compatible PG adapter (`lib/pg-pool.ts`, `lib/pg-query-builder.ts`, `lib/pg-client.ts`)
- **Content pipeline:** Telegram bot → webhook → URL parser → AI (GPT-4o-mini) → translator (PL) → image generator → publisher → PostgreSQL
- **Admin panel:** `/admin` — tabs: Dashboard, URL Parser, Editor, Images, Queue, Articles, Logs, Cleanup, Ads, Feedback
- **Articles:** Dual-language (EN + PL) in `published_articles` table

## Deployment

**Active VPS:** `178.104.223.93` (`ubuntu-16gb-fsn1-1`, Hetzner Falkenstein) — **migrated from VPS#1 on 2026-04-22**.
**Legacy VPS#1:** `46.225.11.249` (`ubuntu-8gb-nbg1-2`) — only wine_* / flask_wine projects remain there; icoffio is GONE from VPS#1.

```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 -o ServerAliveInterval=30 root@178.104.223.93 \
  "cd /root/projects/icoffio-front && \
   git fetch origin feature/info-portal && \
   git reset --hard origin/feature/info-portal && \
   docker compose -f docker-compose.vps.yml --env-file .env.production build && \
   docker compose -f docker-compose.vps.yml --env-file .env.production up -d"
```

- Always use `--env-file .env.production` — required since v10.6.1 (POSTGRES_PASSWORD has `${VAR:?msg}` syntax, fails fast on missing env)
- Use `-o ServerAliveInterval=30` to prevent SSH timeout on long builds
- `NEXT_PUBLIC_*` vars are baked at build time
- ⚠️ `.env.production` is **gitignored** as of v10.6.3 — historically it was tracked as a 53-byte placeholder which `git reset --hard` would blow away. If a fresh checkout has no `.env.production`, restore from a backup like `/root/projects/icoffio-front.predeploy-*` or rebuild from `.env.example`.
- DB migrations: apply via `docker exec -i icoffio-postgres psql -U icoffio -d icoffio -v ON_ERROR_STOP=1 < supabase/migrations/<name>.sql`

## Key Files

| Path | Purpose |
|------|---------|
| `lib/pg-pool.ts` | PostgreSQL connection pool |
| `lib/pg-query-builder.ts` | Supabase-compatible query builder |
| `lib/pg-client.ts` | Drop-in Supabase client replacement |
| `lib/data.ts` | Frontend data loader |
| `supabase/init/001_schema.sql` | Full schema (all tables + functions) |
| `app/api/telegram-simple/webhook/route.ts` | Main Telegram webhook |
| `lib/telegram-simple/content-processor.ts` | AI article processing |
| `components/AdManager.tsx` | VOX SSP ad integration |
| `components/InterstitialAd.tsx` | Fullscreen interstitial ad (320x480) |
| `components/feedback/FeedbackWidget.tsx` | Admin-only feedback button |
| `components/feedback/FeedbackModal.tsx` | Screenshot + annotation + submit |

## Conventions

- Language: Russian in user-facing comments when communicating with user, English in code
- Bump version in `package.json` before deploying
- Commit messages in English

## Permissions

All operations are pre-approved by the project owner. Work autonomously:
- Build, deploy, SSH to VPS
- Git operations (commit, push, pull)
- File creation, editing, deletion
- npm install, run scripts
- Database queries via SSH/psql
- curl requests to web.icoffio.com and VPS
- Browser automation and testing

## Pitfalls

- **VPS migration confusion**: project moved from `46.225.11.249` (VPS#1) to `178.104.223.93` (VPS#2) on 2026-04-22. Old SSH-to-VPS#1 commands will land on a different server; old git-pull paths won't find icoffio.
- **Port 3000 on VPS = Metabase**, app is on port 4200 (`172.17.0.1:4200`)
- **Video players with fake VOX PlaceIDs cause Chrome freeze** — keep `NEXT_PUBLIC_VIDEO_PREROLL_ENABLED=false`
- **PostgreSQL varchar→text cast** needs explicit `::text` in PL/pgSQL RETURNS TABLE
- **Docker compose** reads `${POSTGRES_PASSWORD}` from `.env` by default, NOT `.env.production`. Pass `--env-file .env.production` always.
- **Telegram reply_markup** can only be ONE of InlineKeyboard or ReplyKeyboard per message
- **`.env.production` was tracked in git as placeholder** until v10.6.3. `git reset --hard` would blow away the real prod env — recover from `/root/projects/icoffio-front.predeploy-*` backups.
- **Two Telegram bots in tree**: `/api/telegram/*` is legacy shim, `/api/telegram-simple/*` is active (registered with BotFather). Worker cron hits the simple route every minute.
