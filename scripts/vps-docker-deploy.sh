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

# shellcheck disable=SC1091
source .env.production

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "Missing required variable in .env.production: TELEGRAM_BOT_TOKEN"
  exit 1
fi

if [[ -z "${TELEGRAM_SECRET_TOKEN:-}" && -z "${TELEGRAM_BOT_SECRET:-}" ]]; then
  echo "Missing webhook secret in .env.production."
  echo "Set TELEGRAM_SECRET_TOKEN or TELEGRAM_BOT_SECRET."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" && -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "Missing database configuration in .env.production."
  echo "Set either DATABASE_URL or POSTGRES_PASSWORD (for docker-compose fallback URL)."
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
health_urls=(
  "http://172.17.0.1:4200/api/health"
  "http://127.0.0.1:4200/api/health"
)

health_ok=0
for attempt in $(seq 1 30); do
  for url in "${health_urls[@]}"; do
    if curl -fsS "${url}" >/dev/null 2>&1; then
      curl -fsS "${url}" && echo
      health_ok=1
      break 2
    fi
  done
  sleep 2
done

if [[ "${health_ok}" -ne 1 ]]; then
  echo "Health check failed after 60s on both 172.17.0.1:4200 and 127.0.0.1:4200"
  exit 1
fi

echo "Done."
