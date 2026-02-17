# Security Best Practices Report

Date: 2026-02-17
Scope: Next.js API routes and dependency posture for `/Users/Andrey/App/icoffio-front`

## Executive Summary
This review found multiple high-risk API endpoints that were previously accessible without strict authentication in production. The most critical risks (webhook spoofing, queue triggering, and cost-abuse endpoints) were hardened in code during this pass. Remaining risk is primarily dependency-level (Next.js 14 line and transitive packages flagged by `npm audit`) and infrastructure hardening continuity on VPS.

---

## Critical / High Findings

### SEC-001 (High) - Telegram webhook could accept requests without secret in production
- Location: `/Users/Andrey/App/icoffio-front/app/api/telegram-simple/webhook/route.ts:354`
- Evidence: `verifyTelegramRequest` now shows prior fail-open path replaced by production fail-closed behavior.
- Impact: Attackers could forge webhook calls and enqueue arbitrary processing/messages.
- Fix applied: production now returns error when webhook secret is missing and rejects invalid tokens (`401/503`).
- Status: Fixed.

### SEC-002 (High) - Telegram worker endpoint had fail-open auth logic when no secret configured
- Location: `/Users/Andrey/App/icoffio-front/app/api/telegram-simple/worker/route.ts:32`
- Evidence: worker authorization now enforces secret in production and returns `503` if misconfigured.
- Impact: Unauthorized execution of queue worker could trigger heavy background processing.
- Fix applied: strict auth gate (`Bearer` or `token`) with production fail-closed.
- Status: Fixed.

### SEC-003 (High) - URL check endpoint could be abused for SSRF probing
- Location: `/Users/Andrey/App/icoffio-front/app/api/check-url/route.ts:44`
- Evidence: endpoint now requires admin role and blocks private/internal hostnames/IP ranges.
- Impact: Could probe internal metadata/local services and map private network.
- Fix applied: RBAC (`viewer+`) + blocked target checks + manual redirect handling.
- Status: Fixed (basic SSRF mitigation).

### SEC-004 (High) - Deprecated generate endpoint allowed unauthenticated content generation
- Location: `/Users/Andrey/App/icoffio-front/app/api/generate-article/route.ts:6`
- Evidence: endpoint now requires admin role.
- Impact: Public abuse could burn OpenAI quota and create unauthorized content.
- Fix applied: RBAC (`editor` for POST, `viewer` for GET).
- Status: Fixed.

### SEC-005 (High) - Image options endpoint allowed unauthenticated expensive operations
- Location: `/Users/Andrey/App/icoffio-front/app/api/articles/image-options/route.ts:15`
- Evidence: endpoint now checks admin role before generation.
- Impact: Abuse could consume AI/image API budgets and degrade service.
- Fix applied: RBAC (`editor` POST, `viewer` GET).
- Status: Fixed.

### SEC-006 (High) - Legacy telegram queue processor had no authentication
- Location: `/Users/Andrey/App/icoffio-front/app/api/telegram/process-queue/route.ts:25`
- Evidence: endpoint now validates secret in header/query and fails closed in production when absent.
- Impact: Attackers could invoke queue handling and trigger outbound Telegram traffic.
- Fix applied: `authorizeQueueProcessor` with `TELEGRAM_QUEUE_SECRET` (fallback to worker/cron secret).
- Status: Fixed.

### SEC-007 (High) - Telegram create-from-telegram auth could be effectively bypassed when secret missing
- Location: `/Users/Andrey/App/icoffio-front/app/api/articles/route.ts:841`
- Evidence: `checkAuthentication` now rejects production requests if `N8N_WEBHOOK_SECRET` is missing.
- Impact: Unauthorized source could create content through API actions.
- Fix applied: production fail-closed + normalized Bearer parsing.
- Status: Fixed.

---

## Medium Findings

### SEC-008 (Medium) - Telegram analytics/error endpoints exposed operational data without RBAC
- Location: 
  - `/Users/Andrey/App/icoffio-front/app/api/telegram/stats/route.ts:21`
  - `/Users/Andrey/App/icoffio-front/app/api/telegram/errors/route.ts:23`
  - `/Users/Andrey/App/icoffio-front/app/api/telegram/user-stats/route.ts:16`
- Evidence: endpoints now require admin roles.
- Impact: Information disclosure (user activity, errors, metadata) to unauthenticated users.
- Fix applied: RBAC (`viewer` for read, `editor` for mutate).
- Status: Fixed.

---

## Remaining Open Risks

### SEC-009 (High) - Next.js version flagged by advisory range in `npm audit`
- Location: `/Users/Andrey/App/icoffio-front/package.json:31`
- Evidence: `next@^14.2.35`; audit reports known high-severity advisories affecting version range.
- Impact: Potential DoS vectors depending on runtime usage/patterns.
- Recommended action: plan controlled upgrade path to a patched supported line (at least latest patched Next 14/15/16 path validated against your app).
- Status: Open.

### SEC-010 (Medium) - Transitive dependency advisories (markdown-it / undici)
- Location: `/Users/Andrey/App/icoffio-front/package-lock.json` (transitive)
- Evidence: `npm audit --omit=dev` reports moderate advisories.
- Impact: Potential resource-exhaustion/ReDoS vectors under certain input conditions.
- Recommended action: run targeted dependency updates (`npm audit fix` in feature branch) and re-test parsing/rendering flows.
- Status: Open.

---

## Verification Performed
- `npm run type-check` passed.
- `npm run lint` could not run because Next.js requested first-time interactive ESLint setup (no `.eslintrc` configured in this environment).
- `npm audit --omit=dev` executed and findings captured above.

## Recommended Next Actions (Ordered)
1. Set/verify production secrets: `TELEGRAM_SECRET_TOKEN`, `TELEGRAM_WORKER_SECRET` (or `CRON_SECRET`), `TELEGRAM_QUEUE_SECRET`, `N8N_WEBHOOK_SECRET`.
2. Deploy this hardening patch to VPS and run smoke checks for Telegram/webhook/admin parsing flows.
3. Do dependency security update sprint (Next.js + transitive audit fixes) in a separate branch with regression testing.
4. Add non-interactive lint config and CI gate (`type-check`, lint, security smoke tests) to prevent regressions.
