#!/bin/bash

###############################################################################
# TELEGRAM RELEASE NOTIFICATION SCRIPT
# 
# Sends a release notification to Telegram bot/channel
# 
# Usage:
#   ./scripts/notify-release.sh <version> <chat_id>
#   
# Example:
#   ./scripts/notify-release.sh "7.5.0" "YOUR_CHAT_ID"
#
# Prerequisites:
#   - TELEGRAM_BOT_TOKEN environment variable must be set
#   - Chat ID (your personal chat with bot or channel ID)
###############################################################################

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERSION=$1
CHAT_ID=$2

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  TELEGRAM RELEASE NOTIFICATION${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Validation
if [ -z "$VERSION" ]; then
  echo -e "${RED}❌ Error: Version not provided${NC}"
  echo "Usage: ./scripts/notify-release.sh <version> <chat_id>"
  echo "Example: ./scripts/notify-release.sh \"7.5.0\" \"123456789\""
  exit 1
fi

if [ -z "$CHAT_ID" ]; then
  echo -e "${RED}❌ Error: Chat ID not provided${NC}"
  echo "Usage: ./scripts/notify-release.sh <version> <chat_id>"
  echo "Example: ./scripts/notify-release.sh \"7.5.0\" \"123456789\""
  exit 1
fi

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo -e "${RED}❌ Error: TELEGRAM_BOT_TOKEN environment variable is not set${NC}"
  echo ""
  echo "Please set it first:"
  echo "  export TELEGRAM_BOT_TOKEN='your_token_here'"
  echo ""
  exit 1
fi

# Read release notes from CHANGELOG
echo -e "${BLUE}📖 Reading release notes from CHANGELOG.md...${NC}"

# Extract release notes for this version
RELEASE_NOTES=$(awk "/## \[${VERSION}\]/,/^## \[/" CHANGELOG.md | sed '1d;$d' | head -n 50)

if [ -z "$RELEASE_NOTES" ]; then
  echo -e "${YELLOW}⚠️  Warning: No release notes found for version ${VERSION}${NC}"
  RELEASE_NOTES="No detailed release notes available."
fi

# Build message
MESSAGE="🚀 <b>icoffio v${VERSION} Released!</b>

<b>What's New:</b>
${RELEASE_NOTES}

<b>Links:</b>
🌐 Live Site: https://app.icoffio.com
📝 Full Changelog: https://github.com/Warlockus-prod/icoffio-front/releases/tag/v${VERSION}
💻 Commit: https://github.com/Warlockus-prod/icoffio-front/commit/\$(git rev-parse HEAD)

<i>Deployed to Vercel automatically</i> ✅"

# Truncate if too long (Telegram limit: 4096 chars)
if [ ${#MESSAGE} -gt 4000 ]; then
  MESSAGE="${MESSAGE:0:3900}

... <i>(truncated, see full changelog)</i>"
fi

# Send to Telegram
echo -e "${BLUE}📤 Sending notification to Telegram...${NC}"
echo ""

API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${CHAT_ID}\",
    \"text\": $(echo "$MESSAGE" | jq -Rs .),
    \"parse_mode\": \"HTML\",
    \"disable_web_page_preview\": true
  }")

# Check response
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ Notification sent successfully!${NC}"
  echo ""
  echo -e "${GREEN}Message sent to chat: ${CHAT_ID}${NC}"
else
  echo -e "${RED}❌ Failed to send notification${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ RELEASE NOTIFICATION SENT!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""





