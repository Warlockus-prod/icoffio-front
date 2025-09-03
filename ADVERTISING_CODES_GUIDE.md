# 📈 Руководство по рекламным кодам icoffio

> **Цель:** Централизованное управление всеми рекламными скриптами и кодами в проекте icoffio

## 📋 Содержание

1. [Текущие рекламные коды](#текущие-рекламные-коды)
2. [Локации размещения](#локации-размещения)
3. [Типы рекламы](#типы-рекламы)
4. [Инструкции по добавлению](#инструкции-по-добавлению)
5. [Troubleshooting](#troubleshooting)

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

### 1. In-Image реклама
- **Провайдер:** VOX (st.hbrd.io)
- **Принцип:** Интеграция в существующие изображения
- **Плюсы:** Не нарушает дизайн, высокий CTR
- **Минусы:** Зависит от количества изображений

### 2. Banner реклама
- **Провайдер:** [Планируется]
- **Принцип:** Статичные/анимированные баннеры
- **Размещение:** Header, Sidebar, Footer, Between content

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

#### ✅ **Контейнеры создаются, но реклама невидима**

1. **Добавьте setDisplayBlock:** `setDisplayBlock: true`
2. **Проверьте geo-targeting:** Реклама может быть недоступна в регионе  
3. **Проверьте content-policy:** Контент может не соответствовать политике

### Медленная загрузка

1. **Используйте async/defer:** Для неблокирующей загрузки
2. **Кэшируйте статичные ресурсы:** Через CDN
3. **Оптимизируйте размер:** Минификация кода
4. **Lazy loading:** Загрузка по требованию

---

## 📊 Мониторинг и аналитика

### Ключевые метрики

- **Impressions:** Количество показов
- **CTR:** Click-through rate
- **Revenue:** Доход от рекламы
- **Loading Time:** Время загрузки скриптов
- **Error Rate:** Процент ошибок загрузки

### Инструменты мониторинга

- **Google Analytics:** Событие загрузки рекламы
- **Console Logs:** Отслеживание ошибок
- **Network Analysis:** Производительность загрузки
- **Provider Analytics:** Панели рекламных провайдеров

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
- ✅ **ИСПРАВЛЕН selector: "img"** - блокировал выполнение initVOX, убран из конфигурации
- ❌ **ВЫЯВЛЕНА ПРОБЛЕМА PLACEID** - PlaceID неактивен или домен не авторизован
- ✅ **VOX TIMING РАБОТАЕТ** - функция initVOX выполняется с первого посещения
- ⚠️ **ТРЕБУЕТ АКТИВАЦИИ** - нужно активировать PlaceID у поставщика VOX
- ✅ Структура для будущих рекламных кодов
- ✅ **ДИАГНОСТИКА ДОБАВЛЕНА** - инструкции по проверке статуса PlaceID

### [Дата]
- [Изменения]

---

> **Примечание:** Регулярно обновляйте эту документацию при добавлении новых рекламных кодов или изменении существующих.
