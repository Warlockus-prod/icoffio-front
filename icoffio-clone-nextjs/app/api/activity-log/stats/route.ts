/**
 * 📊 USER STATISTICS API v8.3.1
 * 
 * GET /api/activity-log/stats?period=today|week|month|all
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

function getPeriodDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    default:
      return null; // all time
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const periodDate = getPeriodDate(period);

    const supabase = getSupabase();

    // Получаем все записи за период
    let query = supabase
      .from('activity_logs')
      .select('user_name, user_source, action, created_at');

    if (periodDate) {
      query = query.gte('created_at', periodDate.toISOString());
    }

    const { data: activities, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          users: [],
          warning: 'Table not created yet'
        });
      }
      throw error;
    }

    // Получаем список забаненных
    const { data: bannedData } = await supabase
      .from('banned_users')
      .select('username');
    
    const bannedSet = new Set((bannedData || []).map(b => b.username?.toLowerCase()));

    // Агрегируем статистику по пользователям
    const userMap = new Map<string, {
      user_name: string;
      user_source: string;
      total_actions: number;
      publish_count: number;
      last_activity: string;
    }>();

    for (const activity of (activities || [])) {
      const key = `${activity.user_name}-${activity.user_source}`;
      
      if (!userMap.has(key)) {
        userMap.set(key, {
          user_name: activity.user_name,
          user_source: activity.user_source,
          total_actions: 0,
          publish_count: 0,
          last_activity: activity.created_at
        });
      }

      const user = userMap.get(key)!;
      user.total_actions++;
      
      if (activity.action === 'publish') {
        user.publish_count++;
      }
      
      // Update last activity if newer
      if (new Date(activity.created_at) > new Date(user.last_activity)) {
        user.last_activity = activity.created_at;
      }
    }

    // Convert to array and add banned status
    const users = Array.from(userMap.values())
      .map(user => ({
        ...user,
        is_banned: bannedSet.has(user.user_name.toLowerCase())
      }))
      .sort((a, b) => b.total_actions - a.total_actions);

    return NextResponse.json({
      success: true,
      users,
      period,
      total_users: users.length,
      total_actions: users.reduce((sum, u) => sum + u.total_actions, 0)
    });

  } catch (error) {
    console.error('❌ Stats API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

