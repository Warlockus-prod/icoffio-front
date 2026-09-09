# 🍪 Cookie Consent System - Полное руководство

**Дата:** 25 октября 2025  
**Версия:** 1.0.0  
**Статус:** ✅ Production Ready  
**GDPR Compliant:** ✅ Да  

---

## 📋 Обзор

Профессиональная система управления cookie consent для icoffio с полной поддержкой GDPR и других законов о конфиденциальности.

### ✨ Ключевые возможности

- ✅ **GDPR compliant** - полное соответствие европейским стандартам
- 🌍 **Мультиязычность** - 5 языков (en, ru, pl, de, es)
- 🎨 **Красивый UI** - современный дизайн с анимациями
- 📱 **Responsive** - отлично работает на всех устройствах
- 🔒 **Блокировка скриптов** - трекинг только с согласия пользователя
- 💾 **Persistent storage** - согласие сохраняется на 365 дней
- 🚀 **Легковесный** - всего ~5 KB дополнительного кода
- ⚡ **Без зависимостей** - нет внешних библиотек для consent

---

## 🏗️ Архитектура

### Компоненты

```
lib/
  useCookieConsent.ts          # Hook для управления состоянием consent
  
components/
  CookieConsent.tsx            # Основной баннер
  CookieSettings.tsx           # Модальное окно настроек
  
app/[locale]/
  layout.tsx                   # Интеграция в layout
  
components/
  Analytics.tsx                # Google Analytics с consent check
```

### Категории Cookies

1. **Necessary (Необходимые)** - всегда активны
   - Аутентификация пользователя
   - Настройки темы
   - Языковые предпочтения
   - Session management

2. **Analytics (Аналитические)** - опционально
   - Google Analytics (G-35P327PYGH)
   - Отслеживание page views
   - Пользовательское поведение
   - Производительность сайта

3. **Advertising (Рекламные)** - опционально
   - VOX реклама (In-Image + Display)
   - Персонализированная реклама
   - Retargeting
   - Измерение эффективности

---

## 🔧 Технические детали

### useCookieConsent Hook

**Расположение:** `lib/useCookieConsent.ts`

**Основные функции:**
```typescript
const {
  consentState,        // Текущее состояние consent
  showBanner,          // Показывать ли баннер
  isLoading,           // Загрузка настроек
  acceptAll,           // Принять все cookies
  rejectAll,           // Отклонить все (кроме necessary)
  saveCustomPreferences, // Сохранить выборочные настройки
  resetConsent,        // Сбросить согласие
  hasConsent,          // Проверить разрешение для категории
  setShowBanner        // Вручную управлять баннером
} = useCookieConsent();
```

**Хранение данных:**
- Ключ: `icoffio_cookie_consent`
- Место: `localStorage`
- Срок: 365 дней
- Версия: `1.0` (для инвалидации старых согласий)

**Структура данных:**
```json
{
  "hasConsented": true,
  "timestamp": 1729843200000,
  "preferences": {
    "necessary": true,
    "analytics": true,
    "advertising": false
  },
  "version": "1.0",
  "expiryDate": 1761379200000
}
```

### CookieConsent Component

**Расположение:** `components/CookieConsent.tsx`

**Переводы:**
- Поддерживает 5 языков: en, ru, pl, de, es
- Автоматическое переключение по locale
- Ссылки на Privacy Policy и Cookie Policy

**UI особенности:**
- Overlay с backdrop-blur для фокусировки внимания
- Анимации: fade-in, slide-in-from-bottom
- Три кнопки: Accept All, Reject All, Customize
- Accessibility: role="dialog", aria-labels

### CookieSettings Modal

**Расположение:** `components/CookieSettings.tsx`

**Функции:**
- Детальная информация о каждой категории cookies
- Toggle switches для analytics и advertising
- Necessary cookies всегда активны (без toggle)
- Сохранение, Accept All, Reject All кнопки

**UI особенности:**
- Центрированное модальное окно
- Scrollable content для длинного текста
- Close кнопка (X) в header
- Hover эффекты на cookie категориях

---

## 🔌 Интеграция

### 1. Google Analytics

**Файл:** `components/Analytics.tsx`

**Изменения:**
```typescript
// Проверка consent перед загрузкой
const [hasConsent, setHasConsent] = useState(false);

useEffect(() => {
  const consent = checkCookieConsent('analytics');
  setHasConsent(consent);
  
  // Слушаем изменения
  window.addEventListener('cookieConsentChanged', handleConsentChange);
}, []);

// GA загружается только если hasConsent === true
if (!hasConsent) {
  console.log('Analytics: Waiting for cookie consent');
  return;
}
```

### 2. VOX Реклама

**Файл:** `app/[locale]/layout.tsx`

**Изменения:**
```javascript
// Функция проверки consent
function hasAdvertisingConsent() {
  try {
    var saved = localStorage.getItem('icoffio_cookie_consent');
    if (!saved) return false;
    var parsed = JSON.parse(saved);
    return parsed.hasConsented && parsed.preferences.advertising;
  } catch (e) {
    return false;
  }
}

// Загрузка VOX только с согласием
function loadVOXScript() {
  if (!hasAdvertisingConsent()) {
    console.log('VOX: Ожидание согласия пользователя на рекламу');
    return;
  }
  // ... загрузка скрипта
}

// Слушаем изменения consent
window.addEventListener('cookieConsentChanged', function(event) {
  if (event.detail && event.detail.advertising) {
    // Перезагрузка страницы для активации рекламы
  }
});
```

### 3. Layout Integration

**Файл:** `app/[locale]/layout.tsx`

```tsx
import { CookieConsent } from "@/components/CookieConsent";

// В body, после всех компонентов
<CookieConsent locale={params.locale} />
```

---

## 🎯 Пользовательский опыт

### Первый визит

1. Пользователь заходит на сайт
2. Показывается overlay + баннер cookie consent
3. Блокируются Google Analytics и VOX реклама
4. Пользователь выбирает:
   - **Accept All** → все cookies разрешены, страница перезагружается
   - **Reject All** → только necessary cookies, баннер исчезает
   - **Customize** → открывается модальное окно настроек

### Настройки (Customize)

1. Открывается модальное окно
2. Три категории с описаниями:
   - Necessary (всегда активно)
   - Analytics (toggle switch)
   - Advertising (toggle switch)
3. Кнопки: Save Settings, Accept All, Reject All
4. После выбора страница НЕ перезагружается (с v10.23.2): компоненты перечитывают согласие по событию `cookieConsentChanged`; отказ хранится 30 дней, согласие — 365

### Повторные визиты

1. Consent загружается из localStorage
2. Баннер не показывается
3. Analytics и реклама работают согласно настройкам
4. Через 365 дней согласие истекает и баннер показывается снова

---

## 🔍 Тестирование

### Локальное тестирование

```bash
# Development режим
npm run dev

# Открыть в браузере
open http://localhost:3000/en

# Очистить localStorage для повторного теста
# В DevTools Console:
localStorage.removeItem('icoffio_cookie_consent')
window.location.reload()
```

### Production тестирование

```bash
# Build
npm run build

# Проверить bundle size
npm run build | grep "components/Cookie"

# Deploy на Vercel
git add .
git commit -m "✨ Add: Cookie Consent система (GDPR compliant)"
git push origin main
```

### Проверка работы

1. **Баннер отображается:**
   - Первый визит без consent
   - После очистки localStorage
   - После истечения срока (365 дней)

2. **Блокировка скриптов:**
   - Google Analytics НЕ загружается до Accept
   - VOX реклама НЕ инициализируется до Accept
   - Console логи показывают "Waiting for consent"

3. **Сохранение настроек:**
   - localStorage содержит правильные данные
   - После перезагрузки настройки сохраняются
   - Event 'cookieConsentChanged' триггерится

4. **Мультиязычность:**
   - Тексты переключаются по locale
   - Ссылки Privacy/Cookie Policy работают
   - Все 5 языков корректны

---

## 📊 Console логи для мониторинга

### Google Analytics
```
✅ Analytics: Loading Google Analytics with user consent
❌ Analytics: Waiting for cookie consent
```

### VOX Реклама
```
✅ VOX: Загрузка скрипта с согласием пользователя
✅ VOX: Инициализация начата для URL: ...
❌ VOX: Ожидание согласия пользователя на рекламу
❌ VOX: Пропуск инициализации - нет согласия на рекламу
```

### Cookie Consent
```
Cookie Consent: Ошибка загрузки настроек (если проблема)
Cookie Consent: Ошибка сохранения настроек (если проблема)
```

---

## 🔐 Юридическая информация

### GDPR Compliance

✅ **Требования выполнены:**
- Явное согласие перед установкой cookies
- Возможность отказа от необязательных cookies
- Детальная информация о каждом типе cookies
- Ссылки на Privacy Policy и Cookie Policy
- Срок хранения согласия (365 дней)
- Возможность изменить настройки в любой момент

### Рекомендации

1. **Создать страницы:**
   - `/[locale]/privacy` - Privacy Policy
   - `/[locale]/cookies` - Cookie Policy

2. **В Cookie Policy описать:**
   - Какие cookies используются
   - Для чего они нужны
   - Как долго хранятся
   - Как отключить cookies
   - Контакты для вопросов

3. **Обновить Privacy Policy:**
   - Добавить раздел о cookies
   - Описать используемые трекинг системы
   - Указать партнеров (Google, VOX)

---

## 📈 Метрики и аналитика

### Conversion Rate

**Отслеживание:**
```typescript
// В useCookieConsent.ts уже есть события
window.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
  detail: preferences 
}));
```

**Рекомендуемые метрики:**
- Accept All rate (% пользователей)
- Reject All rate (% пользователей)
- Customize rate (% пользователей)
- Analytics opt-in rate
- Advertising opt-in rate

**Google Analytics события:**
```typescript
// Добавить в Analytics.tsx
trackEvent('cookie_consent', 'engagement', 'accept_all');
trackEvent('cookie_consent', 'engagement', 'reject_all');
trackEvent('cookie_consent', 'engagement', 'customize');
```

---

## 🚀 Будущие улучшения

### Версия 1.1.0 (опционально)

- [ ] **Cookie Manager кнопка** в Footer для повторного открытия настроек
- [ ] **A/B тестирование** разных текстов баннера
- [ ] **Аналитика конверсии** consent
- [ ] **Региональные настройки** (GDPR только для EU)
- [ ] **Более детальные категории** (Marketing, Social Media, etc.)

### Версия 1.2.0 (опционально)

- [ ] **IAB TCF v2.2** compliance (для рекламных платформ)
- [ ] **Google Consent Mode v2** интеграция
- [ ] **Автоматическое сканирование** cookies на сайте
- [ ] **История изменений** согласия пользователя

---

## 🆘 Troubleshooting

### Баннер не показывается

**Проблема:** Баннер не появляется при первом визите

**Решение:**
```javascript
// Проверить localStorage
localStorage.getItem('icoffio_cookie_consent')

// Очистить и перезагрузить
localStorage.removeItem('icoffio_cookie_consent')
window.location.reload()
```

### Google Analytics не работает

**Проблема:** Analytics не загружается даже после Accept All

**Решение:**
```javascript
// Проверить consent
checkCookieConsent('analytics') // должно вернуть true

// Проверить событие
window.addEventListener('cookieConsentChanged', (e) => {
  console.log('Consent changed:', e.detail);
});

// Проверить ENV variable
console.log(process.env.NEXT_PUBLIC_GA_ID);
```

### VOX реклама не показывается

**Проблема:** Реклама не инициализируется после согласия

**Решение:**
```javascript
// Проверить consent
hasAdvertisingConsent() // в console

// Проверить VOX скрипт
console.log(window._tx);

// Перезагрузить страницу
window.location.reload();
```

### Баннер показывается каждый раз

**Проблема:** Баннер появляется при каждом визите

**Решение:**
```javascript
// Проверить localStorage
console.log(localStorage.getItem('icoffio_cookie_consent'));

// Проверить срок действия
const data = JSON.parse(localStorage.getItem('icoffio_cookie_consent'));
console.log('Expires:', new Date(data.expiryDate));

// Проверить версию
console.log('Version:', data.version);
```

---

## 📞 Поддержка

**Документация:** `/docs/COOKIE_CONSENT_GUIDE.md`  
**Код:** `lib/useCookieConsent.ts`, `components/CookieConsent.tsx`  
**Вопросы:** GitHub Issues или прямой контакт

---

## 🎉 Заключение

Cookie Consent система полностью готова к production использованию:

- ✅ Код написан и протестирован
- ✅ Build проходит без ошибок
- ✅ GDPR compliant
- ✅ Мультиязычная поддержка
- ✅ Блокировка трекинга работает
- ✅ UI/UX на высшем уровне
- ✅ Документация полная

**Статус:** 🚀 READY FOR DEPLOY

**Следующий шаг:** 
```bash
git add .
git commit -m "✨ Add: Cookie Consent система (GDPR compliant)"
git push origin main
```

После деплоя на Vercel система автоматически активируется на **app.icoffio.com**.


