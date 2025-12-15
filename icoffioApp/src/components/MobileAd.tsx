import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Dimensions, ViewStyle} from 'react-native';
import {WebView} from 'react-native-webview';

interface MobileAdProps {
  placeId: string;
  format: 'mobile-banner' | 'medium-rectangle' | 'large-mobile-banner' | 'interstitial';
  style?: ViewStyle;
}

const {width: screenWidth} = Dimensions.get('window');

// Мобильные рекламные форматы (стандарты IAB)
const AD_FORMATS = {
  'mobile-banner': {width: 320, height: 50},         // Стандартный мобильный баннер
  'medium-rectangle': {width: 300, height: 250},     // Медиум прямоугольник
  'large-mobile-banner': {width: 320, height: 100},  // Большой мобильный баннер
  'interstitial': {width: screenWidth, height: 300}, // Полноширинная реклама
};

// Соответствие мобильных форматов к VOX Place ID
const VOX_PLACE_IDS = {
  'mobile-banner': '63da9b577bc72f39bc3bfc68',        // Используем 728x90 ID
  'medium-rectangle': '63da9e2a4d506e16acfd2a36',     // 300x250 ID
  'large-mobile-banner': '63daa3c24d506e16acfd2a38',  // Используем 970x250 ID 
  'interstitial': '63daa2ea7bc72f39bc3bfc72',         // Используем 300x600 ID
};

export function MobileAd({placeId, format, style}: MobileAdProps) {
  const webViewRef = useRef<WebView>(null);
  const dimensions = AD_FORMATS[format];
  const voxPlaceId = VOX_PLACE_IDS[format] || placeId;

  // HTML для инициализации VOX рекламы
  const adHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          width: ${dimensions.width}px;
          height: ${dimensions.height}px;
          background: transparent;
          overflow: hidden;
        }
        
        .vox-ad-container {
          width: 100%;
          height: 100%;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Fallback если реклама не загрузилась */
        .ad-fallback {
          width: 100%;
          height: 100%;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          color: #666;
          font-size: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div 
        data-hyb-ssp-ad-place="${voxPlaceId}"
        class="vox-ad-container"
        id="vox-ad-${voxPlaceId}"
      >
        <div class="ad-fallback">Ad Loading...</div>
      </div>
      
      <!-- VOX Display Script -->
      <script>
        (function() {
          // Инициализация VOX рекламы
          var script = document.createElement('script');
          script.src = 'https://js.voxdisplay.com/ads.js';
          script.async = true;
          document.head.appendChild(script);
          
          // Уведомление об успешной загрузке
          script.onload = function() {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage('vox-loaded');
          };
          
          script.onerror = function() {
            document.getElementById('vox-ad-${voxPlaceId}').innerHTML = 
              '<div class="ad-fallback">Advertisement</div>';
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage('vox-error');
          };
        })();
      </script>
    </body>
    </html>
  `;

  const containerStyle = StyleSheet.flatten([
    styles.container,
    {
      width: format === 'interstitial' ? screenWidth - 32 : dimensions.width,
      height: dimensions.height,
    },
    style,
  ]);

  return (
    <View style={containerStyle}>
      <WebView
        ref={webViewRef}
        source={{html: adHtml}}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        startInLoadingState={false}
        scalesPageToFit={false}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          if (message === 'vox-loaded') {
            console.log(`VOX ad loaded for format: ${format}`);
          } else if (message === 'vox-error') {
            console.log(`VOX ad error for format: ${format}`);
          }
        }}
        onError={(error) => {
          console.log('WebView error in MobileAd:', error);
        }}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

// Специализированные компоненты для разных позиций

export function TopBannerAd({style}: {style?: ViewStyle}) {
  return (
    <MobileAd
      placeId="mobile-banner-top"
      format="mobile-banner"
      style={[styles.topBanner, style]}
    />
  );
}

export function ContentAd({style}: {style?: ViewStyle}) {
  return (
    <MobileAd
      placeId="content-rectangle"
      format="medium-rectangle"
      style={[styles.contentAd, style]}
    />
  );
}

export function BottomBannerAd({style}: {style?: ViewStyle}) {
  return (
    <MobileAd
      placeId="mobile-banner-bottom"
      format="large-mobile-banner"
      style={[styles.bottomBanner, style]}
    />
  );
}

export function InterstitialAd({style}: {style?: ViewStyle}) {
  return (
    <MobileAd
      placeId="interstitial-mobile"
      format="interstitial"
      style={[styles.interstitial, style]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    marginVertical: 8,
  },
  webView: {
    backgroundColor: 'transparent',
  },
  topBanner: {
    marginTop: 0,
    marginBottom: 16,
  },
  contentAd: {
    marginVertical: 20,
    alignSelf: 'center',
  },
  bottomBanner: {
    marginTop: 16,
    marginBottom: 8,
  },
  interstitial: {
    marginVertical: 24,
    marginHorizontal: 16,
  },
});
















