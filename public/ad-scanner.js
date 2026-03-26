(function(){
  if(window.__adScannerActive){return alert('Ad Scanner already running');}
  window.__adScannerActive=true;

  var API='https://web.icoffio.com/api/ad-diagnostics/live-scan';
  var panel,logArea,statusEl;
  var logs=[];
  var scanResult={
    url:location.href,
    hostname:location.hostname,
    timestamp:new Date().toISOString(),
    viewport:{w:window.innerWidth,h:window.innerHeight},
    userAgent:navigator.userAgent,
    images:[],
    inImageOverlays:[],
    consoleErrors:[],
    networkErrors:[],
    gamSlots:[],
    scripts:[],
    measurements:{
      totalOverlayPercent:0,
      maxSingleOverlay:0,
      simultaneousAds:0,
      heavyScripts:0,
    },
    issues:[],
  };

  // Inject panel
  function createPanel(){
    panel=document.createElement('div');
    panel.id='__adScannerPanel';
    panel.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
        '<b style="font-size:14px;">Ad Scanner Live</b>'+
        '<div>'+
          '<button id="__asCopy" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">Copy JSON</button>'+
          '<button id="__asSend" style="background:#10b981;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;margin-right:4px;">Send to API</button>'+
          '<button id="__asClose" style="background:#ef4444;color:#fff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:11px;">X</button>'+
        '</div>'+
      '</div>'+
      '<div id="__asStatus" style="padding:4px 8px;background:#1e293b;border-radius:4px;margin-bottom:6px;font-size:11px;color:#94a3b8;">Initializing...</div>'+
      '<div id="__asLog" style="max-height:350px;overflow-y:auto;font-size:10px;line-height:1.4;color:#cbd5e1;font-family:monospace;white-space:pre-wrap;"></div>';
    panel.style.cssText='position:fixed;bottom:10px;right:10px;width:420px;max-height:500px;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:10px;z-index:2147483647;font-family:system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #334155;';
    document.body.appendChild(panel);
    logArea=document.getElementById('__asLog');
    statusEl=document.getElementById('__asStatus');
    document.getElementById('__asClose').onclick=function(){
      panel.remove();window.__adScannerActive=false;
    };
    document.getElementById('__asCopy').onclick=function(){
      navigator.clipboard.writeText(JSON.stringify(scanResult,null,2)).then(function(){
        log('INFO','JSON copied to clipboard');
      });
    };
    document.getElementById('__asSend').onclick=sendToAPI;
  }

  function log(type,msg){
    var ts=new Date().toLocaleTimeString();
    var colors={INFO:'#60a5fa',WARN:'#fbbf24',ERR:'#f87171',OK:'#34d399',SCAN:'#a78bfa'};
    var c=colors[type]||'#94a3b8';
    logs.push({t:ts,type:type,msg:msg});
    if(logArea){
      logArea.innerHTML+='<div><span style="color:'+c+';">['+type+']</span> '+msg+'</div>';
      logArea.scrollTop=logArea.scrollHeight;
    }
  }

  function setStatus(text,color){
    if(statusEl)statusEl.innerHTML='<span style="color:'+(color||'#94a3b8')+';">'+text+'</span>';
  }

  async function sendToAPI(){
    setStatus('Sending...','#fbbf24');
    try{
      var r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(scanResult)});
      if(r.ok){var d=await r.json();log('OK','Saved to server: '+d.id);setStatus('Sent! ID: '+d.id,'#34d399');}
      else{log('ERR','Server error: '+r.status);setStatus('Error: '+r.status,'#f87171');}
    }catch(e){log('ERR','Network error: '+e.message);setStatus('Failed to send','#f87171');}
  }

  // Phase 1: Scan static page
  function scanStatic(){
    setStatus('Phase 1/4: Scanning page structure...','#60a5fa');

    // Scripts
    document.querySelectorAll('script[src]').forEach(function(s){
      var src=s.src||'';
      var type='unknown';
      if(/googletag|gpt\.js|securepubads/i.test(src))type='gam';
      else if(/teads/i.test(src))type='teads';
      else if(/hybssp|hbrd\.io/i.test(src))type='hyb-ssp';
      else if(/prebid/i.test(src))type='prebid';
      else if(/vox|videoexchanger/i.test(src))type='vox';
      else if(/adsense|pagead/i.test(src))type='adsense';
      else if(/pubmatic|appnexus|rubiconproject|openx|indexexchange|criteo/i.test(src))type='ssp';
      if(type!=='unknown')scanResult.scripts.push({src:src.slice(0,200),type:type,async:s.async,defer:s.defer});
    });
    log('SCAN','Found '+scanResult.scripts.length+' ad scripts');

    // GAM slots
    document.querySelectorAll('[id*="gpt-ad"],[id*="google_ads"],[id*="dfp-"]').forEach(function(el){
      var r=el.getBoundingClientRect();
      var s=window.getComputedStyle(el);
      var iframe=el.querySelector('iframe');
      scanResult.gamSlots.push({
        id:el.id,
        w:Math.round(r.width),h:Math.round(r.height),
        display:s.display,visibility:s.visibility,
        hasIframe:!!iframe,
        iframeW:iframe?iframe.width:'n/a',
        iframeH:iframe?iframe.height:'n/a',
        filled:r.width>2&&r.height>2&&s.display!=='none',
      });
    });
    var filled=scanResult.gamSlots.filter(function(s){return s.filled;}).length;
    log('SCAN','GAM slots: '+scanResult.gamSlots.length+' total, '+filled+' filled');

    // Article images
    document.querySelectorAll('article img, .article img, .post img, .entry-content img, [class*="article"] img, main img').forEach(function(img){
      var r=img.getBoundingClientRect();
      if(r.width>200&&r.height>100){
        scanResult.images.push({
          src:(img.src||'').slice(0,200),
          alt:(img.alt||'').slice(0,80),
          w:Math.round(r.width),h:Math.round(r.height),
          top:Math.round(r.top+window.scrollY),
        });
      }
    });
    log('SCAN','Article images: '+scanResult.images.length);
  }

  // Phase 2: Intercept console errors
  function interceptConsole(){
    setStatus('Phase 2/4: Intercepting errors...','#60a5fa');
    var origError=console.error;
    var origWarn=console.warn;
    var captured=0;
    console.error=function(){
      var msg=Array.prototype.slice.call(arguments).join(' ').slice(0,300);
      if(/ad|gpt|teads|hyb|ssp|prebid|vox|gam|pubmatic/i.test(msg)){
        scanResult.consoleErrors.push({type:'error',msg:msg});
        captured++;
      }
      origError.apply(console,arguments);
    };
    console.warn=function(){
      var msg=Array.prototype.slice.call(arguments).join(' ').slice(0,300);
      if(/ad|gpt|teads|hyb|ssp|prebid|vox|gam/i.test(msg)){
        scanResult.consoleErrors.push({type:'warn',msg:msg});
        captured++;
      }
      origWarn.apply(console,arguments);
    };
    // Capture network errors via PerformanceObserver
    if(window.PerformanceObserver){
      try{
        var po=new PerformanceObserver(function(list){
          list.getEntries().forEach(function(e){
            if(e.responseStatus&&e.responseStatus>=400){
              scanResult.networkErrors.push({url:e.name.slice(0,200),status:e.responseStatus,dur:Math.round(e.duration)});
            }
          });
        });
        po.observe({type:'resource',buffered:true});
      }catch(e){}
    }
    log('SCAN','Console/network interceptors active');
    return function(){console.error=origError;console.warn=origWarn;};
  }

  // Phase 3: Scroll and detect InImage overlays
  function scrollAndDetect(){
    return new Promise(function(resolve){
      setStatus('Phase 3/4: Scrolling to trigger InImage ads...','#a78bfa');
      var scrollY=0;
      var maxY=document.documentElement.scrollHeight-window.innerHeight;
      var step=300;
      var delay=800;
      var found=0;

      function tick(){
        if(scrollY>=maxY||scrollY>8000){
          window.scrollTo(0,0);
          log('SCAN','Scroll complete. InImage overlays found: '+found);
          resolve();
          return;
        }
        window.scrollTo(0,scrollY);
        // Check for new InImage overlays at this scroll position
        detectOverlaysNow();
        scrollY+=step;
        setTimeout(tick,delay);
      }

      function detectOverlaysNow(){
        // HYB SSP placeholder
        document.querySelectorAll('.placeholder-d5JfG, [class*="hyb_ssp"], [id*="hyb_ssp"], [class*="in-image"], [data-hyb]').forEach(function(el){
          processOverlay(el,'hyb-ssp');
        });
        // Teads containers
        document.querySelectorAll('[class*="teads"], [id*="teads"], .tds-inread').forEach(function(el){
          processOverlay(el,'teads');
        });
        // Generic InImage iframes overlaying images
        scanResult.images.forEach(function(imgData){
          var img=document.querySelector('img[src*="'+imgData.src.split('/').pop().slice(0,30)+'"]');
          if(!img)return;
          var parent=img.parentElement;
          if(!parent)return;
          parent.querySelectorAll('iframe, [class*="overlay"], [class*="banner"]').forEach(function(el){
            if(el===img)return;
            processOverlay(el,'generic',imgData);
          });
        });
      }

      function processOverlay(el,provider,imgData){
        var r=el.getBoundingClientRect();
        if(r.width<50||r.height<10)return;
        var s=window.getComputedStyle(el);
        var key=el.tagName+':'+Math.round(r.left)+':'+Math.round(r.top)+':'+Math.round(r.width);
        if(scanResult.inImageOverlays.some(function(o){return o.key===key;}))return;

        // Find the closest image
        var closestImg=imgData;
        if(!closestImg){
          var parent=el.closest('picture, figure, [class*="image"], [class*="photo"], [class*="featured"]')||el.parentElement;
          if(parent){
            var img=parent.querySelector('img');
            if(img){
              var ir=img.getBoundingClientRect();
              if(ir.width>200&&ir.height>100){
                closestImg={w:Math.round(ir.width),h:Math.round(ir.height)};
              }
            }
          }
        }

        var overlayPct=0;
        if(closestImg&&closestImg.h>0){
          overlayPct=Math.round(r.height/closestImg.h*100);
        }

        var overlay={
          key:key,
          provider:provider,
          tag:el.tagName,
          id:(el.id||'').slice(0,50),
          cls:(el.className&&typeof el.className==='string'?el.className:'').slice(0,80),
          w:Math.round(r.width),h:Math.round(r.height),
          position:s.position,
          zIndex:s.zIndex,
          display:s.display,
          overlayOnImage:!!closestImg,
          imageW:closestImg?closestImg.w:0,
          imageH:closestImg?closestImg.h:0,
          overlayPercent:overlayPct,
          exceeds30pct:overlayPct>30,
        };

        scanResult.inImageOverlays.push(overlay);
        found++;

        var color=overlay.exceeds30pct?'#f87171':'#34d399';
        log('SCAN','<span style="color:'+color+';">InImage overlay: '+provider+' '+overlay.w+'x'+overlay.h+'px = '+overlayPct+'% of image'+(overlay.exceeds30pct?' EXCEEDS 30% LIMIT':'')+'</span>');

        if(overlay.exceeds30pct){
          scanResult.issues.push({
            severity:'error',
            category:'Better Ads Standards',
            message:'InImage overlay covers '+overlayPct+'% of image (limit: 30%)',
            detail:provider+' overlay '+overlay.w+'x'+overlay.h+' on image '+overlay.imageW+'x'+overlay.imageH,
          });
        }
      }

      tick();
    });
  }

  // Phase 4: Measure and summarize
  function measureAndSummarize(){
    setStatus('Phase 4/4: Analyzing results...','#60a5fa');

    // Count simultaneous ads in viewport
    var viewH=window.innerHeight;
    var adsInView=0;
    document.querySelectorAll('iframe').forEach(function(f){
      var r=f.getBoundingClientRect();
      if(r.top<viewH&&r.bottom>0&&r.width>100&&r.height>30){
        var src=f.src||'';
        if(/ad|gpt|teads|hyb|ssp|doubleclick|googlesyndication/i.test(src)||/ad|gpt|banner|sponsor/i.test(f.id||'')){
          adsInView++;
        }
      }
    });
    scanResult.measurements.simultaneousAds=adsInView;

    // Max overlay
    var maxOv=0;
    scanResult.inImageOverlays.forEach(function(o){
      if(o.overlayPercent>maxOv)maxOv=o.overlayPercent;
    });
    scanResult.measurements.maxSingleOverlay=maxOv;
    scanResult.measurements.totalOverlayPercent=maxOv;

    // z-index abuse
    var maxZ=0;
    document.querySelectorAll('*').forEach(function(el){
      var z=parseInt(window.getComputedStyle(el).zIndex);
      if(!isNaN(z)&&z>maxZ)maxZ=z;
    });
    if(maxZ>999999){
      scanResult.issues.push({severity:'warning',category:'Layout',message:'Very high z-index: '+maxZ,detail:'May trigger Google ad quality filters'});
    }

    // GAM unfilled slots
    var unfilled=scanResult.gamSlots.filter(function(s){return!s.filled;});
    if(unfilled.length>0){
      scanResult.issues.push({
        severity:'error',
        category:'GAM Fill',
        message:unfilled.length+' GAM slots unfilled (display:none or 1x1)',
        detail:unfilled.map(function(s){return s.id;}).join(', '),
      });
    }

    // Simultaneous ads
    if(adsInView>4){
      scanResult.issues.push({severity:'warning',category:'Ad Density',message:adsInView+' ads visible simultaneously',detail:'High ad density may trigger Google ad quality checks'});
    }

    // Console errors
    var adErrors=scanResult.consoleErrors.filter(function(e){return e.type==='error';}).length;
    if(adErrors>0){
      scanResult.issues.push({severity:'warning',category:'Console',message:adErrors+' ad-related console errors',detail:'May indicate broken integrations'});
    }

    // Summary
    log('INFO','------- SUMMARY -------');
    log('INFO','Page: '+location.hostname+location.pathname.slice(0,60));
    log('INFO','GAM slots: '+scanResult.gamSlots.length+' ('+scanResult.gamSlots.filter(function(s){return s.filled;}).length+' filled)');
    log('INFO','InImage overlays: '+scanResult.inImageOverlays.length);
    log('INFO','Max overlay: '+maxOv+'%'+(maxOv>30?' PROBLEM':''));
    log('INFO','Ads in viewport: '+adsInView);
    log('INFO','Console errors: '+adErrors);
    log('INFO','Issues: '+scanResult.issues.filter(function(i){return i.severity==='error';}).length+' errors, '+scanResult.issues.filter(function(i){return i.severity==='warning';}).length+' warnings');

    var hasProblems=scanResult.issues.some(function(i){return i.severity==='error';});
    if(hasProblems){
      setStatus('PROBLEMS FOUND — '+scanResult.issues.filter(function(i){return i.severity==='error';}).length+' errors','#f87171');
    }else{
      setStatus('Scan complete — no critical issues','#34d399');
    }

    scanResult.issues.forEach(function(iss){
      var c=iss.severity==='error'?'ERR':'WARN';
      log(c,'['+iss.category+'] '+iss.message);
    });
  }

  // Run
  createPanel();
  var restoreConsole=interceptConsole();
  scanStatic();
  scrollAndDetect().then(function(){
    measureAndSummarize();
    restoreConsole();
    log('OK','Scan finished. Use "Copy JSON" or "Send to API" buttons.');
  });
})();
