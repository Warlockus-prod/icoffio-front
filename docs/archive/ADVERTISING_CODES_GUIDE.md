# 📈 Руководство по рекламным кодам icoffio

> **Цель:** Централизованное управление всеми рекламными скриптами и кодами в проекте icoffio

## ✅ Актуальный статус (v8.6.6, 2026-02-14)

- **Production:** Docker Compose на VPS#2 (`178.104.223.93`); репозиторий root `icoffio-front`, ветка `feature/info-portal` (все рекламные правки делаем здесь)
- **Display реклама:** стабилизирована, EN/PL синхронизированы, неподходящие креативы скрываются
- **Live debug:** `npm run ad:live-debug` -> отчет `.playwright-mcp/live-ad-debug-report.json`
- **Видео скрипт/модуль найден и подключен:** `components/VideoPlayer.tsx`
- **Видео плеер добавлен в конец статьи:** `app/[locale]/(site)/article/[slug]/page.tsx`
- **Mobile in-content восстановлен:** бывшие правые плейсменты переиспользуются между текстовыми блоками
- **Исправлена деформация последнего mobile баннера:** ad-only контейнер без принудительного сжатия
- **Нижний mobile `320x100` в статье отключен:** заменен на более стабильные in-content врезки
- **Перед video-slot добавлен мобильный `320x50`:** мягкий финальный формат без агрессивной высоты
- **Источник VOX SDK:** `https://st.hbrd.io/ssp.js` (через `lib/vox-advertising.ts`)

### Правило релизов (обязательное)

1. Любое изменение рекламы = новая версия в `package.json`
2. Обязательно запись в `CHANGELOG.md`
3. Обязательно `git push origin feature/info-portal`
4. Обязательно деплой на VPS#2 (см. CLAUDE.md → "Deployment")

## 📋 Содержание

1. [Текущие рекламные коды](#текущие-рекламные-коды)
2. [Google Analytics](#google-analytics)
3. [Локации размещения](#локации-размещения)
4. [Типы рекламы](#типы-рекламы)
5. [Инструкции по добавлению](#инструкции-по-добавлению)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Текущие рекламные коды

### 1. VOX (st.hbrd.io) - In-Image реклама

**Статус:** ✅ Активен  
**PlaceID:** `63d93bb54d506e95f039e2e3`  
**Тип:** Интеграция в изображения  

#### Текущий код:
```javascript
<script>
if (typeof window._tx === "undefined") {
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.async = true;
    s.src = "https://st.hbrd.io/ssp.js?t=" + new Date().getTime();
    (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]).appendChild(s);
}
window._tx = window._tx || {};
window._tx.cmds = window._tx.cmds || [];

// Функция для инициализации VOX с ожиданием загрузки изображений
function initVOX() {
                  window._tx.integrateInImage({
                  placeId: "63d93bb54d506e95f039e2e3",
                  fetchSelector: true,
                  setDisplayBlock: true
              });
    window._tx.init();
}

window._tx.cmds.push(function () {
    // Проверяем готовность изображений и DOM
    if (document.readyState === 'complete') {
        // Страница уже полностью загружена
        initVOX();
    } else {
        // Ждем полной загрузки включая изображения
        window.addEventListener('load', function() {
            initVOX();
        });
        
        // Дополнительная задержка для надежности
        setTimeout(function() {
            initVOX();
        }, 2000);
    }
});
</script>
```

**Размещение:**
- ✅ Next.js: `app/[locale]/layout.tsx` (строки 189-212)
- ✅ WordPress: Ad Inserter плагин (Block 1)
- ✅ WordPress: functions.php (для программного добавления)

---

## 📍 Локации размещения

### Next.js Frontend (icoffio.com)

#### 1. Layout.tsx - Глобальные скрипты
**Файл:** `app/[locale]/layout.tsx`  
**Назначение:** Скрипты, которые должны загружаться на всех страницах  
**Расположение:** В `<body>` перед закрывающим тегом

```jsx
{/* VOX Advertising Script - In-Image Ads */}
<script dangerouslySetInnerHTML={{ __html: `[КОД]` }} />
```

#### 2. Компоненты - Целевые скрипты
**Файлы:** `components/*.tsx`  
**Назначение:** Скрипты для конкретных компонентов/страниц

#### 3. Страницы - Специфичные скрипты
**Файлы:** `app/[locale]/(site)/*/page.tsx`  
**Назначение:** Скрипты только для определенных страниц

### WordPress Backend (icoffio.com/wp-admin)

#### 1. Ad Inserter плагин
**Расположение:** Админка → Плагины → Ad Inserter  
**Блоки:** Block 1, Block 2, etc.  
**Настройки:** Header, Footer, Content

#### 2. functions.php
**Файл:** `wp-content/themes/[theme]/functions.php`  
**Назначение:** Программное добавление через PHP

```php
function add_advertising_scripts() {
    if (!is_admin()) {
        // Код здесь
    }
}
add_action('wp_footer', 'add_advertising_scripts');
```

---

## 🏷️ Типы рекламы

### 1. VOX In-Image реклама ✅ АКТИВНО
- **PlaceID:** `63d93bb54d506e95f039e2e3`
- **Провайдер:** VOX (st.hbrd.io) 
- **Принцип:** Интеграция в существующие изображения
- **Размещение:** Глобально через `app/[locale]/layout.tsx`
- **Плюсы:** Не нарушает дизайн, высокий CTR
- **Минусы:** Зависит от количества изображений

### 2. VOX Display баннеры ✅ АКТИВНО  
- **Провайдер:** VOX (st.hbrd.io)
- **Принцип:** Дисплейные баннеры фиксированных размеров
- **Размещение:** Только в статьях, компоненты `InlineAd.tsx` и `SidebarAd.tsx`

#### **Форматы и PlaceID:**

**Desktop форматы (стабильные):**
- **728x90 (Leaderboard)** `63da9b577bc72f39bc3bfc68` - после заголовка
- **300x250 (Medium Rectangle)** `63da9e2a4d506e16acfd2a36` - в сайдбаре сверху
- **970x250 (Large Leaderboard)** `63daa3c24d506e16acfd2a38` - в конце статьи
- **300x600 (Large Skyscraper)** `63daa2ea7bc72f39bc3bfc72` - в сайдбаре снизу

**Mobile форматы (новые - 2025-10-28):**
- **320x50 (Mobile Banner)** `68f644dc70e7b26b58596f34` - мобильный баннер сверху
- **320x100 (Large Mobile Banner)** `68f645bf810d98e1a08f272f` - большой мобильный баннер
- **160x600 (Wide Skyscraper Mobile)** `68f6451d810d98e1a08f2725` - вертикальный баннер

**Display форматы (новые - 2025-10-28):**
- **320x480 (Mobile Interstitial)** `68f63437810d98e1a08f26de` - полноэкранный мобильный баннер

#### **Компоненты:**
- ✅ **UniversalAd** - универсальный компонент для всех форматов (NEW v7.6.0)
- ✅ **InlineAd** - для баннеров в контенте (DEPRECATED, используйте UniversalAd)
- ✅ **SidebarAd** - для баннеров в сайдбаре (DEPRECATED, используйте UniversalAd)
- ✅ Строгая типизация форматов
- ✅ Правильные размеры без обрезания
- ✅ Централизованная конфигурация через `lib/config/adPlacements.ts`
- ✅ Управление через админ-панель (/admin → Advertising)

#### **Особенности:**
- ✅ Только в статьях (НЕ на главной)
- ✅ Полные размеры баннеров без обрезания
- ✅ Responsive + темная тема
- ✅ Использует общий VOX скрипт (без дублирования)

### 3. Native реклама
- **Провайдер:** [Планируется]
- **Принцип:** Интеграция в контент
- **Размещение:** Между статьями, в списках

### 4. Video реклама ✅ АКТИВНО
- **Провайдер:** VOX (st.hbrd.io)
- **Компонент:** `components/VideoPlayer.tsx`
- **Конфиг:** `lib/config/video-players.ts`
- **Текущее размещение:** конец статьи (`article-end`) в `app/[locale]/(site)/article/[slug]/page.tsx`
- **Принцип:** один видеослот в конце статьи (не мешает чтению), поддержка instream/outstream PlaceID

#### Video PlaceID
- `68f70a1c810d98e1a08f2740` - Instream Article End
- `68f70a1c810d98e1a08f2741` - Instream Article Middle
- `68f70a1c810d98e1a08f2742` - Outstream Sidebar
- `68f70a1c810d98e1a08f2743` - Outstream Mobile

#### Как работает сейчас
- Если задан `NEXT_PUBLIC_ARTICLE_VIDEO_URL`, плеер показывает контент-видео + рекламный слой VOX
- Если URL видео не задан, слот работает как video-ad контейнер (реклама без контентного ролика)
- Инициализация выполняется единым VOX скриптом из `layout.tsx`, дублирования SDK нет

#### Рекомендованный режим (чтобы не перегружать страницу)
- Держать в статье только 1 видеослот (в конце статьи)
- Не включать одновременно `instream-article-middle` до A/B проверки
- Для mobile оставить только один outstream/instream слот на страницу
- Если нет подходящего креатива, слот оставлять пустым (не подставлять другой формат)

---

## ➕ Инструкции по добавлению

### Новый глобальный скрипт в Next.js

1. **Откройте:** `app/[locale]/layout.tsx`
2. **Найдите:** секцию с рекламными скриптами (строка ~189)
3. **Добавьте новый скрипт:**

```jsx
{/* [НАЗВАНИЕ РЕКЛАМЫ] - [ОПИСАНИЕ] */}
<script
  dangerouslySetInnerHTML={{
    __html: `
      // Ваш рекламный код здесь
    `,
  }}
/>
```

### 🆕 Использование компонентов рекламы в Next.js (v7.6.0 - Новая система)

#### UniversalAd - Рекомендуется для всех форматов

```jsx
import { UniversalAd } from "@/components/UniversalAd";

// Desktop Leaderboard после заголовка
<UniversalAd 
  placeId="63da9b577bc72f39bc3bfc68" 
  format="728x90" 
  placement="inline"
  className="mb-6"
/>

// Mobile Banner
<UniversalAd 
  placeId="68f644dc70e7b26b58596f34" 
  format="320x50" 
  placement="mobile"
  className="my-4"
/>

// Sidebar баннер
<UniversalAd 
  placeId="63da9e2a4d506e16acfd2a36" 
  format="300x250" 
  placement="sidebar"
/>

// Display интерстициал
<UniversalAd 
  placeId="68f63437810d98e1a08f26de" 
  format="320x480" 
  placement="display"
/>
```

#### 📊 Управление через конфигурацию (РЕКОМЕНДУЕТСЯ)

Система v7.6.0 использует централизованную конфигурацию:

```jsx
import { getAdPlacementsByLocation } from "@/lib/config/adPlacements";

// В компоненте страницы
const articleAds = getAdPlacementsByLocation('article');
const adsContentTop = articleAds.filter(ad => ad.position === 'content-top');

// Рендерим динамически
{adsContentTop.map((ad) => (
  <UniversalAd 
    key={ad.id}
    placeId={ad.placeId} 
    format={ad.format}
    placement={ad.placement}
    enabled={ad.enabled}
  />
))}
```

**Преимущества:**
- ✅ Централизованное управление всеми рекламными местами
- ✅ Легко включать/выключать рекламу без правки кода
- ✅ Управление через админ-панель
- ✅ Поддержка приоритетов и статусов
- ✅ Автоматическая адаптация под устройства

#### 🔧 Управление через админ-панель

1. Откройте админ-панель: `/admin`
2. Перейдите в раздел **Advertising** (📊 иконка)
3. Просмотрите все рекламные места
4. Используйте фильтры: All / Desktop / Mobile
5. Копируйте код компонентов кнопкой "📋 Код"

#### ⚙️ Редактирование конфигурации

Файл: `lib/config/adPlacements.ts`

```typescript
{
  id: 'mobile-1',
  placeId: '68f644dc70e7b26b58596f34',
  format: '320x50',
  placement: 'mobile',
  name: 'Mobile Banner Top',
  description: '320x50 баннер в верхней части (Mobile)',
  location: 'article',
  position: 'header',
  enabled: true,  // ← Включить/выключить
  priority: 9,     // ← Приоритет (1-10)
  device: 'mobile',
  addedDate: '2025-10-28',
  status: 'new'    // stable | new | testing
}
```

#### 📜 Старая система (DEPRECATED)

InlineAd и SidebarAd остаются для обратной совместимости:

```jsx
// ⚠️ DEPRECATED - используйте UniversalAd
import { InlineAd } from "@/components/InlineAd";
import { SidebarAd } from "@/components/SidebarAd";
```

### Новый блок в WordPress Ad Inserter

1. **Войдите:** WordPress Admin → Плагины → Ad Inserter
2. **Создайте новый блок:** Block [номер]
3. **Вставьте код:** В поле HTML/JavaScript
4. **Настройте показ:** Pages, Posts, Categories
5. **Сохраните:** Settings

### Программное добавление в WordPress

1. **Откройте:** `functions.php` темы
2. **Добавьте функцию:**

```php
function add_[название]_advertising() {
    if (!is_admin()) {
        ?>
        <script>
        // Ваш код здесь
        </script>
        <?php
    }
}
add_action('wp_footer', 'add_[название]_advertising');
```

---

## 🔧 Troubleshooting

### Скрипт не загружается

1. **Проверьте консоль:** Developer Tools → Console
2. **Проверьте Network:** Developer Tools → Network
3. **Проверьте Content Security Policy:** Может блокировать внешние скрипты
4. **Проверьте AdBlock:** Может блокировать рекламные домены

### ⚠️ VOX работает только после обновления страницы

**Проблема:** Скрипт выполняется до загрузки изображений  
**Решение:** Используйте улучшенный VOX код с ожиданием загрузки

```javascript
// ✅ ПРАВИЛЬНО - с ожиданием загрузки изображений
function initVOX() {
    window._tx.integrateInImage({
        placeId: "YOUR_PLACE_ID",
        fetchSelector: true,
    });
    window._tx.init();
}

window._tx.cmds.push(function () {
    if (document.readyState === 'complete') {
        initVOX();
    } else {
        window.addEventListener('load', initVOX);
        setTimeout(initVOX, 2000); // Fallback
    }
});

// ❌ НЕПРАВИЛЬНО - без ожидания
window._tx.cmds.push(function () {
    window._tx.integrateInImage({...}); // Может выполниться слишком рано
    window._tx.init();
});
```

### Скрипт конфликтует с другими

1. **Используйте условия:** `if (typeof window.variable === "undefined")`
2. **Проверьте порядок загрузки:** Некоторые скрипты зависят от других
3. **Используйте namespace:** Избегайте глобальных переменных

### Реклама не отображается

#### 🔍 **Диагностика VOX проблем:**

**Проверьте в консоли браузера:**
```javascript
// Проверка статуса VOX
console.log('VOX Status:', window._tx?.status);
console.log('Places:', window._tx?.allPlaces);

// Если видите places: {} - PlaceID неактивен!
```

#### ❌ **Контейнеры НЕ создаются (0 найдено)**

**Основные причины:**
1. **PlaceID неактивен/неправильный** - самая частая проблема
2. **Домен не авторизован** для данного PlaceID в системе VOX
3. **Селектор блокирует** (например, `selector: "img"`)

**Решения:**
- Свяжитесь с поставщиком VOX для активации PlaceID
- Авторизуйте домен в панели VOX
- Используйте конфигурацию без селектора:

```javascript
window._tx.integrateInImage({
    placeId: "63d93bb54d506e95f039e2e3",
    setDisplayBlock: true
    // НЕ добавляйте selector: "img"
});
```

#### 🔄 **Реклама работает после обновления, но не при первом посещении**

**Причины:**
1. **Timing проблема** - VOX выполняется до загрузки изображений
2. **Next.js client-side navigation** - VOX не перезапускается при переходах между страницами

**Решение (уже реализовано в коде):**
```javascript
// Отслеживание URL для Next.js client-side routing
window._voxLastUrl = window._voxLastUrl || '';

function checkAndInitVOX() {
    const currentUrl = window.location.href;
    if (window._voxLastUrl !== currentUrl || window._voxLastUrl === '') {
        window._voxLastUrl = currentUrl;
        setTimeout(() => initVOX(), 1000); // Задержка для контента
    }
}

// Мониторинг каждые 1.5 секунды + обычные события
setInterval(checkAndInitVOX, 1500);
window.addEventListener('load', checkAndInitVOX);
```

#### ✅ **Контейнеры создаются, но реклама невидима**

1. **Добавьте setDisplayBlock:** `setDisplayBlock: true`
2. **Проверьте geo-targeting:** Реклама может быть недоступна в регионе  
3. **Проверьте content-policy:** Контент может не соответствовать политике

#### 🎯 **ИЗБИРАТЕЛЬНАЯ РЕКЛАМА - показ только в статьях**

**Проблема:** Реклама появлялась везде - на главной, в миниатюрах, в рекомендациях

**Решение (реализовано в коде):**
```javascript
function initVOX() {
    // 1. Проверка URL - только страницы статей
    const isArticlePage = window.location.pathname.includes('/article/');
    if (!isArticlePage) {
        console.log('VOX: Не страница статьи, реклама отключена');
        return;
    }
    
    // 2. Точные селекторы - исключаем миниатюры
    window._tx.integrateInImage({
        placeId: "63d93bb54d506e95f039e2e3",
        selector: 'article img:not(.group img):not([class*="aspect-[16/9]"] img), .prose img, article > div img',
    });
    window._tx.init();
}
```

**Объяснение селекторов:**
- `article img` - все изображения в article контейнерах
- `:not(.group img)` - ❌ ИСКЛЮЧАЕТ миниатюры в .group (ArticleCard, RelatedArticles)
- `:not([class*="aspect-[16/9]"] img)` - ❌ ИСКЛЮЧАЕТ карточки с aspect-ratio 16:9  
- `.prose img` - ✅ ВКЛЮЧАЕТ изображения в контенте статей
- `article > div img` - ✅ ВКЛЮЧАЕТ героические изображения статей

**Результат:**
- ✅ Главная страница - БЕЗ рекламы (UX friendly)
- ✅ Страницы статей - реклама ТОЛЬКО в контенте
- ✅ Рекомендации - БЕЗ рекламы на миниатюрах

### Медленная загрузка

1. **Используйте async/defer:** Для неблокирующей загрузки
2. **Кэшируйте статичные ресурсы:** Через CDN
3. **Оптимизируйте размер:** Минификация кода
4. **Lazy loading:** Загрузка по требованию

---

## 🎯 ФИНАЛЬНАЯ ДИАГНОСТИКА (09.10.2025)

### ✅ **ТЕХНИЧЕСКОЕ СОСТОЯНИЕ - ВСЕ ИСПРАВЛЕНО**

**Статус:** 🟢 Полностью исправлен  
**Проверено:** 09.10.2025 12:09  

#### **Что работает идеально:**
- ✅ VOX скрипт загружается (`st.hbrd.io/ssp.js`)
- ✅ DSP запросы делаются (4 запроса к `ssp.hybrid.ai`)
- ✅ Все PlaceID используются правильно
- ✅ Display контейнеры создаются с правильными размерами
- ✅ In-image селектор исправлен и находит изображения
- ✅ Сетевая активность подтверждена
- ✅ Google Analytics работает

#### **Найденные PlaceID (все активны):**
```javascript
// In-Image реклама
"63d93bb54d506e95f039e2e3" - поверх изображений статей

// Display форматы  
"63da9b577bc72f39bc3bfc68" - 728x90 Leaderboard (после заголовка)
"63da9e2a4d506e16acfd2a36" - 300x250 Medium Rectangle (сайдбар верх)
"63daa3c24d506e16acfd2a38" - 970x250 Large Leaderboard (конец статьи)
"63daa2ea7bc72f39bc3bfc72" - 300x600 Large Skyscraper (сайдбар низ)
```

### ❌ **ПРОБЛЕМА НА СТОРОНЕ ПРОВАЙДЕРА**

**Диагноз:** DSP отвечает статусом `204 No Content`  
**Причина:** Нет активных рекламных кампаний для данного трафика

#### **Что нужно сделать у провайдера:**
1. 🎯 **Добавить рекламные кампании** для всех PlaceID
2. 🌍 **Настроить таргетинг** на польский трафик (`pl-PL`)
3. 🔗 **Проверить домен** `app.icoffio.com` в whitelist
4. 💰 **Увеличить ставки** для качественного трафика
5. 📊 **Активировать fill rate** для всех форматов

**Вывод:** Код работает на 100%, проблема в настройках кампаний у VOX/Hybrid.ai

---

## 📊 Мониторинг и аналитика

### Google Analytics ✅ НАСТРОЕН

**Статус:** ✅ Активен  
**GA ID:** `G-35P327PYGH`  
**Компонент:** `components/Analytics.tsx`  
**Размещение:** `app/[locale]/layout.tsx`  

#### Код интеграции:
```javascript
<Analytics gaId={process.env.NEXT_PUBLIC_GA_ID || 'G-35P327PYGH'} />
```

#### Особенности:
- ✅ Автоматическое отслеживание page views
- ✅ SPA навигация (Next.js routing)
- ✅ Кастомные события (поиск, подписка, социальные сети)
- ✅ Только в production режиме
- ✅ GDPR compliant cookies

#### Доступные tracking функции:
- `trackEvent()` - произвольные события  
- `trackSearch()` - поисковые запросы
- `trackArticleView()` - просмотры статей
- `trackNewsletterSignup()` - подписки на рассылку
- `trackSocialShare()` - социальные репосты

### Ключевые метрики

- **Impressions:** Количество показов
- **CTR:** Click-through rate
- **Revenue:** Доход от рекламы
- **Loading Time:** Время загрузки скриптов
- **Error Rate:** Процент ошибок загрузки
- **Page Views:** Google Analytics
- **User Behavior:** GA событийная аналитика

### Инструменты мониторинга

- **Google Analytics:** `G-35P327PYGH` - полная аналитика сайта
- **Console Logs:** Отслеживание ошибок рекламы
- **Network Analysis:** Производительность загрузки
- **Provider Analytics:** Панели рекламных провайдеров (VOX/Hybrid)
- **Web Vitals:** Производительность сайта

---

## 📝 Чеклист при добавлении нового кода

- [ ] Код протестирован локально
- [ ] Добавлены комментарии с описанием
- [ ] Проверена совместимость с существующими скриптами
- [ ] Добавлены обработчики ошибок
- [ ] Обновлена документация
- [ ] Проверена производительность
- [ ] Тестирование на разных устройствах/браузерах

---

## 🆘 Контакты и поддержка

### Техническая поддержка
- **Разработчик:** Andrey (icoffio team)
- **GitHub Issues:** [ссылка на репозиторий]

### Рекламные провайдеры
- **VOX Support:** [контактные данные]
- **[Другие провайдеры]:** [контактные данные]

---

## 📅 История изменений

### 2025-01-12
- ✅ Создание документации
- ✅ Документирование текущего VOX скрипта  
- ✅ Обновление VOX скрипта (убран setDisplayBlock: true)
- ✅ **ИСПРАВЛЕНИЕ TIMING ПРОБЛЕМЫ** - добавлено ожидание загрузки изображений
- ✅ Добавлена функция initVOX() с проверкой document.readyState
- ✅ Добавлен window load event listener для надежности  
- ✅ Добавлен timeout fallback (2 сек) для дополнительной гарантии
- ✅ **ВОССТАНОВЛЕН setDisplayBlock: true** - критический параметр для отображения рекламы
- ✅ **ВОССТАНОВЛЕН НА ОРИГИНАЛЬНЫЙ КОД** - вернулись к рабочей версии с fetchSelector: true
- ✅ **ИСПРАВЛЕН TIMING** - добавлена логика ожидания загрузки DOM и изображений  
- ✅ **ИСПРАВЛЕНА NEXT.JS NAVIGATION** - VOX перезапускается при client-side переходах
- ✅ **URL TRACKING** - автоматическое отслеживание изменений страниц (setInterval 1.5s)
- ✅ **PlaceID АКТИВИРОВАН** - PlaceID работает, DSP запросы успешны (коды 200)
- ✅ **КРЕАТИВЫ ЗАГРУЖАЮТСЯ** - видео, анимации, SVG контент подгружается
- ✅ Структура для будущих рекламных кодов
- ✅ **ИЗБИРАТЕЛЬНАЯ РЕКЛАМА** - показывается ТОЛЬКО в статьях, исключает миниатюры
- ✅ **URL ФИЛЬТРАЦИЯ** - VOX работает только на страницах /article/[slug]  
- ✅ **ТОЧНЫЕ СЕЛЕКТОРЫ** - исключает .group img и aspect-[16/9] img (миниатюры)
- ✅ **ПОЛНОЕ РЕШЕНИЕ** - работает на всех страницах при любом способе навигации

### 2025-01-13 - РЕЛИЗ v1.2.0: ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ DISPLAY РЕКЛАМЫ
- ✅ **СОЗДАН КОМПОНЕНТ SidebarAd** - специально для рекламы в сайдбаре (300x250, 300x600)
- ✅ **ИСПРАВЛЕН КОМПОНЕНТ InlineAd** - поддержка всех форматов (728x90, 300x250, 300x600, 970x250)
- ✅ **СТРОГАЯ ТИПИЗАЦИЯ** - union типы для форматов, предотвращает ошибки
- ✅ **УБРАНЫ ОБРЕЗАННЫЕ БАННЕРЫ** - заменен прямой HTML на компоненты с правильными размерами
- ✅ **ПОЛНЫЕ РАЗМЕРЫ БАННЕРОВ** - все форматы отображаются без обрезания
- ✅ **ПРАВИЛЬНЫЕ PlaceID** - все соответствуют документации VOX
- ✅ **ЧИСТЫЙ КОД** - убраны inline стили, улучшена структура
- ✅ **ВЕРСИЯ 1.2.0** - значительные функциональные улучшения компонентов рекламы
- ✅ **ГОТОВО К ПРОДАКШН** - протестировано и работает на app.icoffio.com

### 2025-01-13 - РЕЛИЗ v1.3.0: ИСПРАВЛЕНИЕ ТЕМНОЙ ТЕМЫ
- ✅ **ИСПРАВЛЕНА ТЕМНАЯ ТЕМА** - переключатель теперь работает визуально
- ✅ **TAILWIND CSS** - добавлен `darkMode: 'class'` для поддержки класса `.dark`
- ✅ **ГЛОБАЛЬНЫЕ СТИЛИ** - исправлены CSS переменные для поддержки `.dark` класса
- ✅ **ВИЗУАЛЬНЫЕ ИЗМЕНЕНИЯ** - фон и текст теперь корректно переключаются между светлой/темной темой
- ✅ **ПОЛНАЯ ФУНКЦИОНАЛЬНОСТЬ** - Light 🌞 / Dark 🌙 / System 🖥️ режимы работают
- ✅ **UX УЛУЧШЕНИЯ** - плавные переходы между темами (0.3s transition)
- ✅ **СОВМЕСТИМОСТЬ** - поддержка изображений в темной теме
- ✅ **КРИТИЧЕСКИЙ БАГФИКС** - устранена проблема с нефункционирующим переключателем темы
- ✅ **ВЕРСИЯ 1.3.0** - критическое исправление пользовательского опыта
- ✅ **ПРОТЕСТИРОВАНО** - работает на app.icoffio.com

### 2025-10-28 - РЕЛИЗ v7.6.0: РЕВОЛЮЦИОННАЯ СИСТЕМА УПРАВЛЕНИЯ РЕКЛАМОЙ
- ✅ **СОЗДАН UniversalAd** - универсальный компонент для всех форматов рекламы
- ✅ **ДОБАВЛЕНЫ МОБИЛЬНЫЕ ФОРМАТЫ** - 320x50, 320x100, 160x600
- ✅ **ДОБАВЛЕНЫ DISPLAY ФОРМАТЫ** - 320x480 Mobile Interstitial
- ✅ **ЦЕНТРАЛИЗОВАННАЯ КОНФИГУРАЦИЯ** - `lib/config/adPlacements.ts`
- ✅ **АДМИН-ПАНЕЛЬ УПРАВЛЕНИЯ** - новый раздел "Advertising" в `/admin`
- ✅ **ДИНАМИЧЕСКАЯ СИСТЕМА** - рекламные места управляются через конфигурацию
- ✅ **ФИЛЬТРЫ И ПОИСК** - по устройствам (Desktop/Mobile), статусам, названиям
- ✅ **ПРИОРИТЕТЫ И СТАТУСЫ** - stable/new/testing с визуальными индикаторами
- ✅ **КОПИРОВАНИЕ КОДА** - кнопка для быстрого копирования компонентов
- ✅ **ПОЛНАЯ ТИПИЗАЦИЯ** - TypeScript типы для всех конфигураций
- ✅ **ОБРАТНАЯ СОВМЕСТИМОСТЬ** - InlineAd и SidebarAd остаются рабочими

**Новые PlaceID:**
- `68f644dc70e7b26b58596f34` - 320x50 Mobile Banner
- `68f6451d810d98e1a08f2725` - 160x600 Wide Skyscraper
- `68f645bf810d98e1a08f272f` - 320x100 Large Mobile Banner
- `68f63437810d98e1a08f26de` - 320x480 Mobile Interstitial

**Статистика:**
- Всего рекламных мест: 8 (4 desktop + 4 mobile/display)
- Активных по умолчанию: 7 (160x600 отключен как навязчивый)
- Управляемых через админку: 100%

**Миграция:**
- Старые компоненты InlineAd/SidebarAd → DEPRECATED (но работают)
- Новые страницы используют UniversalAd + конфигурацию
- Админ-панель позволяет управлять без правки кода

**СИСТЕМА ГОТОВА К МАСШТАБИРОВАНИЮ** - легко добавлять новые места через конфиг

### [Будущие обновления]
- [ ] v7.7.0: API для управления рекламой из админки (изменение enabled/priority)
- [ ] v7.7.0: Статистика показов и кликов по PlaceID
- [ ] v7.8.0: A/B тестирование рекламных мест
- [ ] v7.8.0: Автоматическое переключение между PlaceID при низком fill rate

---

> **Примечание:** Регулярно обновляйте эту документацию при добавлении новых рекламных кодов или изменении существующих.
>
> **v7.6.0 Recommendation:** Используйте новую систему с UniversalAd и централизованной конфигурацией для максимальной гибкости управления.
