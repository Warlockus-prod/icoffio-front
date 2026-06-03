#!/bin/bash
# icoffio-translate-items — auto-translate fresh news headlines (titles PL+EN, descriptions PL).
#
# Invoked HOURLY by /etc/cron.d/icoffio-translate-items.
#
# v10.20.2: throughput raised. The inflow of new feed items (~5k/day × 2 langs =
# ~10k translations needed) outpaced the old cadence (every 2h × 4 cycles ≈
# 4.8k/day), so even fresh (<7d) items accumulated a translation backlog.
# Now: hourly × 6 cycles ≈ 14k titles/day — covers inflow and chips the backlog.
# Each batch self-terminates early when totalScanned hits 0 (nothing left), so
# cost falls back to ~inflow once caught up.
set -e
ENV_FILE=/root/projects/icoffio-front/.env.production
LOG=/var/log/icoffio-translate-items.log
SECRET=$(grep "^INFO_FETCH_SECRET=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d "\"")
[ -z "$SECRET" ] && SECRET=$(grep "^CRON_SECRET=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d "\"")
[ -z "$SECRET" ] && { echo "[$(date -u +%FT%TZ)] no secret" >> "$LOG"; exit 1; }

call() {
  # args: target field limit
  curl -fsS --max-time 90 \
    -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
    -d "{\"target\":\"$1\",\"field\":\"$2\",\"days\":7,\"limit\":$3}" \
    "http://172.17.0.1:4200/api/admin/info/translate-items-batch" 2>&1 || echo "curl-failed"
}

# Titles: PL + EN (high value, cheap). 6 cycles each per run.
for target in pl en; do
  for i in 1 2 3 4 5 6; do
    RESP=$(call "$target" title 50)
    echo "[$(date -u +%FT%TZ)] title/$target #$i: $RESP" >> "$LOG"
    echo "$RESP" | grep -q "\"totalScanned\":0" && break
  done
done

# Descriptions: PL only (3x cost — keep modest), 3 cycles of 30.
for i in 1 2 3; do
  RESP=$(call pl description 30)
  echo "[$(date -u +%FT%TZ)] desc/pl #$i: $RESP" >> "$LOG"
  echo "$RESP" | grep -q "\"totalScanned\":0" && break
done
