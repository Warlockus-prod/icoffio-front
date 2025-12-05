'use client';

import { useState, useEffect } from 'react';
import { AdPlacementConfig } from '@/lib/config/adPlacements';
import {
  getAdPlacements,
  saveAdPlacements,
  toggleAdPlacement,
  resetAdPlacements,
  getAdPlacementsStatsFromStorage
} from '@/lib/config/adPlacementsManager';

export default function AdvertisingManager() {
  const [placements, setPlacements] = useState<AdPlacementConfig[]>([]);
  const [filter, setFilter] = useState<'all' | 'display' | 'video'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'both'>('all');
  const [stats, setStats] = useState<ReturnType<typeof getAdPlacementsStatsFromStorage>>();
  const [isLoading, setIsLoading] = useState(true);

  // Load placements on mount
  useEffect(() => {
    loadPlacements();
  }, []);

  const loadPlacements = () => {
    setIsLoading(true);
    const loaded = getAdPlacements();
    const loadedStats = getAdPlacementsStatsFromStorage();
    setPlacements(loaded);
    setStats(loadedStats);
    setIsLoading(false);
  };

  const handleToggle = (id: string, currentEnabled: boolean) => {
    toggleAdPlacement(id, !currentEnabled);
    loadPlacements(); // Reload to reflect changes
  };

  const handleReset = () => {
    if (window.confirm('🔄 Reset all ad settings to default?\n\nThis will restore the standard configuration of all ad placements.')) {
      resetAdPlacements();
      loadPlacements();
    }
  };

  const handleUpdatePriority = (id: string, newPriority: number) => {
    const updated = placements.map(ad =>
      ad.id === id ? { ...ad, priority: newPriority } : ad
    );
    saveAdPlacements(updated);
    loadPlacements();
  };

  // Filter placements
  const filteredPlacements = placements.filter(ad => {
    const typeMatch = filter === 'all' || filter === 'display'; // video removed as not in AdFormat type
    
    const deviceMatch = deviceFilter === 'all' || ad.device === deviceFilter;
    
    return typeMatch && deviceMatch;
  });

  // Get icon for ad type
  const getAdIcon = (format: string) => {
    if (format === 'video') return '🎬';
    if (format.includes('x')) return '📊';
    return '💼';
  };

  // Get device icon
  const getDeviceIcon = (device: string) => {
    if (device === 'desktop') return '💻';
    if (device === 'mobile') return '📱';
    return '📱💻';
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    if (status === 'stable') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'new') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-gray-600 dark:text-gray-400">Loading ad placements...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              💰 Advertising Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all VOX Display ad placements
            </p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors flex items-center gap-2"
          >
            🔄 Reset to Default
          </button>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Places</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {stats.enabled} active
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Display Ads</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.byType.display}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {stats.enabledByType.display} active
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Video Ads</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.byType.video}</div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {stats.enabledByType.video} active
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">Online</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                VOX Active
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
            <div className="flex gap-2">
              {['all', 'display', 'video'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type === 'all' && '🎯 All'}
                  {type === 'display' && '📊 Display'}
                  {type === 'video' && '🎬 Video'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Device:</span>
            <div className="flex gap-2">
              {['all', 'desktop', 'mobile', 'both'].map(device => (
                <button
                  key={device}
                  onClick={() => setDeviceFilter(device as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    deviceFilter === device
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {device === 'all' && '🌐 All'}
                  {device === 'desktop' && '💻 Desktop'}
                  {device === 'mobile' && '📱 Mobile'}
                  {device === 'both' && '📱💻 Both'}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredPlacements.length} of {placements.length} placements
          </div>
        </div>
      </div>

      {/* Placements List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredPlacements.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-4xl mb-4">🔍</div>
            <div className="text-gray-600 dark:text-gray-400">
              No ad placements found with current filters
            </div>
          </div>
        ) : (
          filteredPlacements
            .sort((a, b) => b.priority - a.priority)
            .map((ad) => (
              <div
                key={ad.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                  ad.enabled
                    ? 'border-green-200 dark:border-green-800 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Side - Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">{getAdIcon(ad.format as string)}</div>
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {ad.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ad.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ad.status)}`}>
                        {ad.status === 'stable' && '✅ Stable'}
                        {ad.status === 'new' && '🆕 New'}
                        {ad.status === 'testing' && '🧪 Testing'}
                      </span>
                      
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {getDeviceIcon(ad.device)} {ad.device}
                      </span>
                      
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                        📍 {ad.position}
                      </span>

                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        🎯 Priority: {ad.priority}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      PlaceID: {ad.placeId}
                    </div>
                  </div>

                  {/* Right Side - Controls */}
                  <div className="flex flex-col gap-3 items-end">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => handleToggle(ad.id, ad.enabled)}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                        ad.enabled
                          ? 'bg-green-500 dark:bg-green-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          ad.enabled ? 'translate-x-9' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    <div className="text-xs font-medium">
                      {ad.enabled ? (
                        <span className="text-green-600 dark:text-green-400">✅ Active</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">❌ Disabled</span>
                      )}
                    </div>

                    {/* Priority Adjuster */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleUpdatePriority(ad.id, Math.max(1, ad.priority - 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Decrease Priority"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => handleUpdatePriority(ad.id, Math.min(10, ad.priority + 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Increase Priority"
                      >
                        ⬆️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              How Ad Management Works
            </h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• <strong>Toggle switch</strong> - enable/disable ad placement</li>
              <li>• <strong>Priority arrows</strong> - change display priority (1-10)</li>
              <li>• <strong>Reset to Default</strong> - restore original configuration</li>
              <li>• <strong>Settings are saved</strong> to localStorage and applied immediately</li>
              <li>• <strong>Video ads</strong> work on both devices (Desktop & Mobile)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
