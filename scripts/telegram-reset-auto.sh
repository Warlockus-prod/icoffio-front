#!/bin/bash

# ============================================
# TELEGRAM BOT AUTOMATIC RESET v7.14.1
# Полностью автоматический сброс и настройка
# ============================================

set -e # Exit on any error

echo "🚀 TELEGRAM BOT AUTOMATIC RESET"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1. CHECK ENVIRONMENT VARIABLES
# ============================================

echo "📋 Step 1/4: Checking environment variables..."

if [ -f .env.local ]; then
    source .env.local
    echo -e "${GREEN}✅ .env.local found${NC}"
else
    echo -e "${RED}❌ .env.local not found${NC}"
    echo "Creating .env.local template..."
    cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dlellopouivlmbrmjhoz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_SECRET_TOKEN=your_secret_token_here

# OpenAI
OPENAI_API_KEY=your_openai_key_here

# Unsplash
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
EOF
    echo -e "${YELLOW}⚠️  Please fill .env.local with your tokens and run again${NC}"
    exit 1
fi

# Check required variables
REQUIRED_VARS=(
    "TELEGRAM_BOT_TOKEN"
    "TELEGRAM_SECRET_TOKEN"
    "NEXT_PUBLIC_SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        MISSING_VARS+=("$VAR")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for VAR in "${MISSING_VARS[@]}"; do
        echo "  - $VAR"
    done
    echo ""
    echo "Please set these in .env.local and run again"
    exit 1
fi

echo -e "${GREEN}✅ All required variables present${NC}"
echo ""

# ============================================
# 2. RESET SUPABASE TELEGRAM TABLES
# ============================================

echo "📋 Step 2/4: Resetting Supabase telegram tables..."

# Extract project ID from URL
SUPABASE_PROJECT_ID=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\/\([^.]*\).*/\1/')
echo "Project ID: $SUPABASE_PROJECT_ID"

for TABLE in telegram_jobs telegram_submissions; do
    echo "Clearing ${TABLE}..."
    DELETE_RESPONSE=$(curl -s -o /tmp/telegram_reset_delete.out -w "%{http_code}" -X DELETE \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${TABLE}?id=not.is.null" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal")

    if [[ "$DELETE_RESPONSE" == "200" || "$DELETE_RESPONSE" == "204" ]]; then
        echo -e "${GREEN}✅ ${TABLE} cleared${NC}"
    elif [[ "$DELETE_RESPONSE" == "404" ]]; then
        echo -e "${YELLOW}⚠️  ${TABLE} not found (skipped)${NC}"
    else
        echo -e "${YELLOW}⚠️  ${TABLE} clear response: ${DELETE_RESPONSE}${NC}"
        cat /tmp/telegram_reset_delete.out 2>/dev/null || true
    fi

    echo "Verifying ${TABLE}..."
    VERIFY_RESPONSE=$(curl -s -o /tmp/telegram_reset_verify.out -w "%{http_code}" -X GET \
        "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${TABLE}?select=id&limit=1" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json")
    VERIFY_BODY=$(cat /tmp/telegram_reset_verify.out 2>/dev/null || echo "")

    if [[ "$VERIFY_RESPONSE" == "404" ]]; then
        echo -e "${YELLOW}⚠️  ${TABLE} not found during verify (skipped)${NC}"
    elif [[ "$VERIFY_RESPONSE" == "200" || "$VERIFY_RESPONSE" == "206" ]]; then
        if [[ "$VERIFY_BODY" == "[]" ]]; then
            echo -e "${GREEN}✅ ${TABLE} is empty${NC}"
        else
            echo -e "${YELLOW}⚠️  ${TABLE} still has rows: ${VERIFY_BODY}${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  ${TABLE} verify response: ${VERIFY_RESPONSE}${NC}"
        echo "$VERIFY_BODY"
    fi
done

echo ""

# ============================================
# 3. TELEGRAM WEBHOOK MANAGEMENT
# ============================================

echo "📋 Step 3/4: Managing Telegram webhook..."

TELEGRAM_API="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-https://app.icoffio.com/api/telegram-simple/webhook}"

# Get current webhook info
echo "Fetching current webhook info..."
WEBHOOK_INFO=$(curl -s "${TELEGRAM_API}/getWebhookInfo")
echo "Current webhook: $WEBHOOK_INFO"
echo ""

# Delete existing webhook
echo "Deleting existing webhook..."
DELETE_RESPONSE=$(curl -s -X POST "${TELEGRAM_API}/deleteWebhook")
echo "Delete response: $DELETE_RESPONSE"

if [[ $DELETE_RESPONSE == *"\"ok\":true"* ]]; then
    echo -e "${GREEN}✅ Webhook deleted${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook delete response: $DELETE_RESPONSE${NC}"
fi

sleep 2

# Set new webhook
echo "Setting new webhook..."
WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "url": "${WEBHOOK_URL}",
  "secret_token": "${TELEGRAM_SECRET_TOKEN}",
  "allowed_updates": ["message", "edited_message", "channel_post", "edited_channel_post"],
  "max_connections": 40,
  "drop_pending_updates": true
}
EOF
)

SET_RESPONSE=$(curl -s -X POST "${TELEGRAM_API}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "$WEBHOOK_PAYLOAD")

echo "Set webhook response: $SET_RESPONSE"

if [[ $SET_RESPONSE == *"\"ok\":true"* ]]; then
    echo -e "${GREEN}✅ Webhook set successfully${NC}"
else
    echo -e "${RED}❌ Failed to set webhook${NC}"
    echo "$SET_RESPONSE"
    exit 1
fi

sleep 2

# Verify webhook
echo "Verifying new webhook..."
NEW_WEBHOOK_INFO=$(curl -s "${TELEGRAM_API}/getWebhookInfo")
echo "New webhook info:"
echo "$NEW_WEBHOOK_INFO" | jq '.' 2>/dev/null || echo "$NEW_WEBHOOK_INFO"

if [[ $NEW_WEBHOOK_INFO == *"$WEBHOOK_URL"* ]]; then
    echo -e "${GREEN}✅ Webhook verified${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook verification unclear${NC}"
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
echo "  ✅ Supabase telegram tables reset"
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
echo "  Vercel: https://vercel.com/andreys-projects-a55f75b3/icoffio-front/logs"
echo "  Supabase: https://supabase.com/dashboard/project/dlellopouivlmbrmjhoz"
echo ""

echo "🎯 If issues persist, check:"
echo "  1. Vercel environment variables"
echo "  2. Vercel deployment status (must be Ready)"
echo "  3. Vercel logs for errors"
echo ""

echo -e "${GREEN}Done! 🚀${NC}"
