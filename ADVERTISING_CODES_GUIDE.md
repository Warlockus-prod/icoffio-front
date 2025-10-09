# 📈 Руководство по рекламным кодам icoffio

> **Цель:** Централизованное управление всеми рекламными скриптами и кодами в проекте icoffio

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
- **Размещение:** Только в статьях, компонент `DisplayAd.tsx`

#### **Форматы и PlaceID:**
- **728x90 (Leaderboard)** `63da9b577bc72f39bc3bfc68` - после заголовка
- **300x250 (Medium Rectangle)** `63da9e2a4d506e16acfd2a36` - в сайдбаре сверху  
- **970x250 (Large Leaderboard)** `63daa3c24d506e16acfd2a38` - в конце статьи
- **300x600 (Large Skyscraper)** `63daa2ea7bc72f39bc3bfc72` - в сайдбаре снизу

#### **Особенности:**
- ✅ Только в статьях (НЕ на главной)
- ✅ Плейсхолдеры с визуализацией размещения
- ✅ Responsive + темная тема
- ✅ Использует общий VOX скрипт (без дублирования)

### 3. Native реклама
- **Провайдер:** [Планируется]
- **Принцип:** Интеграция в контент
- **Размещение:** Между статьями, в списках

### 4. Video реклама
- **Провайдер:** [Планируется]
- **Принцип:** Pre-roll, Mid-roll, Overlay
- **Размещение:** В видео контенте

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

### [Дата]
- [Изменения]

---

> **Примечание:** Регулярно обновляйте эту документацию при добавлении новых рекламных кодов или изменении существующих.
