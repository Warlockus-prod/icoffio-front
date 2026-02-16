# Domain Outage Runbook (icoffio.com / app.icoffio.com)

## Purpose
This runbook is for incidents when one hostname is down (most commonly `app.icoffio.com`) while deployments are still `Ready` in Vercel.

## Quick Diagnosis (2-3 min)
Run:

```bash
./scripts/check-prod-health.sh
```

Expected:
- `https://app.icoffio.com/pl` should return `200` (primary domain).
- `https://www.icoffio.com/pl` should also return `200` (standby fallback).
- `https://icoffio.com/pl` is legacy/non-canonical and may not serve the Next.js frontend.

If only `app.icoffio.com` fails, this is usually a host/domain edge issue (DNS/TLS/mitigation), not a Next.js code crash.

## Vercel Checks
Run:

```bash
vercel inspect app.icoffio.com
vercel alias ls
vercel domains inspect app.icoffio.com
```

Verify:
- deployment status is `Ready`
- alias `app.icoffio.com` points to current production deployment
- domain is attached to project

## DNS Checks
Run:

```bash
dig +short app.icoffio.com CNAME
dig +short www.icoffio.com CNAME
```

Current stable pattern:
- `www.icoffio.com` uses dedicated Vercel CNAME (for example `...vercel-dns-017.com`)
- `app.icoffio.com` historically used generic `cname.vercel-dns.com` (more fragile)

If `app` is unstable, update DNS at provider (`ns1.metroweb.pl` / `ns2.metroweb.pl`) to the dedicated CNAME recommended by Vercel for this domain.

## Recovery Actions
1. Re-issue cert:
```bash
vercel certs issue app.icoffio.com
```
2. Re-check alias:
```bash
vercel alias ls
```
3. If `app` is failing, switch traffic temporarily to fallback:
- `https://www.icoffio.com`
4. After `app` recovers, keep generated/public links on:
- `https://app.icoffio.com`

## Hardening Already Implemented
Release `8.6.44` includes:
- centralized site URL helper (`/lib/site-url.ts`)
- removal of mixed hardcoded hosts in publish/data/queue/image/telegram critical paths
- article URLs/revalidate/sitemap now use centralized site base URL helper

This prevents article publication and internal API flows from depending on the `app` subdomain health.

## Post-Incident Checklist
1. Run `./scripts/check-prod-health.sh` and save output.
2. Confirm publishing works from admin panel.
3. Open one new EN and PL article URL and verify image/thumbnail.
4. Record incident in `CHANGELOG.md` with root cause and mitigation.
