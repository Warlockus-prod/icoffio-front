'use client';

import { useEffect } from 'react';
import { useAdminStore } from '@/lib/stores/admin-store';

export default function Dashboard() {
  const { statistics, updateStatistics } = useAdminStore();

  useEffect(() => {
    updateStatistics();
    // Update every 30 seconds
    const interval = setInterval(updateStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const statsCards = [
    {
      title: 'URLs Today',
      value: statistics.urlsAddedToday,
      icon: '🔗',
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Successfully Parsed',
      value: statistics.successfullyParsed,
      icon: '✅',
      color: 'green',
      change: '+8%'
    },
    {
      title: 'Published Articles',
      value: statistics.publishedArticles,
      icon: '📰',
      color: 'purple',
      change: '+15%'
    },
    {
      title: 'Failed Parses',
      value: statistics.failedParses,
      icon: '❌',
      color: 'red',
      change: '-5%'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Welcome to Admin Panel! 👋
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Manage icoffio articles with intelligent parsing and translation
            </p>
          </div>
          <div className="text-4xl">🚀</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${getColorClasses(card.color)}`}>
                {card.icon}
              </div>
              <div className={`text-sm font-medium ${
                card.change.startsWith('+') 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {card.change}
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {card.value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {card.title}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📋 Recent Activity
          </h4>
          
          <div className="space-y-3">
            {statistics.recentActivity.length > 0 ? (
              statistics.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-lg">
                    {activity.type === 'url_added' && '🔗'}
                    {activity.type === 'parsing_started' && '🔄'}
                    {activity.type === 'parsing_completed' && '✅'}
                    {activity.type === 'article_published' && '📰'}
                    {activity.type === 'parsing_failed' && '❌'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(activity.timestamp).toLocaleTimeString('ru-RU')}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">📭</div>
                <p>No recent activity</p>
                <p className="text-sm">Start by adding URLs to parse</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🔧 System Status
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">OpenAI API</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Unsplash API</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">WordPress</span>
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">Connected</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">URL Parser</span>
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Ready</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average Processing Time</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {statistics.averageProcessingTime > 0 
                ? `${Math.round(statistics.averageProcessingTime)}s` 
                : 'N/A'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          ⚡ Quick Actions
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => useAdminStore.getState().setActiveTab('parser')}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-left">
            <div className="text-xl mb-2">🔗</div>
            <div className="font-medium text-gray-900 dark:text-white">Parse URL</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Add new article from URL</div>
          </button>
          
          <button 
            onClick={() => useAdminStore.getState().setActiveTab('parser')}
            className="p-4 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors text-left">
            <div className="text-xl mb-2">✏️</div>
            <div className="font-medium text-gray-900 dark:text-white">Create Article</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Write article from text</div>
          </button>
          
          <button 
            onClick={() => useAdminStore.getState().setActiveTab('articles')}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors text-left">
            <div className="text-xl mb-2">📚</div>
            <div className="font-medium text-gray-900 dark:text-white">All Articles</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">View and manage all content</div>
          </button>

          <button 
            onClick={() => useAdminStore.getState().setActiveTab('editor')}
            className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors text-left">
            <div className="text-xl mb-2">📝</div>
            <div className="font-medium text-gray-900 dark:text-white">Edit Articles</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Edit specific content</div>
          </button>
          
          <button 
            onClick={() => useAdminStore.getState().setActiveTab('queue')}
            className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors text-left">
            <div className="text-xl mb-2">📤</div>
            <div className="font-medium text-gray-900 dark:text-white">Publish Queue</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Manage publishing queue</div>
          </button>
        </div>
      </div>
    </div>
  );
}




