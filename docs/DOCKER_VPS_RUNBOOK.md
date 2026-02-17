# VPS Docker Runbook (icoffio-front)

## Goal

Move `icoffio-front` from PM2 host process to Docker container on the same VPS.

Architecture after switch:
- `Internet -> Docker nginx (443/80) -> 127.0.0.1:4200 -> Docker container icoffio-front-app`

## Files

- `Dockerfile`
- `docker-compose.vps.yml`
- `app/api/health/route.ts`
- `scripts/vps-docker-deploy.sh`

## One-time switch on VPS

Run inside `/root/projects/icoffio-front`:

```bash
git fetch origin
git checkout <branch-with-docker-changes>
git pull --ff-only origin <branch-with-docker-changes>

chmod +x scripts/vps-docker-deploy.sh
./scripts/vps-docker-deploy.sh
```

## Required env for new admin auth (v8.7.3+)

Set in `.env.production` (or your VPS env source):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_BOOTSTRAP_EMAILS=owner@icoffio.com
```

Notes:
- `ADMIN_BOOTSTRAP_EMAILS` is optional but recommended.
- If it is missing and `admin_user_roles` is empty, the first authenticated email can bootstrap as `admin`.

## Required Supabase migration (v8.7.3+)

Run SQL migration:

```sql
supabase/migrations/20260217_admin_roles_and_access.sql
```

Without this migration, admin login/roles endpoints return an explicit error about missing table `admin_user_roles`.

## Validation

```bash
docker compose -f docker-compose.vps.yml ps
curl -I http://127.0.0.1:4200/en
curl -s http://127.0.0.1:4200/api/health
```

Public check:
- `https://web.icoffio.com/en`
- `https://web.icoffio.com/pl`

## Logs & Monitoring

Single stream:

```bash
docker compose -f docker-compose.vps.yml logs -f icoffio-front
```

Persistent app-level server logs (for Admin -> System Logs tab) are stored on host:

```bash
ls -la runtime-logs/
tail -n 100 runtime-logs/system-events.ndjson
```

Container health:

```bash
docker inspect --format='{{json .State.Health}}' icoffio-front-app
```

## Rollback

If required:

```bash
docker compose -f docker-compose.vps.yml down
pm2 start ecosystem.config.js
pm2 save
```
