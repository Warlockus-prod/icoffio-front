/**
 * 📊 ACTIVITY LOG API v8.3.0
 * 
 * POST /api/activity-log - Добавить запись активности
 * GET /api/activity-log - Получить последние записи
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminRole } from '@/lib/admin-auth';

// Supabase client
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// POST - Добавить запись
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'editor', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    
    const {
      user_name,
      user_source,
      telegram_username,
      telegram_chat_id,
      action,
      action_label,
      entity_type,
      entity_id,
      entity_title,
      entity_url,
      entity_url_pl,
      metadata
    } = body;

    // Валидация обязательных полей
    if (!user_name || !user_source || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: user_name, user_source, action' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Вставляем запись
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        user_name,
        user_source,
        telegram_username: telegram_username || null,
        telegram_chat_id: telegram_chat_id || null,
        action,
        action_label: action_label || action,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        entity_title: entity_title || null,
        entity_url: entity_url || null,
        entity_url_pl: entity_url_pl || null,
        metadata: metadata || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Activity log error:', error);
      
      // Если таблица не существует, возвращаем успех (для graceful degradation)
      if (error.code === '42P01') {
        console.warn('⚠️ activity_logs table does not exist, skipping log');
        return NextResponse.json({ success: true, warning: 'Table not created yet' });
      }
      
      throw error;
    }

    console.log(`📊 Activity logged: ${action} by ${user_name} (${user_source})`);

    return NextResponse.json({
      success: true,
      id: data.id,
      created_at: data.created_at
    });

  } catch (error) {
    console.error('❌ Activity log API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Получить записи
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const source = searchParams.get('source'); // filter by source
    const action = searchParams.get('action'); // filter by action

    const supabase = getSupabase();

    // Строим запрос
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Фильтры
    if (source) {
      query = query.eq('user_source', source);
    }
    if (action) {
      query = query.eq('action', action);
    }

    const { data, error } = await query;

    if (error) {
      // Если таблица не существует
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          activities: [],
          warning: 'Table not created yet'
        });
      }
      throw error;
    }

    // Форматируем для отображения
    const activities = (data || []).map(entry => ({
      ...entry,
      display_user: formatDisplayUser(entry),
      time_ago: formatTimeAgo(entry.created_at)
    }));

    return NextResponse.json({
      success: true,
      activities,
      count: activities.length
    });

  } catch (error) {
    console.error('❌ Activity fetch error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helpers
function formatDisplayUser(entry: any): string {
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

function formatTimeAgo(dateString: string): string {
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
