import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Share,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import {WebView} from 'react-native-webview';

import {Article} from '../types';
import {apiService} from '../services/api';
import {ContentAd, BottomBannerAd} from '../components/MobileAd';
import {RootStackParamList} from '../../App';

type ArticleScreenRouteProp = RouteProp<RootStackParamList, 'Article'>;

const {width: screenWidth} = Dimensions.get('window');

export default function ArticleScreen() {
  const route = useRoute<ArticleScreenRouteProp>();
  const {articleId} = route.params;
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [webViewHeight, setWebViewHeight] = useState(300);

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const fetchedArticle = await apiService.getArticle(articleId);
      setArticle(fetchedArticle);
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!article) return;
    
    try {
      await Share.share({
        title: article.title,
        message: `${article.title}\n\nЧитать на ICoffio: https://app.icoffio.com/article/${article.slug}`,
        url: `https://app.icoffio.com/article/${article.slug}`,
      });
    } catch (error) {
      console.error('Error sharing article:', error);
    }
  };

  // HTML контент статьи с мобильной оптимизацией
  const getArticleHtml = (content: string) => {
    return `
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #ffffff;
            background: transparent;
            padding: 0;
            font-size: 16px;
            overflow-x: hidden;
          }
          
          .content {
            padding: 0;
            max-width: 100%;
          }
          
          p {
            margin-bottom: 16px;
            line-height: 1.7;
          }
          
          h1, h2, h3, h4, h5, h6 {
            color: #ffffff;
            margin: 20px 0 12px 0;
            line-height: 1.3;
          }
          
          h1 { font-size: 28px; }
          h2 { font-size: 24px; }
          h3 { font-size: 20px; }
          h4 { font-size: 18px; }
          
          img {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 16px 0;
            border-radius: 8px;
          }
          
          a {
            color: #007AFF;
            text-decoration: none;
          }
          
          a:hover {
            text-decoration: underline;
          }
          
          blockquote {
            border-left: 4px solid #007AFF;
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: #cccccc;
          }
          
          code {
            background: #2a2a2a;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', Consolas, monospace;
            font-size: 14px;
          }
          
          pre {
            background: #2a2a2a;
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 16px 0;
          }
          
          pre code {
            background: none;
            padding: 0;
          }
          
          ul, ol {
            padding-left: 20px;
            margin: 16px 0;
          }
          
          li {
            margin-bottom: 8px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          
          th, td {
            border: 1px solid #333333;
            padding: 8px 12px;
            text-align: left;
          }
          
          th {
            background: #2a2a2a;
            font-weight: 600;
          }
          
          /* Удаляем лишние отступы */
          .content > *:first-child {
            margin-top: 0;
          }
          
          .content > *:last-child {
            margin-bottom: 0;
          }
        </style>
      </head>
      <body>
        <div class="content">
          ${content}
        </div>
        
        <script>
          // Уведомляем React Native о высоте контента
          function updateHeight() {
            const height = document.body.scrollHeight;
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'height', height: height })
            );
          }
          
          // Обновляем высоту после загрузки
          window.addEventListener('load', updateHeight);
          
          // Отслеживаем изменения размера
          const observer = new ResizeObserver(updateHeight);
          observer.observe(document.body);
          
          // Отлавливаем клики по ссылкам
          document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.href) {
              e.preventDefault();
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'link', url: link.href })
              );
            }
          });
          
          // Начальное обновление высоты
          setTimeout(updateHeight, 100);
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'height') {
        setWebViewHeight(Math.max(data.height, 300));
      } else if (data.type === 'link') {
        // Обработка ссылок - можно открыть в браузере или WebView
        console.log('Link clicked:', data.url);
      }
    } catch (error) {
      console.log('Error parsing WebView message:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка статьи...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Статья не найдена</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Заголовок и мета информация */}
      <View style={styles.header}>
        <Image 
          source={{uri: article.featuredImage.url}}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        
        <View style={styles.headerContent}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{article.category.name}</Text>
          </View>
          
          <Text style={styles.title}>{article.title}</Text>
          
          <View style={styles.meta}>
            <Text style={styles.metaText}>
              {article.author.name} • {article.readingTime} min read
            </Text>
            <Text style={styles.metaDate}>
              {new Date(article.publishedAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Поделиться</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Рекламный блок после заголовка */}
      <ContentAd />

      {/* Содержание статьи */}
      <View style={styles.contentContainer}>
        <WebView
          source={{html: getArticleHtml(article.content)}}
          style={[styles.contentWebView, {height: webViewHeight}]}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={false}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={['*']}
          startInLoadingState={false}
          onError={(error) => {
            console.log('WebView error:', error);
          }}
        />
      </View>

      {/* Тэги */}
      {article.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          <Text style={styles.tagsTitle}>Теги:</Text>
          <View style={styles.tagsWrapper}>
            {article.tags.map((tag) => (
              <View key={tag.id} style={styles.tag}>
                <Text style={styles.tagText}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Рекламный блок в конце */}
      <BottomBannerAd />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 18,
  },
  header: {
    backgroundColor: '#1a1a1a',
  },
  featuredImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#2a2a2a',
  },
  headerContent: {
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 32,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaText: {
    color: '#cccccc',
    fontSize: 14,
  },
  metaDate: {
    color: '#888888',
    fontSize: 14,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  shareButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentWebView: {
    backgroundColor: 'transparent',
    margin: 16,
  },
  tagsContainer: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  tagsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tagsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#cccccc',
    fontSize: 14,
  },
});
















