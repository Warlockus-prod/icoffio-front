# 🚀 ICOFFIO PROJECT - Полная документация по созданию проекта

> **Мастер-документация для повторения проекта icoffio на другом сайте**

---

## 📋 Содержание

1. [Обзор архитектуры](#-обзор-архитектуры)
2. [Технологический стек](#-технологический-стек)
3. [Пошаговое создание проекта](#-пошаговое-создание-проекта)
4. [WordPress Headless CMS](#-wordpress-headless-cms)
5. [Next.js Frontend](#-nextjs-frontend)
6. [Vercel деплоймент](#-vercel-деплоймент)
7. [API интеграции](#-api-интеграции)
8. [Интернационализация](#-интернационализация)
9. [N8N автоматизация](#-n8n-автоматизация)
10. [Рекламная система](#-рекламная-система)
11. [Производственные настройки](#-производственные-настройки)
12. [Мониторинг и поддержка](#-мониторинг-и-поддержка)

---

## 🏗️ Обзор архитектуры

### Концепция проекта
**ICOFFIO** - современная технологическая медиа-платформа с многоязычной поддержкой, использующая headless архитектуру и AI-powered автоматизацию.

### Архитектурная схема

```
┌─────────────────────────────────────────────────────────────────┐
│                        ICOFFIO ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 FRONTEND (Next.js 14)          📊 BACKEND (WordPress)      │
│  ┌─────────────────────────┐       ┌───────────────────────┐   │
│  │   icoffio.com           │       │ admin.icoffio.com     │   │
│  │   ├── /en/ (English)    │ ◄────► │ ├── WPGraphQL        │   │
│  │   ├── /pl/ (Polish)     │GraphQL │ ├── REST API         │   │
│  │   ├── /de/ (German)     │   API  │ ├── Admin Panel      │   │
│  │   ├── /ro/ (Romanian)   │        │ └── Media Library    │   │
│  │   └── /cs/ (Czech)      │        └───────────────────────┘   │
│  └─────────────────────────┘                                    │
│                                                                 │
│  🤖 AUTOMATION (N8N)               🔧 SERVICES                 │
│  ┌─────────────────────────┐       ┌───────────────────────┐   │
│  │ Telegram Bot            │       │ OpenAI API            │   │
│  │ ├── Article Input       │ ◄────► │ ├── GPT-4 Copywriting│   │
│  │ ├── AI Enhancement      │        │ ├── Translation       │   │
│  │ ├── Multi-lang Publish  │        │ └── DALL-E Images     │   │
│  │ └── Auto-distribution   │        └───────────────────────┘   │
│  └─────────────────────────┘                                    │
│                                                                 │
│  💰 MONETIZATION                    🚀 DEPLOYMENT              │
│  ┌─────────────────────────┐       ┌───────────────────────┐   │
│  │ VOX Advertising         │       │ Vercel (Frontend)     │   │
│  │ ├── In-image Ads        │       │ VPS (WordPress)       │   │  
│  │ ├── Selective Display   │       │ GitHub (Code)         │   │
│  │ └── Performance Tracking│       │ Domain Management     │   │
│  └─────────────────────────┘       └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Ключевые принципы
- **Headless Architecture**: Разделение контента и презентации
- **Multi-language First**: 5 языков с автоматическим переводом
- **AI-Powered**: Автоматическое улучшение контента через GPT-4
- **Performance-Oriented**: SSG + ISR для максимальной скорости
- **Monetization-Ready**: Встроенная рекламная система
- **Automation-Focused**: Полная автоматизация публикации

---

## 🛠️ Технологический стек

### Frontend
```json
{
  "framework": "Next.js 14 (App Router)",
  "language": "TypeScript",
  "styling": "Tailwind CSS + @tailwindcss/typography",
  "components": "React 18",
  "deployment": "Vercel",
  "domain": "icoffio.com"
}
```

### Backend
```json
{
  "cms": "WordPress 6.4+ (Headless)",
  "api": "WPGraphQL + REST API",
  "database": "MySQL",
  "server": "VPS (185.41.68.62)",
  "domain": "admin.icoffio.com"
}
```

### Интеграции
```json
{
  "automation": "N8N",
  "ai_services": "OpenAI GPT-4 + DALL-E",
  "translation": "OpenAI GPT-4",
  "images": "Unsplash API + DALL-E",
  "advertising": "VOX (st.hbrd.io)",
  "analytics": "Vercel Analytics + Web Vitals"
}
```

### Языки
```json
{
  "supported_languages": ["en", "pl", "de", "ro", "cs"],
  "default": "en",
  "detection": "browser_automatic",
  "fallback": "en"
}
```

---

## 🔧 Пошаговое создание проекта

### Этап 1: Подготовка инфраструктуры

#### 1.1 Домены и DNS
```bash
# Основные домены
yourdomain.com        → Next.js (Vercel)
admin.yourdomain.com  → WordPress (VPS)

# DNS настройки
yourdomain.com      CNAME  cname.vercel-dns.com
www                 CNAME  yourdomain.com  
admin               A      YOUR_VPS_IP
```

#### 1.2 VPS сервер для WordPress
```bash
# Минимальные требования
CPU: 2 cores
RAM: 4GB
Storage: 50GB SSD
OS: Ubuntu 22.04 LTS
```

#### 1.3 Необходимые аккаунты
- [x] **Vercel** - для деплоя Next.js
- [x] **GitHub** - для хранения кода  
- [x] **OpenAI** - для AI функций
- [x] **Unsplash** (опционально) - для изображений
- [x] **N8N Cloud** (опционально) - для автоматизации

### Этап 2: Настройка WordPress (Backend)

#### 2.1 Установка WordPress
```bash
# На VPS сервере
sudo apt update && sudo apt upgrade -y
sudo apt install nginx mysql-server php8.1-fpm php8.1-mysql php8.1-curl php8.1-mbstring

# Скачать WordPress
cd /var/www/html
sudo wget https://wordpress.org/latest.tar.gz
sudo tar -xzf latest.tar.gz
sudo mv wordpress/* .
```

#### 2.2 Конфигурация wp-config.php
```php
<?php
// wp-config.php
define('DB_NAME', 'your_database');
define('DB_USER', 'your_user');
define('DB_PASSWORD', 'your_password');
define('DB_HOST', 'localhost');

// URL конфигурация для headless режима
define('WP_HOME', 'https://yourdomain.com');
define('WP_SITEURL', 'https://admin.yourdomain.com');

// Безопасность
define('DISALLOW_FILE_EDIT', true);
define('WP_DEBUG', false);

// Увеличиваем лимиты для API
ini_set('memory_limit', '512M');
ini_set('max_execution_time', 300);
?>
```

#### 2.3 Обязательные плагины WordPress
```bash
# Установить через админку WordPress:
1. WPGraphQL - основной GraphQL API
2. WPGraphQL for ACF - поддержка custom fields
3. Yoast SEO - SEO оптимизация
4. Application Passwords - для API авторизации
5. Ad Inserter - управление рекламой (опционально)
```

#### 2.4 Настройка GraphQL endpoint
```bash
# После установки WPGraphQL доступен по адресу:
https://admin.yourdomain.com/graphql

# Проверка работоспособности:
curl -X POST https://admin.yourdomain.com/graphql \
-H "Content-Type: application/json" \
-d '{"query": "{ posts { nodes { id title } } }"}'
```

### Этап 3: Создание Next.js Frontend

#### 3.1 Инициализация проекта
```bash
npx create-next-app@latest your-project --typescript --tailwind --app
cd your-project

# Установка зависимостей
npm install clsx
npm install -D @tailwindcss/typography
```

#### 3.2 Структура проекта
```
your-project/
├── app/
│   ├── [locale]/           # Языковые маршруты
│   │   ├── (site)/        # Основные страницы
│   │   │   ├── page.tsx   # Главная страница
│   │   │   ├── article/[slug]/page.tsx
│   │   │   └── category/[slug]/page.tsx
│   │   └── layout.tsx     # Основной layout с навигацией
│   ├── api/               # API маршруты
│   │   ├── revalidate/    # ISR webhook
│   │   ├── translate/     # AI переводы
│   │   ├── n8n-webhook/   # Автоматизация
│   │   └── wordpress-articles/  # WordPress API
│   └── sitemap.ts         # SEO карта сайта
├── components/            # UI компоненты
├── lib/                   # Утилиты и сервисы  
│   ├── wordpress-service.ts
│   ├── translation-service.ts
│   ├── image-service.ts
│   ├── types.ts
│   └── i18n.ts
├── middleware.ts          # Языковая маршрутизация
└── next.config.mjs        # Конфигурация Next.js
```

#### 3.3 Конфигурация Next.js
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: false },
  
  // Настройка изображений
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.yourdomain.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' }
    ],
  },
  
  // Языковые редиректы
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/en', // Редирект на язык по умолчанию
      },
      {
        source: '/article/:slug',
        destination: '/en/article/:slug',
      },
      {
        source: '/category/:slug', 
        destination: '/en/category/:slug',
      },
    ]
  },
};

export default nextConfig;
```

#### 3.4 Middleware для интернационализации
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const locales = ['en', 'pl', 'de', 'ro', 'cs']
const defaultLocale = 'en'

function getLocale(request: NextRequest): string {
  // Проверяем URL на наличие локали
  const pathname = request.nextUrl.pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    return pathname.split('/')[1]
  }

  // Проверяем заголовок Accept-Language
  const acceptLanguage = request.headers.get('accept-language') || ''
  const preferredLocale = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].split('-')[0])
    .find(lang => locales.includes(lang))

  return preferredLocale || defaultLocale
}

export function middleware(request: NextRequest) {
  // Исключаем API и статические файлы
  if (
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const pathname = request.nextUrl.pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    const locale = getLocale(request)
    const newUrl = new URL(`/${locale}${pathname}`, request.url)
    return NextResponse.redirect(newUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
```

---

## 📊 WordPress Headless CMS

### Настройка WordPress как headless CMS

#### GraphQL схема данных
```graphql
# Основные типы данных для статей
type Post {
  id: ID!
  slug: String!
  title: String!
  excerpt: String!
  content: String!
  date: String!
  featuredImage: {
    sourceUrl: String!
    altText: String
  }
  categories: {
    nodes: [Category!]!
  }
  tags: {
    nodes: [Tag!]!
  }
  seo: {
    title: String
    metaDesc: String
    canonical: String
  }
}

type Category {
  id: ID!
  name: String!
  slug: String!
  description: String
}
```

#### API интеграция в Next.js
```typescript
// lib/wordpress-service.ts
const WP_GRAPHQL_URL = process.env.NEXT_PUBLIC_WP_ENDPOINT || 'https://admin.yourdomain.com/graphql';

async function fetchAPI(query: string, variables = {}) {
  const response = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();
  if (json.errors) {
    console.error('GraphQL errors:', json.errors);
    throw new Error('GraphQL API error');
  }

  return json.data;
}

// Получение всех статей
export async function getPosts(first = 10, after?: string) {
  const query = `
    query GetPosts($first: Int!, $after: String) {
      posts(first: $first, after: $after, where: { status: PUBLISH }) {
        nodes {
          id
          slug
          title
          excerpt
          date
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          categories {
            nodes {
              name
              slug
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  return fetchAPI(query, { first, after });
}

// Получение статьи по slug
export async function getPostBySlug(slug: string) {
  const query = `
    query GetPostBySlug($slug: String!) {
      postBy(slug: $slug) {
        id
        title
        content
        excerpt
        slug
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        seo {
          title
          metaDesc
          canonical
        }
      }
    }
  `;

  return fetchAPI(query, { slug });
}
```

---

## 🌐 Next.js Frontend

### Ключевые компоненты

#### Главная страница
```typescript
// app/[locale]/(site)/page.tsx
import { getPosts } from '@/lib/wordpress-service';
import { getTranslation } from '@/lib/i18n';
import { ArticleCard } from '@/components/ArticleCard';
import { Hero } from '@/components/Hero';

interface HomePageProps {
  params: { locale: string }
}

export default async function HomePage({ params }: HomePageProps) {
  const t = getTranslation(params.locale);
  const { posts } = await getPosts(12);

  return (
    <main>
      {/* Hero секция */}
      <Hero 
        title={t.siteTitle}
        description={t.mostActualEvents}
        locale={params.locale}
      />

      {/* Сетка статей */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">{t.latestNews}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.nodes.map((post) => (
            <ArticleCard 
              key={post.id}
              post={post}
              locale={params.locale}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

// Генерация мета-данных для SEO
export async function generateMetadata({ params }: HomePageProps) {
  const t = getTranslation(params.locale);
  
  return {
    title: t.siteTitle,
    description: t.siteDescription,
    openGraph: {
      title: t.siteTitle,
      description: t.siteDescription,
      url: `https://yourdomain.com/${params.locale}`,
      siteName: 'Your Site Name',
      locale: params.locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t.siteTitle,
      description: t.siteDescription,
    }
  };
}
```

#### Страница статьи
```typescript
// app/[locale]/(site)/article/[slug]/page.tsx
import { getPostBySlug } from '@/lib/wordpress-service';
import { getTranslation } from '@/lib/i18n';
import { notFound } from 'next/navigation';
import { Prose } from '@/components/Prose';
import { ReadingProgress } from '@/components/ReadingProgress';

interface ArticlePageProps {
  params: { locale: string; slug: string }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const t = getTranslation(params.locale);
  const { postBy: post } = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      {/* Компонент прогресса чтения */}
      <ReadingProgress />
      
      {/* Заголовок статьи */}
      <header className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
          {post.title}
        </h1>
        
        <div className="flex items-center text-gray-600 text-sm">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString(params.locale)}
          </time>
          <span className="mx-2">•</span>
          <span>{Math.ceil(post.content.length / 1000)} {t.readingTime}</span>
        </div>
      </header>

      {/* Изображение статьи */}
      {post.featuredImage?.node && (
        <div className="mb-8">
          <img
            src={post.featuredImage.node.sourceUrl}
            alt={post.featuredImage.node.altText || post.title}
            className="w-full h-auto rounded-lg"
          />
        </div>
      )}

      {/* Контент статьи */}
      <Prose>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </Prose>
    </article>
  );
}

// SEO мета-данные для статьи
export async function generateMetadata({ params }: ArticlePageProps) {
  const { postBy: post } = await getPostBySlug(params.slug);

  if (!post) {
    return {
      title: 'Article not found'
    };
  }

  return {
    title: post.seo?.title || post.title,
    description: post.seo?.metaDesc || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://yourdomain.com/${params.locale}/article/${params.slug}`,
      images: post.featuredImage?.node?.sourceUrl ? [
        {
          url: post.featuredImage.node.sourceUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        }
      ] : [],
      publishedTime: post.date,
      type: 'article',
    }
  };
}
```

### Компоненты UI

#### ArticleCard - карточка статьи
```typescript
// components/ArticleCard.tsx
import Link from 'next/link';
import { OptimizedImage } from './OptimizedImage';
import { formatDate } from '@/lib/format';
import { getTranslation } from '@/lib/i18n';

interface ArticleCardProps {
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    featuredImage?: {
      node: {
        sourceUrl: string;
        altText?: string;
      }
    };
    categories: {
      nodes: Array<{
        name: string;
        slug: string;
      }>;
    };
  };
  locale: string;
}

export function ArticleCard({ post, locale }: ArticleCardProps) {
  const t = getTranslation(locale);
  const category = post.categories.nodes[0];

  return (
    <article className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Изображение статьи */}
      <Link href={`/${locale}/article/${post.slug}`}>
        <div className="aspect-video overflow-hidden">
          <OptimizedImage
            src={post.featuredImage?.node?.sourceUrl || '/placeholder.jpg'}
            alt={post.featuredImage?.node?.altText || post.title}
            width={400}
            height={225}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      <div className="p-6">
        {/* Категория */}
        {category && (
          <Link 
            href={`/${locale}/category/${category.slug}`}
            className="text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            {category.name}
          </Link>
        )}

        {/* Заголовок */}
        <h3 className="mt-2 mb-3">
          <Link 
            href={`/${locale}/article/${post.slug}`}
            className="text-xl font-bold text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {post.title}
          </Link>
        </h3>

        {/* Отрывок */}
        <div 
          className="text-gray-600 text-sm line-clamp-3 mb-4"
          dangerouslySetInnerHTML={{ __html: post.excerpt }}
        />

        {/* Метаданные */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <time dateTime={post.date}>
            {formatDate(post.date, locale)}
          </time>
          
          <Link 
            href={`/${locale}/article/${post.slug}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t.readMore} →
          </Link>
        </div>
      </div>
    </article>
  );
}
```

---

## 🚀 Vercel деплоймент  

### Настройка Vercel проекта

#### 1. Подключение GitHub репозитория
```bash
# 1. Создать репозиторий на GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-project.git
git push -u origin main

# 2. Импортировать в Vercel
# Перейти на vercel.com → New Project → Import from GitHub
```

#### 2. Environment Variables в Vercel
```bash
# Production variables
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_WP_ENDPOINT=https://admin.yourdomain.com/graphql

# API Keys  
OPENAI_API_KEY=sk-proj-your-openai-key
UNSPLASH_ACCESS_KEY=your-unsplash-key

# WordPress Integration
WORDPRESS_API_URL=https://admin.yourdomain.com
WORDPRESS_USERNAME=your-wp-username  
WORDPRESS_APP_PASSWORD=your-wp-app-password

# Webhooks & Security
REVALIDATE_TOKEN=your-secure-revalidate-token
N8N_WEBHOOK_SECRET=your-n8n-secret-key
```

#### 3. Настройка доменов в Vercel
```bash
# Добавить домены в Vercel Dashboard:
yourdomain.com (primary)
www.yourdomain.com (redirect to yourdomain.com)

# Для мультиязычных поддоменов (опционально):
en.yourdomain.com
pl.yourdomain.com  
de.yourdomain.com
```

#### 4. Vercel конфигурация
```json
// vercel.json (опционально)
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["fra1", "iad1"],
  "functions": {
    "app/api/*/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods", 
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        }
      ]
    }
  ]
}
```

### Автоматический деплоймент
- **Push в main** → Production deployment
- **Pull Request** → Preview deployment  
- **Push в dev** → Development deployment

---

## 🔌 API интеграции

### API Routes структура

#### 1. N8N Webhook `/api/n8n-webhook`
```typescript
// app/api/n8n-webhook/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, data } = body;

  switch (action) {
    case 'process-article':
      return await processArticleFromTelegram(data);
    case 'health-check':
      return await healthCheck();
    case 'get-categories':
      return await getAvailableCategories();
  }
}
```

**Использование:**
```bash
# Публикация статьи
curl -X POST https://yourdomain.com/api/n8n-webhook \
-H "Content-Type: application/json" \
-H "Authorization: Bearer YOUR_SECRET" \
-d '{
  "action": "process-article",
  "data": {
    "title": "Новая статья об AI",
    "content": "Содержимое статьи...",
    "category": "ai"
  }
}'
```

#### 2. Translation API `/api/translate`
```typescript
// app/api/translate/route.ts  
export async function POST(request: NextRequest) {
  const { content, targetLanguage, action } = await request.json();
  
  if (action === 'translate-article') {
    const translations = await translationService.translateToAllLanguages(
      content, 
      excludeLanguages || []
    );
    return NextResponse.json({ success: true, translations });
  }
}
```

**Использование:**
```bash
# Перевод статьи на все языки
curl -X POST https://yourdomain.com/api/translate \
-H "Content-Type: application/json" \
-d '{
  "action": "translate-article",
  "content": {
    "title": "AI Revolution",
    "excerpt": "Brief description...",
    "body": "Full article content..."
  }
}'
```

#### 3. Revalidate API `/api/revalidate`
```typescript
// app/api/revalidate/route.ts
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
  
  const path = req.nextUrl.searchParams.get("path") || "/";
  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path });
}
```

**Webhook для WordPress:**
```bash
# Настроить в WordPress для автообновления кеша
POST https://yourdomain.com/api/revalidate?secret=TOKEN&path=/
```

### Сервисы интеграции

#### Translation Service
```typescript
// lib/translation-service.ts
import OpenAI from 'openai';

class TranslationService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async translateToAllLanguages(
    content: { title: string; excerpt: string; body: string },
    excludeLanguages: string[] = []
  ) {
    const targetLanguages = ['en', 'pl', 'de', 'ro', 'cs'].filter(
      lang => !excludeLanguages.includes(lang)
    );

    const translations = {};
    
    for (const lang of targetLanguages) {
      translations[lang] = await this.translateContent(content, lang);
    }

    return translations;
  }

  private async translateContent(content: any, targetLanguage: string) {
    const prompt = `Translate the following content to ${targetLanguage}.
    Maintain professional tone and technical accuracy.
    
    Title: ${content.title}
    Excerpt: ${content.excerpt}
    Body: ${content.body}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    // Парсинг ответа и возврат переведенного контента
    return this.parseTranslationResponse(response.choices[0].message.content);
  }
}

export const translationService = new TranslationService();
```

---

## 🌍 Интернационализация

### Настройка мультиязычности

#### Конфигурация языков
```typescript
// lib/i18n.ts
export const locales = ['en', 'pl', 'de', 'ro', 'cs'] as const;
export type Locale = typeof locales[number];

export const localeNames = {
  en: 'English',
  pl: 'Polski', 
  de: 'Deutsch',
  ro: 'Română',
  cs: 'Čeština'
};

export const translations = {
  en: {
    siteTitle: "YourSite — gadgets, technology and more",
    siteDescription: "Latest tech news and reviews",
    home: "Home",
    articles: "Articles", 
    readMore: "Read more",
    // ... все переводы
  },
  pl: {
    siteTitle: "YourSite — gadżety, technologie i więcej", 
    siteDescription: "Najnowsze wiadomości technologiczne",
    home: "Strona główna",
    articles: "Artykuły",
    readMore: "Czytaj więcej",
    // ... все переводы
  },
  // ... остальные языки
};
```

#### Language Selector компонент
```typescript
// components/LanguageSelector.tsx
'use client'
import { useRouter, usePathname } from 'next/navigation';
import { locales, localeNames } from '@/lib/i18n';

export function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    // Заменяем текущий locale в URL
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="relative">
      <select 
        value={currentLocale}
        onChange={(e) => switchLanguage(e.target.value)}
        className="bg-transparent border border-gray-300 rounded px-2 py-1"
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
```

#### SEO для мультиязычного сайта
```typescript
// app/[locale]/layout.tsx
export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = getTranslation(params.locale);
  
  return {
    title: {
      template: '%s | ' + t.siteTitle,
      default: t.siteTitle,
    },
    description: t.siteDescription,
    
    // Языковые альтернативы для SEO
    alternates: {
      canonical: `https://yourdomain.com/${params.locale}`,
      languages: {
        'en': 'https://yourdomain.com/en',
        'pl': 'https://yourdomain.com/pl',  
        'de': 'https://yourdomain.com/de',
        'ro': 'https://yourdomain.com/ro',
        'cs': 'https://yourdomain.com/cs',
      },
    },
    
    openGraph: {
      title: t.siteTitle,
      description: t.siteDescription,
      url: `https://yourdomain.com/${params.locale}`,
      siteName: 'Your Site Name',
      locale: params.locale,
      type: 'website',
    }
  };
}
```

---

## 🤖 N8N автоматизация

### Настройка автоматизации публикации

#### N8N Workflow схема
```
[Telegram Bot] → [Webhook] → [Content Enhancement] → [Translation] → [WordPress Publish] → [Response]
```

#### 1. Telegram Bot настройка
```bash
# Создание бота через @BotFather
/newbot
Bot Name: YourSite Content Bot
Username: yoursitebot

# Получение токена
Token: 123456789:ABCDEF...

# Установка webhook
curl -F "url=https://your-n8n-instance.com/webhook/telegram" \
https://api.telegram.org/bot<TOKEN>/setWebhook
```

#### 2. N8N Workflow конфигурация
```json
{
  "nodes": [
    {
      "name": "Telegram Trigger",
      "type": "n8n-nodes-base.telegramTrigger",
      "parameters": {
        "updates": ["message"]
      }
    },
    {
      "name": "Content Enhancement",
      "type": "n8n-nodes-base.httpRequest", 
      "parameters": {
        "url": "https://yourdomain.com/api/n8n-webhook",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer {{ $env.N8N_WEBHOOK_SECRET }}"
        },
        "body": {
          "action": "process-article",
          "data": {
            "title": "{{ $json.message.text.split('\\n')[0] }}",
            "content": "{{ $json.message.text }}",
            "category": "tech"
          }
        }
      }
    },
    {
      "name": "Send Success Message",
      "type": "n8n-nodes-base.telegram",
      "parameters": {
        "operation": "sendMessage",
        "chatId": "{{ $json.message.chat.id }}",
        "text": "✅ Статья обработана и опубликована!\n\nЗаголовок: {{ $('Content Enhancement').item.json.article.title }}\n\nСсылки:\n{{ Object.entries($('Content Enhancement').item.json.urls).map(([lang, url]) => `${lang}: ${url}`).join('\\n') }}"
      }
    }
  ],
  "connections": {
    "Telegram Trigger": {
      "main": [["Content Enhancement"]]
    },
    "Content Enhancement": {
      "main": [["Send Success Message"]]
    }
  }
}
```

#### 3. AI Content Enhancement
Сервис автоматически:
- ✅ Улучшает заголовок и контент через GPT-4
- ✅ Создает SEO-оптимизированное описание  
- ✅ Переводит на все поддерживаемые языки
- ✅ Генерирует изображение через DALL-E/Unsplash
- ✅ Публикует в WordPress на всех языках
- ✅ Возвращает ссылки на опубликованные статьи

---

## 💰 Рекламная система

### VOX In-Image реклама

#### Интеграция кода
```typescript
// app/[locale]/layout.tsx
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={locale}>
      <body>
        {children}
        
        {/* VOX Advertising Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window._tx === "undefined") {
                var s = document.createElement("script");
                s.type = "text/javascript";
                s.async = true;
                s.src = "https://st.hbrd.io/ssp.js?t=" + new Date().getTime();
                (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(s);
              }
              
              window._tx = window._tx || {};
              window._tx.cmds = window._tx.cmds || [];
              
              // Отслеживание URL для Next.js client-side routing
              window._voxLastUrl = window._voxLastUrl || '';
              
              function initVOX() {
                // Проверяем, что мы на странице статьи
                const isArticlePage = window.location.pathname.includes('/article/');
                if (!isArticlePage) return;
                
                window._tx.integrateInImage({
                  placeId: "YOUR_PLACE_ID",
                  selector: 'article img:not(.group img):not([class*="aspect-[16/9]"] img), .prose img, article > div img',
                  fetchSelector: true,
                  setDisplayBlock: true
                });
                window._tx.init();
              }
              
              function checkAndInitVOX() {
                const currentUrl = window.location.href;
                if (window._voxLastUrl !== currentUrl || window._voxLastUrl === '') {
                  window._voxLastUrl = currentUrl;
                  setTimeout(() => initVOX(), 1000);
                }
              }
              
              window._tx.cmds.push(function () {
                if (document.readyState === 'complete') {
                  checkAndInitVOX();
                } else {
                  window.addEventListener('load', checkAndInitVOX);
                }
              });
              
              // Мониторинг URL изменений для Next.js
              setInterval(checkAndInitVOX, 1500);
            `,
          }}
        />
      </body>
    </html>
  );
}
```

#### Особенности реализации
- ✅ **Избирательный показ**: только на страницах статей `/article/[slug]`
- ✅ **Исключение миниатюр**: не показывается в карточках ArticleCard
- ✅ **Next.js совместимость**: работает с client-side routing
- ✅ **Производительность**: не блокирует загрузку страницы

---

## 🏭 Производственные настройки

### Performance оптимизации

#### Next.js оптимизации
```typescript
// next.config.mjs
const nextConfig = {
  // Оптимизация сжатия
  compress: true,
  
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 дней
    dangerouslyAllowSVG: true,
  },
  
  // Оптимизация бандла
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  
  // Headers для кеширования
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control', 
            value: 'public, max-age=3600', // 1 час
          },
        ],
      },
    ];
  },
};
```

#### SEO оптимизации
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { getPosts } from '@/lib/wordpress-service';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts } = await getPosts(1000); // Все статьи
  const locales = ['en', 'pl', 'de', 'ro', 'cs'];

  const staticPages = [
    {
      url: 'https://yourdomain.com',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
      alternates: {
        languages: locales.reduce((acc, locale) => ({
          ...acc,
          [locale]: `https://yourdomain.com/${locale}`
        }), {})
      }
    }
  ];

  const articlePages = posts.nodes.flatMap(post => 
    locales.map(locale => ({
      url: `https://yourdomain.com/${locale}/article/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: {
        languages: locales.reduce((acc, lang) => ({
          ...acc,
          [lang]: `https://yourdomain.com/${lang}/article/${post.slug}`
        }), {})
      }
    }))
  );

  return [...staticPages, ...articlePages];
}

// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: 'https://yourdomain.com/sitemap.xml',
  };
}
```

### Безопасность

#### Environment Variables validation
```typescript
// lib/env.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_WP_ENDPOINT',
  'OPENAI_API_KEY',
  'WORDPRESS_API_URL',
  'WORDPRESS_USERNAME',
  'WORDPRESS_APP_PASSWORD'
];

export function validateEnvironment() {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Проверка при старте приложения
validateEnvironment();
```

#### API Rate Limiting
```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map();

export function rateLimit(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 минут
  const max = 100; // максимум запросов

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }

  const record = rateLimitMap.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    return { success: true };
  }

  if (record.count >= max) {
    return { 
      success: false, 
      error: 'Rate limit exceeded',
      resetTime: record.resetTime 
    };
  }

  record.count++;
  return { success: true };
}
```

---

## 📊 Мониторинг и поддержка

### Analytics и мониторинг

#### Web Vitals компонент  
```typescript
// components/WebVitals.tsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Отправляем метрики в аналитику
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(console.error);
    }
  });

  return null;
}
```

#### Health Check API
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    fetch(process.env.NEXT_PUBLIC_WP_ENDPOINT!).then(r => r.ok),
    fetch(`${process.env.WORDPRESS_API_URL}/wp-json/wp/v2/posts?per_page=1`).then(r => r.ok),
    Promise.resolve(!!process.env.OPENAI_API_KEY)
  ]);

  const [wpGraphQL, wpRest, openai] = checks;

  return Response.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      wordpress_graphql: wpGraphQL.status === 'fulfilled' ? wpGraphQL.value : false,
      wordpress_rest: wpRest.status === 'fulfilled' ? wpRest.value : false,
      openai_api: openai.status === 'fulfilled' ? openai.value : false,
    },
    deployment: {
      environment: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV,
      git_commit: process.env.VERCEL_GIT_COMMIT_SHA,
    }
  });
}
```

### Backup и восстановление

#### WordPress backup стратегия
```bash
# Автоматический бэкап базы данных (cron)
#!/bin/bash
# /etc/cron.daily/wp-backup
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="your_wordpress_db"
BACKUP_DIR="/backups/wordpress"

mysqldump -u root -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz /var/www/html/wp-content/uploads/

# Оставляем только последние 7 дней
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### Обновления и поддержка

#### Обновление зависимостей
```bash
# Проверка устаревших пакетов
npm audit
npm update

# Обновление Next.js
npm install next@latest

# Обновление TypeScript
npm install typescript@latest @types/react@latest @types/node@latest
```

#### Мониторинг логов
```bash
# Vercel логи
vercel logs --follow

# WordPress логи (на VPS)
tail -f /var/log/nginx/error.log
tail -f /var/log/php8.1-fpm.log
```

---

## ✅ Чек-лист запуска проекта

### Подготовка к запуску

#### 1. Infrastructure Setup
- [ ] VPS сервер настроен и доступен
- [ ] Домены настроены (yourdomain.com, admin.yourdomain.com)
- [ ] SSL сертификаты установлены
- [ ] DNS записи корректны

#### 2. WordPress Setup  
- [ ] WordPress установлен и работает
- [ ] WPGraphQL плагин активирован
- [ ] GraphQL endpoint доступен
- [ ] Application Password создан
- [ ] Базовые категории созданы
- [ ] Тестовые статьи опубликованы

#### 3. Next.js Setup
- [ ] Проект создан и настроен
- [ ] Все зависимости установлены
- [ ] Environment variables настроены
- [ ] Middleware для i18n работает
- [ ] API routes функционируют

#### 4. Vercel Deployment
- [ ] GitHub репозиторий подключен
- [ ] Environment variables добавлены
- [ ] Домены настроены
- [ ] Деплоймент успешен
- [ ] SSL активирован

#### 5. Integrations
- [ ] OpenAI API ключ валиден
- [ ] Translation service работает
- [ ] Image generation функционирует
- [ ] WordPress API интеграция работает

#### 6. N8N Automation (опционально)
- [ ] N8N instance настроен  
- [ ] Telegram Bot создан
- [ ] Webhook endpoints работают
- [ ] Workflow настроен и протестирован

#### 7. Advertising (опционально)
- [ ] VOX PlaceID активирован
- [ ] Рекламные коды интегрированы
- [ ] Избирательный показ настроен
- [ ] Performance протестирован

#### 8. Final Testing
- [ ] Все страницы загружаются корректно
- [ ] Языковая навигация работает
- [ ] SEO meta-теги генерируются
- [ ] Sitemap доступен
- [ ] Robots.txt настроен
- [ ] Web Vitals в норме

---

## 🎯 Заключение

Данная документация предоставляет полный план создания современной медиа-платформы с использованием headless архитектуры, AI-powered автоматизации и мультиязычной поддержки.

### Ключевые преимущества архитектуры:
- ⚡ **Высокая производительность** благодаря Next.js и статической генерации
- 🌍 **Глобальная доступность** через 5 языков и автоматические переводы
- 🤖 **Автоматизация контента** с помощью AI и N8N
- 💰 **Встроенная монетизация** через продвинутую рекламную систему
- 🔧 **Простота управления** через знакомый WordPress интерфейс
- 🚀 **Масштабируемость** благодаря serverless архитектуре Vercel

### Примерная стоимость запуска:
- **VPS для WordPress**: $10-20/месяц
- **Vercel Pro** (опционально): $20/месяц
- **OpenAI API**: $10-50/месяц в зависимости от объема
- **Домены**: $10-15/год
- **Общий бюджет**: $40-90/месяц

Следуя этой документации, вы сможете создать полностью функциональную копию icoffio проекта, адаптированную под ваши нужды и тематику.

---

*Создано для технологических медиа-проектов с использованием современных web-технологий* 🚀
