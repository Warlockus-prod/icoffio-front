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
          `🤖 <b>Привет! Я icoffio Bot (Simple)</b>\n\n` +
          `📝 <b>Что я умею:</b>\n` +
          `• Создавать статьи из текста\n` +
          `• Парсить статьи по URL\n\n` +
          `💡 <b>Просто отправь:</b>\n` +
          `• URL статьи для парсинга\n` +
          `• Текст (минимум 100 символов)\n\n` +
          `⚡ Обработка: ~10-15 секунд\n` +
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
          `2. Жди ~10-15 секунд\n` +
          `3. Получи ссылку на статью\n\n` +
          `<b>Минимальные требования:</b>\n` +
          `• Текст: минимум 100 символов\n` +
          `• URL: любая статья\n\n` +
          `<b>Что получишь:</b>\n` +
          `✅ Профессиональная статья\n` +
          `✅ Опубликована на сайте\n` +
          `✅ Готова к редактированию в админке`
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
    // PROCESS ARTICLE
    // ========================================
    
    await sendTelegramMessage(
      chatId,
      `⏳ <b>Обрабатываю...</b>\n\n` +
      `${isUrl(text) ? '🔗 Парсю URL' : '📝 Обрабатываю текст'}\n` +
      `⏱️ Примерно 10-15 секунд`
    );

    let article;

    if (isUrl(text)) {
      // URL → Parse → Process
      console.log('[TelegramSimple] 🔗 Processing URL...');
      const parsed = await parseUrl(text);
      article = await processText(parsed.content, parsed.title);
    } else {
      // Text → Process directly
      console.log('[TelegramSimple] 📝 Processing text...');
      article = await processText(text);
    }

    // ========================================
    // PUBLISH TO SUPABASE
    // ========================================
    
    console.log('[TelegramSimple] 📤 Publishing...');
    const result = await publishArticle(article, chatId);

    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }

    // ========================================
    // SEND SUCCESS NOTIFICATION (DUAL-LANGUAGE)
    // ========================================
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    await sendTelegramMessage(
      chatId,
      `✅ <b>ОПУБЛИКОВАНО НА ДВУХ ЯЗЫКАХ!</b>\n\n` +
      `📝 <b>Заголовок:</b>\n${article.title}\n\n` +
      `📊 <b>Статистика:</b>\n` +
      `• Слов: ${article.wordCount}\n` +
      `• Категория: ${article.category}\n` +
      `• Время: ${duration}s\n\n` +
      `🔗 <b>Ссылки:</b>\n` +
      `🇬🇧 <b>EN:</b> ${result.en.url}\n` +
      `🇵🇱 <b>PL:</b> ${result.pl.url}\n\n` +
      `✨ Статья опубликована на сайте (2 языка)!\n` +
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
 * Check if text is URL
 */
function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

