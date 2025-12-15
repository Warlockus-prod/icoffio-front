/**
 * 🚫 USER BAN API v8.3.1
 * 
 * GET /api/activity-log/ban?username=xxx - Check if banned
 * POST /api/activity-log/ban - Ban/Unban user (Super Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Super Admin names (case-insensitive)
const SUPER_ADMINS = ['andrey'];

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Check if user is banned
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('banned_users')
      .select('username, banned_at, banned_by, reason')
      .eq('username', username.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      // Table might not exist
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, banned: false, warning: 'Table not created' });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      banned: !!data,
      details: data || null
    });

  } catch (error) {
    console.error('❌ Ban check error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Ban or Unban user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, action, admin_username, reason } = body;

    if (!username || !action) {
      return NextResponse.json(
        { success: false, error: 'Username and action required' },
        { status: 400 }
      );
    }

    // Check if admin is super admin
    if (admin_username && !SUPER_ADMINS.includes(admin_username.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Only Super Admin can ban users' },
        { status: 403 }
      );
    }

    // Cannot ban super admins
    if (SUPER_ADMINS.includes(username.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Cannot ban Super Admin' },
        { status: 403 }
      );
    }

    const supabase = getSupabase();

    if (action === 'ban') {
      // Insert into banned_users
      const { error } = await supabase
        .from('banned_users')
        .upsert({
          username: username.toLowerCase(),
          banned_at: new Date().toISOString(),
          banned_by: admin_username || 'system',
          reason: reason || 'Banned by admin'
        }, {
          onConflict: 'username'
        });

      if (error) {
        // Create table if not exists
        if (error.code === '42P01') {
          return NextResponse.json({
            success: false,
            error: 'banned_users table not created. Please run migration.'
          }, { status: 500 });
        }
        throw error;
      }

      console.log(`🚫 User banned: ${username} by ${admin_username}`);
      
      return NextResponse.json({
        success: true,
        message: `User "${username}" has been banned`
      });

    } else if (action === 'unban') {
      // Delete from banned_users
      const { error } = await supabase
        .from('banned_users')
        .delete()
        .eq('username', username.toLowerCase());

      if (error && error.code !== '42P01') {
        throw error;
      }

      console.log(`✅ User unbanned: ${username} by ${admin_username}`);
      
      return NextResponse.json({
        success: true,
        message: `User "${username}" has been unbanned`
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "ban" or "unban"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('❌ Ban API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

