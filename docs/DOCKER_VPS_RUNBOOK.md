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

