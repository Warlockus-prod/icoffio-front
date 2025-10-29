#!/bin/bash

# 📦 Script: Создание backup перед push
# Использование: ./scripts/create-backup.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Создание backup...${NC}"

# Создать backups директорию если не существует
mkdir -p backups

# Timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="backups/backup-${TIMESTAMP}.patch"

# Создать backup
git diff > "$BACKUP_FILE"

# Проверить размер
FILESIZE=$(wc -c < "$BACKUP_FILE")

if [ $FILESIZE -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Нет изменений для backup${NC}"
    rm "$BACKUP_FILE"
else
    echo -e "${GREEN}✅ Backup создан: $BACKUP_FILE${NC}"
    echo -e "${BLUE}   Размер: $(du -h $BACKUP_FILE | cut -f1)${NC}"
    
    # Добавить описание в README
    echo "- $(date '+%Y-%m-%d %H:%M:%S') - $BACKUP_FILE" >> backups/README.md
    
    # Показать последние 5 backups
    echo -e "\n${BLUE}📋 Последние backups:${NC}"
    ls -lht backups/*.patch | head -5
fi





