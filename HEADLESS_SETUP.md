# 🚀 DNS RECOVERY & Blog Setup Guide
## icoffio.com (WordPress) + blog.icoffio.com (Next.js)

## 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ DNS

**ПРОБЛЕМА НАЙДЕНА:** icoffio.com указывает на Vercel вместо WordPress сервера!

```bash
БЫЛО ПРАВИЛЬНО: icoffio.com → 185.41.68.62 (WordPress)
СТАЛО НЕПРАВИЛЬНО: icoffio.com → 216.198.79.1 (Vercel)  
```

## 📋 **DNS ЗАПИСИ ДЛЯ НАСТРОЙКИ:**

### **В вашем DNS провайдере создайте:**

```dns
# ИСПРАВИТЬ ПРОБЛЕМУ:
❌ УДАЛИТЬ: icoffio.com A 216.198.79.1 (Vercel)
✅ ВОССТАНОВИТЬ: icoffio.com A 185.41.68.62 (WordPress)

# ДОБАВИТЬ ДЛЯ NEXT.JS:
✅ blog.icoffio.com CNAME cname.vercel-dns.com (Next.js)
✅ www.blog.icoffio.com CNAME blog.icoffio.com

# ОПЦИОНАЛЬНО (НА БУДУЩЕЕ):
admin.icoffio.com A 185.41.68.62 (для Headless CMS)
```

---

## ⚙️ **НАСТРОЙКА VERCEL:**

### **1. Environment Variables в Vercel:**
```bash
NEXT_PUBLIC_WP_ENDPOINT=https://icoffio.com/graphql
NEXT_PUBLIC_SITE_URL=https://blog.icoffio.com  
OPENAI_API_KEY=[ваш OpenAI ключ]
```

### **2. Domains в Vercel:**
- ❌ УДАЛИТЬ: `icoffio.com` (возвращаем WordPress)
- ✅ ДОБАВИТЬ: `blog.icoffio.com` 
- ✅ ДОБАВИТЬ: `www.blog.icoffio.com` (redirect to blog.icoffio.com)

---

## 🔧 **НАСТРОЙКА WORDPRESS:**

### **1. В WordPress Admin (admin.icoffio.com/wp-admin):**

#### **Site URL Settings:**
```bash
WordPress Address (URL): https://admin.icoffio.com
Site Address (URL): https://icoffio.com
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
┌──────────────────┐   GraphQL    ┌─────────────────┐
│ blog.icoffio.com │ ────────────→ │   icoffio.com   │
│    (Next.js)     │   API Data   │  (WordPress)    │
│   Blog Frontend  │ ←──────────── │   CMS + Site    │
└──────────────────┘              └─────────────────┘
        │                                   │
        ├── Красивый блог                   ├── Основной сайт WordPress
        ├── Быстрая загрузка                ├── /wp-admin панель  
        ├── SEO оптимизация                 ├── /wp-json API
        └── PWA возможности                 └── Плагины и темы
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
- **WordPress админка:** https://icoffio.com/wp-admin (восстановлено)
- **Основной сайт:** https://icoffio.com (WordPress как раньше)
- **Красивый блог:** https://blog.icoffio.com (Next.js)  
- **API данных:** https://icoffio.com/graphql
- **Все обновления контента** делаются через WordPress, автоматически появляются на блоге!

---

## 📞 **ПОДДЕРЖКА:**
Если что-то не работает, проверьте:
1. DNS записи (может потребоваться 24 часа)
2. WordPress плагины активированы
3. Vercel Environment Variables настроены
4. GraphQL endpoint отвечает
