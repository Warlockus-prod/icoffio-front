# Source Of Truth Workflow

Last updated: 2026-02-15  
Status: active

## Canonical source
The repository uses a single app tree in project root:
- `/app`
- `/components`
- `/lib`
- `/styles`

`/icoffio-clone-nextjs` and mirror sync tooling were retired to eliminate drift risk.

## CI behavior
GitHub CI validates the root project directly:
1. `npm ci`
2. `npm run type-check`
3. `npm test`
4. `npm run build`

## Release recommendation
Before release:
1. `npm run type-check`
2. `npm test`
3. `npm run build`
4. update version + changelog
5. push + deploy

Supporting docs:
- `/docs/TECH_DEBT_BACKLOG.md`
