# 📺 СИСТЕМА ВИДЕО ПЛЕЕРОВ С РЕКЛАМОЙ v7.9.0

## 🎯 Обзор

Профессиональная система видео плееров с поддержкой видео рекламы (preroll, midroll, postroll) и VOX Display интеграцией.

**Дата релиза**: 30 октября 2025  
**Версия**: v7.9.0  
**Предыдущая версия**: v7.8.1 (Content Prompts System)

---

## 📺 Типы видео плееров

### 1. **Instream Плееры** (с видео контентом)

**Что это**: Плеер с реальным видео контентом + реклама

**Форматы рекламы**:
- **Preroll** - реклама перед видео
- **Midroll** - реклама в середине видео
- **Postroll** - реклама после видео

**Позиции**:
- ✅ **Article End** (рекомендуется) - В конце статьи
- ⚠️ **Article Middle** - В середине статьи (может мешать чтению)

---

### 2. **Outstream Плееры** (только реклама)

**Что это**: Рекламный блок без видео контента, autoplay on scroll

**Позиции**:
- ✅ **Sidebar Sticky** (рекомендуется) - Desktop, sticky справа
- ✅ **In-Content** (рекомендуется) - Mobile, между параграфами

---

## 📍 Рекомендуемые позиции

### Desktop (1920x1080):
```
┌────────────────────────────────────────────────────┐
│ Header                                             │
├────────────────────────┬───────────────────────────┤
│ Article Content        │ Sidebar                   │
│                        │                           │
│ Текст статьи...        │ ┌───────────────────────┐ │
│                        │ │ Реклама               │ │
│ Параграф 1             │ └───────────────────────┘ │
│ Параграф 2             │                           │
│ Параграф 3             │ ┌───────────────────────┐ │
│                        │ │ 📺 Outstream Плеер    │ │ 
│ ────────────           │ │ (Sticky, Autoplay)    │ │ ← ЗДЕСЬ
│                        │ │ 300x250               │ │
│ ┌──────────────────┐   │ └───────────────────────┘ │
│ │ 📺 Instream     │   │                           │
│ │ Плеер           │   │ ┌───────────────────────┐ │
│ │ (Article End)   │   │ │ Реклама               │ │
│ │ 16:9, Preroll   │   │ └───────────────────────┘ │
│ └──────────────────┘   │                           │ ← И ЗДЕСЬ
│                        │                           │
│ Related Articles...    │                           │
└────────────────────────┴───────────────────────────┘
```

### Mobile (375x667):
```
┌────────────────────────┐
│ Header                 │
├────────────────────────┤
│ Article Content        │
│                        │
│ Текст статьи...        │
│                        │
│ Параграф 1             │
│ Параграф 2             │
│                        │
│ ┌──────────────────┐   │
│ │ 📺 Outstream    │   │
│ │ (In-Content)    │   │ ← МЕЖДУ ПАРАГРАФАМИ
│ │ Autoplay        │   │
│ └──────────────────┘   │
│                        │
│ Параграф 3             │
│ Параграф 4             │
│                        │
│ ┌──────────────────┐   │
│ │ 📺 Instream     │   │
│ │ (Article End)   │   │ ← В КОНЦЕ СТАТЬИ
│ │ 16:9, Preroll   │   │
│ └──────────────────┘   │
│                        │
│ Related Articles...    │
└────────────────────────┘
```

---

## 🛠️ Техническая реализация

### Файлы:

```
components/VideoPlayer.tsx
├─ Instream плеер (с видео)
├─ Outstream плеер (только реклама)
├─ VOX интеграция
├─ Autoplay on scroll
└─ Responsive дизайн

lib/config/video-players.ts
├─ Конфигурация всех плееров
├─ VOX PlaceID для каждого плеера
├─ Enable/disable флаги
└─ Device таргетинг (desktop/mobile/all)

app/[locale]/(site)/article/[slug]/page.tsx
├─ Интеграция в страницу статьи
├─ Instream в конце статьи
└─ Outstream в сайдбаре
```

---

## 💻 Конфигурация плееров

### Файл: `lib/config/video-players.ts`

```typescript
export const VIDEO_PLAYERS: VideoPlayerConfig[] = [
  // Instream плеер - В конце статьи
  {
    id: 'instream-article-end',
    name: 'Instream Video (Article End)',
    type: 'instream',
    position: 'article-end',
    voxPlaceId: '68f70a1c810d98e1a08f2740', // ← Ваш VOX PlaceID
    enabled: true,
    autoplay: false,
    muted: true,
    device: 'all'
  },

  // Outstream плеер - Sticky сайдбар (desktop)
  {
    id: 'outstream-sidebar',
    name: 'Outstream Ad (Sidebar Sticky)',
    type: 'outstream',
    position: 'sidebar-sticky',
    voxPlaceId: '68f70a1c810d98e1a08f2742', // ← Ваш VOX PlaceID
    enabled: true,
    autoplay: true,
    muted: true,
    device: 'desktop'
  },

  // Outstream плеер - Между параграфами (mobile)
  {
    id: 'outstream-content-mobile',
    name: 'Outstream Ad (In-Content Mobile)',
    type: 'outstream',
    position: 'in-content',
    voxPlaceId: '68f70a1c810d98e1a08f2743', // ← Ваш VOX PlaceID
    enabled: true,
    autoplay: true,
    muted: true,
    device: 'mobile'
  }
];
```

---

## 🎨 Использование компонента

### Instream плеер (с видео):

```tsx
<VideoPlayer
  type="instream"
  position="article-end"
  videoUrl="https://example.com/video.mp4"
  videoTitle="Название видео"
  voxPlaceId="68f70a1c810d98e1a08f2740"
  autoplay={false}
  muted={true}
/>
```

### Outstream плеер (только реклама):

```tsx
<VideoPlayer
  type="outstream"
  position="sidebar-sticky"
  voxPlaceId="68f70a1c810d98e1a08f2742"
  autoplay={true}
  muted={true}
/>
```

---

## 🎯 Рекомендации по использованию

### ✅ ЧТО ДЕЛАТЬ:

1. **Instream в конце статьи**
   - ✅ Не мешает чтению
   - ✅ Высокий engagement после прочтения
   - ✅ Подходит для связанного видео

2. **Outstream sticky sidebar (desktop)**
   - ✅ Всегда в поле зрения
   - ✅ Не мешает контенту
   - ✅ Высокий CTR

3. **Outstream in-content (mobile)**
   - ✅ Естественная интеграция
   - ✅ Высокая видимость
   - ✅ Mobile-friendly

### ❌ ЧЕГО НЕ ДЕЛАТЬ:

1. **НЕ ставить Instream в середину статьи**
   - ❌ Мешает чтению
   - ❌ Раздражающий фактор
   - ❌ Плохой UX

2. **НЕ делать слишком много outstream плееров**
   - ❌ Overload рекламы
   - ❌ Пользователь уйдет
   - ❌ Плохо для SEO

3. **НЕ делать autoplay со звуком**
   - ❌ Раздражает пользователей
   - ❌ Против UX best practices
   - ❌ Может быть заблокировано браузером

---

## 💰 Монетизация

### Форматы видео рекламы:

| Формат | CPM | Fill Rate | Рекомендация |
|--------|-----|-----------|--------------|
| **Preroll** | $5-15 | 80-90% | ✅ Лучший |
| **Midroll** | $8-20 | 60-70% | ✅ Хороший |
| **Postroll** | $2-5 | 40-50% | ⚠️ Низкий |
| **Outstream** | $3-10 | 70-80% | ✅ Хороший |

### Оптимальная стратегия:

```
Desktop:
├─ Instream (Article End): Preroll + Midroll
└─ Outstream (Sidebar Sticky): Autoplay

Mobile:
├─ Instream (Article End): Preroll
└─ Outstream (In-Content): Autoplay

Результат: $15-30 CPM суммарно
```

---

## 🔧 Настройка VOX плееров

### 1. Получить VOX PlaceID

Свяжитесь с VOX Display для создания видео PlaceID:
- Instream 16:9 (800x450)
- Outstream 300x250 (sidebar)
- Outstream 640x360 (mobile)

### 2. Обновить конфигурацию

В `lib/config/video-players.ts` замените PlaceID:

```typescript
voxPlaceId: 'ВАШ_РЕАЛЬНЫЙ_VOX_PLACE_ID'
```

### 3. Включить/выключить плееры

```typescript
enabled: true  // или false для отключения
```

---

## 📊 Analytics & Tracking

### Автоматический трекинг:

```typescript
// Трекинг событий плеера
- Video Start
- Ad Start (Preroll/Midroll/Postroll)
- Ad Complete
- Video Complete
- Video Pause
- Video Resume
```

### Интеграция с Google Analytics:

```javascript
// Автоматически отправляется
gtag('event', 'video_start', {
  'video_title': 'Название видео',
  'video_position': 'article-end'
});
```

---

## 🎨 Кастомизация

### Изменить размеры:

```typescript
// В VideoPlayer.tsx, функция getContainerDimensions()
case 'instream':
  return {
    width: '100%',
    maxWidth: '900px',  // ← Измените здесь
    aspectRatio: '16/9'
  };
```

### Изменить цвета:

```typescript
<div style={{
  backgroundColor: '#000',  // ← Фон плеера
  borderRadius: '12px',     // ← Скругление углов
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'  // ← Тень
}}>
```

---

## 🚀 A/B тестирование

### Тестируйте позиции:

```typescript
// Вариант A: Instream в конце
enabled: true, position: 'article-end'

// Вариант B: Instream в середине
enabled: true, position: 'article-middle'

// Метрики: CTR, время просмотра, bounce rate
```

---

## ✅ Checklist

- [ ] Получить VOX PlaceID для видео
- [ ] Обновить `lib/config/video-players.ts` с реальными PlaceID
- [ ] Протестировать Instream плеер
- [ ] Протестировать Outstream плеер (desktop)
- [ ] Протестировать Outstream плеер (mobile)
- [ ] Проверить autoplay on scroll
- [ ] Настроить analytics трекинг
- [ ] A/B тестирование позиций

---

**v7.9.0** - Video Players with Advertising  
**Автор**: AI Assistant  
**Дата**: 30 октября 2025

