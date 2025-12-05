'use client';

import { useState, useEffect } from 'react';
import { 
  getRecentActivity, 
  formatTimeAgo, 
  getActionIcon,
  getUsersStats,
  banUser,
  unbanUser,
  getAdminUsername,
  isSuperAdmin,
  type ActivityLogDisplay,
  type UserStats,
  type TimePeriod
} from '@/lib/activity-logger';
import toast from 'react-hot-toast';

/**
 * 📊 ACTIVITY LOG COMPONENT v8.3.1
 * 
 * Shows user activity history + statistics
 * Super Admin can manage users (ban/unban)
 */

type ViewMode = 'activity' | 'statistics';

export default function ActivityLog() {
  const [activities, setActivities] = useState<ActivityLogDisplay[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'admin' | 'telegram'>('all');
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('activity');
  
  // Super Admin check
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);

  // Initialize
  useEffect(() => {
    const username = getAdminUsername();
    setCurrentUser(username);
    setIsSuperAdminUser(isSuperAdmin(username));
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reload when period changes
  useEffect(() => {
    if (viewMode === 'statistics') {
      loadStats();
    }
  }, [period, viewMode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadActivity(), loadStats()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const data = await getRecentActivity(100);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await getUsersStats(period);
      setUserStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Handle ban/unban
  const handleBanUser = async (username: string, isBanned: boolean) => {
    if (!isSuperAdminUser) {
      toast.error('❌ Only Super Admin can manage users');
      return;
    }

    const action = isBanned ? 'unban' : 'ban';
    const confirmMsg = isBanned 
      ? `Unban user "${username}"?`
      : `Ban user "${username}"? They won't be able to log in with this name.`;

    if (!confirm(confirmMsg)) return;

    const success = isBanned 
      ? await unbanUser(username)
      : await banUser(username);

    if (success) {
      toast.success(`✅ User ${isBanned ? 'unbanned' : 'banned'}: ${username}`);
      loadStats();
    } else {
      toast.error(`❌ Failed to ${action} user`);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    return a.user_source === filter;
  });

  // Group by date
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

  // Calculate totals
  const totalPublishes = userStats.reduce((sum, u) => sum + u.publish_count, 0);
  const totalActions = userStats.reduce((sum, u) => sum + u.total_actions, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              📊 Activity Log
              {isSuperAdminUser && (
                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                  👑 Super Admin
                </span>
              )}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track who published what and when
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('activity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'activity'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📋 Activity Feed
          </button>
          <button
            onClick={() => setViewMode('statistics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'statistics'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📊 User Statistics
          </button>
        </div>

        {/* Filters for Activity View */}
        {viewMode === 'activity' && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All ({activities.length})
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              👤 Admin ({activities.filter(a => a.user_source === 'admin').length})
            </button>
            <button
              onClick={() => setFilter('telegram')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'telegram'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              📱 Telegram ({activities.filter(a => a.user_source === 'telegram').length})
            </button>
          </div>
        )}

        {/* Period Filter for Statistics */}
        {viewMode === 'statistics' && (
          <div className="flex gap-2">
            {(['today', 'week', 'month', 'all'] as TimePeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {p === 'today' && '📅 Today'}
                {p === 'week' && '📆 Week'}
                {p === 'month' && '🗓️ Month'}
                {p === 'all' && '📊 All Time'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Statistics View */}
      {viewMode === 'statistics' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-blue-600">{userStats.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-green-600">{totalPublishes}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Publishes</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-purple-600">{totalActions}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Actions</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-orange-600">
                {userStats.filter(u => u.is_banned).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Banned Users</div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                👥 Users ({userStats.length})
              </h4>
            </div>

            {userStats.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-gray-500 dark:text-gray-400">No users found for this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Publishes</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Active</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      {isSuperAdminUser && (
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {userStats.map((user, idx) => (
                      <tr key={`${user.user_name}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              user.user_source === 'telegram' ? 'bg-purple-500' : 'bg-blue-500'
                            }`}>
                              {user.user_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {user.user_name}
                            </span>
                            {isSuperAdmin(user.user_name) && (
                              <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded">
                                👑
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.user_source === 'telegram'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}>
                            {user.user_source === 'telegram' ? '📱 Telegram' : '💻 Admin'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-lg font-semibold text-green-600">{user.publish_count}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-gray-600 dark:text-gray-400">{user.total_actions}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(user.last_activity)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user.is_banned ? (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                              🚫 Banned
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                              ✅ Active
                            </span>
                          )}
                        </td>
                        {isSuperAdminUser && (
                          <td className="px-6 py-4 text-center">
                            {!isSuperAdmin(user.user_name) && (
                              <button
                                onClick={() => handleBanUser(user.user_name, user.is_banned)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  user.is_banned
                                    ? 'bg-green-100 hover:bg-green-200 text-green-700'
                                    : 'bg-red-100 hover:bg-red-200 text-red-700'
                                }`}
                              >
                                {user.is_banned ? '✅ Unban' : '🚫 Ban'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Activity Feed View */}
      {viewMode === 'activity' && (
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
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{date}</span>
                  </div>
                  {dayActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Activity Row Component
function ActivityRow({ activity }: { activity: ActivityLogDisplay }) {
  const icon = getActionIcon(activity.action as any);

  return (
    <div className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
          activity.user_source === 'telegram' 
            ? 'bg-purple-100 dark:bg-purple-900/30' 
            : 'bg-blue-100 dark:bg-blue-900/30'
        }`}>
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${
              activity.user_source === 'telegram' 
                ? 'text-purple-700 dark:text-purple-300' 
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {activity.display_user}
            </span>
            <span className="text-gray-600 dark:text-gray-400">{activity.action_label}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              activity.user_source === 'telegram'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}>
              {activity.user_source === 'telegram' ? '📱 Telegram' : '💻 Admin'}
            </span>
          </div>

          {activity.entity_title && (
            <p className="text-gray-900 dark:text-white font-medium truncate">
              "{activity.entity_title}"
            </p>
          )}

          {activity.entity_url && (
            <div className="flex gap-3 mt-2">
              <a
                href={activity.entity_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                🔗 EN Version
              </a>
              {activity.entity_url_pl && (
                <a
                  href={activity.entity_url_pl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-600 hover:text-green-800 dark:text-green-400"
                >
                  🔗 PL Version
                </a>
              )}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {activity.time_ago}
        </div>
      </div>
    </div>
  );
}
