# 📈 Hybrid Advertising Strategy

> **Status:** ✅ VOX script in Next.js + Ad Inserter in WordPress for maximum coverage

## 🎯 ГИБРИДНАЯ СТРАТЕГИЯ РЕКЛАМЫ

### **📊 ПОКРЫТИЕ ВСЕХ СТРАНИЦ:**
- ✅ **Next.js страницы** (www.icoffio.com) → VOX скрипт в layout.tsx
- ✅ **WordPress страницы** (icoffio.com/wp-admin) → Ad Inserter плагин
- 🎯 **Максимальное покрытие** без дублирования

### **💡 ПОЧЕМУ ГИБРИДНАЯ МОДЕЛЬ:**
- WordPress Ad Inserter работает только на WP страницах  
- Next.js красивый дизайн нуждается в собственной рекламе
- VOX интегрируется в изображения на фронтенде
- Ad Inserter управляет рекламой в контенте WordPress

---

## 🎯 РЕКЛАМНЫЕ СКРИПТЫ В WORDPRESS

### **1️⃣ СПОСОБ 1: Ad Inserter плагин (РЕКОМЕНДУЮ)**

**Установка:**
```bash
# В icoffio.com/wp-admin:
Plugins → Add New → Search "Ad Inserter" → Install & Activate
```

**Настройка рекламного скрипта:**
```javascript
// В Ad Inserter → Block 1 → HTML/JavaScript:
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
window._tx.cmds.push(function () {
    window._tx.integrateInImage({
        placeId: "63d93bb54d506e95f039e2e3",
        fetchSelector: true,
    });
    window._tx.init();
});
</script>
```

**Настройка блока:**
- ☑️ **Insertion:** Footer
- ☑️ **Pages:** All pages
- ☑️ **Device:** All devices

---

### **2️⃣ СПОСОБ 2: Functions.php (для разработчиков)**

```php
// В theme functions.php:
function add_advertising_scripts() {
    if (!is_admin()) {
        ?>
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
        window._tx.cmds.push(function () {
            window._tx.integrateInImage({
                placeId: "63d93bb54d506e95f039e2e3",
                fetchSelector: true,
                setDisplayBlock: true
            });
            window._tx.init();
        });
        </script>
        <?php
    }
}
add_action('wp_footer', 'add_advertising_scripts');
```

---

### **3️⃣ СПОСОБ 3: Header/Footer Scripts плагин**

```bash
# Установить: Insert Headers and Footers плагин
# Settings → Insert Headers and Footers → Scripts in Footer
# Вставить скрипт в Footer Scripts секцию
```

---

## 📊 **ДОПОЛНИТЕЛЬНЫЕ РЕКЛАМНЫЕ БЛОКИ**

### **AdSense блоки через Ad Inserter:**

**Block 1: After Post Title**
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXX"
     data-ad-slot="1234567890"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

**Block 2: After 1st Paragraph**
- Insertion: After paragraph 1
- Show on: Single post  
- Device: All devices

**Block 3: Sidebar Widget**
- Insertion: Widget
- Position: Sidebar
- Size: 300x250 rectangle

---

## 🎯 **ПРЕИМУЩЕСТВА ЭТОГО ПОДХОДА:**

### **✅ ЦЕНТРАЛИЗОВАННОЕ УПРАВЛЕНИЕ:**
```bash
✅ Все реклама в одном месте (WordPress админка)
✅ Изменения без редеплоя Next.js
✅ A/B тестирование позиций  
✅ Статистика кликов и доходов
✅ Conditional display (по категориям/устройствам)
```

### **🔧 ТЕХНИЧЕСКАЯ ГИБКОСТЬ:**
```bash
✅ Работает на всех доменах: 
   - icoffio.com (основной WordPress)
   - www.icoffio.com (если ссылки на WordPress)
   - app.icoffio.com (для рекламных консолей)
✅ Автоматическая вставка в новые статьи
✅ Респонсивные размеры для мобильных
✅ AdBlocker detection и fallback контент
```

---

## 🚀 **ПЛАН ВНЕДРЕНИЯ:**

**1️⃣ Сейчас:**
- Установить Ad Inserter в icoffio.com/wp-admin
- Добавить рекламный скрипт в Footer block

**2️⃣ Через день:**  
- Добавить AdSense блоки в контент
- Настроить A/B тестирование позиций

**3️⃣ Через неделю:**
- Проанализировать статистику  
- Оптимизировать размещение для максимальных доходов

**4️⃣ Через месяц:**
- Добавить геотаргетинг (US/EU разная реклама)
- Seasonal campaigns (праздничная реклама)
