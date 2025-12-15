import React, {useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  BackHandler,
  useEffect,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useRoute, RouteProp} from '@react-navigation/native';

import {RootStackParamList} from '../../App';

type WebViewScreenRouteProp = RouteProp<RootStackParamList, 'WebView'>;

export default function WebViewScreen() {
  const route = useRoute<WebViewScreenRouteProp>();
  const {url} = route.params;
  
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleBackPress = (): boolean => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    Alert.alert(
      'Ошибка загрузки',
      'Не удается загрузить страницу. Проверьте подключение к интернету.',
      [
        {
          text: 'Перезагрузить',
          onPress: () => {
            webViewRef.current?.reload();
          },
        },
      ],
    );
  };

  // Скрипт для улучшения отображения на мобильном
  const injectedJavaScript = `
    (function() {
      // Добавляем стили для мобильного отображения
      const style = document.createElement('style');
      style.innerHTML = \`
        body {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }
        
        html, body {
          overflow-x: hidden;
          max-width: 100vw;
        }
        
        * {
          max-width: 100%;
        }
        
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* Улучшаем читаемость на темной теме */
        .dark body,
        body.dark {
          background-color: #1a1a1a !important;
          color: #ffffff !important;
        }
        
        /* Скрываем элементы навигации если они есть */
        header nav,
        .site-header,
        .main-navigation {
          display: none !important;
        }
      \`;
      document.head.appendChild(style);
      
      // Включаем темную тему если поддерживается
      if (document.documentElement) {
        document.documentElement.classList.add('dark');
      }
      
      // Уведомляем React Native
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('pageLoaded');
    })();
  `;

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{uri: url}}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        injectedJavaScript={injectedJavaScript}
        userAgent="ICoffio-Mobile-App/1.0 (iOS)"
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsProtectedMedia={true}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          if (message === 'pageLoaded') {
            console.log('WebView page loaded');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});
















