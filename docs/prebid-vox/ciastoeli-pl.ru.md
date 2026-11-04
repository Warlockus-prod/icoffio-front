# ciastoeli.pl — разбор и план интеграции VOX через Prebid (обновлено 04.11.2026)

Первый разбор от 03.11 был сделан снаружи и содержал две ошибки: будто в ads.txt нет VOX и будто Prebid сам дожидается баннера согласия. Ниже исправленная версия: она проверена на сервере (вход открыл владелец) и в чистом тестовом браузере. Кнопки согласия я не нажимал: на сайте их нет (см. «Согласие»).

## Что сделано на сайте 03.11.2026

Изменена только шапка Ad Inserter (опция `ad_inserter`, блок `h`), затем очищен кэш WP Fastest Cache.

1. **Починен аукцион `art_1`.** SDK Bidio запускал его на ~0,7 с, а `__tcfapi` появлялся на ~0,85 с: баннер согласия Google подгружается через GPT, которого грузит сам SDK. Prebid видел `TCF2 CMP not found. Canceling auction` и отменял аукцион, поэтому `art_1` никогда не уходил в VOX. Теперь в шапке сначала грузится настоящий скрипт Google `fundingchoicesmessages.google.com/i/112044522?ers=1`, а SDK стартует, когда появится `__tcfapi` (если его нет 8 с, SDK всё равно стартует и Prebid отменит аукцион, как раньше). Согласие не подделывается, настройки `consentManagement` не менялись.
2. **Выключен `debug`** в `BIDIO_LAZY_CONFIG`.

Проверка снаружи после установки: 3 рецепта и главная, компьютер и телефон. Все страницы 200, ошибок JS нет, отменённых аукционов 0. Запросы к VOX теперь уходят по обоим местам (`698ef4…` и `6ae438…`), раньше только по `6ae438…`.

Откат:

```bash
ssh aevseyenko@77.65.215.14 'cd ~/public_html/ciastoeli.pl/public_html && /usr/local/bin/php83 /usr/bin/wp --skip-themes --skip-plugins option update ad_inserter "$(cat ~/ciastoeli-backups/ad_inserter-2026-11-03.txt)" && /usr/local/bin/php83 /usr/bin/wp fastest-cache clear all'
```

`112044522` — это сеть GAM Bidio. Если Bidio её сменит, адрес в шапке нужно поменять. Правильное постоянное решение на стороне Bidio: SDK должен ждать CMP сам.

## Что стоит на сайте сейчас

| Что | Как есть |
|---|---|
| Движок | WordPress 7.1.4, тема Braise, Elementor, плагин Ad Inserter (шапка `h`, блоки 1 и 2), WP Fastest Cache. Хостинг Progreso, общий аккаунт с другими сайтами; WP-CLI запускается через `/usr/local/bin/php83 /usr/bin/wp` |
| Prebid | Bidio lazy SDK `https://files.bidio.pl/bidio-lazy.min.js`, Prebid v11.7.0, `websiteId: w01kqvmpr7yna08s2qtfqvkx5bq`, `excludePlacements: ['interstitial']` |
| Места Bidio | `art_1` — над текстом рецепта, сразу под фото; `art_2` — в конце текста |
| Биддеры в этих местах | **включён только `vox`**: art_1 → placementId `6a86b83b70e7b27b3807c97d` (после 03.11 Bidio заменил им `698ef45d…`), art_2 → `6ae4388970e7b23ad0981c81`. Остальной спрос выключен в настройках Bidio, хотя строки Criteo, RTB House, Rubicon и др. в ads.txt есть |
| GAM | `/112044522/hb-bidio/ciastoeli.pl/art_1` и `/art_2` — GAM Bidio |
| ads.txt | 14 КБ, блок Bidio. **VOX есть:** строка 318 `voxexchange.io, 5f169c237bc72fa3a0bc6ad2, DIRECT`. Этот аккаунт не «Goleta VOX PL EN» (`63d93a3e…`). Принадлежат ли ему места `698ef45d…` и `6ae43889…`, снаружи не проверить |
| CSP | нет |
| In-image и видео | нет: Bidio SDK таких мест не умеет |
| Фото рецепта | `img.wp-post-image` (1024×1024) и `img.size-zrdn_recipe_image_main` (на компьютере 1060×795) — оба подходят для in-image |

## Согласие

Google CMP (cmpId 300) показывает не запрос согласия, а уведомление «Jak są używane Twoje dane»: кнопки «Принять» нет, только ссылка на настройки. В строке TCF, которая уходит в VOX: согласий на цели нет (`purposeConsents: []`), законный интерес по целям 2, 7, 8, 9, 10, 11, цели 1 (хранение на устройстве) нет.

Следствия: реклама идёт без согласия на cookies и персонализацию, поэтому кампании Hybrid с опцией «Cookie consent (Google)» такой трафик, скорее всего, покупать не будут, а спрос и цена ниже. Сообщение настроено в сети Bidio (`112044522`), менять его нужно там. Юридическую оценку такой настройки я не делал, это вопрос к Bidio и юристу.

## Что показали ставки (6 проверок 3 рецептов после установки, компьютер и телефон, 03.11; выборка маленькая)

| Место | Запрос в VOX | Результат |
|---|---|---|
| `art_1` | после исправления уходит всегда | ставок нет (0 из 6 страниц рецептов) |
| `art_2` | уходит всегда | ставка 10 PLN только на «Jajka w szampanie» (при каждой проверке), на других рецептах ставок нет |

**Ставка 10 PLN не показывается.** Она приходит с размером `0x120` (это формат in-image, width 0, height 120) в баннерное место и попадает в таргетинг GAM как `hb_size=0x120`, `hb_pb=10.00`, но события `bidWon` нет. Проверить line items в GAM Bidio без доступа нельзя, вопрос к Bidio и VOX: почему баннерное место получает креатив in-image.

## Сравнение с web.icoffio.com (конфиг Bidio `as.bidio.pl/o` и живые запросы; по 2 загрузки, выборка маленькая)

Prebid работает на обоих сайтах: аукцион идёт, `hb_*` доходит до GAM. Разница в том, что отвечает VOX.

| Что | web.icoffio.com | ciastoeli.pl |
|---|---|---|
| Место VOX `art_1` | `6a86b83b…` | `6a86b83b…` (то же) |
| Место VOX второго слота | `6a86b83b…` | `6ae43889…` |
| Путь GAM второго слота | `ciastoeli.pl/art_1` | `ciastoeli.pl/art_2` |
| Согласие в запросе к VOX | нет: `gdprEnabled: false` на странице, TCF не передаётся | TCF от Google CMP, согласий нет, только законный интерес |
| Ставка | `art_1`: 204 и 10 PLN 970×250 | `art_1`: 204; `art_2`: 10 PLN `0x120` на одном рецепте, иначе 204 |
| Что вернул GAM | на 970×250 строка `7414099655`, креатив `138572654764`, показ VOX (`bidWon`) | на `hb_size=0x120` строки нет, место пустое |

- Цепочка Prebid → строка GAM рабочая: при обычном размере баннер показывается. Строки GAM живут в общей сети, поэтому ставка `0x120` не показывается из-за самого размера или креатива in-image, а не из-за настроек сайта. Это вывод по одному показу, подтвердить может Bidio.
- Трафик web.icoffio.com в GAM Bidio идёт под `ciastoeli.pl/art_1`, поэтому в отчётах этого места смешаны два сайта.
- Почему VOX чаще отвечает 204 на ciastoeli.pl, не доказано. Кандидаты: согласие и домен (whitelist кампаний). Кто купил показ 970×250, из ставки не видно. Кампания «TEST PEBID web.icoffio.com» на момент проверки неактивна (status 2), у неё включён `hasGoogleConsent` и есть whitelist; купила ли она этот показ, не установлено.

## Что осталось, по порядку

1. **Bidio:**
   - включить остальной спрос в art_1 и art_2 — сейчас при отсутствии ставки VOX место остаётся пустым или уходит в бэкфилл GAM;
   - встроить ожидание CMP в SDK, тогда обход в шапке можно убрать;
   - разобрать ставку `0x120`, которая не показывается;
   - решить, нужен ли настоящий запрос согласия вместо уведомления.
2. **In-image VOX через Prebid** — код ниже, ещё **не установлен**. Нужен placeId места in-image VOX для ciastoeli.pl. Варианты:
   - (а) место in-image в том же аккаунте VOX, что и art_1/art_2 — доход идёт туда же, куда сейчас;
   - (б) место в аккаунте icoffio «Goleta VOX PL EN» — доход начисляется icoffio, тогда в ads.txt ciastoeli.pl нужна ещё строка `voxexchange.io, 63d93a3e4d506ea2dc1863ea, …` и договор с владельцем сайта.
   Выбор — коммерческий, за владельцем.
3. **Со стороны Hybrid** (если покупают наши кампании): ciastoeli.pl в whitelist кампании или whitelist пустой; креативы in-image и размеров art_1/art_2 (970×250, 728×90, 300×250, 336×280 и др.); опция «Cookie consent (Google)» с учётом раздела «Согласие».
4. **Видео** — на сайте нет видеоплеера. Можно добавить outstream-видео VOX через тот же Prebid (как на web.icoffio.com), но это отдельный шаг: нужен плеер и место видео в VOX.

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
- Согласие отдельно проверять не нужно: в сборке Bidio включён модуль TCF, и Prebid сам передаёт в запрос строку от Google CMP. Если CMP на момент аукциона ещё нет, Prebid аукцион отменяет, а не ждёт; загрузка CMP в шапке (см. выше) это закрывает.
- Если ставки нет (204), фото не трогаем.

## Как проверить после установки

1. Открыть рецепт, DevTools → Network. Кнопки согласия нет, нажимать ничего не нужно.
2. `ssp.hybrid.ai/auction/prebid` с `"placement":"inImage"` в теле запроса; ответ — ставка или 204.
3. При ставке: `st.hybrid.ai/prebidrenderer.js`, полоса внизу фото, затем `ssp.hybrid.ai/seance/Impression/…` и `…/View/…`.
4. В панели VOX у места in-image появляются запросы и показы.

## Что не проверено

- Чей аккаунт VOX у мест 698ef45d… и 6ae43889…, и совпадает ли он со строкой `5f169c23…` в ads.txt — это знают VOX / Bidio.
- Почему ставка `0x120` не показывается: line items в GAM Bidio мне не видны.
- Код in-image на этом сайте ещё не запускался: нет placeId.
