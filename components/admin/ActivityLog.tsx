'use client';

import { useState, useEffect } from 'react';
import { 
  getRecentActivity, 
  formatTimeAgo, 
  getActionIcon,
  type ActivityLogDisplay 
} from '@/lib/activity-logger';

/**
 * 📊 ACTIVITY LOG COMPONENT v8.3.0
 * 
 * Показывает историю действий пользователей:
 * - Кто публиковал
 * - Когда
 * - Название статьи
 * - Ссылка
 * - Источник (Admin / Telegram)
 */

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityLogDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'telegram'>('all');

  // Загрузка активности
  useEffect(() => {
    loadActivity();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivity = async () => {
    setIsLoading(true);
    try {
      const data = await getRecentActivity(100);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация
  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    return a.user_source === filter;
  });

  // Группировка по дням
  const groupedByDate = filteredActivities.reduce((groups, activity) => {
    const date = new Date(activity.created_at!).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, ActivityLogDisplay[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Activity Log
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track who published what and when
            </p>
          </div>

          <button
            onClick={loadActivity}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({activities.length})
          </button>
          <button
            onClick={() => setFilter('admin')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            👤 Admin ({activities.filter(a => a.user_source === 'admin').length})
          </button>
          <button
            onClick={() => setFilter('telegram')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'telegram'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📱 Telegram ({activities.filter(a => a.user_source === 'telegram').length})
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading && activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading activity...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Activity Yet</h4>
            <p className="text-gray-500 dark:text-gray-400">
              Activity will appear here when articles are published
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {Object.entries(groupedByDate).map(([date, dayActivities]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {date}
                  </span>
                </div>

                {/* Activities for this day */}
                {dayActivities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY ROW COMPONENT
// ============================================================================

function ActivityRow({ activity }: { activity: ActivityLogDisplay }) {
  const icon = getActionIcon(activity.action as any);
  const sourceColor = activity.user_source === 'telegram' ? 'purple' : 'blue';

  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          activity.user_source === 'telegram' 
            ? 'bg-purple-100 dark:bg-purple-900/30' 
            : 'bg-blue-100 dark:bg-blue-900/30'
        }`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* User */}
            <span className={`font-medium ${
              activity.user_source === 'telegram' 
                ? 'text-purple-700 dark:text-purple-300' 
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {activity.display_user}
            </span>

            {/* Action */}
            <span className="text-gray-600 dark:text-gray-400">
              {activity.action_label}
            </span>

            {/* Source Badge */}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              activity.user_source === 'telegram'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {activity.user_source === 'telegram' ? '📱 Telegram' : '💻 Admin'}
            </span>
          </div>

          {/* Article Title */}
          {activity.entity_title && (
            <p className="text-gray-900 dark:text-white font-medium truncate">
              "{activity.entity_title}"
            </p>
          )}

          {/* Links */}
          {activity.entity_url && (
            <div className="flex gap-3 mt-2">
              <a
                href={activity.entity_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                🔗 EN Version
              </a>
              {activity.entity_url_pl && (
                <a
                  href={activity.entity_url_pl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 flex items-center gap-1"
                >
                  🔗 PL Version
                </a>
              )}
            </div>
          )}
        </div>

        {/* Time */}
        <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {activity.time_ago}
        </div>
      </div>
    </div>
  );
}

