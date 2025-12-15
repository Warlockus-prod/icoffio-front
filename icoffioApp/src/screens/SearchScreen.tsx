import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';

import {Article} from '../types';
import {apiService} from '../services/api';
import {TopBannerAd, ContentAd} from '../components/MobileAd';
import {RootStackParamList} from '../../App';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      const results = await apiService.searchArticles(query.trim());
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching articles:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const navigateToArticle = useCallback((article: Article) => {
    navigation.navigate('Article', {
      articleId: article.id,
      articleSlug: article.slug,
    });
  }, [navigation]);

  const renderSearchResult = ({item, index}: {item: Article; index: number}) => {
    const shouldShowAd = index > 0 && (index + 1) % 4 === 0; // Каждый 4-й результат

    return (
      <>
        <TouchableOpacity
          style={styles.resultCard}
          onPress={() => navigateToArticle(item)}
          activeOpacity={0.8}
        >
          <Image 
            source={{uri: item.featuredImage.url}}
            style={styles.resultImage}
            resizeMode="cover"
          />
          
          <View style={styles.resultContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category.name}</Text>
            </View>
            
            <Text style={styles.resultTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            <Text style={styles.resultExcerpt} numberOfLines={2}>
              {item.excerpt}
            </Text>
            
            <View style={styles.resultMeta}>
              <Text style={styles.metaText}>
                {item.author.name} • {item.readingTime} min read
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {shouldShowAd && <ContentAd />}
      </>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;

    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>🔍 Поиск статей</Text>
          <Text style={styles.emptyText}>
            Введите ключевые слова для поиска статей на ICoffio
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>😔 Ничего не найдено</Text>
          <Text style={styles.emptyText}>
            Попробуйте изменить поисковый запрос или использовать другие ключевые слова
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Строка поиска */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск статей..."
          placeholderTextColor="#888888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch(searchQuery)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearch(searchQuery)}
        >
          <Text style={styles.searchButtonText}>Найти</Text>
        </TouchableOpacity>
      </View>

      {/* Рекламный баннер */}
      <TopBannerAd />

      {/* Загрузка */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Поиск...</Text>
        </View>
      )}

      {/* Результаты поиска */}
      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
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
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultImage: {
    width: 100,
    height: 100,
    backgroundColor: '#2a2a2a',
  },
  resultContent: {
    flex: 1,
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 20,
  },
  resultExcerpt: {
    color: '#cccccc',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  resultMeta: {
    marginTop: 'auto',
  },
  metaText: {
    color: '#888888',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: '#cccccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
});
















