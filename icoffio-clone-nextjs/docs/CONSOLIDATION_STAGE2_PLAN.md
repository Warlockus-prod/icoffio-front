# Consolidation Stage 2 Plan

Last updated: 2026-02-15
Status: planned

## Goal
Reduce operational risk from duplicated app trees (`/` and `/icoffio-clone-nextjs`) by converging to one effective source path.

## Non-goals
- No one-shot mass refactor in a single release.
- No destructive migration without build parity checks.

## Phase 2 scope
1. Expand mirror control from "critical set" to "admin + article pipeline set".
2. Eliminate silent drift with automated checks in CI and release checklist.
3. Prepare single-tree cutover strategy with rollback.

## Execution plan
1. Mirror expansion wave (low risk)
   - Add critical API/admin files to `sync-manifest.json`.
   - Run `npm run sync:apply` once, then keep `sync:check` green in CI.
   - Exit criteria:
     - Manifest covers key admin/article routes.
     - No recurring drift in two consecutive releases.

2. Ownership hardening (medium risk)
   - Declare canonical edit location per domain (admin routes, article routes, shared libs).
   - Add PR checklist item: "changed mirrored file? run sync check locally".
   - Exit criteria:
     - All PRs touching mirrored paths pass sync gate without manual firefighting.

3. Single-tree cutover prep (higher risk, staged)
   - Inventory non-mirrored diffs with behavior impact.
   - Migrate remaining live paths by domain (admin, article rendering, ads, analytics).
   - Validate each domain with build + smoke tests.
   - Exit criteria:
     - One tree becomes authoritative for runtime build.
     - Duplicate implementation paths are archived/deprecated.

## Risk controls
- Keep cutover incremental by domain, not by full repository.
- Keep rollback trivial: previous deployment + previous manifest.
- Require build parity (`root` and `icoffio-clone-nextjs`) before each production release.

## Deliverables for Stage 2 completion
- Updated `sync-manifest.json` with broad coverage.
- Closed/highly reduced drift incidents in release notes.
- "Single source build path" decision recorded in docs and CI.
