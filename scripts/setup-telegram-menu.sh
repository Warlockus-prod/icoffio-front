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
  {"command": "start", "description": "Start bot"},
  {"command": "help", "description": "How to use bot"},
  {"command": "settings", "description": "Show current settings"},
  {"command": "queue", "description": "My processing history"},
  {"command": "status", "description": "Alias for /queue"},
  {"command": "language", "description": "Set interface language"},
  {"command": "style", "description": "Set writing style"},
  {"command": "images", "description": "Set number of images"},
  {"command": "source", "description": "Set image source"},
  {"command": "single", "description": "One article from many URLs"},
  {"command": "reload", "description": "Reset stuck processing"},
  {"command": "autopublish", "description": "Toggle auto publish"},
  {"command": "admin", "description": "Open admin panel"}
]'

# Define menu commands (Russian)
COMMANDS_RU='[
  {"command": "start", "description": "Запустить бота"},
  {"command": "help", "description": "Как пользоваться"},
  {"command": "settings", "description": "Текущие настройки"},
  {"command": "queue", "description": "История и статусы"},
  {"command": "status", "description": "То же, что /queue"},
  {"command": "language", "description": "Язык интерфейса"},
  {"command": "style", "description": "Стиль публикации"},
  {"command": "images", "description": "Количество картинок"},
  {"command": "source", "description": "Источник картинок"},
  {"command": "single", "description": "Одна статья из нескольких URL"},
  {"command": "reload", "description": "Сброс зависших задач"},
  {"command": "autopublish", "description": "Автопубликация on/off"},
  {"command": "admin", "description": "Открыть админку"}
]'

# Define menu commands (Polish)
COMMANDS_PL='[
  {"command": "start", "description": "Uruchom bota"},
  {"command": "help", "description": "Jak korzystać"},
  {"command": "settings", "description": "Aktualne ustawienia"},
  {"command": "queue", "description": "Historia i statusy"},
  {"command": "status", "description": "To samo co /queue"},
  {"command": "language", "description": "Język interfejsu"},
  {"command": "style", "description": "Styl publikacji"},
  {"command": "images", "description": "Liczba obrazów"},
  {"command": "source", "description": "Źródło obrazów"},
  {"command": "single", "description": "Jeden artykuł z wielu URL"},
  {"command": "reload", "description": "Reset zawieszonych zadań"},
  {"command": "autopublish", "description": "Auto publikacja on/off"},
  {"command": "admin", "description": "Otwórz panel admina"}
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








