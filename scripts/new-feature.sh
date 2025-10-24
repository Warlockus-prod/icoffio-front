#!/bin/bash

# 🌟 Script: Создание нового feature branch с правильной структурой
# Использование: ./scripts/new-feature.sh имя-фичи

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка аргумента
if [ -z "$1" ]; then
    echo -e "${YELLOW}Использование: ./scripts/new-feature.sh имя-фичи${NC}"
    echo -e "${YELLOW}Пример: ./scripts/new-feature.sh category-fallback${NC}"
    exit 1
fi

FEATURE_NAME=$1

echo -e "${BLUE}🌟 Создание нового feature branch...${NC}\n"

# 1. Обновить main
echo -e "${BLUE}1️⃣  Обновление main...${NC}"
git checkout main
git pull origin main
echo -e "${GREEN}✅ Main обновлен${NC}\n"

# 2. Создать feature branch
echo -e "${BLUE}2️⃣  Создание branch: feature/${FEATURE_NAME}${NC}"
git checkout -b "feature/${FEATURE_NAME}"
echo -e "${GREEN}✅ Branch создан${NC}\n"

# 3. Создать TODO файл
echo -e "${BLUE}3️⃣  Создание TODO файла...${NC}"
cat > "TODO_${FEATURE_NAME}.md" << EOF
# TODO: ${FEATURE_NAME}

**Создано:** $(date '+%Y-%m-%d %H:%M:%S')
**Branch:** feature/${FEATURE_NAME}

## Задачи

- [ ] Спланировать изменения
- [ ] Разработать функциональность
- [ ] Добавить fallback (если критично)
- [ ] Локальное тестирование
- [ ] Обновить CHANGELOG.md
- [ ] Создать backup
- [ ] Push и проверка

## Файлы для изменения

- 

## Тестирование

### Локально
- [ ] \`npm run build\` успешен
- [ ] \`npx tsc --noEmit\` без ошибок
- [ ] Development server работает
- [ ] Visual проверка

### Production (после deploy)
- [ ] HTTP Status 200
- [ ] Функциональность работает
- [ ] Нет console errors

## Заметки

EOF

echo -e "${GREEN}✅ TODO файл создан: TODO_${FEATURE_NAME}.md${NC}\n"

# 4. Показать инструкции
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Feature branch готов к работе!${NC}"
echo -e "${BLUE}════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}Следующие шаги:${NC}"
echo -e "1. Редактировать TODO_${FEATURE_NAME}.md"
echo -e "2. Разработать функциональность"
echo -e "3. Коммитить с правильными префиксами:"
echo -e "   ${BLUE}git commit -m \"✨ Add: описание\"${NC}"
echo -e "4. Тестировать: ${BLUE}./scripts/pre-deploy.sh${NC}"
echo -e "5. Push: ${BLUE}git push origin feature/${FEATURE_NAME}${NC}\n"

echo -e "${YELLOW}Полезные команды:${NC}"
echo -e "- Проверка перед push: ${BLUE}./scripts/pre-deploy.sh${NC}"
echo -e "- Создание backup: ${BLUE}./scripts/create-backup.sh${NC}"
echo -e "- Переключение в main: ${BLUE}git checkout main${NC}"


