#!/bin/bash

# БЕЗОПАСНАЯ ОЧИСТКА ТОЛЬКО ICOFFIO ПРОЕКТА С VPS
# НЕ ТРОГАЕТ ДРУГИЕ ПРОЕКТЫ!

set -e

echo "🧹 ОЧИСТКА ICOFFIO ПРОЕКТА С VPS"
echo "================================="

VPS_HOST="77.55.211.1"
VPS_PORT="8908"
VPS_USER="andrlock"
VPS_PASSWORD="Pgrass890!#Brot23"

echo ""
echo "⚠️  ВНИМАНИЕ: Удаляю ТОЛЬКО icoffio-front проект"
echo "⚠️  Другие проекты НЕ ЗАТРАГИВАЮ!"

# Подключаемся и очищаем только наш проект
sshpass -p "$VPS_PASSWORD" ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" << 'EOF'
set -e

echo ""
echo "📋 Показываю ВСЕ PM2 процессы ПЕРЕД очисткой:"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18 2>/dev/null || echo "NVM не найден"
pm2 list 2>/dev/null || echo "PM2 процессы не найдены"

echo ""
echo "🛑 Останавливаю ТОЛЬКО icoffio процессы..."
pm2 delete icoffio-front 2>/dev/null || echo "icoffio-front уже не запущен"
pm2 delete icoffio-front-proxy 2>/dev/null || echo "icoffio-front-proxy уже не запущен"

echo ""
echo "🗂️ Удаляю папку проекта icoffio-front..."
rm -rf /home/andrlock/projects/icoffio-front 2>/dev/null || echo "Папка уже не существует"

echo ""
echo "🧹 Очищаю временные файлы..."
rm -f /home/andrlock/deploy.tar.gz 2>/dev/null || true
rm -f /home/andrlock/vps-update.sh 2>/dev/null || true

echo ""
echo "📋 Показываю ОСТАВШИЕСЯ PM2 процессы:"
pm2 list 2>/dev/null || echo "PM2 процессы не найдены"

echo ""
echo "📊 Статус портов после очистки:"
netstat -tuln 2>/dev/null | grep -E "3001|8001" || echo "Порты 3001 и 8001 свободны"

echo ""
echo "✅ ОЧИСТКА ICOFFIO ПРОЕКТА ЗАВЕРШЕНА"
echo "✅ Другие проекты НЕ ЗАТРОНУТЫ"
EOF

echo ""
echo "🎯 ИТОГ ОЧИСТКИ:"
echo "✅ Удален проект: /home/andrlock/projects/icoffio-front"
echo "✅ Остановлены процессы: icoffio-front, icoffio-front-proxy"  
echo "✅ Освобождены порты: 3001, 8001"
echo "✅ Другие проекты: НЕ ТРОНУТЫ"
echo ""
echo "💡 Теперь можно выбрать альтернативное решение для деплоя!"


























