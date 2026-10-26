# 📺 VOX Video PlaceID Setup Guide

## 🎯 Получение PlaceID для видео плееров

### VOX SSP Dashboard:
**URL**: https://ssp.hybrid.ai/?+nGr9caz9oMHo1fYQVHzhd8BL757aGdBsUe4JwnMPWt3Rllh7jvLUYECx9zmNbehW/A4uGsova/5dLdaNO3va9QpcBV29GtLVSFOK/Bicr0=

---

## 📋 Необходимые PlaceID

Вам нужно создать 4 PlaceID в VOX SSP:

### 1. Instream Video (Article End)
- **Тип**: Instream Video
- **Размер**: 800x450 (16:9)
- **Позиция**: В конце статьи
- **Автоплей**: Нет
- **Форматы**: Preroll + Midroll + Postroll

### 2. Instream Video (Article Middle)  
- **Тип**: Instream Video
- **Размер**: 800x450 (16:9)
- **Позиция**: В середине статьи (опционально)
- **Автоплей**: Нет
- **Форматы**: Preroll

### 3. Outstream Ad (Sidebar Sticky - Desktop)
- **Тип**: Outstream Video
- **Размер**: 300x250
- **Позиция**: Sidebar (sticky)
- **Автоплей**: Да (on scroll)
- **Device**: Desktop only

### 4. Outstream Ad (In-Content - Mobile)
- **Тип**: Outstream Video
- **Размер**: 640x360 (16:9)
- **Позиция**: Between paragraphs
- **Автоплей**: Да (on scroll)
- **Device**: Mobile only

---

## ⚙️ Настройка после получения PlaceID

### 1. Обновите `lib/config/video-players.ts`:

```typescript
export const VIDEO_PLAYERS: VideoPlayerConfig[] = [
  {
    id: 'instream-article-end',
    name: 'Instream Video (Article End)',
    type: 'instream',
    position: 'article-end',
    voxPlaceId: 'ВАШ_PLACEID_1', // ← Замените здесь
    enabled: true,
    autoplay: false,
    muted: true,
    device: 'all'
  },
  {
    id: 'outstream-sidebar',
    name: 'Outstream Ad (Sidebar Sticky)',
    type: 'outstream',
    position: 'sidebar-sticky',
    voxPlaceId: 'ВАШ_PLACEID_3', // ← Замените здесь
    enabled: true,
    autoplay: true,
    muted: true,
    device: 'desktop'
  },
  {
    id: 'outstream-content-mobile',
    name: 'Outstream Ad (In-Content Mobile)',
    type: 'outstream',
    position: 'in-content',
    voxPlaceId: 'ВАШ_PLACEID_4', // ← Замените здесь
    enabled: true,
    autoplay: true,
    muted: true,
    device: 'mobile'
  }
];
```

### 2. Проверьте интеграцию VOX скрипта

В `app/[locale]/layout.tsx` должен быть:

```html
<script type="text/javascript">
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
  window._tx.init();
});
</script>
```

### 3. Тестирование

После обновления PlaceID:

1. **Desktop тест**:
   - Откройте статью на desktop
   - Проскрольте вниз
   - Проверьте Instream плеер в конце статьи
   - Проверьте Outstream sticky в sidebar

2. **Mobile тест**:
   - Откройте статью на mobile
   - Проскрольте вниз
   - Проверьте Outstream между параграфами
   - Проверьте Instream в конце статьи

3. **Autoplay тест**:
   - Outstream должен автоматически начать проигрывать при появлении в viewport
   - Должен останавливаться при выходе из viewport

---

## 📊 Мониторинг

После запуска следите за метриками в VOX SSP:

- **Impressions**: Количество показов
- **Fill Rate**: % заполнения (должно быть 70-90%)
- **CPM**: Цена за 1000 показов
- **Viewability**: % видимости (target: 70%+)
- **Completion Rate**: % досмотров (для Instream)

---

## 🔧 Troubleshooting

### Плеер не показывается:
1. Проверьте PlaceID в консоли браузера
2. Убедитесь что VOX скрипт загружен
3. Проверьте enabled: true в конфигурации
4. Проверьте device таргетинг (desktop/mobile/all)

### Autoplay не работает:
1. Убедитесь что muted: true (браузеры блокируют autoplay со звуком)
2. Проверьте что Intersection Observer работает
3. Откройте консоль - должны быть логи "[VideoPlayer]"

### Низкий Fill Rate:
1. Проверьте таргетинг в VOX SSP
2. Убедитесь что PlaceID настроены правильно
3. Проверьте geo-targeting
4. Связитесь с VOX support

---

## 💰 Оптимизация монетизации

### Рекомендации:

1. **Используйте оба формата**:
   - Instream для высокого CPM ($5-20)
   - Outstream для fill rate (70-80%)

2. **Позиционирование**:
   - Instream: только в конце статьи (лучший UX)
   - Outstream: sidebar (desktop) + in-content (mobile)

3. **Тестируйте**:
   - A/B test разные позиции
   - Мониторьте bounce rate
   - Оптимизируйте для balance (revenue vs UX)

---

## ✅ Checklist

- [ ] Зарегистрирован в VOX SSP
- [ ] Создано 4 PlaceID (Instream x2 + Outstream x2)
- [ ] Обновлен `lib/config/video-players.ts` с реальными PlaceID
- [ ] Протестированы плееры на desktop
- [ ] Протестированы плееры на mobile
- [ ] Проверен autoplay on scroll
- [ ] Настроен мониторинг в VOX SSP
- [ ] Fill rate > 70%
- [ ] CPM соответствует ожиданиям ($15-30)

---

**Дата**: 30 октября 2025  
**Версия**: v7.9.0  
**Support**: VOX SSP Dashboard

