/**
 * TELEGRAM SIMPLE - WEBHOOK
 * 
 * Упрощенная версия Telegram бота
 * Быстро, надежно, просто
 * 
 * @version 1.0.0
 * @date 2025-12-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram-simple/telegram-notifier';
import { parseUrl } from '@/lib/telegram-simple/url-parser';
import { processText } from '@/lib/telegram-simple/content-processor';
import { publishArticle } from '@/lib/telegram-simple/publisher';
import { loadTelegramSettings } from '@/lib/telegram-simple/settings-loader';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse update from Telegram
    const update = await request.json();
    console.log('[TelegramSimple] 📨 Webhook called');

    // Extract message
    const message = update.message || update.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true, message: 'No message' });
    }

    const chatId = message.chat.id;
    const text = message.text?.trim() || '';

    if (!text) {
      return NextResponse.json({ ok: true, message: 'Empty message' });
    }

    console.log(`[TelegramSimple] 💬 From chat ${chatId}: "${text.substring(0, 50)}..."`);

    // ========================================
    // HANDLE COMMANDS
    // ========================================
    
    if (text.startsWith('/')) {
      const command = text.toLowerCase();

      if (command === '/start') {
        await sendTelegramMessage(
          chatId,
          `🤖 <b>Привет! Я icoffio Bot v8.5</b>\n\n` +
          `📝 <b>Что я умею:</b>\n` +
          `• Создавать статьи из текста\n` +
          `• Парсить статьи по URL\n` +
          `• Публиковать на EN + PL 🇬🇧🇵🇱\n\n` +
          `💡 <b>Просто отправь:</b>\n` +
          `• URL статьи для парсинга\n` +
          `• Текст (минимум 100 символов)\n\n` +
          `⚙️ <b>Команды:</b>\n` +
          `/settings - Твои настройки\n` +
          `/help - Справка\n\n` +
          `⚡ Обработка: ~15-25 секунд\n` +
          `🚀 Начни прямо сейчас!`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/help') {
        await sendTelegramMessage(
          chatId,
          `📚 <b>Справка icoffio Bot</b>\n\n` +
          `<b>Как использовать:</b>\n` +
          `1. Отправь URL или текст\n` +
          `2. Жди ~15-25 секунд\n` +
          `3. Получи ссылку на статью\n\n` +
          `<b>Минимальные требования:</b>\n` +
          `• Текст: минимум 100 символов\n` +
          `• URL: любая статья\n\n` +
          `<b>Команды:</b>\n` +
          `/settings - Текущие настройки\n` +
          `/help - Эта справка\n\n` +
          `<b>Что получишь:</b>\n` +
          `✅ Профессиональная статья (EN + PL)\n` +
          `✅ Обработка по твоим настройкам\n` +
          `✅ Готова к редактированию в админке`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/settings') {
        const settings = await loadTelegramSettings(chatId);
        await sendTelegramMessage(
          chatId,
          `⚙️ <b>Ваши настройки публикации</b>\n\n` +
          `📝 <b>Стиль:</b> ${getStyleLabel(settings.contentStyle)}\n` +
          `🖼️ <b>Картинок:</b> ${settings.imagesCount}\n` +
          `📸 <b>Источник:</b> ${settings.imagesSource === 'unsplash' ? 'Unsplash' : settings.imagesSource === 'ai' ? 'AI Generated' : 'Нет'}\n` +
          `${settings.autoPublish ? '✅' : '📝'} <b>Публикация:</b> ${settings.autoPublish ? 'Автоматически' : 'Черновик'}\n\n` +
          `💡 <b>Изменить настройки:</b>\n` +
          `🔗 <a href="https://app.icoffio.com/en/admin">app.icoffio.com/en/admin</a>\n\n` +
          `Откройте админ панель → вкладка "🤖 Telegram"`
        );
        return NextResponse.json({ ok: true });
      }

      // Unknown command
      await sendTelegramMessage(chatId, '❓ Неизвестная команда. Используйте /help');
      return NextResponse.json({ ok: true });
    }

    // ========================================
    // VALIDATE TEXT LENGTH
    // ========================================
    
    if (text.length < 100 && !isUrl(text)) {
      await sendTelegramMessage(
        chatId,
        `📝 <b>Текст слишком короткий</b>\n\n` +
        `Минимум: 100 символов\n` +
        `У вас: ${text.length} символов\n\n` +
        `Или отправьте URL статьи для парсинга.`
      );
      return NextResponse.json({ ok: true });
    }

    // ========================================
    // LOAD USER SETTINGS (v8.5.0)
    // ========================================
    
    console.log('[TelegramSimple] 📋 Loading user settings...');
    const settings = await loadTelegramSettings(chatId);
    console.log('[TelegramSimple] ⚙️ Settings:', {
      contentStyle: settings.contentStyle,
      imagesCount: settings.imagesCount,
      imagesSource: settings.imagesSource,
      autoPublish: settings.autoPublish,
    });

    // ========================================
    // PROCESS ARTICLE
    // ========================================
    
    const estimatedTime = settings.imagesCount > 0 ? '20-35 секунд' : '15-25 секунд';
    
    await sendTelegramMessage(
      chatId,
      `⏳ <b>Обрабатываю...</b>\n\n` +
      `${isUrl(text) ? '🔗 Парсю URL' : '📝 Обрабатываю текст'}\n` +
      `📝 Стиль: ${getStyleLabel(settings.contentStyle)}\n` +
      `🖼️ Картинок: ${settings.imagesCount} ${settings.imagesCount > 0 ? `(${settings.imagesSource})` : ''}\n` +
      `⏱️ Примерно ${estimatedTime}`
    );

    let article;

    if (isUrl(text)) {
      // URL → Parse → Process
      console.log('[TelegramSimple] 🔗 Processing URL...');
      const parsed = await parseUrl(text);
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
    } else {
      // Text → Process directly
      console.log('[TelegramSimple] 📝 Processing text...');
      article = await processText(text, undefined, settings.contentStyle);
    }

    // ========================================
    // PUBLISH TO SUPABASE (with autoPublish + images)
    // ========================================
    
    console.log(`[TelegramSimple] 📤 ${settings.autoPublish ? 'Publishing' : 'Saving as draft'}...`);
    const result = await publishArticle(
      article, 
      chatId, 
      settings.autoPublish,
      {
        imagesCount: settings.imagesCount,
        imagesSource: settings.imagesSource,
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }

    // ========================================
    // SEND SUCCESS NOTIFICATION (DUAL-LANGUAGE)
    // ========================================
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    const statusEmoji = settings.autoPublish ? '✅' : '📝';
    const statusText = settings.autoPublish ? 'ОПУБЛИКОВАНО' : 'СОХРАНЕНО КАК ЧЕРНОВИК';
    const statusNote = settings.autoPublish 
      ? '✨ Статья опубликована на сайте (2 языка)!'
      : '💡 Черновик сохранен. Опубликуйте через админ панель.';
    
    const imagesInfo = settings.imagesCount > 0 
      ? `• Изображений: ${settings.imagesCount} (${settings.imagesSource})\n`
      : '';
    
    await sendTelegramMessage(
      chatId,
      `${statusEmoji} <b>${statusText}!</b>\n\n` +
      `📝 <b>Заголовок:</b>\n${article.title}\n\n` +
      `📊 <b>Статистика:</b>\n` +
      `• Стиль: ${getStyleLabel(settings.contentStyle)}\n` +
      `• Слов: ${article.wordCount}\n` +
      `${imagesInfo}` +
      `• Категория: ${article.category}\n` +
      `• Время: ${duration}s\n\n` +
      `🔗 <b>Ссылки:</b>\n` +
      `🇬🇧 <b>EN:</b> ${result.en.url}\n` +
      `🇵🇱 <b>PL:</b> ${result.pl.url}\n\n` +
      `${statusNote}\n` +
      `🎨 Редактировать: app.icoffio.com/en/admin`,
      { disable_web_page_preview: false }
    );

    console.log(`[TelegramSimple] ✅ SUCCESS (${duration}s):`);
    console.log(`  🇬🇧 EN: ${result.en.url}`);
    console.log(`  🇵🇱 PL: ${result.pl.url}`);

    return NextResponse.json({ ok: true, result });

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ ERROR:', error);

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Try to send error notification
    try {
      const update = await request.json();
      const chatId = update.message?.chat?.id;
      
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `❌ <b>Ошибка обработки</b>\n\n` +
          `📋 ${error.message}\n\n` +
          `⏱️ Время: ${duration}s\n\n` +
          `Попробуйте еще раз или обратитесь к администратору.`
        );
      }
    } catch (notifyError) {
      console.error('[TelegramSimple] Failed to send error notification:', notifyError);
    }

    return NextResponse.json(
      { 
        ok: false, 
        error: error.message,
        duration 
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-simple-webhook',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get human-readable style label
 */
function getStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    'journalistic': '📰 Journalistic',
    'keep_as_is': '✋ Keep As Is',
    'seo_optimized': '🔍 SEO',
    'academic': '🎓 Academic',
    'casual': '💬 Casual',
    'technical': '⚙️ Technical',
  };
  return labels[style] || style;
}

/**
 * Check if text is URL
 */
function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

