# Реклама на icoffio — как устроено сейчас

Актуально на v10.24.0 (2026-10-26). Это единственный действующий документ по рекламе;
старые руководства лежат в `docs/archive/` и описывают снятые интеграции.
История расследований: [ADVERTISING_AUDIT_2026-10-22.md](ADVERTISING_AUDIT_2026-10-22.md).

## Цепочка

```
Hybrid DSP (кампании)  →  VOX SSP (места издателя)  →  сайт (ssp.js + контейнеры)
console.hybrid.ai          partners.voxexchange.io        lib/config/adPlacements.ts
```

- **Кампании** заводятся в Hybrid Console, рекламодатель `TESTY POLSKA`
  (`64d34c927bc72fc6e0e9c666`), кабинет «Konglomerat in-image PL». Таргет на сайт —
  whitelist доменов `icoffio.com` / `app.icoffio.com`, SSP — Vox (systemId 15).
- **Места издателя** — VOX-аккаунт «Goleta VOX PL EN», publisherId
  `63d93a3e4d506ea2dc1863ea` (он же в `/ads.txt`). Там же floor-цены и выручка.
- **Сайт** только запрашивает эти места и показывает то, что вернул SSP.

## Где что в коде

| Что | Файл |
|---|---|
| Все места и PlaceID (единственный источник) | `lib/config/adPlacements.ts` |
| Загрузка SDK из `<head>` при сохранённом согласии | `lib/consent-storage.ts`, `app/[locale]/layout.tsx` |
| Регистрация мест и in-image, жизненный цикл | `lib/vox-ad-lifecycle.ts`, `components/AdManager.tsx` |
| Контейнер места, проверка размера креатива | `components/UniversalAd.tsx` |
| Учёт заполнения (beacon → таблица) | `lib/ad-telemetry.ts`, `app/api/ads/telemetry`, таблица `ad_slot_daily` |
| Экран в админке | `components/admin/AdvertisingManager.tsx` (вкладка Advertising) |
| Настройки рекламы отдельной статьи | `lib/monetization-settings.ts` |
| Какой стек на каком домене | `lib/ads-provider-core.ts` (Prebid только на `web.icoffio.com`) |
| Prebid (Bidio) на `web.icoffio.com`: дисплей | `components/PrebidManager.tsx`, `lib/config/prebidPlacements.ts` |
| In-image через Prebid на `web.icoffio.com` | `lib/prebid-inimage.ts` (запускается из `PrebidManager`) |
| Баннеры и видео VOX через Prebid на `web.icoffio.com` | `lib/prebid-vox.ts`, `components/PrebidVoxAd.tsx`, флаг `prebid` в `lib/config/adPlacements.ts` |
| Разбор VAST (сервер и браузер) | `lib/vast.ts` |

### In-image на web.icoffio.com (через Prebid)

На `web.icoffio.com` in-image идёт не через VOX SDK (`_tx.integrateInImage`), а через
биддер `vox` в сборке Prebid от Bidio: на каждое фото статьи — отдельный аукцион
`{ placement: 'inImage', placementId: IN_IMAGE_PLACE_ID, imageUrl }` →
`POST ssp.hybrid.ai/auction/prebid`. Победившая ставка рисуется в iframe поверх фото
(рендерер VOX `st.hybrid.ai/prebidrenderer.js`). Спрос тот же — кампании Hybrid на
place `63d93bb54d506e95f039e2e3`. VOX SDK на этом хосте не грузится, чтобы на фото не
было двух оверлеев. Видимость — то же правило: >99% фото на экране 1 с.
Проверка: в консоли `[Bidio] in-image icoffio-inimage-N: vox <cpm> rendered` или `no bid`.

### Остальные форматы на web.icoffio.com (через Prebid)

Слоты Bidio (`art_1`–`art_3`) покрывают только три места в статье. Остальные места
VOX на этом хосте покупаются так же, как in-image: свой аукцион на `pbjs` Bidio с
биддером `vox` и тем же placeId, что на основном сайте.

| Место | Как | placeId |
|---|---|---|
| Сайдбар 300×250 / 300×600 | `PrebidVoxAd` (`placement: 'banner'`) | Ad slot #3 / #4 |
| Мобайл 320×50 над фото / 320×100 после текста | `PrebidVoxAd` | Ad slot #11 / #13 |
| Interstitial 320×480 | `InterstitialAd` | Ad slot #10 |
| Главная 970×250 / 320×100 | `PrebidVoxAd` | Ad slot #5 / #13 |
| Видео в конце статьи | `VideoPlayer`: `placement: 'video'`, `context: 'outstream'` + renderer без url, VAST из `bid.vastXml` | Ad slot #9 `64b662024d506ede18ffa441` |

Выключены на этом хосте (`prebid: false`): 728×90 в тексте и 970×250 перед похожими —
там стоят `art_2` и `art_3`. Аукцион места идёт, когда оно подходит к экрану; слот в
скрытой обёртке (мобильный на десктопе) не участвует. Видео-VAST VOX — inline VAST 3.0
с MP4, плеер играет его сам и после старта помечает ставку как выигравшую
(`markWinningBidAsUsed`). Почему outstream: ставку `instream`, в которой есть только `vastXml`,
Prebid отбрасывает без prebid cache (а `cache` — общий конфиг Bidio); outstream-ставке нужен
renderer, и renderer без `url` Prebid ставит без загрузки скрипта. В панели VOX есть и второе видеоместо «Video preroll Ad slot #14»
(`69036eff810d982b30508d46`, floor 6 PLN) — пока без трафика.
Проверка: `[Bidio] vox <формат> icoffio-vox-banner-N: vox <cpm> rendered`, `[Bidio] vox video …`.
| Видео preroll | `lib/config/video-players.ts`, `components/VideoPlayer.tsx`, `app/api/video/preroll` |

## Места (сверено с VOX-панелью 2026-10-26)

| Место на сайте | Формат | VOX slot | Где |
|---|---|---|---|
| In-image на фото статьи | in-image | InImage Ad slot #1 (CPMV 5 PLN) | статья |
| Между абзацами | 728×90 | Ad slot #2 | статья, десктоп |
| Перед похожими статьями | 970×250 | Ad slot #5 (5 PLN) | статья, десктоп |
| Сайдбар | 300×250 / 300×600 | Ad slot #3 / #4 | статья, десктоп |
| Над фото | 320×50 | Ad slot #11 | статья, мобайл |
| После текста | 320×100 | Ad slot #13 | статья, мобайл |
| Interstitial | 320×480 | Ad slot #10 | статья, мобайл |
| Под списком статей | 970×250 / 320×100 | Ad slot #5 / #13 | главная |

Ad slot #12 160×600 существует в VOX, но на сайте не используется.

**Правило:** формат места на сайте = размер слота в VOX = размер креатива в кампании.
Чтобы место заполнялось, в кампании должен быть креатив ровно этого размера.

## Правила, о которые уже спотыкались

- **Место видно — только тогда оно в аукционе.** `_tx.init()` сам сканирует все
  `[data-hyb-ssp-ad-place]`, поэтому `UniversalAd` добавляет контейнер в DOM только когда
  обёртка не скрыта (`xl:hidden` / `hidden xl:block`). Иначе мобильный слот на десктопе
  выигрывает аукцион, который никто не видит (до v10.23.7 — 2 из 3 display-показов на десктопе).
- **Viewability in-image** считается по >99% фото-носителя на экране в течение 1 с, не по
  стандарту MRC 50%. Hero статьи держим 21:9 на десктопе, начало ≈ y=252.
- **Пусто (204) почти всегда — спрос, а не код.** Сначала смотрите вкладку Advertising:
  если сайт фиксирует `empty` по всем местам, вопрос к кампаниям/SSP.
- **Настройки статьи (маркер `ICOFFIO_MONETIZATION`)** с версии 2 хранят список мест,
  известных на момент сохранения; новые места показываются на старых статьях автоматически.
- Согласие: без `advertising` в баннере cookies SDK не грузится вообще. TCF CMP на VOX-доменах нет.
- `ads.txt`: `voxexchange.io, 63d93a3e4d506ea2dc1863ea, DIRECT` — не трогать без панели VOX.

## Проверка руками

1. Открыть статью на `icoffio.com` в окне ≥1280px, принять cookies.
2. В DevTools: у контейнеров `data-hyb-ssp-ad-place-status` = `display` (заполнено) или `empty`.
3. Админка → Advertising: счётчики за сегодня растут.
4. Сверить с VOX-панелью (показы, выручка) и Hybrid Console (показы кампаний).

`npm run ad:live-debug` — автоматический прогон по доменам/языкам/устройствам.
