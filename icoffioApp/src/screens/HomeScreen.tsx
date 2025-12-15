import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

import {Article} from '../types';
import {apiService} from '../services/api';
import {TopBannerAd, ContentAd, InterstitialAd} from '../components/MobileAd';
import {RootStackParamList} from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const {width: screenWidth} = Dimensions.get('window');
const cardWidth = screenWidth - 32;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchArticles = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (!refresh && pageNum === 1) setLoading(true);
      
      const response = await apiService.getArticles(pageNum, 'en');
      
      if (refresh || pageNum === 1) {
        setArticles(response.data);
      } else {
        setArticles(prev => [...prev, ...response.data]);
      }
      
      setHasMore(response.pagination ? pageNum < response.pagination.totalPages : false);
      setPage(pageNum);
      
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchArticles(1, true);
  }, [fetchArticles]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      setLoadingMore(true);
      fetchArticles(page + 1);
    }
  }, [hasMore, loadingMore, loading, page, fetchArticles]);

  const navigateToArticle = useCallback((article: Article) => {
    navigation.navigate('Article', {
      articleId: article.id,
      articleSlug: article.slug,
    });
  }, [navigation]);

  const renderArticleItem = ({item, index}: {item: Article; index: number}) => {
    const isFirst = index === 0;
    const shouldShowContentAd = index > 0 && (index + 1) % 5 === 0; // Каждый 5-й элемент
    const shouldShowInterstitial = index > 0 && (index + 1) % 10 === 0; // Каждый 10-й элемент

    return (
      <>
        {/* Рекламный баннер вверху для первого элемента */}
        {isFirst && <TopBannerAd />}
        
        <TouchableOpacity
          style={styles.articleCard}
          onPress={() => navigateToArticle(item)}
          activeOpacity={0.8}
        >
          <Image 
            source={{uri: item.featuredImage.url}}
            style={styles.articleImage}
            resizeMode="cover"
          />
          
          <View style={styles.articleContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category.name}</Text>
            </View>
            
            <Text style={styles.articleTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            <Text style={styles.articleExcerpt} numberOfLines={3}>
              {item.excerpt}
            </Text>
            
            <View style={styles.articleMeta}>
              <Text style={styles.metaText}>
                {item.author.name} • {item.readingTime} min read
              </Text>
              <Text style={styles.metaDate}>
                {new Date(item.publishedAt).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Рекламные блоки между статьями */}
        {shouldShowInterstitial && <InterstitialAd />}
        {shouldShowContentAd && !shouldShowInterstitial && <ContentAd />}
      </>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка статей...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={articles}
        renderItem={renderArticleItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  articleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  articleImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#2a2a2a',
  },
  articleContent: {
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  articleTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 24,
  },
  articleExcerpt: {
    color: '#cccccc',
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: '#888888',
    fontSize: 12,
  },
  metaDate: {
    color: '#888888',
    fontSize: 12,
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
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
















