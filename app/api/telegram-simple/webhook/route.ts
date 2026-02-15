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
import type {
  ContentStyle,
  ImagesSource,
  TelegramSettings,
} from '@/lib/telegram-simple/types';
import {
  createTelegramSubmission,
  getTelegramSubmissions,
  updateTelegramSubmission,
} from '@/lib/supabase-analytics';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BATCH_URLS = 5;

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

interface ProcessSubmissionInput {
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  rawText: string;
  url?: string;
  sendProgressMessage?: boolean;
  sendResultMessage?: boolean;
  progressLabel?: string;
}

interface ProcessSubmissionResult {
  success: boolean;
  submissionId: number | null;
  submissionType: 'url' | 'text';
  title?: string;
  enUrl?: string;
  plUrl?: string;
  error?: string;
  durationMs: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStyleLabel(style: ContentStyle | string): string {
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

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  const normalized = matches.map((url) => url.replace(/[),.;!?]+$/g, '').trim());
  return Array.from(new Set(normalized.filter(Boolean)));
}

function normalizeContentStyle(rawValue?: string): ContentStyle | null {
  if (!rawValue) return null;

  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, ContentStyle> = {
    journalistic: 'journalistic',
    journal: 'journalistic',
    keep_as_is: 'keep_as_is',
    'keep-as-is': 'keep_as_is',
    keepasis: 'keep_as_is',
    asis: 'keep_as_is',
    original: 'keep_as_is',
    seo_optimized: 'seo_optimized',
    'seo-optimized': 'seo_optimized',
    seo: 'seo_optimized',
    academic: 'academic',
    casual: 'casual',
    technical: 'technical',
    tech: 'technical',
  };

  return aliases[value] || null;
}

function normalizeImagesSource(rawValue?: string): ImagesSource | null {
  if (!rawValue) return null;

  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, ImagesSource> = {
    unsplash: 'unsplash',
    stock: 'unsplash',
    ai: 'ai',
    dalle: 'ai',
    none: 'none',
    off: 'none',
    no: 'none',
  };

  return aliases[value] || null;
}

function normalizeAutoPublish(rawValue?: string): boolean | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  if (['on', 'true', '1', 'yes', 'y', 'enable'].includes(value)) return true;
  if (['off', 'false', '0', 'no', 'n', 'disable'].includes(value)) return false;
  return null;
}

function getEffectiveImageMode(
  settings: Pick<TelegramSettings, 'imagesCount' | 'imagesSource'>
): 'none' | 'unsplash' | 'ai' | 'mixed' {
  if (settings.imagesCount <= 0 || settings.imagesSource === 'none') {
    return 'none';
  }

  // Base rule: with two images we always publish one stock + one generated.
  if (settings.imagesCount === 2) {
    return 'mixed';
  }

  return settings.imagesSource === 'ai' ? 'ai' : 'unsplash';
}

function getEffectiveImageLabel(
  settings: Pick<TelegramSettings, 'imagesCount' | 'imagesSource'>
): string {
  const mode = getEffectiveImageMode(settings);
  if (mode === 'none') return 'Нет';
  if (mode === 'mixed') return 'Mixed (Unsplash + AI)';
  if (mode === 'ai') return 'AI';
  return 'Unsplash';
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
    console.warn(
      '[TelegramSimple] Secret token is not configured; request accepted without verification'
    );
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

async function saveTelegramSettings(
  chatId: number,
  patch: Partial<Pick<TelegramSettings, 'contentStyle' | 'imagesCount' | 'imagesSource' | 'autoPublish'>>
): Promise<TelegramSettings> {
  const current = await loadTelegramSettings(chatId);
  const merged: TelegramSettings = {
    ...current,
    ...patch,
    chatId,
  };

  const supabase = getActivitySupabaseClient();
  if (!supabase) {
    console.warn('[TelegramSimple] Supabase not configured, settings change cannot be persisted');
    return merged;
  }

  const { error } = await supabase
    .from('telegram_user_preferences')
    .upsert(
      {
        chat_id: chatId,
        content_style: merged.contentStyle,
        images_count: merged.imagesCount,
        images_source: merged.imagesSource,
        auto_publish: merged.autoPublish,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chat_id' }
    );

  if (error) {
    throw new Error(error.message || 'Failed to save settings');
  }

  return merged;
}

function buildSettingsMessage(settings: TelegramSettings): string {
  return (
    `⚙️ <b>Настройки публикации</b>\n\n` +
    `📝 Стиль: ${escapeHtml(getStyleLabel(settings.contentStyle))}\n` +
    `🖼️ Картинок: ${settings.imagesCount}\n` +
    `📸 Источник: ${escapeHtml(getEffectiveImageLabel(settings))}\n` +
    `${settings.autoPublish ? '✅' : '📝'} Публикация: ${
      settings.autoPublish ? 'Автоматически' : 'Черновик'
    }\n\n` +
    `<b>Быстрые команды:</b>\n` +
    `• /style journalistic|keep_as_is|seo|academic|casual|technical\n` +
    `• /images 0|1|2|3\n` +
    `• /source unsplash|ai|none\n` +
    `• /autopublish on|off\n\n` +
    `🎨 Полные настройки: https://app.icoffio.com/en/admin`
  );
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

    const recentLines = userSubmissions
      .slice(0, 5)
      .map((item, index) => {
        const icon =
          item.status === 'published' ? '✅' : item.status === 'failed' ? '❌' : '⏳';
        const typeLabel = item.submission_type === 'url' ? 'URL' : 'TEXT';
        if (item.status === 'published' && item.article_url_en) {
          return `${index + 1}. ${icon} ${typeLabel} • <a href="${item.article_url_en}">EN</a>${
            item.article_url_pl ? ` | <a href="${item.article_url_pl}">PL</a>` : ''
          }`;
        }
        return `${index + 1}. ${icon} ${typeLabel} • ${item.status}`;
      })
      .join('\n');

    await sendTelegramMessage(
      chatId,
      `📊 <b>Ваш статус обработки</b>\n\n` +
        `• Всего: ${userSubmissions.length}\n` +
        `• В обработке: ${processing}\n` +
        `• Успешно: ${published}\n` +
        `• Ошибки: ${failed}\n\n` +
        `🕒 <b>Последние 5:</b>\n${recentLines}`
    );
  } catch (error) {
    console.error('[TelegramSimple] Queue command failed:', error);
    await sendTelegramMessage(chatId, '❌ Не удалось получить статус. Попробуйте позже.');
  }
}

async function processSubmission(input: ProcessSubmissionInput): Promise<ProcessSubmissionResult> {
  const startTime = Date.now();
  const normalizedText = input.rawText.trim();
  const url = input.url || extractUrls(normalizedText)[0] || null;
  const submissionType: 'url' | 'text' = url ? 'url' : 'text';
  let submissionId: number | null = null;

  try {
    if (!url && normalizedText.length < 100) {
      if (input.sendResultMessage !== false) {
        await sendTelegramMessage(
          input.chatId,
          `📝 <b>Текст слишком короткий</b>\n\n` +
            `Минимум: 100 символов\n` +
            `Сейчас: ${normalizedText.length}\n\n` +
            `Либо отправьте ссылку на статью.`
        );
      }

      return {
        success: false,
        submissionId: null,
        submissionType,
        error: 'Text is too short',
        durationMs: Date.now() - startTime,
      };
    }

    submissionId = await createTelegramSubmission({
      user_id: input.userId,
      username: input.username,
      first_name: input.firstName,
      last_name: input.lastName,
      submission_type: submissionType,
      submission_content: (url || normalizedText).slice(0, 8000),
      status: 'processing',
      language: input.languageCode,
    });

    await logTelegramActivity({
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
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

    const settings = await loadTelegramSettings(input.chatId);
    const effectiveImageMode = getEffectiveImageMode(settings);
    const estimatedTime = settings.imagesCount > 0 ? '20-35 секунд' : '15-25 секунд';

    if (input.sendProgressMessage !== false) {
      await sendTelegramMessage(
        input.chatId,
        `${input.progressLabel ? `${escapeHtml(input.progressLabel)}\n` : ''}` +
          `⏳ <b>Обрабатываю...</b>\n\n` +
          `${url ? '🔗 Обрабатываю ссылку' : '📝 Обрабатываю текст'}\n` +
          `📝 Стиль: ${escapeHtml(getStyleLabel(settings.contentStyle))}\n` +
          `🖼️ Картинок: ${settings.imagesCount}${
            settings.imagesCount > 0 ? ` (${escapeHtml(getEffectiveImageLabel(settings))})` : ''
          }\n` +
          `⏱️ Ориентировочно: ${estimatedTime}`
      );
    }

    let article;
    if (url) {
      const parsed = await parseUrl(url);
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
    } else {
      article = await processText(normalizedText, undefined, settings.contentStyle);
    }

    const publishResult = await publishArticle(article, input.chatId, settings.autoPublish, {
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
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
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
        effectiveImageMode,
        durationMs,
      },
    });

    if (input.sendResultMessage !== false) {
      const statusText = settings.autoPublish ? 'ОПУБЛИКОВАНО' : 'СОХРАНЕНО КАК ЧЕРНОВИК';
      const statusNote = settings.autoPublish
        ? 'Статья опубликована на сайте.'
        : 'Черновик сохранен. Опубликуйте через админ панель.';

      await sendTelegramMessage(
        input.chatId,
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
    }

    return {
      success: true,
      submissionId,
      submissionType,
      title: article.title,
      enUrl: publishResult.en.url,
      plUrl: publishResult.pl.url,
      durationMs,
    };
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

    await logTelegramActivity({
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
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

    if (input.sendResultMessage !== false) {
      await sendTelegramMessage(
        input.chatId,
        `❌ <b>Ошибка обработки</b>\n\n` +
          `Причина: ${escapeHtml(message)}\n` +
          `⏱️ Время: ${Math.round(durationMs / 1000)}s\n\n` +
          `Попробуйте снова через пару минут.`
      );
    }

    return {
      success: false,
      submissionId,
      submissionType,
      error: message,
      durationMs,
    };
  }
}

export async function POST(request: NextRequest) {
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
      update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true, message: 'No message payload' });
    }

    const chatId = Number(message.chat.id);
    const userId = message.from?.id || chatId;
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

    console.log(`[TelegramSimple] Incoming message from chat ${chatId}: "${text.slice(0, 80)}"`);

    if (text.startsWith('/')) {
      const parts = text.split(/\s+/);
      const command = (parts[0] || '').toLowerCase();
      const args = parts.slice(1);
      const firstArg = args[0];

      if (command === '/start') {
        await sendTelegramMessage(
          chatId,
          `🤖 <b>Привет! Я icoffio Bot</b>\n\n` +
            `Отправь ссылку или текст, и я создам публикацию.\n` +
            `Можно отправить сразу несколько URL (до ${MAX_BATCH_URLS} за сообщение).\n\n` +
            `⚙️ Команды:\n` +
            `/settings - Твои настройки\n` +
            `/queue - История и статус\n` +
            `/help - Справка`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/help') {
        await sendTelegramMessage(
          chatId,
          `📚 <b>Как использовать:</b>\n\n` +
            `1. Отправь URL статьи или текст (от 100 символов)\n` +
            `2. Подожди обработку\n` +
            `3. Получи EN + PL ссылки\n\n` +
            `<b>Команды:</b>\n` +
            `/settings\n` +
            `/queue (или /status)\n` +
            `/style <value>\n` +
            `/images <0-3>\n` +
            `/source <unsplash|ai|none>\n` +
            `/autopublish <on|off>\n` +
            `/admin`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/settings') {
        const settings = await loadTelegramSettings(chatId);
        await sendTelegramMessage(chatId, buildSettingsMessage(settings));
        return NextResponse.json({ ok: true });
      }

      if (command === '/queue' || command === '/status') {
        await handleQueueCommand(chatId, userId);
        return NextResponse.json({ ok: true });
      }

      if (command === '/style') {
        if (!firstArg) {
          await sendTelegramMessage(
            chatId,
            `📝 <b>Выбор стиля</b>\n\n` +
              `Пример: <code>/style technical</code>\n\n` +
              `Доступно:\n` +
              `• journalistic\n` +
              `• keep_as_is\n` +
              `• seo\n` +
              `• academic\n` +
              `• casual\n` +
              `• technical`
          );
          return NextResponse.json({ ok: true });
        }

        const style = normalizeContentStyle(firstArg);
        if (!style) {
          await sendTelegramMessage(
            chatId,
            `❌ Неизвестный стиль: <code>${escapeHtml(firstArg)}</code>\n` +
              `Используйте /style и один из доступных вариантов.`
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { contentStyle: style });
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram content style',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', contentStyle: style },
        });

        await sendTelegramMessage(
          chatId,
          `✅ Стиль обновлен: <b>${escapeHtml(getStyleLabel(updated.contentStyle))}</b>`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/images') {
        if (!firstArg) {
          await sendTelegramMessage(
            chatId,
            `🖼️ <b>Количество картинок</b>\n\n` +
              `Пример: <code>/images 2</code>\n` +
              `Допустимо: 0, 1, 2, 3`
          );
          return NextResponse.json({ ok: true });
        }

        const imagesCount = Number(firstArg);
        if (!Number.isInteger(imagesCount) || imagesCount < 0 || imagesCount > 3) {
          await sendTelegramMessage(chatId, '❌ Некорректное значение. Используйте /images 0..3');
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { imagesCount });
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram images count',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', imagesCount },
        });

        await sendTelegramMessage(
          chatId,
          `✅ Количество картинок: <b>${updated.imagesCount}</b>${
            updated.imagesCount === 2
              ? '\n📸 Режим 2 изображений: <b>1 Unsplash + 1 AI</b>'
              : ''
          }`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/source') {
        if (!firstArg) {
          await sendTelegramMessage(
            chatId,
            `📸 <b>Источник изображений</b>\n\n` +
              `Пример: <code>/source unsplash</code>\n` +
              `Доступно: unsplash, ai, none`
          );
          return NextResponse.json({ ok: true });
        }

        const source = normalizeImagesSource(firstArg);
        if (!source) {
          await sendTelegramMessage(chatId, '❌ Некорректный источник. Используйте unsplash, ai или none.');
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { imagesSource: source });
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram image source',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', imagesSource: source },
        });

        await sendTelegramMessage(
          chatId,
          `✅ Источник картинок: <b>${escapeHtml(updated.imagesSource.toUpperCase())}</b>${
            updated.imagesCount === 2
              ? '\nℹ️ При 2 картинках автоматически используется <b>1 Unsplash + 1 AI</b>.'
              : ''
          }`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/autopublish') {
        if (!firstArg) {
          await sendTelegramMessage(
            chatId,
            `🚀 <b>Автопубликация</b>\n\n` +
              `Пример: <code>/autopublish on</code>\n` +
              `Значения: on или off`
          );
          return NextResponse.json({ ok: true });
        }

        const autoPublish = normalizeAutoPublish(firstArg);
        if (autoPublish === null) {
          await sendTelegramMessage(chatId, '❌ Некорректное значение. Используйте /autopublish on|off');
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { autoPublish });
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram auto-publish mode',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', autoPublish },
        });

        await sendTelegramMessage(
          chatId,
          `✅ Режим публикации: <b>${updated.autoPublish ? 'Автоматически' : 'Черновик'}</b>`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/admin') {
        await sendTelegramMessage(chatId, '🎨 Админ-панель: https://app.icoffio.com/en/admin');
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        chatId,
        `❓ Неизвестная команда.\n\n` +
          `Поддерживается:\n` +
          `/help\n/settings\n/queue\n/style\n/images\n/source\n/autopublish\n/admin`
      );
      return NextResponse.json({ ok: true });
    }

    const urls = extractUrls(text);
    if (urls.length > 1) {
      const batchUrls = urls.slice(0, MAX_BATCH_URLS);
      await sendTelegramMessage(
        chatId,
        `📦 <b>Пакетная обработка</b>\n\n` +
          `Получено URL: ${urls.length}\n` +
          `В обработку: ${batchUrls.length}${urls.length > MAX_BATCH_URLS ? ` (лимит ${MAX_BATCH_URLS})` : ''}\n\n` +
          `Начинаю обработку по очереди.`
      );

      const results: Array<{ url: string; result: ProcessSubmissionResult }> = [];
      for (let index = 0; index < batchUrls.length; index++) {
        const url = batchUrls[index];
        const result = await processSubmission({
          chatId,
          userId,
          username,
          firstName,
          lastName,
          languageCode,
          rawText: url,
          url,
          sendProgressMessage: true,
          sendResultMessage: false,
          progressLabel: `[${index + 1}/${batchUrls.length}]`,
        });
        results.push({ url, result });
      }

      const success = results.filter((item) => item.result.success);
      const failed = results.filter((item) => !item.result.success);

      const successLines = success
        .slice(0, 5)
        .map(
          (item, idx) =>
            `${idx + 1}. ✅ <a href="${item.result.enUrl}">EN</a>${
              item.result.plUrl ? ` | <a href="${item.result.plUrl}">PL</a>` : ''
            }`
        )
        .join('\n');
      const failedLines = failed
        .slice(0, 5)
        .map(
          (item, idx) =>
            `${idx + 1}. ❌ ${escapeHtml(item.result.error || 'Unknown error')} (${escapeHtml(item.url)})`
        )
        .join('\n');

      await sendTelegramMessage(
        chatId,
        `📊 <b>Пакет завершен</b>\n\n` +
          `• Всего: ${batchUrls.length}\n` +
          `• Успешно: ${success.length}\n` +
          `• С ошибкой: ${failed.length}\n\n` +
          `${successLines ? `✅ <b>Ссылки:</b>\n${successLines}\n\n` : ''}` +
          `${failedLines ? `❌ <b>Ошибки:</b>\n${failedLines}` : ''}`
      );

      return NextResponse.json({
        ok: true,
        batch: true,
        total: batchUrls.length,
        success: success.length,
        failed: failed.length,
      });
    }

    const singleResult = await processSubmission({
      chatId,
      userId,
      username,
      firstName,
      lastName,
      languageCode,
      rawText: text,
      sendProgressMessage: true,
      sendResultMessage: true,
    });

    return NextResponse.json({
      ok: singleResult.success,
      submissionId: singleResult.submissionId,
      durationMs: singleResult.durationMs,
      error: singleResult.error,
    });
  } catch (error: any) {
    console.error('[TelegramSimple] Unexpected webhook error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown webhook error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-simple-webhook',
    version: '1.3.0',
    timestamp: new Date().toISOString(),
  });
}
