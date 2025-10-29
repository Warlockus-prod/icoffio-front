#!/bin/bash

###############################################################################
# TELEGRAM BOT MENU COMMANDS SETUP
# 
# This script sets up the bot menu commands for icoffio Telegram bot
# Commands will appear in the Telegram menu (hamburger button)
# 
# Usage:
#   ./scripts/setup-telegram-menu.sh
#
# Prerequisites:
#   - TELEGRAM_BOT_TOKEN environment variable must be set
#   - curl must be installed
###############################################################################

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  TELEGRAM BOT MENU COMMANDS SETUP${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo -e "${RED}❌ Error: TELEGRAM_BOT_TOKEN environment variable is not set${NC}"
  echo ""
  echo "Please set it first:"
  echo "  export TELEGRAM_BOT_TOKEN='your_token_here'"
  echo ""
  exit 1
fi

# Define menu commands (English)
COMMANDS_EN='[
  {"command": "start", "description": "Start bot & welcome message"},
  {"command": "help", "description": "Show help & available commands"},
  {"command": "compose", "description": "Start composing multi-message article"},
  {"command": "publish", "description": "Publish composed article"},
  {"command": "cancel", "description": "Cancel current operation"},
  {"command": "delete", "description": "Delete article by URL"},
  {"command": "queue", "description": "View queue status"},
  {"command": "status", "description": "Check system status"},
  {"command": "language", "description": "Change interface language"}
]'

# Define menu commands (Russian)
COMMANDS_RU='[
  {"command": "start", "description": "Запустить бот"},
  {"command": "help", "description": "Помощь и команды"},
  {"command": "compose", "description": "Режим составления статьи"},
  {"command": "publish", "description": "Опубликовать составленное"},
  {"command": "cancel", "description": "Отменить операцию"},
  {"command": "delete", "description": "Удалить статью по ссылке"},
  {"command": "queue", "description": "Статус очереди"},
  {"command": "status", "description": "Статус системы"},
  {"command": "language", "description": "Выбор языка"}
]'

# Define menu commands (Polish)
COMMANDS_PL='[
  {"command": "start", "description": "Uruchom bota"},
  {"command": "help", "description": "Pomoc i komendy"},
  {"command": "compose", "description": "Tryb komponowania artykułu"},
  {"command": "publish", "description": "Opublikuj skomponowane"},
  {"command": "cancel", "description": "Anuluj operację"},
  {"command": "delete", "description": "Usuń artykuł po linku"},
  {"command": "queue", "description": "Status kolejki"},
  {"command": "status", "description": "Status systemu"},
  {"command": "language", "description": "Wybór języka"}
]'

API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands"

# Set commands for all languages (default - English)
echo -e "${BLUE}📝 Setting menu commands for all languages (default - EN)...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"commands\": $COMMANDS_EN}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ English commands set successfully${NC}"
else
  echo -e "${RED}❌ Failed to set English commands${NC}"
  echo "Response: $RESPONSE"
fi

echo ""

# Set commands for Russian
echo -e "${BLUE}📝 Setting menu commands for Russian (RU)...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"commands\": $COMMANDS_RU, \"language_code\": \"ru\"}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ Russian commands set successfully${NC}"
else
  echo -e "${RED}❌ Failed to set Russian commands${NC}"
  echo "Response: $RESPONSE"
fi

echo ""

# Set commands for Polish
echo -e "${BLUE}📝 Setting menu commands for Polish (PL)...${NC}"
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"commands\": $COMMANDS_PL, \"language_code\": \"pl\"}")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo -e "${GREEN}✅ Polish commands set successfully${NC}"
else
  echo -e "${RED}❌ Failed to set Polish commands${NC}"
  echo "Response: $RESPONSE"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Commands are now available in the Telegram bot menu (hamburger button)."
echo ""
echo "To test:"
echo "  1. Open your Telegram bot"
echo "  2. Click the menu button (/) or hamburger icon"
echo "  3. See all available commands"
echo ""


