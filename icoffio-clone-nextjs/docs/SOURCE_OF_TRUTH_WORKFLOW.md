# Source Of Truth Workflow

## Why this exists
The repository has two app trees:
- root app (`/app`, `/components`, `/lib`, ...)
- clone app (`/icoffio-clone-nextjs/...`)

To reduce accidental drift for critical production paths, we enforce a mirror check.

## Canonical source
For mirrored files, canonical source is:
- `/icoffio-clone-nextjs/<path>`

Mirrored targets are:
- `/<path>`

The file list is defined in:
- `/sync-manifest.json`

Current scope includes:
- admin parsing/generation/publishing API routes
- admin URL parser UI + image selection + article editor
- key article ingestion routes and content formatting utilities

## Commands
- Check drift:
  - `npm run sync:check`
- Apply mirror updates from clone to root:
  - `npm run sync:apply`

## CI behavior
GitHub CI runs `sync:check` before install/build.
If drift is detected in manifest paths, CI fails with a list of out-of-sync files.

## Release recommendation
Before release:
1. `npm run sync:check`
2. `npm run build` in `icoffio-clone-nextjs`
3. `npm run build` in root
4. update version + changelog
5. push + deploy

Supporting docs:
- `/docs/TECH_DEBT_BACKLOG.md`
- `/docs/CONSOLIDATION_STAGE2_PLAN.md`
