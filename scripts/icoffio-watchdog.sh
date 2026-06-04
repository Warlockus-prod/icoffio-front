#!/usr/bin/env bash
#
# icoffio-watchdog.sh (v10.20.0)
#
# Self-healing watchdog for the icoffio production site.
# Runs every minute via /etc/cron.d/icoffio-watchdog.
#
# What it does:
#   1. Pings the public health endpoint.
#   2. After FAIL_THRESHOLD consecutive failures (default 3 min of downtime),
#      restarts the app container — this covers the case Docker's restart policy
#      does NOT: a hung-but-alive process (memory leak / blocked event loop) that
#      the healthcheck marks "unhealthy" but Docker never auto-restarts.
#   3. Sends a Telegram alert (via the existing bot) on down / restart / recovery.
#   4. Cooldown prevents restart-flapping when the problem is NOT the container
#      (e.g. nginx/host down) — alerts once, then waits for manual intervention.
#
# Idempotent + stateless across reboots (state in /var/lib/icoffio-watchdog).

set -uo pipefail

URL="https://web.icoffio.com/api/health"
PROJECT_DIR="/root/projects/icoffio-front"
ENV_FILE="${PROJECT_DIR}/.env.production"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.vps.yml"
SERVICE="icoffio-front"

STATE_DIR="/var/lib/icoffio-watchdog"
FAIL_FILE="${STATE_DIR}/consecutive_fails"
DOWN_FILE="${STATE_DIR}/is_down"            # marker: we've already alerted about current outage
LAST_RESTART_FILE="${STATE_DIR}/last_restart"

FAIL_THRESHOLD=2        # consecutive failures before restarting (runs every 15 min → ~30 min max downtime)
RESTART_COOLDOWN=1800   # seconds: don't restart more than once per 30 min
CURL_TIMEOUT=15

mkdir -p "${STATE_DIR}"

# --- Telegram credentials (read from prod env; silently skip if absent) ---
# tr strips both double and single quotes that may wrap the env value
TG_TOKEN="$(grep -E '^TELEGRAM_BOT_TOKEN=' "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'")"
TG_CHAT="$(grep -E '^TELEGRAM_CHAT_ID=' "${ENV_FILE}" 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'")"

notify() {
  local msg="$1"
  [ -z "${TG_TOKEN}" ] && return 0
  [ -z "${TG_CHAT}" ] && return 0
  curl -s --max-time 10 \
    "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    -d "chat_id=${TG_CHAT}" \
    -d "parse_mode=HTML" \
    -d "disable_web_page_preview=true" \
    --data-urlencode "text=${msg}" >/dev/null 2>&1 || true
}

# --- Probe ---
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time "${CURL_TIMEOUT}" "${URL}" 2>/dev/null || echo 000)"

if [ "${code}" = "200" ]; then
  # Healthy. Announce recovery if we were previously down.
  if [ -f "${DOWN_FILE}" ]; then
    notify "✅ <b>icoffio</b> снова работает (HTTP 200)."
    rm -f "${DOWN_FILE}"
  fi
  echo 0 > "${FAIL_FILE}"
  # v10.20.6: hourly heartbeat so the log proves the watchdog is alive (it is
  # otherwise silent on success). Writes at most once per hour (minute < 15 with
  # the */15 cron means the top-of-hour run).
  if [ "$(date +%M)" -lt 15 ]; then
    echo "[$(date -u +%FT%TZ)] heartbeat: healthy (HTTP 200)" >> "${HEARTBEAT_LOG:-/var/log/icoffio-watchdog.log}"
  fi
  exit 0
fi

# --- Failure path ---
fails=$(( $(cat "${FAIL_FILE}" 2>/dev/null || echo 0) + 1 ))
echo "${fails}" > "${FAIL_FILE}"

# Not enough consecutive failures yet — could be a transient blip. Wait.
if [ "${fails}" -lt "${FAIL_THRESHOLD}" ]; then
  exit 0
fi

now="$(date +%s)"
last="$(cat "${LAST_RESTART_FILE}" 2>/dev/null || echo 0)"

# Cooldown: we already restarted recently and it's STILL down → not a container
# problem. Alert once, then leave it for a human (avoid restart-flapping).
if [ $(( now - last )) -lt "${RESTART_COOLDOWN}" ]; then
  if [ ! -f "${DOWN_FILE}" ]; then
    notify "🔴 <b>icoffio</b> по-прежнему down (HTTP ${code}) после авто-перезапуска. Нужно ручное вмешательство — проверь VPS/nginx."
    touch "${DOWN_FILE}"
  fi
  exit 0
fi

# --- Restart the container ---
notify "⚠️ <b>icoffio</b> не отвечает (HTTP ${code}, ${fails} мин подряд). Перезапускаю контейнер…"
touch "${DOWN_FILE}"
echo "${now}" > "${LAST_RESTART_FILE}"

cd "${PROJECT_DIR}" || exit 1
if ! docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" restart "${SERVICE}" >/dev/null 2>&1; then
  # restart failed (e.g. container removed) — try to bring the stack up
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d >/dev/null 2>&1 || true
fi

# Reset the counter so the next tick re-evaluates from scratch.
echo 0 > "${FAIL_FILE}"
exit 0
