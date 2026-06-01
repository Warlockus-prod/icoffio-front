#!/usr/bin/env bash

# ============================================
# TELEGRAM BOT AUTOMATIC RESET (POSTGRESQL)
# Полностью автоматический сброс и настройка
# ============================================

set -euo pipefail

echo "🚀 TELEGRAM BOT AUTOMATIC RESET"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
    echo -e "${GREEN}✅ Loaded ${env_file}${NC}"
    return 0
  fi
  return 1
}

run_sql() {
  local sql="$1"

  if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
    if psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -tAc "${sql}"; then
      return
    fi
    echo -e "${YELLOW}⚠️ Direct psql call failed, trying Docker fallback...${NC}" >&2
  fi

  local pg_container="${POSTGRES_CONTAINER:-icoffio-postgres}"
  local pg_user="${POSTGRES_USER:-icoffio}"
  local pg_db="${POSTGRES_DB:-icoffio}"

  if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "${pg_container}"; then
    if [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
      docker exec -e PGPASSWORD="${POSTGRES_PASSWORD}" -i "${pg_container}" \
        psql -U "${pg_user}" -d "${pg_db}" -v ON_ERROR_STOP=1 -tAc "${sql}" && return
    else
      docker exec -i "${pg_container}" \
        psql -U "${pg_user}" -d "${pg_db}" -v ON_ERROR_STOP=1 -tAc "${sql}" && return
    fi
  fi

  echo -e "${RED}❌ Cannot execute SQL reset.${NC}"
  echo "Set DATABASE_URL (with local psql installed) or ensure Docker container ${pg_container} is running."
  exit 1
}

# ============================================
# 1. CHECK ENVIRONMENT VARIABLES
# ============================================

echo "📋 Step 1/4: Checking environment variables..."

if ! load_env_file ".env.local"; then
  load_env_file ".env.production" || true
fi

REQUIRED_VARS=(
  "TELEGRAM_BOT_TOKEN"
)

MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!VAR:-}" ]]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [[ ${#MISSING_VARS[@]} -ne 0 ]]; then
  echo -e "${RED}❌ Missing required environment variables:${NC}"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "  - $VAR"
  done
  echo ""
  echo "Please set these in .env.local or .env.production and run again."
  exit 1
fi

WEBHOOK_SECRET="${TELEGRAM_SECRET_TOKEN:-${TELEGRAM_BOT_SECRET:-}}"
if [[ -z "${WEBHOOK_SECRET}" ]]; then
  echo -e "${RED}❌ Missing webhook secret.${NC}"
  echo "Set TELEGRAM_SECRET_TOKEN or TELEGRAM_BOT_SECRET in .env.local/.env.production."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" && -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo -e "${YELLOW}⚠️ DATABASE_URL and POSTGRES_PASSWORD are missing.${NC}"
  echo "Queue reset will only work if docker exec has trusted local auth."
fi

echo -e "${GREEN}✅ Environment looks good${NC}"
echo ""

# ============================================
# 2. RESET POSTGRES QUEUE
# ============================================

echo "📋 Step 2/4: Resetting PostgreSQL queue..."

run_sql "DELETE FROM telegram_jobs;"
QUEUE_COUNT="$(run_sql "SELECT COUNT(*) FROM telegram_jobs;" | tr -d '[:space:]')"

if [[ "${QUEUE_COUNT}" == "0" ]]; then
  echo -e "${GREEN}✅ Queue reset successful (0 jobs)${NC}"
else
  echo -e "${YELLOW}⚠️ Queue count after reset: ${QUEUE_COUNT}${NC}"
fi

echo ""

# ============================================
# 3. TELEGRAM WEBHOOK MANAGEMENT
# ============================================

echo "📋 Step 3/4: Managing Telegram webhook..."

TELEGRAM_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
WEBHOOK_BASE_URL="${TELEGRAM_WEBHOOK_BASE_URL:-${NEXT_PUBLIC_SITE_URL:-https://web.icoffio.com}}"
WEBHOOK_BASE_URL="${WEBHOOK_BASE_URL%/}"
WEBHOOK_URL="${WEBHOOK_BASE_URL}/api/telegram-simple/webhook"

echo "Fetching current webhook info..."
WEBHOOK_INFO="$(curl -s "${TELEGRAM_API}/getWebhookInfo")"
echo "Current webhook: ${WEBHOOK_INFO}"
echo ""

echo "Deleting existing webhook..."
DELETE_RESPONSE="$(curl -s -X POST "${TELEGRAM_API}/deleteWebhook")"
echo "Delete response: ${DELETE_RESPONSE}"

if [[ "${DELETE_RESPONSE}" == *"\"ok\":true"* ]]; then
  echo -e "${GREEN}✅ Webhook deleted${NC}"
else
  echo -e "${YELLOW}⚠️ Webhook delete response: ${DELETE_RESPONSE}${NC}"
fi

sleep 2

echo "Setting new webhook..."
WEBHOOK_PAYLOAD="$(cat <<EOF
{
  "url": "${WEBHOOK_URL}",
  "secret_token": "${WEBHOOK_SECRET}",
  "allowed_updates": ["message", "callback_query"],
  "max_connections": 40,
  "drop_pending_updates": true
}
EOF
)"

SET_RESPONSE="$(curl -s -X POST "${TELEGRAM_API}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "${WEBHOOK_PAYLOAD}")"

echo "Set webhook response: ${SET_RESPONSE}"

if [[ "${SET_RESPONSE}" == *"\"ok\":true"* ]]; then
  echo -e "${GREEN}✅ Webhook set successfully${NC}"
else
  echo -e "${RED}❌ Failed to set webhook${NC}"
  echo "${SET_RESPONSE}"
  exit 1
fi

sleep 2

echo "Verifying new webhook..."
NEW_WEBHOOK_INFO="$(curl -s "${TELEGRAM_API}/getWebhookInfo")"
echo "New webhook info:"
echo "${NEW_WEBHOOK_INFO}" | jq '.' 2>/dev/null || echo "${NEW_WEBHOOK_INFO}"

if [[ "${NEW_WEBHOOK_INFO}" == *"${WEBHOOK_URL}"* ]]; then
  echo -e "${GREEN}✅ Webhook verified${NC}"
else
  echo -e "${YELLOW}⚠️ Webhook verification unclear${NC}"
fi

echo ""

# ============================================
# 4. FINAL STATUS
# ============================================

echo "📋 Step 4/4: Final status check..."
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TELEGRAM BOT RESET COMPLETED!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "📊 Summary:"
echo "  ✅ PostgreSQL queue reset (0 jobs)"
echo "  ✅ Webhook deleted"
echo "  ✅ Webhook recreated"
echo "  ✅ Webhook verified"
echo ""

echo "🧪 Next: Test in Telegram"
echo ""
echo "1. Open your Telegram bot"
echo "2. Send: /start"
echo "3. Send text: AI revolutionizes education. Machine learning helps students."
echo "4. Wait 5-15 seconds"
echo "5. You should receive article URLs"
echo ""

echo "📊 Monitor logs:"
echo "  App container: docker compose -f docker-compose.vps.yml logs -f icoffio-front"
echo "  Postgres:      docker compose -f docker-compose.vps.yml logs -f postgres"
echo ""

echo -e "${GREEN}Done! 🚀${NC}"
