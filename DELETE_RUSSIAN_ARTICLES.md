# 🗑️ ИНСТРУКЦИЯ ПО УДАЛЕНИЮ РУССКИХ СТАТЕЙ

## 📊 Найдено проблемных статей: 29

### Список статей для удаления:

1. apple-pl
2. apple-en  
3. pl-2
4. en-5
5. google-android-sms-ios-pl
6. google-android-sms-ios-en
7. en-4
8. en-3
9. pl
10. en-2
11. test-article-benefits-of-coffee-for-productivity-en
12. siri-google-gemini-pl-4
13. siri-google-gemini-pl-3
14. siri-google-gemini-en-4
15. siri-google-gemini-en-3
16. siri-google-gemini-pl-2
17. siri-google-gemini-en-2
18. siri-google-gemini-pl
19. siri-google-gemini-en
20. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-4
21. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-3
22. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-4
23. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-3
24. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-2
25. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-2
26. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl
27. ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en
28. ai-edited-test-en-2
29. en

## 🔧 СПОСОБ 1: Автоматическое удаление через скрипт

### Шаг 1: Получить WordPress Application Password

1. Войдите в WordPress Admin: https://icoffio.com/wp-admin/
2. Перейдите в **Пользователи → Ваш профиль**
3. Прокрутите до раздела **Application Passwords**
4. Введите название (например: "icoffio-cleanup")
5. Нажмите **"Add New Application Password"**
6. **Скопируйте сгенерированный пароль** (он показывается только один раз!)

### Шаг 2: Запустить скрипт удаления

```bash
cd icoffio-clone-nextjs

# Установите credentials
export WP_USERNAME="your_username"  # Ваш WordPress username
export WP_APP_PASSWORD="xxxx xxxx xxxx xxxx"  # Application Password из шага 1

# Запустите удаление
node scripts/delete-russian-articles-direct.js
```

## 🔧 СПОСОБ 2: Настроить credentials в Vercel

### Шаг 1: Добавить credentials в Vercel

1. Откройте: https://vercel.com/dashboard
2. Выберите проект **icoffio-front**
3. **Settings** → **Environment Variables**
4. Добавьте переменные:

```
WP_USERNAME=your_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

5. Выберите **All Environments** (Production, Preview, Development)
6. Нажмите **Save**

### Шаг 2: Дождаться redeploy

После добавления переменных Vercel автоматически пересоберет проект.

### Шаг 3: Запустить удаление через API

```bash
cd icoffio-clone-nextjs
node scripts/delete-via-api-batch.js
```

## 🔧 СПОСОБ 3: Ручное удаление через WordPress Admin

1. Войдите в WordPress Admin: https://icoffio.com/wp-admin/
2. Перейдите в **Posts → All Posts**
3. Используйте поиск для каждой статьи из списка выше
4. Выберите статью → **Move to Trash**
5. После удаления всех статей: **Trash → Empty Trash**

## ✅ После удаления

- Статьи исчезнут с сайта в течение 1-2 минут
- Проверьте главную страницу: https://app.icoffio.com
- Проверьте английскую версию: https://app.icoffio.com/en
- Проверьте польскую версию: https://app.icoffio.com/pl

## 📝 Примечания

- Скрипты автоматически обрабатывают все 29 статей
- Есть задержка 500-800ms между удалениями для безопасности
- Если статья уже удалена, скрипт пропустит её
- Все действия логируются в консоль

