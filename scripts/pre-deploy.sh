#!/bin/bash

# ✅ Script: Pre-deploy checklist automation
# Использование: ./scripts/pre-deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${BLUE}     PRE-DEPLOY CHECKLIST AUTOMATION        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"

ERRORS=0

# 1. TypeScript check
echo -e "${BLUE}1️⃣  Проверка TypeScript...${NC}"
if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo -e "${RED}❌ TypeScript errors found!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ TypeScript OK (0 errors)${NC}"
fi
echo ""

# 2. Build check
echo -e "${BLUE}2️⃣  Проверка сборки...${NC}"
if npm run build > /tmp/build-output.log 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
    # Показать размеры бандлов
    grep "Route (app)" /tmp/build-output.log | head -5
else
    echo -e "${RED}❌ Build failed!${NC}"
    tail -20 /tmp/build-output.log
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Git status check
echo -e "${BLUE}3️⃣  Проверка Git статуса...${NC}"
if git diff --quiet; then
    echo -e "${YELLOW}⚠️  Нет изменений для commit${NC}"
else
    echo -e "${GREEN}✅ Есть изменения:${NC}"
    git status --short
fi
echo ""

# 4. Backup creation
echo -e "${BLUE}4️⃣  Создание backup...${NC}"
./scripts/create-backup.sh
echo ""

# 5. Проверка CHANGELOG
echo -e "${BLUE}5️⃣  Проверка CHANGELOG.md...${NC}"
if grep -q "\[Unreleased\]" CHANGELOG.md; then
    echo -e "${GREEN}✅ CHANGELOG содержит [Unreleased]${NC}"
    echo -e "${YELLOW}   Не забудьте обновить перед релизом!${NC}"
else
    echo -e "${YELLOW}⚠️  [Unreleased] не найден в CHANGELOG${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!${NC}"
    echo -e "${GREEN}   Можно делать push${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}\n"
    echo -e "${YELLOW}Следующие шаги:${NC}"
    echo -e "1. git add ."
    echo -e "2. git commit -m \"тип: описание\""
    echo -e "3. git push origin branch-name"
    exit 0
else
    echo -e "${RED}❌ НАЙДЕНО ОШИБОК: $ERRORS${NC}"
    echo -e "${RED}   ИСПРАВЬТЕ ПЕРЕД PUSH!${NC}"
    echo -e "${BLUE}════════════════════════════════════════════${NC}"
    exit 1
fi













