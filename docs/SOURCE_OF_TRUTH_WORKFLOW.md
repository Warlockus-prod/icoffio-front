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
