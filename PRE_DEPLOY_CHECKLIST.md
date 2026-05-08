# ✅ ЧЕК-ЛИСТ ПЕРЕД ДЕПЛОЕМ

**Используйте этот чек-лист КАЖДЫЙ РАЗ перед push в production!**

---

## 🚨 ОБЯЗАТЕЛЬНЫЕ ПРОВЕРКИ

### 1. Локальное тестирование

```bash
# Чистая сборка
npm run build

# Должно быть: 
# ✓ Compiled successfully
# ✓ Route (app) - все routes присутствуют
# ✓ No TypeScript errors
```

**Результат:** ✅ / ❌ _________

### 2. Запуск development сервера

```bash
npm run dev
# Откройте http://localhost:3000
```

**Проверьте вручную:**
- [ ] Главная страница загружается
- [ ] Header отображается правильно
- [ ] Footer на месте
- [ ] Навигация работает (AI, Apple, Games, Tech, News)
- [ ] Переключатель темы работает (Light/Dark/System)
- [ ] Языковой селектор отображается
- [ ] Поиск открывается
- [ ] Статьи показываются (или mock данные)

**Результат:** ✅ / ❌ _________

### 3. TypeScript проверка

```bash
# Должно быть: 0 errors
npx tsc --noEmit
```

**Результат:** ✅ / ❌ _________

### 4. Критические страницы

Откройте и проверьте:
- [ ] http://localhost:3000/en
- [ ] http://localhost:3000/pl
- [ ] http://localhost:3000/en/admin
- [ ] http://localhost:3000/en/article/any-slug (должна отобразиться или 404)

**Результат:** ✅ / ❌ _________

---

## 📝 GIT WORKFLOW

### 5. Проверка изменений

```bash
# Посмотрите что изменилось
git status
git diff
```

**Убедитесь:**
- [ ] Изменения только в нужных файлах
- [ ] Нет случайно измененных файлов
- [ ] Нет удаленных критических файлов

**Результат:** ✅ / ❌ _________

### 6. Создание backup

```bash
# ВСЕГДА создавайте backup перед push
git diff > backup-$(date +%Y%m%d-%H%M%S).patch
ls -lh backup-*.patch | tail -1
```

**Результат:** ✅ / ❌ _________

### 7. Commit с описательным сообщением

```bash
# Формат: [тип] Краткое описание
git commit -m "✨ Add: новая функция"
# или
git commit -m "🐛 Fix: исправление бага"
# или
git commit -m "📝 Docs: обновление документации"
```

**Результат:** ✅ / ❌ _________

---

## 🚀 DEPLOYMENT

### 8. Push в main

```bash
# Обычный push (НЕ force)
git push origin main

# Если нужен force push - СТОП! Подумайте дважды!
# Есть backup? ✅ Только тогда:
# git push origin main --force
```

**Результат:** ✅ / ❌ _________

### 9. Деплой на VPS#2

```bash
ssh -i ~/.ssh/aiw_new_vps_ed25519 -o ServerAliveInterval=30 root@178.104.223.93 \
  "cd /root/projects/icoffio-front && \
   git fetch origin feature/info-portal && git reset --hard origin/feature/info-portal && \
   docker compose -f docker-compose.vps.yml --env-file .env.production build && \
   docker compose -f docker-compose.vps.yml --env-file .env.production up -d"
```

**Дождитесь:**
- [ ] Build OK
- [ ] `icoffio-front-app: Up X seconds (healthy)`

**Время ожидания:** ~1-2 минуты

**Результат:** ✅ / ❌ _________

### 10. Production тест

```bash
# HTTP Status
curl -I https://web.icoffio.com/en

# Должно быть: HTTP/2 200
```

**Откройте в браузере:**
- [ ] https://web.icoffio.com/en - загружается
- [ ] Дизайн правильный
- [ ] Нет JavaScript ошибок в консоли
- [ ] Темная тема работает

**Результат:** ✅ / ❌ _________

---

## 🆘 ЕСЛИ ЧТО-ТО ПОШЛО НЕ ТАК

### НЕМЕДЛЕННЫЙ ОТКАТ

```bash
# 1. Откат на один коммит назад на VPS
ssh -i ~/.ssh/aiw_new_vps_ed25519 root@178.104.223.93 \
  "cd /root/projects/icoffio-front && git reset --hard HEAD~1 && \
   docker compose -f docker-compose.vps.yml --env-file .env.production build && \
   docker compose -f docker-compose.vps.yml --env-file .env.production up -d"

# 2. Откатить и в git origin
git reset --hard HEAD~1
git push origin feature/info-portal --force-with-lease
```

### ОТКАТ К ИЗВЕСТНОЙ СТАБИЛЬНОЙ ВЕРСИИ

```bash
# Текущая стабильная версия: v4.7.0
git reset --hard 7ba5cee
git push origin main --force
```

---

## 📊 ФИНАЛЬНАЯ ПРОВЕРКА

**Все 10 пунктов выполнены?**
- Локальное тестирование: ✅
- Development сервер: ✅
- TypeScript: ✅
- Критические страницы: ✅
- Проверка изменений: ✅
- Backup создан: ✅
- Commit сделан: ✅
- Push выполнен: ✅
- Docker деплой на VPS#2 успешен: ✅
- Production тест пройден: ✅

**Если все ✅ - ПОЗДРАВЛЯЕМ! Деплой успешен! 🎉**

**Если хоть один ❌ - НЕ ДЕЛАЙТЕ PUSH!**

---

## 🎯 БЫСТРЫЙ ЧЕК-ЛИСТ (1 минута)

Для маленьких изменений (документация, стили):

```bash
# 1. Build
npm run build && echo "✅ Build OK" || echo "❌ Build FAILED"

# 2. Backup
git diff > backup-$(date +%Y%m%d-%H%M%S).patch && echo "✅ Backup created"

# 3. Push
git push origin main && echo "✅ Pushed"

# 4. Test production (через 1 минуту)
curl -I https://app.icoffio.com/en | head -1
# Должно быть: HTTP/2 200
```

---

## 📚 ПОЛЕЗНЫЕ КОМАНДЫ

### Проверка текущей версии
```bash
git log --oneline -5
git describe --tags --always
```

### История изменений
```bash
git log --oneline --graph --all -20
```

### Откат конкретного файла
```bash
git checkout HEAD -- path/to/file
```

### Просмотр последних изменений
```bash
git show HEAD
```

---

## 💡 СОВЕТЫ

1. **Не торопитесь** - лучше потратить 5 минут на проверку, чем часы на восстановление
2. **Backup всегда** - даже для маленьких изменений
3. **Один релиз в день** - не делайте несколько push подряд
4. **Тестируйте локально** - production не место для экспериментов
5. **Читайте ошибки** - они говорят что именно сломалось

---

**Сохраните этот чек-лист в закладки и используйте КАЖДЫЙ РАЗ!**

**Версия чек-листа:** 1.0  
**Дата создания:** 22 октября 2025  
**Для проекта:** icoffio v4.7.0+













