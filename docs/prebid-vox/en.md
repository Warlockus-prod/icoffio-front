# VOX through Prebid: in-image, banners and video — instructions

Version: v10.26.1, 30 Oct 2026. Other languages: [Polski](pl.md), [Русский](ru.md).

## In short

VOX ads (in-image, banners, video) can be sold through Prebid with no changes in the Hybrid console or the VOX panel. Only the code on the publisher's site changes. It runs on web.icoffio.com: in-image since 29 Oct 2026 (v10.25.9), banners and video since 30 Oct 2026 (v10.26.1). VOX wins, the ad shows, and the Impression and View pixels reach Hybrid.

We did not write the adapter. It is the standard public **VOX** adapter (`voxBidAdapter`) from Prebid.js, maintained by Hybrid. It is in every Prebid build that includes it, for example Bidio's build (`files.bidio.pl/prebid.js`). On our side there is only site code: the places in the Prebid auction and rendering the winning bid.

| Where | What changes | Notes |
| --- | --- | --- |
| Hybrid console (campaigns) | Nothing | The campaign buys through the Vox SSP and has creatives in the place's size; its domain whitelist must not exclude the site |
| VOX panel (places, VOX SSP code) | Nothing | Same places, same placeIds; no new places needed; floor and place settings apply as before |
| ads.txt | Nothing, if the line is already there | `voxexchange.io, <publisherId>, DIRECT` on the site's domain |
| Publisher's site | Places in Prebid + rendering the bid | Code below; without it Prebid does not offer these places |

Hybrid buys automatically: the Prebid request reaches the VOX SSP with the place's placeId, and the SSP runs the auction among campaigns connected to Vox, just as with the plain VOX code. But "automatically" only covers sites that have these places in Prebid. The Bidio wrapper (lazy SDK) fills only its own GPT slots (art_1…art_3), so a Bidio partner needs code like ours or support from Bidio.

## VOX places used on web.icoffio.com

| Format | Place in the VOX panel | placeId | Adapter params |
| --- | --- | --- | --- |
| In-image | InImage #1 | `63d93bb54d506e95f039e2e3` | `placement: 'inImage'`, `imageUrl` |
| 300×250 | Ad slot #3 | `63da9e2a4d506e16acfd2a36` | `placement: 'banner'` |
| 300×600 | Ad slot #4 | `63daa2ea7bc72f39bc3bfc72` | `placement: 'banner'` |
| 970×250 | Ad slot #5 | `63daa3c24d506e16acfd2a38` | `placement: 'banner'` |
| 320×480 (interstitial) | Ad slot #10 | `68f63437810d98e1a08f26de` | `placement: 'banner'` |
| 320×50 | Ad slot #11 | `68f644dc70e7b26b58596f34` | `placement: 'banner'` |
| 320×100 | Ad slot #13 | `68f645bf810d98e1a08f272f` | `placement: 'banner'` |
| Video | Ad slot #9 VideoPlace | `64b662024d506ede18ffa441` | `placement: 'video'` |

On web.icoffio.com the 728×90 (#2) in the text and the 970×250 before related articles do not go through Prebid: Bidio's art_2 and art_3 slots sit in the same spots.

## Common requirements

- CSP allows `*.hybrid.ai` in `script-src`, `connect-src` and `frame-src`.
- The user's advertising consent before Prebid loads.
- Auction only once the place nears the screen (for example an IntersectionObserver with a 300 px margin). Places inside hidden containers (`display:none`) do not bid.
- One unit per auction: the SSP returns one bid per place per request.

## In-image

1. The site loads Prebid with the `vox` adapter (for example through the Bidio wrapper).
2. For each article photo, as it nears the screen, the site runs a separate auction with `placement: 'inImage'`, `placementId` (the in-image place's placeId) and `imageUrl` (the original photo's address).
3. The adapter sends the request to `https://ssp.hybrid.ai/auction/prebid`; the VOX SSP picks a Hybrid campaign and returns a bid.
4. The site lays a frame (iframe) exactly the photo's size over it and renders the bid there with `pbjs.renderAd`. The VOX renderer (`st.hybrid.ai/prebidrenderer.js`) draws the stripe at the bottom of the photo and fires the pixels.

Also:

- Photo at least 300 × 200 px (a smaller one cannot fit the 120–200 px stripe).
- Direct VOX in-image (`_tx.integrateInImage`) does not run on the same page, or one photo gets two overlays.

Minimal code for one photo (after Prebid loads; `<VOX_INIMAGE_PLACE_ID>` from the VOX panel):

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

Full version (many photos, auction as a photo enters the screen, cleanup): `lib/prebid-inimage.ts`.

## Banners

1. As the place nears the screen, the site runs an auction with one unit: `mediaTypes.banner.sizes` = the place's size, `placement: 'banner'`, the place's `placementId`.
2. On a win the site creates a frame exactly the place's size, with `id` and `name` equal to the unit code, and calls `pbjs.renderAd`. The creative loads `st.hybrid.ai/prebidrenderer.js`.
3. No bid (204): the place stays empty.

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

Full version: `lib/prebid-vox.ts` and `components/PrebidVoxAd.tsx`; the 320×480 interstitial: `components/InterstitialAd.tsx`.

## Video

1. The site runs an auction with an **outstream** video unit with an empty renderer (no `url`), `placement: 'video'` and the video place's placeId.
2. The winning bid carries `bid.vastXml` (inline VAST). The site parses it itself: the MP4 file, duration, and the Impression, quartile, Complete and Error pixels.
3. The site's player plays the MP4, fires the VAST pixels and on first playback calls `pbjs.markWinningBidAsUsed` (Prebid/Bidio analytics).
4. No bid, or a VAST without an MP4: no ad player.

Why outstream: Prebid 11 drops an `instream` bid that carries only `vastXml` when no Prebid cache is configured ("will not work when a prebid cache url is not specified"). The cache is the Bidio wrapper's global config. An outstream bid needs a renderer; one without a `url` loads no script and is never called, because the site's player plays the VAST.

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

Full version: `components/VideoPlayer.tsx` (auction and playback) and `lib/vast.ts` (VAST parsing).

## Checking

DevTools, Network tab:

- `ssp.hybrid.ai/auction/prebid` with `"placement":"inImage"`, `"banner"` or `"video"` in the request; response `{"bids":[{"price":…}]}` or 204 (no bid).
- Banners and in-image after a win: `st.hybrid.ai/prebidrenderer.js`, then `ssp.hybrid.ai/seance/Impression/…` and `ssp.hybrid.ai/seance/View/…`.
- Video after a win: the `.mp4` download from `content.hybrid.ai` and the VAST pixels.
- Browser console on web.icoffio.com: `[Bidio] vox <format> <code>: vox <cpm> rendered` or `no bid`.

Test results on web.icoffio.com, 29–30 Oct 2026:

| Place | Result |
| --- | --- |
| In-image | bids of 5–10 PLN, stripe visible |
| 300×250 / 300×600 | bids of 2 and 3 PLN, banners visible |
| 320×50 | bid of 2 PLN, banner visible |
| Video | bid of 5 PLN, MP4 plays in the player |
| 320×100 / 320×480 | 204 — the display campaign has no creatives in these sizes |

## Pitfalls

| Pitfall | Symptom | Fix |
| --- | --- | --- |
| Prebid 11 renders in-image in a frame of the bid's size (width 0) | Impression and View pixels fire, no stripe visible | Stretch the inner frame to 100% (in-image code) |
| After rendering, Prebid resizes the in-image frame to the bid height (120 px) | Stripe at the top of the photo instead of the bottom | Keep the frame at 100% of the photo (in-image code) |
| `instream` video without a Prebid cache | The SSP returns a bid, Prebid has 0 bids, console says "prebid cache url is not specified" | `context: 'outstream'` with an empty renderer, or `cache.url` in the Prebid config |
| No creatives in the place's size | 204 on every request (for us 320×100 and 320×480) | Add creatives of exactly that size to the campaign |
| A Prebid place in the same spot as a wrapper slot | Two banners side by side | Do not run the VOX auction in that spot |
| Campaign with a domain whitelist | No bids on a new domain | Add the domain to the whitelist or clear it |
| Campaign with "Cookie consent (Google)" while the site passes no TCF consent | Fewer bids or none | On real traffic: a certified CMP and `gdprEnabled: true` |
| Direct VOX in-image runs in parallel | Two overlays on one photo | On pages with Prebid in-image, turn off `_tx.integrateInImage` |

In-image viewability counts the same as with direct VOX: View at >99% of the photo on screen for 1 s. Demand is intermittent: in the 29 Oct test an in-image bid came in 1 of 5 views; in the others the SSP returned 204.
