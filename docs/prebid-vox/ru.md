# VOX через Prebid: in-image, баннеры и видео — инструкция

Версия: v10.26.1, 30.10.2026. Другие языки: [Polski](pl.md), [English](en.md).

## Коротко

Рекламу VOX (in-image, баннеры, видео) можно продавать через Prebid без изменений в консоли Hybrid и в панели VOX. Меняется только код на сайте издателя. Работает на web.icoffio.com: in-image с 29.10.2026 (v10.25.9), баннеры и видео с 30.10.2026 (v10.26.1). Выигрывает VOX, реклама показывается, пиксели Impression и View доходят до Hybrid.

Адаптер не наш. Это стандартный публичный адаптер **VOX** (`voxBidAdapter`) из Prebid.js, его поддерживает Hybrid. Он есть в любой сборке Prebid, в которую его включили, например в сборке Bidio (`files.bidio.pl/prebid.js`). Мы написали только код сайта: места в аукционе Prebid и отрисовку выигравшей ставки.

| Где | Что меняется | Замечания |
| --- | --- | --- |
| Консоль Hybrid (кампании) | Ничего | Кампания покупает через SSP Vox и имеет креативы размера места; whitelist доменов не должен исключать сайт |
| Панель VOX (места, код VOX SSP) | Ничего | Те же места и те же placeId; новые места не нужны; floor и настройки места действуют так же |
| ads.txt | Ничего, если строка уже есть | `voxexchange.io, <publisherId>, DIRECT` на домене сайта |
| Сайт издателя | Места в Prebid + отрисовка ставки | Код ниже; без него Prebid эти места не выставит |

Hybrid покупает сам: запрос Prebid приходит в SSP VOX с placeId места, а SSP проводит аукцион среди кампаний, подключённых к Vox, как и при обычном коде VOX. Но «сам» — только на сайтах, где эти места есть в Prebid. Обёртка Bidio (lazy SDK) заполняет только свои GPT-слоты (art_1…art_3), поэтому партнёру Bidio нужен код, как у нас, или поддержка со стороны Bidio.

## Места VOX на web.icoffio.com

| Формат | Место в панели VOX | placeId | Параметры адаптера |
| --- | --- | --- | --- |
| In-image | InImage #1 | `63d93bb54d506e95f039e2e3` | `placement: 'inImage'`, `imageUrl` |
| 300×250 | Ad slot #3 | `63da9e2a4d506e16acfd2a36` | `placement: 'banner'` |
| 300×600 | Ad slot #4 | `63daa2ea7bc72f39bc3bfc72` | `placement: 'banner'` |
| 970×250 | Ad slot #5 | `63daa3c24d506e16acfd2a38` | `placement: 'banner'` |
| 320×480 (interstitial) | Ad slot #10 | `68f63437810d98e1a08f26de` | `placement: 'banner'` |
| 320×50 | Ad slot #11 | `68f644dc70e7b26b58596f34` | `placement: 'banner'` |
| 320×100 | Ad slot #13 | `68f645bf810d98e1a08f272f` | `placement: 'banner'` |
| Видео | Ad slot #9 VideoPlace | `64b662024d506ede18ffa441` | `placement: 'video'` |

На web.icoffio.com 728×90 (#2) в тексте и 970×250 перед похожими статьями через Prebid не идут: на тех же местах стоят слоты Bidio art_2 и art_3.

## Общие требования

- CSP разрешает `*.hybrid.ai` в `script-src`, `connect-src` и `frame-src`.
- Согласие пользователя на рекламу — до загрузки Prebid.
- Аукцион только когда место подходит к экрану (например, IntersectionObserver с отступом 300 px). Места в скрытых контейнерах (`display:none`) не участвуют.
- Одно место на аукцион: SSP отдаёт одну ставку на место за запрос.

## In-image

1. Сайт загружает Prebid с адаптером `vox` (например, через обёртку Bidio).
2. Для каждого фото статьи, когда оно подходит к экрану, сайт запускает отдельный аукцион с `placement: 'inImage'`, `placementId` (placeId места in-image) и `imageUrl` (адрес исходного фото).
3. Адаптер отправляет запрос на `https://ssp.hybrid.ai/auction/prebid`; SSP VOX выбирает кампанию Hybrid и возвращает ставку.
4. Сайт кладёт поверх фото рамку (iframe) ровно его размера и отрисовывает в ней ставку через `pbjs.renderAd`. Рендерер VOX (`st.hybrid.ai/prebidrenderer.js`) рисует полосу внизу фото и отправляет пиксели.

Дополнительно:

- Фото не меньше 300 × 200 px (в меньшее не помещается полоса 120–200 px).
- На той же странице не работает параллельно прямой VOX in-image (`_tx.integrateInImage`), иначе на одном фото будет два баннера.

Минимальный код для одного фото (после загрузки Prebid; `<VOX_INIMAGE_PLACE_ID>` — из панели VOX):

```js
pbjs.que.push(function () {
  var img = document.querySelector('article img');
  var code = 'inimage-1';
  var FULL = 'display:block;width:100%;height:100%;border:0;';
  pbjs.requestBids({
    timeout: 1500,
    adUnits: [{
      code: code,
      mediaTypes: { banner: { sizes: [[0, 0]] } },
      bids: [{ bidder: 'vox', params: {
        placement: 'inImage',
        placementId: '<VOX_INIMAGE_PLACE_ID>',
        imageUrl: img.currentSrc || img.src
      } }]
    }],
    bidsBackHandler: function () {
      var bid = pbjs.getHighestCpmBids(code)[0];
      if (!bid) return; // no bid: leave the photo alone

      // A box exactly over the photo; the ad frame fills it.
      var host = img.parentElement;
      if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
      var box = document.createElement('div');
      box.style.cssText = 'position:absolute;z-index:2;overflow:hidden;' +
        'top:' + img.offsetTop + 'px;left:' + img.offsetLeft + 'px;' +
        'width:' + img.offsetWidth + 'px;height:' + img.offsetHeight + 'px;';
      var frame = document.createElement('iframe');
      frame.id = frame.name = code;
      frame.setAttribute('scrolling', 'no');
      frame.style.cssText = FULL;
      box.appendChild(frame);
      host.appendChild(box);

      var doc = frame.contentDocument;
      doc.documentElement.style.cssText = 'width:100%;height:100%;margin:0;';
      doc.body.style.cssText = 'width:100%;height:100%;margin:0;overflow:hidden;';
      // Prebid 11 sizes the ad to the bid (VOX in-image: width 0, height 120).
      // Keep both frames at the full photo size, or the stripe is invisible or on top.
      new MutationObserver(function () {
        doc.querySelectorAll('iframe').forEach(function (f) {
          f.removeAttribute('width'); f.removeAttribute('height'); f.style.cssText = FULL;
        });
      }).observe(doc.documentElement, { childList: true, subtree: true });
      new MutationObserver(function () {
        if (frame.style.height !== '100%' || frame.style.width !== '100%') frame.style.cssText = FULL;
      }).observe(frame, { attributes: true, attributeFilter: ['style', 'width', 'height'] });

      pbjs.renderAd(doc, bid.adId);
    }
  });
});
```

Полная версия (много фото, аукцион при появлении фото на экране, уборка): `lib/prebid-inimage.ts`.

## Баннеры

1. Когда место подходит к экрану, сайт запускает аукцион с одним местом: `mediaTypes.banner.sizes` = размер места, `placement: 'banner'`, `placementId` места.
2. После выигрыша сайт создаёт рамку ровно размера места, с `id` и `name`, равными коду места, и вызывает `pbjs.renderAd`. Креатив загружает `st.hybrid.ai/prebidrenderer.js`.
3. Нет ставки (204): место остаётся пустым.

```js
pbjs.que.push(function () {
  var code = 'banner-300x250';
  pbjs.requestBids({
    timeout: 1500,
    adUnits: [{
      code: code,
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      bids: [{ bidder: 'vox', params: { placement: 'banner', placementId: '<VOX_PLACE_ID>' } }]
    }],
    bidsBackHandler: function () {
      var bid = pbjs.getHighestCpmBids(code)[0];
      if (!bid) return; // no bid: leave the place empty
      var frame = document.createElement('iframe');
      frame.id = frame.name = code;
      frame.width = '300';
      frame.height = '250';
      frame.setAttribute('scrolling', 'no');
      frame.style.border = '0';
      document.getElementById('ad-300x250').appendChild(frame);
      pbjs.renderAd(frame.contentDocument, bid.adId);
    }
  });
});
```

Полная версия: `lib/prebid-vox.ts` и `components/PrebidVoxAd.tsx`; interstitial 320×480 — `components/InterstitialAd.tsx`.

## Видео

1. Сайт запускает аукцион с видеоместом **outstream** с пустым рендерером (без `url`), `placement: 'video'` и placeId видеоместа.
2. В выигравшей ставке есть `bid.vastXml` (inline VAST). Сайт сам его разбирает: MP4-файл, длительность, пиксели Impression, квартилей, Complete, Error.
3. Плеер сайта играет MP4, шлёт пиксели VAST и при первом запуске вызывает `pbjs.markWinningBidAsUsed` (аналитика Prebid/Bidio).
4. Нет ставки или в VAST нет MP4: рекламного плеера нет.

Почему outstream: Prebid 11 отбрасывает ставку `instream`, в которой только `vastXml`, если в конфигурации нет кэша Prebid («will not work when a prebid cache url is not specified»). Кэш — глобальная настройка обёртки Bidio. Ставке outstream нужен рендерер; рендерер без `url` не грузит скриптов и не вызывается, потому что VAST играет плеер сайта.

```js
pbjs.que.push(function () {
  var code = 'video-1';
  pbjs.requestBids({
    timeout: 1500,
    adUnits: [{
      code: code,
      mediaTypes: { video: {
        context: 'outstream', // instream without a Prebid cache is dropped
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        skip: 1,
        renderer: { render: function () {} } // no url: no script is loaded
      } },
      bids: [{ bidder: 'vox', params: { placement: 'video', placementId: '<VOX_VIDEO_PLACE_ID>' } }]
    }],
    bidsBackHandler: function () {
      var bid = pbjs.getHighestCpmBids(code)[0];
      if (!bid || !bid.vastXml) return; // no bid: no ad player
      var vast = new DOMParser().parseFromString(bid.vastXml, 'text/xml');
      var file = vast.querySelector('MediaFile[type="video/mp4"]');
      if (!file) return;
      // Play file.textContent.trim() in the site's player and fire the
      // <Impression> and <Tracking> URLs from the VAST at the right moments.
      pbjs.markWinningBidAsUsed({ adId: bid.adId, analytics: true });
    }
  });
});
```

Полная версия: `components/VideoPlayer.tsx` (аукцион и показ) и `lib/vast.ts` (разбор VAST).

## Проверка

DevTools, вкладка Network:

- `ssp.hybrid.ai/auction/prebid` с `"placement":"inImage"`, `"banner"` или `"video"` в запросе; ответ `{"bids":[{"price":…}]}` или 204 (ставки нет).
- Баннеры и in-image после выигрыша: `st.hybrid.ai/prebidrenderer.js`, затем `ssp.hybrid.ai/seance/Impression/…` и `ssp.hybrid.ai/seance/View/…`.
- Видео после выигрыша: загрузка `.mp4` с `content.hybrid.ai` и пиксели из VAST.
- Консоль браузера на web.icoffio.com: `[Bidio] vox <формат> <код>: vox <cpm> rendered` или `no bid`.

Результат проверки 29–30.10.2026 на web.icoffio.com:

| Место | Результат |
| --- | --- |
| In-image | ставки 5–10 PLN, полоса видна |
| 300×250 / 300×600 | ставки 2 и 3 PLN, баннеры видны |
| 320×50 | ставка 2 PLN, баннер виден |
| Видео | ставка 5 PLN, MP4 играет в плеере |
| 320×100 / 320×480 | 204 — в display-кампании нет креативов этих размеров |

## Подводные камни

| Подводный камень | Признак | Решение |
| --- | --- | --- |
| Prebid 11 рисует in-image в рамке размером ставки (ширина 0) | Пиксели Impression и View уходят, полосы не видно | Растянуть вложенную рамку на 100% (код in-image) |
| После отрисовки Prebid меняет рамку in-image на высоту ставки (120 px) | Полоса сверху фото, а не снизу | Держать рамку на 100% фото (код in-image) |
| Видео `instream` без кэша Prebid | SSP отдаёт ставку, в Prebid 0 ставок, в консоли «prebid cache url is not specified» | `context: 'outstream'` с пустым рендерером или `cache.url` в конфигурации Prebid |
| Нет креативов размера места | 204 на каждый запрос (у нас 320×100 и 320×480) | Добавить в кампанию креативы ровно этого размера |
| Место Prebid там же, где слот обёртки | Два баннера рядом | Не запускать аукцион VOX на этом месте |
| Кампания с whitelist доменов | На новом домене ставок нет | Добавить домен в whitelist или очистить его |
| Кампания с «Cookie consent (Google)», а сайт не передаёт согласие TCF | Меньше ставок или ни одной | На реальном трафике: сертифицированная CMP и `gdprEnabled: true` |
| Параллельно работает прямой VOX in-image | Два баннера на одном фото | На странице с Prebid in-image отключить `_tx.integrateInImage` |

Видимость in-image считается так же, как у прямого VOX: View — при >99% фото на экране в течение 1 с. Спрос бывает не всегда: в проверке 29.10 ставка in-image пришла в 1 из 5 показов, в остальных SSP вернул 204.
