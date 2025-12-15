import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar} from 'react-native';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import ArticleScreen from './src/screens/ArticleScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import SearchScreen from './src/screens/SearchScreen';
import WebViewScreen from './src/screens/WebViewScreen';

// Types
export type RootStackParamList = {
  MainTabs: undefined;
  Article: {articleId: string; articleSlug: string};
  WebView: {url: string; title: string};
};

export type TabParamList = {
  Home: undefined;
  Categories: undefined;
  Search: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333333',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888888',
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'ICoffio',
          tabBarLabel: 'Главная',
        }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoriesScreen}
        options={{
          title: 'Категории',
          tabBarLabel: 'Категории',
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          title: 'Поиск',
          tabBarLabel: 'Поиск',
        }}
      />
    </Tab.Navigator>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1a1a1a"
        translucent={false}
      />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1a1a1a',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}>
          <Stack.Screen 
            name="MainTabs" 
            component={TabNavigator}
            options={{headerShown: false}}
          />
          <Stack.Screen 
            name="Article" 
            component={ArticleScreen}
            options={{
              title: 'Статья',
              headerBackTitleVisible: false,
            }}
          />
          <Stack.Screen 
            name="WebView" 
            component={WebViewScreen}
            options={({route}) => ({
              title: route.params.title,
              headerBackTitleVisible: false,
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;