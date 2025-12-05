/**
 * 📊 ACTIVITY LOGGER v8.3.0
 * 
 * Система логирования активности пользователей.
 * Отслеживает кто, когда и что сделал.
 * 
 * Источники:
 * - admin: Admin Panel (имя из localStorage)
 * - telegram: Telegram Bot (@username)
 * - api: External API
 * - system: Автоматические действия
 */

// ============================================================================
// TYPES
// ============================================================================

export type ActivitySource = 'admin' | 'telegram' | 'api' | 'system';

export type ActivityAction = 
  | 'publish'
  | 'edit'
  | 'delete'
  | 'parse'
  | 'login'
  | 'logout'
  | 'upload_image'
  | 'generate_image'
  | 'add_to_queue'
  | 'remove_from_queue';

export interface ActivityLogEntry {
  id?: number;
  user_name: string;
  user_source: ActivitySource;
  telegram_username?: string;
  telegram_chat_id?: number;
  action: ActivityAction;
  action_label?: string;
  entity_type?: 'article' | 'image' | 'settings' | 'queue';
  entity_id?: string;
  entity_title?: string;
  entity_url?: string;
  entity_url_pl?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface ActivityLogDisplay extends ActivityLogEntry {
  display_user: string;
  time_ago: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_LABELS: Record<ActivityAction, string> = {
  publish: 'Published article',
  edit: 'Edited article',
  delete: 'Deleted article',
  parse: 'Parsed URL',
  login: 'Logged in',
  logout: 'Logged out',
  upload_image: 'Uploaded image',
  generate_image: 'Generated AI image',
  add_to_queue: 'Added to queue',
  remove_from_queue: 'Removed from queue'
};

const ACTION_ICONS: Record<ActivityAction, string> = {
  publish: '📢',
  edit: '✏️',
  delete: '🗑️',
  parse: '🔗',
  login: '🔐',
  logout: '🚪',
  upload_image: '📤',
  generate_image: '🎨',
  add_to_queue: '📥',
  remove_from_queue: '📤'
};

const LOCAL_STORAGE_KEY = 'icoffio_admin_username';

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

/**
 * Получить имя текущего админа из localStorage
 */
export function getAdminUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCAL_STORAGE_KEY);
}

/**
 * Установить имя админа
 */
export function setAdminUsername(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, username);
}

/**
 * Проверить есть ли сохраненное имя
 */
export function hasAdminUsername(): boolean {
  return !!getAdminUsername();
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Залогировать действие (отправляет на сервер)
 */
export async function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'created_at'>): Promise<boolean> {
  try {
    // Добавляем action_label если не указан
    const enrichedEntry = {
      ...entry,
      action_label: entry.action_label || ACTION_LABELS[entry.action] || entry.action
    };

    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedEntry)
    });

    if (!response.ok) {
      console.error('Failed to log activity:', await response.text());
      return false;
    }

    console.log(`📊 Activity logged: ${entry.action} by ${entry.user_name}`);
    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
}

/**
 * Залогировать действие из Admin Panel
 */
export async function logAdminActivity(
  action: ActivityAction,
  options: {
    entity_type?: ActivityLogEntry['entity_type'];
    entity_id?: string;
    entity_title?: string;
    entity_url?: string;
    entity_url_pl?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<boolean> {
  const username = getAdminUsername();
  
  if (!username) {
    console.warn('No admin username set, using "Anonymous"');
  }

  return logActivity({
    user_name: username || 'Anonymous',
    user_source: 'admin',
    action,
    ...options
  });
}

/**
 * Залогировать действие из Telegram
 */
export async function logTelegramActivity(
  action: ActivityAction,
  telegramUser: {
    username?: string;
    first_name?: string;
    chat_id: number;
  },
  options: {
    entity_type?: ActivityLogEntry['entity_type'];
    entity_id?: string;
    entity_title?: string;
    entity_url?: string;
    entity_url_pl?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<boolean> {
  const displayName = telegramUser.username 
    ? `@${telegramUser.username}` 
    : telegramUser.first_name || `User ${telegramUser.chat_id}`;

  return logActivity({
    user_name: displayName,
    user_source: 'telegram',
    telegram_username: telegramUser.username,
    telegram_chat_id: telegramUser.chat_id,
    action,
    ...options
  });
}

// ============================================================================
// ACTIVITY FETCHING
// ============================================================================

/**
 * Получить последние записи активности
 */
export async function getRecentActivity(limit: number = 50): Promise<ActivityLogDisplay[]> {
  try {
    const response = await fetch(`/api/activity-log?limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch activity');
    }

    const data = await response.json();
    return data.activities || [];
  } catch (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Форматировать время "X минут назад"
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Получить иконку для действия
 */
export function getActionIcon(action: ActivityAction): string {
  return ACTION_ICONS[action] || '📌';
}

/**
 * Получить цвет для источника
 */
export function getSourceColor(source: ActivitySource): string {
  const colors = {
    admin: 'blue',
    telegram: 'purple',
    api: 'green',
    system: 'gray'
  };
  return colors[source] || 'gray';
}

/**
 * Форматировать отображение пользователя
 */
export function formatUserDisplay(entry: ActivityLogEntry): string {
  if (entry.user_source === 'telegram') {
    return `📱 ${entry.telegram_username ? '@' + entry.telegram_username : 'Telegram'}`;
  }
  if (entry.user_source === 'admin') {
    return `👤 ${entry.user_name}`;
  }
  if (entry.user_source === 'api') {
    return '🤖 API';
  }
  return '⚙️ System';
}

