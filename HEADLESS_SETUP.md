# 🚀 Premium Architecture Setup Guide
## icoffio.com (Next.js Frontend) + admin.icoffio.com (WordPress Admin)

## 🎯 ВЫБРАННАЯ АРХИТЕКТУРА: ВАРИАНТ 1

**ЦЕЛЬ:** Красивый Next.js сайт на главном домене + WordPress админка на поддомене

```bash
icoffio.com → Next.js ⚡ (красивый сайт для пользователей)
admin.icoffio.com → WordPress 🔧 (админка + API)
```

## 📋 **DNS ЗАПИСИ ДЛЯ НАСТРОЙКИ:**

### **В вашем DNS провайдере создайте:**

```dns
# ГЛАВНЫЙ САЙТ NEXT.JS:
❌ УДАЛИТЬ: icoffio.com. A 185.41.68.62 (старый WordPress)
✅ ДОБАВИТЬ: icoffio.com CNAME cname.vercel-dns.com (Next.js)
✅ ДОБАВИТЬ: www CNAME icoffio.com (редирект на главный)

# WORDPRESS АДМИНКА:
✅ ОСТАВИТЬ: admin A 185.41.68.62 (admin.icoffio.com)

# ИСПРАВИТЬ БЛОГ (если добавляли):
❌ ИСПРАВИТЬ: blog CNAME cname.vercel-dns.com.icoffio.com
✅ НА: blog CNAME cname.vercel-dns.com

# ПОЧТА (оставить как есть):
mail A 185.41.68.62
```

---

## ⚙️ **НАСТРОЙКА VERCEL:**

### **1. Environment Variables в Vercel:**
```bash
NEXT_PUBLIC_WP_ENDPOINT=https://admin.icoffio.com/graphql
NEXT_PUBLIC_SITE_URL=https://icoffio.com
OPENAI_API_KEY=[ваш OpenAI ключ]
```

### **2. Domains в Vercel:**
- ✅ ДОБАВИТЬ: `icoffio.com` (главный домен)
- ✅ ДОБАВИТЬ: `www.icoffio.com` (redirect to icoffio.com)
- ❌ УДАЛИТЬ: `blog.icoffio.com` (если был добавлен)

---

## 🔧 **НАСТРОЙКА WORDPRESS:**

### **1. В WordPress Admin (admin.icoffio.com/wp-admin):**

#### **Site URL Settings (ВАЖНО!):**
```bash
WordPress Address (URL): https://admin.icoffio.com
Site Address (URL): https://icoffio.com
```

**ИЛИ через wp-config.php:**
```php
define('WP_HOME', 'https://icoffio.com');
define('WP_SITEURL', 'https://admin.icoffio.com');
```

#### **Обязательные плагины:**
```bash
1. WPGraphQL - для API данных
2. WPGraphQL for ACF - если используете custom fields
3. Yoast SEO - для SEO метаданных
```

---

## 🌐 **АРХИТЕКТУРА:**

```
┌─────────────────┐   GraphQL    ┌────────────────────┐
│   icoffio.com   │ ────────────→ │ admin.icoffio.com  │
│   (Next.js)     │   API Data   │   (WordPress)      │
│ Main Frontend   │ ←──────────── │  Headless CMS      │
└─────────────────┘              └────────────────────┘
        │                                   │
        ├── 🎨 Красивый главный сайт         ├── 🔧 WordPress админка  
        ├── ⚡ Молниеносная загрузка         ├── 📝 Управление контентом
        ├── 📱 PWA поддержка               ├── 📡 GraphQL API
        ├── 🚀 SEO на главном домене        ├── 🔌 Плагины и темы
        └── 🎯 Современный дизайн           └── 📊 Аналитика
```

---

## ✅ **ПОШАГОВЫЙ ПЛАН ВНЕДРЕНИЯ:**

### **Этап 1: DNS (СРОЧНО)**
1. Удалить `icoffio.com` из Vercel (если добавлен)
2. Настроить DNS записи выше
3. Проверить доступ к `admin.icoffio.com/wp-admin`

### **Этап 2: WordPress**
1. Установить WPGraphQL плагин
2. Изменить Site URL на admin.icoffio.com
3. Протестировать API: `admin.icoffio.com/graphql`

### **Этап 3: Next.js**
1. Добавить домен `icoffio.com` в Vercel
2. Настроить Environment Variables
3. Деплой и тестирование

### **Этап 4: Тестирование**
1. Проверить загрузку данных из WordPress API
2. Проверить работу форм и поиска
3. SEO и производительность

---

## 🔍 **ТЕСТИРОВАНИЕ API:**

```bash
# Проверить GraphQL endpoint:
curl https://admin.icoffio.com/graphql

# Проверить REST API:
curl https://admin.icoffio.com/wp-json/wp/v2/posts
```

---

## 🚨 **ВАЖНО:**
- **Главный сайт:** https://icoffio.com (Next.js - красивый и быстрый)
- **WordPress админка:** https://admin.icoffio.com/wp-admin (управление контентом)
- **API данных:** https://admin.icoffio.com/graphql
- **Все обновления контента** делаются через WordPress, автоматически появляются на главном сайте!
- **SEO преимущество:** Главный домен занимает Next.js с отличной производительностью

---

## 📞 **ПОДДЕРЖКА:**
Если что-то не работает, проверьте:
1. DNS записи (может потребоваться 24 часа)
2. WordPress плагины активированы
3. Vercel Environment Variables настроены
4. GraphQL endpoint отвечает
