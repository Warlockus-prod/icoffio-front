# Consolidation Stage 2 Plan

Last updated: 2026-02-15
Status: completed

## Goal
Reduce operational risk from duplicated app trees by converging to one effective source path.

## Outcome
- Single source of truth is repository root.
- Mirror tooling and manifest (`sync-mirror`, `sync-manifest.json`) are removed.
- CI now runs against root only.
- Vercel Root Directory is expected to be repository root.

## Post-cutover checks
1. `npm run type-check`
2. `npm test`
3. `npm run build`
4. Deploy from root and verify Telegram webhook + ad rendering smoke checks.
