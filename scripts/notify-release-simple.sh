#!/bin/bash

###############################################################################
# SIMPLE TELEGRAM RELEASE NOTIFICATION
# 
# Sends a SHORT release notification to Telegram
# 
# Usage:
#   ./scripts/notify-release-simple.sh
#   
# Automatically extracts version from package.json
# Sends to your personal chat (TELEGRAM_CHAT_ID)
#
# Prerequisites:
#   - TELEGRAM_BOT_TOKEN environment variable
#   - TELEGRAM_CHAT_ID environment variable (your chat ID with bot)
###############################################################################

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Sending Release Notification...${NC}"

# Check env vars
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo -e "${RED}❌ TELEGRAM_BOT_TOKEN not set${NC}"
  exit 1
fi

if [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo -e "${RED}❌ TELEGRAM_CHAT_ID not set${NC}"
  echo "Get your chat ID: send /start to bot, then check with getUpdates API"
  exit 1
fi

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Extract FIRST LINE of release notes (title)
TITLE=$(grep -A 1 "## \[${VERSION}\]" CHANGELOG.md | tail -n 1)

# Extract key features (first 5 bullet points after "Added" or "✨")
FEATURES=$(awk "/## \[${VERSION}\]/,/^## \[/" CHANGELOG.md | \
  grep -E "^-|^[0-9]+\." | head -n 5 | \
  sed 's/^- /• /g' | sed 's/^[0-9]*\. /• /g')

# Build SHORT message
MESSAGE="🚀 <b>icoffio v${VERSION}</b>

${TITLE}

<b>Key Features:</b>
${FEATURES}

🌐 <a href=\"https://app.icoffio.com\">app.icoffio.com</a> | 📝 <a href=\"https://github.com/Warlockus-prod/icoffio-front/releases/tag/v${VERSION}\">Release Notes</a>"

# Send
API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${TELEGRAM_CHAT_ID}\",
    \"text\": $(echo "$MESSAGE" | jq -Rs .),
    \"parse_mode\": \"HTML\",
    \"disable_web_page_preview\": false
  }" > /dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Notification sent to Telegram!${NC}"
  echo "Version: v${VERSION}"
  echo "Chat ID: ${TELEGRAM_CHAT_ID}"
else
  echo -e "${RED}❌ Failed to send${NC}"
  exit 1
fi

