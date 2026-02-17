#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/vps-docker-deploy.sh
#
# Requirements:
# - run on VPS in repo root (/root/projects/icoffio-front)
# - .env.production must exist

if [[ ! -f "docker-compose.vps.yml" ]]; then
  echo "docker-compose.vps.yml not found. Run this script from repo root."
  exit 1
fi

if [[ ! -f ".env.production" ]]; then
  echo ".env.production not found."
  exit 1
fi

echo "Stopping PM2 process (if running)..."
pm2 delete icoffio-front >/dev/null 2>&1 || true

echo "Building and starting Docker service..."
docker compose -f docker-compose.vps.yml up -d --build

echo "Container status:"
docker compose -f docker-compose.vps.yml ps

echo "Recent logs:"
docker compose -f docker-compose.vps.yml logs --tail=80 icoffio-front

echo "Health check:"
curl -fsS http://127.0.0.1:4200/api/health && echo

echo "Done."

