# VOX przez Prebid: in-image, banery i wideo — instrukcja

Wersja: v10.26.1, 30.10.2026. Inne języki: [Русский](ru.md), [English](en.md).

## Krótko

Reklamy VOX (in-image, banery, wideo) można sprzedawać przez Prebid bez żadnych zmian w konsoli Hybrid i w panelu VOX. Zmienia się tylko kod na stronie wydawcy. Działa to na web.icoffio.com: in-image od 29.10.2026 (v10.25.9), banery i wideo od 30.10.2026 (v10.26.1). Wygrywa VOX, reklama się wyświetla, piksele Impression i View dochodzą do Hybrid.

Adaptera nie stworzyliśmy sami. To standardowy, publiczny adapter **VOX** (`voxBidAdapter`) z Prebid.js, utrzymywany przez Hybrid. Jest w każdej kompilacji Prebid, która go zawiera, np. w kompilacji Bidio (`files.bidio.pl/prebid.js`). Po naszej stronie powstał tylko kod strony: miejsca w aukcji Prebid i wyświetlenie wygranej oferty.

| Gdzie | Co się zmienia | Uwagi |
| --- | --- | --- |
| Konsola Hybrid (kampanie) | Nic | Kampania musi kupować przez SSP Vox i mieć kreacje w rozmiarze miejsca; whitelist domen nie może wykluczać strony |
| Panel VOX (miejsca, kod VOX SSP) | Nic | Te same miejsca i te same placeId; nowe miejsca nie są potrzebne; floor i ustawienia miejsca działają tak samo |
| ads.txt | Nic, jeśli wpis już jest | `voxexchange.io, <publisherId>, DIRECT` na domenie strony |
| Strona wydawcy | Miejsca w Prebid + wyświetlenie oferty | Kod poniżej; bez niego Prebid nie wystawi tych miejsc |

Hybrid kupuje automatycznie: zapytanie Prebid trafia do SSP VOX z placeId miejsca, a SSP prowadzi aukcję wśród kampanii podłączonych do Vox, tak jak przy zwykłym kodzie VOX. „Automatycznie” dotyczy jednak tylko stron, na których te miejsca są w Prebid. Wrapper Bidio (lazy SDK) wypełnia tylko swoje sloty GPT (art_1…art_3), więc partner Bidio potrzebuje kodu jak nasz albo wsparcia po stronie Bidio.

## Miejsca VOX użyte na web.icoffio.com

| Format | Miejsce w panelu VOX | placeId | Parametry adaptera |
| --- | --- | --- | --- |
| In-image | InImage #1 | `63d93bb54d506e95f039e2e3` | `placement: 'inImage'`, `imageUrl` |
| 300×250 | Ad slot #3 | `63da9e2a4d506e16acfd2a36` | `placement: 'banner'` |
| 300×600 | Ad slot #4 | `63daa2ea7bc72f39bc3bfc72` | `placement: 'banner'` |
| 970×250 | Ad slot #5 | `63daa3c24d506e16acfd2a38` | `placement: 'banner'` |
| 320×480 (interstitial) | Ad slot #10 | `68f63437810d98e1a08f26de` | `placement: 'banner'` |
| 320×50 | Ad slot #11 | `68f644dc70e7b26b58596f34` | `placement: 'banner'` |
| 320×100 | Ad slot #13 | `68f645bf810d98e1a08f272f` | `placement: 'banner'` |
| Wideo | Ad slot #9 VideoPlace | `64b662024d506ede18ffa441` | `placement: 'video'` |

Na web.icoffio.com 728×90 (#2) w tekście i 970×250 przed podobnymi artykułami nie idą przez Prebid: w tych samych miejscach stoją sloty Bidio art_2 i art_3.

## Wspólne wymagania

- CSP przepuszcza `*.hybrid.ai` w `script-src`, `connect-src` i `frame-src`.
- Zgoda reklamowa użytkownika przed załadowaniem Prebid.
- Aukcja dopiero, gdy miejsce zbliża się do ekranu (np. IntersectionObserver z marginesem 300 px). Miejsca w ukrytych kontenerach (`display:none`) nie licytują.
- Jedna jednostka na aukcję: SSP zwraca jedną ofertę na miejsce na zapytanie.

## In-image

1. Strona ładuje Prebid z adapterem `vox` (np. przez wrapper Bidio).
2. Dla każdego zdjęcia artykułu, gdy zbliża się do ekranu, strona uruchamia osobną aukcję z `placement: 'inImage'`, `placementId` (placeId miejsca in-image) i `imageUrl` (adres oryginalnego zdjęcia).
3. Adapter wysyła zapytanie do `https://ssp.hybrid.ai/auction/prebid`; SSP VOX wybiera kampanię Hybrid i zwraca ofertę.
4. Strona kładzie nad zdjęciem ramkę (iframe) dokładnie jego rozmiaru i wyświetla w niej ofertę przez `pbjs.renderAd`. Renderer VOX (`st.hybrid.ai/prebidrenderer.js`) rysuje pasek na dole zdjęcia i wysyła piksele.

Dodatkowe wymagania:

- Zdjęcie min. 300 × 200 px (mniejsze nie zmieszczą paska 120–200 px).
- Na tej samej stronie nie działa równolegle bezpośrednie VOX in-image (`_tx.integrateInImage`), żeby na jednym zdjęciu nie było dwóch nakładek.

Minimalny kod dla jednego zdjęcia (po załadowaniu Prebid; `<VOX_INIMAGE_PLACE_ID>` z panelu VOX):

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

Pełna wersja (wiele zdjęć, aukcja przy wejściu zdjęcia na ekran, sprzątanie): `lib/prebid-inimage.ts`.

## Banery

1. Gdy miejsce zbliża się do ekranu, strona uruchamia aukcję z jedną jednostką: `mediaTypes.banner.sizes` = rozmiar miejsca, `placement: 'banner'`, `placementId` miejsca.
2. Po wygranej strona tworzy ramkę dokładnie w rozmiarze miejsca, z `id` i `name` równymi kodowi jednostki, i wywołuje `pbjs.renderAd`. Kreacja ładuje `st.hybrid.ai/prebidrenderer.js`.
3. Brak oferty (204): miejsce zostaje puste.

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

Pełna wersja: `lib/prebid-vox.ts` i `components/PrebidVoxAd.tsx`; interstitial 320×480: `components/InterstitialAd.tsx`.

## Wideo

1. Strona uruchamia aukcję z jednostką wideo **outstream** z pustym rendererem (bez `url`), `placement: 'video'` i placeId miejsca wideo.
2. Wygrana oferta ma `bid.vastXml` (inline VAST). Strona sama go odczytuje: plik MP4, czas trwania, piksele Impression, kwartyli, Complete, Error.
3. Odtwarzacz strony gra MP4, wysyła piksele VAST i przy pierwszym odtworzeniu woła `pbjs.markWinningBidAsUsed` (analityka Prebid/Bidio).
4. Brak oferty albo VAST bez MP4: odtwarzacza reklamy nie ma.

Dlaczego outstream: Prebid 11 odrzuca ofertę `instream`, która ma tylko `vastXml`, jeśli w konfiguracji nie ma cache Prebid („will not work when a prebid cache url is not specified”). Cache to globalna konfiguracja wrappera Bidio. Oferta outstream wymaga renderera; renderer bez `url` nie ładuje żadnego skryptu i nie jest wywoływany, bo VAST gra odtwarzacz strony.

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

Pełna wersja: `components/VideoPlayer.tsx` (aukcja i odtwarzanie) i `lib/vast.ts` (odczyt VAST).

## Sprawdzenie

DevTools, zakładka Network:

- `ssp.hybrid.ai/auction/prebid` z `"placement":"inImage"`, `"banner"` albo `"video"` w zapytaniu; odpowiedź `{"bids":[{"price":…}]}` albo 204 (brak oferty).
- Banery i in-image po wygranej: `st.hybrid.ai/prebidrenderer.js`, potem `ssp.hybrid.ai/seance/Impression/…` i `ssp.hybrid.ai/seance/View/…`.
- Wideo po wygranej: pobranie pliku `.mp4` z `content.hybrid.ai` i piksele z VAST.
- Konsola przeglądarki na web.icoffio.com: `[Bidio] vox <format> <kod>: vox <cpm> rendered` albo `no bid`.

Wynik testu 29–30.10.2026 na web.icoffio.com:

| Miejsce | Wynik |
| --- | --- |
| In-image | oferty 5–10 PLN, pasek widoczny |
| 300×250 / 300×600 | oferty 2 i 3 PLN, banery widoczne |
| 320×50 | oferta 2 PLN, baner widoczny |
| Wideo | oferta 5 PLN, MP4 gra w odtwarzaczu |
| 320×100 / 320×480 | 204 — w kampanii display brak kreacji w tych rozmiarach |

## Pułapki

| Pułapka | Objaw | Rozwiązanie |
| --- | --- | --- |
| Prebid 11 rysuje in-image w ramce o rozmiarze oferty (szerokość 0) | Piksele Impression i View idą, paska nie widać | Rozciągnąć wewnętrzną ramkę do 100% (kod in-image) |
| Po wyświetleniu Prebid zmienia ramkę in-image na wysokość oferty (120 px) | Pasek na górze zdjęcia zamiast na dole | Trzymać ramkę na 100% zdjęcia (kod in-image) |
| Wideo `instream` bez cache Prebid | SSP zwraca ofertę, w Prebid 0 ofert, w konsoli „prebid cache url is not specified” | `context: 'outstream'` z pustym rendererem albo `cache.url` w konfiguracji Prebid |
| Brak kreacji w rozmiarze miejsca | 204 na każdym zapytaniu (u nas 320×100 i 320×480) | Dodać do kampanii kreacje dokładnie w tym rozmiarze |
| Miejsce Prebid w tym samym miejscu co slot wrappera | Dwa banery obok siebie | Nie uruchamiać aukcji VOX w tym miejscu |
| Kampania z whitelistą domen | Brak ofert na nowej domenie | Dodać domenę do whitelisty albo ją wyczyścić |
| Kampania z „Cookie consent (Google)”, a strona nie przekazuje zgody TCF | Mniej ofert lub brak | Na prawdziwym ruchu: certyfikowany CMP i `gdprEnabled: true` |
| Bezpośrednie VOX in-image działa równolegle | Dwie nakładki na jednym zdjęciu | Na stronie z Prebid in-image wyłączyć `_tx.integrateInImage` |

Widoczność in-image liczy się tak samo jak przy bezpośrednim VOX: View przy >99% zdjęcia na ekranie przez 1 s. Popyt bywa przerywany: w teście 29.10 oferta in-image przyszła w 1 z 5 wyświetleń, w pozostałych SSP zwrócił 204.
