# 🚀 icoffio — Multi-Language Tech News Platform

**Version:** v10.7.0
**Status:** ✅ Production
**Domain:** [web.icoffio.com](https://web.icoffio.com)
**Branch:** `feature/info-portal`

Bilingual (EN + PL) tech news aggregator. Content arrives from three pipelines:
- **Telegram bot** — user sends URL or text → AI rewrite → translate → image gen → publish
- **Admin panel** — same pipeline, manual control via `/admin`
- **Market Watch** — passive RSS/Atom/Telegram crawler + AI analysis (`/info`)

Public reads via Next.js SSR + ISR. Monetized through VOX SSP.

---

## 📚 Documentation

| Document | What's inside |
|----------|---------------|
| [docs/ARCHITECTURE_BLUEPRINT.md](./docs/ARCHITECTURE_BLUEPRINT.md) | **Full architecture** — recreate-from-scratch guide |
| [CLAUDE.md](./CLAUDE.md) | Working instructions for AI assistants + key paths + pitfalls |
| [SERVER_ACCESS.md](./SERVER_ACCESS.md) | VPS access, SSH keys, hosted projects topology |
| [CHANGELOG.md](./CHANGELOG.md) | Version history with deploy notes |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Project conventions |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | How to contribute |
| [PRE_DEPLOY_CHECKLIST.md](./PRE_DEPLOY_CHECKLIST.md) | Mandatory checks before each deploy |

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 14** (App Router) + **React 18** + **TypeScript 5.5** (strict) |
| Styles | **Tailwind 3.4** + `@tailwindcss/typography` |
| Database | **Self-hosted PostgreSQL 16** (`icoffio-postgres`, port 5433→5432) |
| DB adapter | Custom Supabase-compatible (`lib/pg-pool.ts` + `pg-query-builder.ts` + `pg-client.ts`) |
| AI | **OpenAI GPT-4.1-mini** (rewrite/translate) + **DALL·E 3** (images) + **Unsplash** (stock) |
| Editor | **TipTap 3** (admin article editor) |
| Sanitizer | **isomorphic-dompurify** (XSS protection) |
| Monetization | **VOX SSP** (in-image, banners, video preroll, interstitial) |
| Deploy | Docker Compose on VPS#2 (`178.104.223.93`, Hetzner Falkenstein) |

---

## 🚀 Quick Start (local dev)

```bash
# Clone + install
git clone https://github.com/Warlockus-prod/icoffio-front.git
cd icoffio-front
npm install

# Run local PostgreSQL via Docker (port 5433)
docker run -d --name icoffio-pg-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=icoffio \
  -e POSTGRES_USER=icoffio \
  -p 5433:5432 \
  postgres:16-alpine

# Apply schema
PGPASSWORD=dev psql -h 127.0.0.1 -p 5433 -U icoffio -d icoffio \
  -f supabase/init/001_schema.sql

# Configure local env (NEVER commit .env or .env.production)
cp .env.example .env.local
# edit .env.local — add OPENAI_API_KEY, ADMIN_PASSWORD, etc.

# Dev server
npm run dev   # http://localhost:3000
```

---

## 📦 Project Layout

```
app/
├── [locale]/              # i18n root (en, pl)
│   ├── (site)/            # public pages (home, article, category, …)
│   ├── admin/             # /admin panel (password auth)
│   └── info/              # Info Portal + Market Watch
├── api/                   # Route Handlers
│   ├── admin/             # admin CRUD (rate-limited, auth-gated)
│   ├── telegram-simple/   # ACTIVE Telegram bot (webhook + worker)
│   ├── telegram/          # legacy shim — keep for BotFather URL compat
│   ├── info/              # Info Portal API (write-gated since v10.6.1)
│   └── analytics/         # view tracking + popular-articles
components/
├── admin/                 # admin UI (~30 components)
├── info/                  # info portal + market watch UI
├── feedback/              # bug-reporting widget
└── …                      # public site components (Header, Hero, Ad*, …)
lib/
├── pg-*.ts                # PostgreSQL adapter (the supabase-compat layer)
├── data.ts                # frontend data loader
├── admin-auth.ts          # password auth + RBAC
├── api-rate-limiter.ts    # in-memory rate limit
├── markdown.ts            # marked + DOMPurify pipeline
├── telegram-simple/       # active bot lib
├── info/                  # info-portal lib (data, feed-fetcher, watch-search)
└── utils/                 # html-sanitizer, url-guard, content-formatter, …
supabase/
├── init/001_schema.sql    # consolidated schema for fresh installs
└── migrations/            # incremental DB migrations
```

---

## 🔁 npm Scripts

```bash
npm run dev               # Next.js dev server
npm run build             # production build (validates types + bundles)
npm run start             # production server
npm run type-check        # TypeScript only (fast)
npm run lint              # ESLint (next/core-web-vitals)
npm test                  # Vitest run-once (64 unit tests)
npm run test:watch        # Vitest watch mode
npm run ad:live-debug     # live ad scanner against prod
npm run sanitize-published:dry  # dry-run cleanup of stale articles
npm run clean-problematic:dry   # dry-run problematic-article scan
```

---

## 🚢 Deployment

**Active VPS:** `178.104.223.93` (`ubuntu-16gb-fsn1-1`, Hetzner Falkenstein) — migrated from VPS#1 (`46.225.11.249`) on 2026-04-22. VPS#1 is no longer running icoffio.

```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 -o ServerAliveInterval=30 root@178.104.223.93 \
  "cd /root/projects/icoffio-front && \
   git fetch origin feature/info-portal && \
   git reset --hard origin/feature/info-portal && \
   docker compose -f docker-compose.vps.yml --env-file .env.production build && \
   docker compose -f docker-compose.vps.yml --env-file .env.production up -d"
```

⚠️ **Always pass `--env-file .env.production`** — `POSTGRES_PASSWORD` uses `${VAR:?msg}` syntax and the stack will refuse to start without it (intentional, since v10.6.1).

⚠️ **`.env.production` is gitignored** as of v10.6.3. Real prod secrets live on the VPS only. After a fresh `git clone` on the VPS, restore `.env.production` from a backup like `/root/projects/icoffio-front.predeploy-*` or rebuild from `.env.example`.

### Apply DB migrations
```bash
docker exec -i icoffio-postgres psql -U icoffio -d icoffio -v ON_ERROR_STOP=1 \
  < supabase/migrations/<NEW-MIGRATION>.sql
```

---

## ✅ Post-deploy smoke tests

```bash
# Public health
curl -sI https://web.icoffio.com/en           # → HTTP/2 200
curl -sI https://web.icoffio.com/api/health   # → HTTP/2 200

# Auth gate on info-portal writes
curl -sw '%{http_code}\n' -o /dev/null -X POST \
  -H 'Content-Type: application/json' -d '{}' \
  https://web.icoffio.com/api/info/cleanup    # → 401

# Brute-force protection (6th attempt should be 429)
for i in 1 2 3 4 5 6; do
  curl -sw "attempt $i: %{http_code}\n" -o /dev/null -X POST \
    -H 'Content-Type: application/json' \
    -d '{"action":"password_login","password":"wrong"}' \
    https://web.icoffio.com/api/admin/auth
done
```

---

## 🛡 Security baseline (v10.7.0)

- Rate-limit on `/api/admin/auth` → 5 attempts / 15 min per IP
- All `/api/info/**` mutating endpoints require `editor` role
- HTML sanitization via `isomorphic-dompurify` before render
- SSRF guard (`lib/utils/url-guard.ts`) on user-supplied URLs (parse-url, fetch-feeds)
- AI-burning endpoints (`watch/{analyze,report,translate}`) admin-only
- Cookie consent gate on Analytics + Article view tracker (GDPR)
- ⚠️ Deferred (per project decision): CSRF strict, server-side session validation, magic-bytes upload check

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md).

Core conventions:
- Bump `version` in `package.json` before deploy
- Add CHANGELOG entry following the existing format (`### ✅ Fixed`, `### 🧪 Validation`, etc.)
- Run `npm run type-check && npm test && npm run lint` before push
- No commits with `--no-verify`; no pushes that bypass CI

---

## 📝 License

Private project. All rights reserved.
