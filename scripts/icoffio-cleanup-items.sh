#!/bin/bash
# icoffio-cleanup-items — delete feed items older than the retention window.
#
# Runs daily via /etc/cron.d/icoffio-cleanup-items (v10.20.9).
# The /api/info/cleanup endpoint existed but nothing called it, so info_feed_items
# grew unbounded (183 MB / 143k rows before this was wired up). Retention is read
# from info_settings.retention_days (default 30).
set -e
ENV_FILE=/root/projects/icoffio-front/.env.production
LOG=/var/log/icoffio-cleanup-items.log
SECRET=$(grep "^INFO_FETCH_SECRET=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d "\"")
[ -z "$SECRET" ] && SECRET=$(grep "^CRON_SECRET=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d "\"")
[ -z "$SECRET" ] && { echo "[$(date -u +%FT%TZ)] no secret" >> "$LOG"; exit 1; }

RESP=$(curl -fsS --max-time 120 \
  -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
  -X POST "http://172.17.0.1:4200/api/info/cleanup" 2>&1 || echo "curl-failed")
echo "[$(date -u +%FT%TZ)] $RESP" >> "$LOG"
