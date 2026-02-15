/**
 * TELEGRAM SIMPLE - WEBHOOK
 *
 * Single production webhook for Telegram ingestion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegramMessage } from '@/lib/telegram-simple/telegram-notifier';
import { parseUrl } from '@/lib/telegram-simple/url-parser';
import { processText } from '@/lib/telegram-simple/content-processor';
import { publishArticle } from '@/lib/telegram-simple/publisher';
import { loadTelegramSettings } from '@/lib/telegram-simple/settings-loader';
import {
  createTelegramSubmission,
  getTelegramSubmissions,
  updateTelegramSubmission,
} from '@/lib/supabase-analytics';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TelegramActivityInput {
  chatId: number;
  username?: string;
  firstName?: string;
  action: 'parse' | 'publish';
  actionLabel: string;
  entityType?: 'article' | 'image' | 'settings' | 'queue';
  entityId?: string;
  entityTitle?: string;
  entityUrl?: string;
  entityUrlPl?: string;
  metadata?: Record<string, any>;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    journalistic: 'Journalistic',
    keep_as_is: 'Keep As Is',
    seo_optimized: 'SEO',
    academic: 'Academic',
    casual: 'Casual',
    technical: 'Technical',
  };
  return labels[style] || style;
}

function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"')]+/i);
  return match ? match[0] : null;
}

function verifyTelegramRequest(request: NextRequest): boolean {
  const configuredSecrets = Array.from(
    new Set(
      [process.env.TELEGRAM_SECRET_TOKEN, process.env.TELEGRAM_BOT_SECRET]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  if (configuredSecrets.length === 0) {
    console.warn('[TelegramSimple] Secret token is not configured; request accepted without verification');
    return true;
  }

  if (configuredSecrets.length > 1) {
    console.warn('[TelegramSimple] Multiple webhook secrets configured; accepting either configured value');
  }

  const receivedSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!receivedSecret || !configuredSecrets.includes(receivedSecret)) {
    console.warn('[TelegramSimple] Invalid webhook secret token');
    return false;
  }

  return true;
}

async function handleQueueCommand(chatId: number, userId: number): Promise<void> {
  try {
    const submissions = await getTelegramSubmissions(100);
    const userSubmissions = submissions.filter((item) => item.user_id === userId);

    if (userSubmissions.length === 0) {
      await sendTelegramMessage(
        chatId,
        '📭 <b>История пуста</b>\n\nЕще нет обработанных запросов. Отправьте ссылку или текст.'
      );
      return;
    }

    const processing = userSubmissions.filter((item) => item.status === 'processing').length;
    const published = userSubmissions.filter((item) => item.status === 'published').length;
    const failed = userSubmissions.filter((item) => item.status === 'failed').length;
    const latest = userSubmissions[0];

    await sendTelegramMessage(
      chatId,
      `📊 <b>Ваш статус обработки</b>\n\n` +
        `• Всего: ${userSubmissions.length}\n` +
        `• В обработке: ${processing}\n` +
        `• Успешно: ${published}\n` +
        `• Ошибки: ${failed}\n\n` +
        `🕒 Последний запрос: ${escapeHtml((latest.submission_type || 'text').toUpperCase())}`
    );
  } catch (error) {
    console.error('[TelegramSimple] Queue command failed:', error);
    await sendTelegramMessage(chatId, '❌ Не удалось получить статус. Попробуйте позже.');
  }
}

function getActivitySupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function logTelegramActivity(input: TelegramActivityInput): Promise<void> {
  const supabase = getActivitySupabaseClient();
  if (!supabase) return;

  const userName = input.username ? `@${input.username}` : input.firstName || `User ${input.chatId}`;

  const { error } = await supabase.from('activity_logs').insert([
    {
      user_name: userName,
      user_source: 'telegram',
      telegram_username: input.username || null,
      telegram_chat_id: input.chatId,
      action: input.action,
      action_label: input.actionLabel,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      entity_title: input.entityTitle || null,
      entity_url: input.entityUrl || null,
      entity_url_pl: input.entityUrlPl || null,
      metadata: input.metadata || {},
    },
  ]);

  if (error && error.code !== '42P01') {
    console.warn('[TelegramSimple] Failed to write activity log:', error.message);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let chatId: number | null = null;
  let submissionId: number | null = null;
  let telegramUsername: string | undefined;
  let telegramFirstName: string | undefined;
  let submissionType: 'url' | 'text' = 'text';

  try {
    if (!verifyTelegramRequest(request)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    let update: any;
    try {
      update = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const message =
      update.message ||
      update.edited_message ||
      update.channel_post ||
      update.edited_channel_post;
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true, message: 'No message payload' });
    }

    const resolvedChatId = Number(message.chat.id);
    chatId = resolvedChatId;
    const userId = message.from?.id || resolvedChatId;
    const username = message.from?.username;
    const firstName = message.from?.first_name;
    const lastName = message.from?.last_name;
    const languageCode = message.from?.language_code;
    const text =
      typeof message.text === 'string'
        ? message.text.trim()
        : typeof message.caption === 'string'
          ? message.caption.trim()
          : '';

    if (!text) {
      return NextResponse.json({ ok: true, message: 'Empty text message' });
    }

    telegramUsername = username;
    telegramFirstName = firstName;

    console.log(`[TelegramSimple] Incoming message from chat ${resolvedChatId}: "${text.slice(0, 80)}"`);

    if (text.startsWith('/')) {
      const command = text.split(/\s+/)[0].toLowerCase();

      if (command === '/start') {
        await sendTelegramMessage(
          resolvedChatId,
          `🤖 <b>Привет! Я icoffio Bot</b>\n\n` +
            `Отправь ссылку или текст, и я создам публикацию.\n\n` +
            `⚙️ Команды:\n` +
            `/settings - Твои настройки\n` +
            `/queue - История и статус\n` +
            `/help - Справка`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/help') {
        await sendTelegramMessage(
          resolvedChatId,
          `📚 <b>Как использовать:</b>\n\n` +
            `1. Отправь URL статьи или текст (от 100 символов)\n` +
            `2. Подожди обработку\n` +
            `3. Получи EN + PL ссылки\n\n` +
            `Команды:\n` +
            `/settings\n` +
            `/queue\n` +
            `/help`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/settings') {
        const settings = await loadTelegramSettings(resolvedChatId);
        await sendTelegramMessage(
          resolvedChatId,
          `⚙️ <b>Настройки публикации</b>\n\n` +
            `📝 Стиль: ${escapeHtml(getStyleLabel(settings.contentStyle))}\n` +
            `🖼️ Картинок: ${settings.imagesCount}\n` +
            `📸 Источник: ${settings.imagesSource === 'unsplash' ? 'Unsplash' : settings.imagesSource === 'ai' ? 'AI' : 'Нет'}\n` +
            `${settings.autoPublish ? '✅' : '📝'} Публикация: ${settings.autoPublish ? 'Автоматически' : 'Черновик'}\n\n` +
            `Редактирование: https://app.icoffio.com/en/admin`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/queue') {
        await handleQueueCommand(resolvedChatId, userId);
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(resolvedChatId, '❓ Неизвестная команда. Используйте /help');
      return NextResponse.json({ ok: true });
    }

    const url = extractUrl(text);
    submissionType = url ? 'url' : 'text';
    if (!url && text.length < 100) {
      await sendTelegramMessage(
        resolvedChatId,
        `📝 <b>Текст слишком короткий</b>\n\n` +
          `Минимум: 100 символов\n` +
          `Сейчас: ${text.length}\n\n` +
          `Либо отправьте ссылку на статью.`
      );
      return NextResponse.json({ ok: true });
    }

    submissionId = await createTelegramSubmission({
      user_id: userId,
      username,
      first_name: firstName,
      last_name: lastName,
      submission_type: url ? 'url' : 'text',
      submission_content: text.slice(0, 8000),
      status: 'processing',
      language: languageCode,
    });

    await logTelegramActivity({
      chatId: resolvedChatId,
      username,
      firstName,
      action: 'parse',
      actionLabel: url ? 'Received URL from Telegram' : 'Received text from Telegram',
      entityType: 'article',
      entityId: submissionId ? String(submissionId) : undefined,
      metadata: {
        source: 'telegram-simple',
        submissionId,
        submissionType,
        status: 'processing',
      },
    });

    const settings = await loadTelegramSettings(resolvedChatId);
    const estimatedTime = settings.imagesCount > 0 ? '20-35 секунд' : '15-25 секунд';

    await sendTelegramMessage(
      resolvedChatId,
      `⏳ <b>Обрабатываю...</b>\n\n` +
        `${url ? '🔗 Обрабатываю ссылку' : '📝 Обрабатываю текст'}\n` +
        `📝 Стиль: ${escapeHtml(getStyleLabel(settings.contentStyle))}\n` +
        `🖼️ Картинок: ${settings.imagesCount}${settings.imagesCount > 0 ? ` (${settings.imagesSource})` : ''}\n` +
        `⏱️ Ориентировочно: ${estimatedTime}`
    );

    let article;
    if (url) {
      const parsed = await parseUrl(url);
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
    } else {
      article = await processText(text, undefined, settings.contentStyle);
    }

    const publishResult = await publishArticle(article, resolvedChatId, settings.autoPublish, {
      imagesCount: settings.imagesCount,
      imagesSource: settings.imagesSource,
    });

    if (!publishResult.success) {
      throw new Error(publishResult.error || 'Publication failed');
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    if (submissionId) {
      await updateTelegramSubmission(submissionId, {
        status: 'published',
        article_slug_en: publishResult.en.slug,
        article_slug_pl: publishResult.pl.slug,
        article_url_en: publishResult.en.url,
        article_url_pl: publishResult.pl.url,
        processing_time_ms: durationMs,
        category: article.category,
      });
    }

    await logTelegramActivity({
      chatId: resolvedChatId,
      username,
      firstName,
      action: 'publish',
      actionLabel: settings.autoPublish
        ? 'Published article from Telegram'
        : 'Saved Telegram article as draft',
      entityType: 'article',
      entityId: submissionId ? String(submissionId) : undefined,
      entityTitle: article.title,
      entityUrl: publishResult.en.url,
      entityUrlPl: publishResult.pl.url,
      metadata: {
        source: 'telegram-simple',
        submissionId,
        submissionType,
        autoPublish: settings.autoPublish,
        imagesCount: settings.imagesCount,
        imagesSource: settings.imagesSource,
        durationMs,
      },
    });

    const statusText = settings.autoPublish ? 'ОПУБЛИКОВАНО' : 'СОХРАНЕНО КАК ЧЕРНОВИК';
    const statusNote = settings.autoPublish
      ? 'Статья опубликована на сайте.'
      : 'Черновик сохранен. Опубликуйте через админ панель.';

    await sendTelegramMessage(
      resolvedChatId,
      `${settings.autoPublish ? '✅' : '📝'} <b>${statusText}</b>\n\n` +
        `📝 <b>Заголовок:</b> ${escapeHtml(article.title)}\n` +
        `📊 <b>Статистика:</b>\n` +
        `• Слов: ${article.wordCount}\n` +
        `• Категория: ${escapeHtml(article.category)}\n` +
        `• Время: ${durationSec}s\n\n` +
        `🔗 <b>Ссылки:</b>\n` +
        `🇬🇧 EN: ${publishResult.en.url}\n` +
        `🇵🇱 PL: ${publishResult.pl.url}\n\n` +
        `${statusNote}\n` +
        `🎨 Редактирование: https://app.icoffio.com/en/admin`,
      { disable_web_page_preview: false }
    );

    return NextResponse.json({
      ok: true,
      submissionId,
      result: publishResult,
      durationMs,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown processing error';
    console.error('[TelegramSimple] Processing error:', message, error);

    if (submissionId) {
      await updateTelegramSubmission(submissionId, {
        status: 'failed',
        error_message: message,
        error_details: { message },
        processing_time_ms: durationMs,
      });
    }

    if (chatId) {
      await logTelegramActivity({
        chatId,
        username: telegramUsername,
        firstName: telegramFirstName,
        action: 'parse',
        actionLabel: 'Telegram processing failed',
        entityType: 'article',
        entityId: submissionId ? String(submissionId) : undefined,
        metadata: {
          source: 'telegram-simple',
          submissionId,
          submissionType,
          status: 'failed',
          error: message,
          durationMs,
        },
      });
    }

    if (chatId) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Ошибка обработки</b>\n\n` +
          `Причина: ${escapeHtml(message)}\n` +
          `⏱️ Время: ${Math.round(durationMs / 1000)}s\n\n` +
          `Попробуйте снова через пару минут.`
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
        durationMs,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-simple-webhook',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
  });
}
