/**
 * TELEGRAM SETTINGS API v8.5.0
 * 
 * GET - получить настройки пользователя
 * POST - сохранить настройки пользователя
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { InterfaceLanguage, TelegramSettings } from '@/lib/telegram-simple/types';
import { requireAdminRole } from '@/lib/admin-auth';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function normalizeInterfaceLanguage(raw?: string | null): InterfaceLanguage {
  if (!raw) return 'ru';
  const value = raw.toLowerCase();
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('pl')) return 'pl';
  if (value.startsWith('ru')) return 'ru';
  return 'ru';
}

/**
 * GET - получить настройки для chat_id
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId parameter required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Получаем настройки из БД
    const { data, error } = await supabase
      .from('telegram_user_preferences')
      .select('*')
      .eq('chat_id', parseInt(chatId))
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (это нормально для нового пользователя)
      throw error;
    }

    // Если нет настроек - возвращаем дефолтные
    const settings: TelegramSettings = {
      chatId: parseInt(chatId),
      contentStyle: data?.content_style || 'journalistic',
      imagesCount: data?.images_count ?? 2,
      imagesSource: data?.images_source || 'unsplash',
      autoPublish: data?.auto_publish ?? true,
      interfaceLanguage: normalizeInterfaceLanguage(data?.language || 'ru'),
      combineUrlsAsSingle: data?.combine_urls_as_single ?? false,
    };

    return NextResponse.json({ success: true, settings });

  } catch (error: any) {
    console.error('[TelegramSettings] GET error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - сохранить настройки
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  try {
    const body: TelegramSettings = await request.json();

    const {
      chatId,
      contentStyle,
      imagesCount,
      imagesSource,
      autoPublish,
      interfaceLanguage,
      combineUrlsAsSingle,
    } = body;
    const normalizedLanguage = normalizeInterfaceLanguage(interfaceLanguage || 'ru');
    const normalizedCombineUrlsAsSingle = Boolean(combineUrlsAsSingle);

    // Валидация
    if (!chatId) {
      return NextResponse.json(
        { error: 'chatId required' },
        { status: 400 }
      );
    }

    if (imagesCount < 0 || imagesCount > 3) {
      return NextResponse.json(
        { error: 'imagesCount must be 0-3' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const basePayload = {
      chat_id: chatId,
      content_style: contentStyle,
      images_count: imagesCount,
      images_source: imagesSource,
      auto_publish: autoPublish,
      language: normalizedLanguage,
      updated_at: new Date().toISOString(),
    };

    // Upsert (update or insert)
    let { data, error } = await supabase
      .from('telegram_user_preferences')
      .upsert(
        {
          ...basePayload,
          combine_urls_as_single: normalizedCombineUrlsAsSingle,
        },
        {
          onConflict: 'chat_id',
        }
      )
      .select()
      .single();

    // Backward compatibility if migration is not applied yet.
    if (error && error.code === '42703') {
      const retry = await supabase
        .from('telegram_user_preferences')
        .upsert(basePayload, { onConflict: 'chat_id' })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw error;
    }

    console.log(`[TelegramSettings] Saved for chat ${chatId}:`, {
      contentStyle,
      imagesCount,
      imagesSource,
      autoPublish,
      interfaceLanguage: normalizedLanguage,
      combineUrlsAsSingle: normalizedCombineUrlsAsSingle,
    });

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
      settings: {
        chatId,
        contentStyle,
        imagesCount,
        imagesSource,
        autoPublish,
        interfaceLanguage: normalizedLanguage,
        combineUrlsAsSingle: normalizedCombineUrlsAsSingle,
      },
    });

  } catch (error: any) {
    console.error('[TelegramSettings] POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
