# ciastoeli.pl — разбор и план интеграции VOX через Prebid (03.11.2026)

Разбор сделан снаружи, по открытому коду страниц, ads.txt и конфигурации Bidio (`as.bidio.pl/o?websiteId=…`). На сервер не заходил. Баннер согласия не принимал, поэтому ставки в браузере не проверены (см. «Что не проверено»).

## Что стоит на сайте сейчас

| Что | Как есть |
|---|---|
| Движок | WordPress 7.1.4, тема Braise, Elementor, плагин Ad Inserter (блоки `code-block-1`, `code-block-2`) |
| Prebid | Bidio lazy SDK `https://files.bidio.pl/bidio-lazy.min.js` (официальный, уже не самодельная копия от 19.08), `websiteId: w01kqvmpr7yna08s2qtfqvkx5bq`, `excludePlacements: ['interstitial']`, `debug: true` |
| Места Bidio | `art_1` — над текстом рецепта, сразу под фото; `art_2` — в конце текста |
| Биддеры в этих местах | **включён только `vox`**: art_1 → placementId `698ef45d810d98e150079069`, art_2 → `6ae4388970e7b23ad0981c81`. Criteo, RTB House, Rubicon, OpenX, Adform и остальные выключены |
| Чьи эти места VOX | не аккаунта icoffio «Goleta VOX PL EN». В sellers.json Bidio указан контакт `ads@newmediawave.pl` |
| GAM | `/112044522/hb-bidio/ciastoeli.pl/art_1` и `/art_2` — GAM Bidio |
| Согласие | Google CMP (TCF), `gdprEnabled` включён — аукцион ждёт согласия, так и должно быть |
| CSP | нет (ничего не блокирует) |
| ads.txt | есть Google и `bidio.pl, 7721042601/7721042602, DIRECT`; **строки `voxexchange.io` нет** |
| In-image и видео | нет: Bidio SDK таких мест не умеет |
| Фото рецепта | главное `img.wp-post-image` (1024×1024) и фото в карточке рецепта `img.size-zrdn_recipe_image_main` (800×600) — оба подходят для in-image (≥ 300×200) |

## Что сделать, по порядку

1. **Добавить VOX в ads.txt** — главная находка. Сейчас в art_1 и art_2 продаёт только `vox`, но в ads.txt сайта VOX не значится. Покупатели, которые проверяют ads.txt (и SSP VOX по sellers.json), такой инвентарь режут или не покупают. Нужна строка вида
   `voxexchange.io, <publisherId аккаунта VOX, в котором созданы места 698ef45d… и 6ae43889…>, DIRECT` (или `RESELLER`, если аккаунт принадлежит Bidio / New Media Wave, а не владельцу сайта).
   Точный publisherId и тип (DIRECT/RESELLER) дают VOX или Bidio — я его не знаю и подставлять наугад нельзя. ads.txt правится в корне сайта (файл или плагин ads.txt).
2. **Попросить Bidio включить остальной спрос** в art_1 и art_2 (Criteo, RTB House и др.). Сейчас места живут только на VOX: нет ставки VOX — место пустое.
3. **Выключить `debug: true`** в `BIDIO_LAZY_CONFIG` на боевом сайте (лишний шум в консоли).
4. **In-image VOX через Prebid** — код ниже. Нужен placeId места in-image VOX для ciastoeli.pl. Варианты:
   - (а) место in-image в том же аккаунте VOX, что и art_1/art_2 (его создаёт владелец аккаунта в `partners.voxexchange.io`) — доход идёт туда же, куда сейчас;
   - (б) место в аккаунте icoffio «Goleta VOX PL EN» — доход начисляется icoffio, тогда в ads.txt ciastoeli.pl нужна ещё строка `voxexchange.io, 63d93a3e4d506ea2dc1863ea, …` и договор с владельцем сайта.
   Выбор — коммерческий, за вами.
5. **Со стороны Hybrid** (если покупают наши кампании): ciastoeli.pl в whitelist кампании или whitelist пустой; креативы in-image и размеров art_1/art_2 (970×250, 728×90, 300×250, 336×280 и др.).
6. **Видео** — на сайте нет видеоплеера. Можно добавить outstream-видео VOX через тот же Prebid (как на web.icoffio.com), но это отдельный шаг: нужен плеер и место видео в VOX.

## Код in-image для WordPress

Куда: Ad Inserter → новый блок → вставка «Footer», только на записях (Posts). Или любой плагин «code snippets» в футер. Подставить `VOX_INIMAGE_PLACE_ID`.

```html
<script>
(function () {
  var PLACE_ID = 'VOX_INIMAGE_PLACE_ID'; // VOX in-image place for ciastoeli.pl
  var SELECTOR = 'img.wp-post-image, img.size-zrdn_recipe_image_main';
  var FULL = 'display:block;width:100%;height:100%;border:0;';
  var n = 0;

  window.pbjs = window.pbjs || { que: [] };

  function auction(img) {
    if (img.dataset.voxInimage) return;
    if (img.offsetWidth < 300 || img.offsetHeight < 200) return; // the stripe needs room
    img.dataset.voxInimage = '1';
    var code = 'ciastoeli-inimage-' + (++n);

    pbjs.que.push(function () {
      pbjs.requestBids({
        timeout: 1500,
        adUnits: [{
          code: code,
          mediaTypes: { banner: { sizes: [[0, 0]] } },
          bids: [{ bidder: 'vox', params: {
            placement: 'inImage',
            placementId: PLACE_ID,
            imageUrl: img.currentSrc || img.src
          } }]
        }],
        bidsBackHandler: function () {
          var bid = pbjs.getHighestCpmBids(code)[0];
          if (!bid) return; // no bid: leave the photo alone

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
          // Prebid sizes the ad to the bid (in-image: width 0, height 120); keep both frames full size.
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
  }

  // One auction per photo, only when it comes near the screen.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      if (e.target.complete) auction(e.target);
      else e.target.addEventListener('load', function () { auction(e.target); }, { once: true });
    });
  }, { rootMargin: '300px' });

  document.querySelectorAll(SELECTOR).forEach(function (img) { io.observe(img); });
})();
</script>
```

Почему так:
- `pbjs` — экземпляр Prebid, который грузит Bidio. Код только ставит задание в `pbjs.que`, поэтому порядок загрузки не важен.
- Согласие отдельно проверять не нужно: в сборке Bidio включён модуль TCF, Prebid сам ждёт ответа Google CMP и передаёт согласие в запрос.
- Если ставки нет (204), фото не трогаем.

## Как проверить после установки

1. Открыть рецепт, принять согласие, DevTools → Network.
2. `ssp.hybrid.ai/auction/prebid` с `"placement":"inImage"` в теле запроса; ответ — ставка или 204.
3. При ставке: `st.hybrid.ai/prebidrenderer.js`, полоса внизу фото, затем `ssp.hybrid.ai/seance/Impression/…` и `…/View/…`.
4. В панели VOX у места in-image появляются запросы и показы.

## Что не проверено

- Приходят ли сейчас ставки VOX в art_1/art_2: для этого нужно принять баннер согласия на ciastoeli.pl в тестовом браузере. Сделаю, если скажете, что можно.
- Чей аккаунт VOX у мест 698ef45d… и 6ae43889…, и какой у него publisherId для ads.txt — это знают VOX / Bidio.
