# VPS Migration Runbook (icoffio)

Updated: 2026-02-16

## Goal
Stabilize production, remove WordPress runtime dependency, then migrate from Vercel to VPS with minimal downtime.

## Phase 1: Stabilization (Done)
- [x] Remove WordPress runtime dependency in category flow.
- [x] Remove large mock fallback pages in production paths.
- [x] Use `AdManager` lifecycle flow instead of inline global ad script injection.
- [x] Mark `GET /api/activity-log/stats` as dynamic to avoid static-build conflicts.
- [x] Verify build/tests/type-check.

Verification commands:
```bash
npm run type-check
npm test
npm run build
```

## Phase 2: WordPress Cleanup (Done)
- [x] Dry-run cleanup scan.
- [x] Delete problematic articles via API.
- [x] Re-run dry-run to confirm clean state.

Commands used:
```bash
node scripts/clean-wordpress-via-api.js --dry-run
node scripts/clean-wordpress-via-api.js --confirm
node scripts/clean-wordpress-via-api.js --dry-run
```

## Phase 3: Pre-Migration Hardening (Next)
- [ ] Freeze schema/critical env vars (`Supabase`, `OpenAI`, `Telegram`, ads).
- [ ] Add production healthchecks (`/api/check-url`, homepage, article page).
- [ ] Enable log shipping/rotation strategy for VPS.
- [ ] Ensure DNS TTL is reduced (e.g. 60-120s) 24h before cutover.

## Phase 4: VPS Deployment (Next)
- [ ] Provision Ubuntu 24.04 server.
- [ ] Install Node 20+, Nginx, PM2 (or systemd), certbot.
- [ ] Deploy app with `npm ci && npm run build && npm run start`.
- [ ] Configure reverse proxy (`443 -> app port`), gzip/brotli, timeouts.
- [ ] Configure firewall/rate-limit (`ufw`, `fail2ban`, Nginx limits).
- [ ] Put Cloudflare in front (WAF + bot protection + caching).

## Phase 5: Cutover (Next)
- [ ] Smoke test VPS by direct host.
- [ ] Switch `icoffio.com`, `www.icoffio.com`, `app.icoffio.com` DNS to VPS.
- [ ] Monitor 24-72h (latency, 5xx, CPU/RAM).
- [ ] Keep Vercel as fallback until stable window is complete.

## Rollback Plan
- Keep current Vercel deployment and domains ready.
- If VPS error rate spikes, point DNS back to Vercel immediately.
- Re-run smoke tests and compare logs before second cutover.

## Notes
- WordPress can remain only as archival/source backend during transition, but production runtime must not depend on it.
- Perform load test before final DNS switch.
