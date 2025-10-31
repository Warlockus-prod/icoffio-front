/**
 * TELEGRAM BOT WEBHOOK v7.11.0 - CLEAN REWRITE
 * 
 * Простая и чистая реализация Telegram бота
 * Фокус на стабильности и надежности
 * 
 * @version 7.11.0
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueueService } from '@/lib/queue-service';
import { t, getUserLanguage } from '@/lib/telegram-i18n';
import { setPublicationStyle, getPublicationStyle, PublicationStyle } from '@/lib/telegram-user-preferences';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// ============================================================================
// TELEGRAM API HELPERS
// ============================================================================

/**
 * Send message to Telegram
 */
async function sendMessage(chatId: number, text: string, options?: any): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[Bot] TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Bot] Failed to send message:', error);
    }
  } catch (error) {
    console.error('[Bot] Error sending message:', error);
  }
}

/**
 * Verify Telegram request
 */
function verifyRequest(request: NextRequest): boolean {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = process.env.TELEGRAM_BOT_SECRET;
  
  if (expectedSecret && secret !== expectedSecret) {
    console.warn('[Bot] Invalid secret token');
    return false;
  }
  
  return true;
}

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * Handle /start command
 */
async function handleStart(chatId: number): Promise<void> {
  const message = `
🤖 <b>Привет! Я icoffio Bot</b>

📝 <b>Что я умею:</b>
• Создавать статьи из текста
• Парсить статьи по URL
• Публиковать на сайт

💡 <b>Как использовать:</b>
1. Отправь мне текст или URL
2. Я создам статью
3. Получишь ссылку на публикацию

📊 <b>Команды:</b>
/queue - Показать статус очереди
/help - Показать эту справку

🚀 <b>Просто отправь текст или URL для начала!</b>
`;

  await sendMessage(chatId, message);
}

/**
 * Handle /help command
 */
async function handleHelp(chatId: number): Promise<void> {
  const message = `
📚 <b>Справка icoffio Bot</b>

<b>Текстовые статьи:</b>
Просто отправь текст, и я создам статью.

<b>Парсинг URL:</b>
Отправь ссылку, и я извлеку контент.

<b>Очередь:</b>
/queue - Проверить статус обработки

<b>Процесс:</b>
1. Отправляешь текст/URL
2. Я добавляю в очередь
3. AI обрабатывает (~60 сек)
4. Получаешь уведомление с URL

❓ <b>Вопросы?</b>
Пиши @icoffio_support
`;

  await sendMessage(chatId, message);
}

/**
 * Handle /queue command
 */
async function handleQueue(chatId: number): Promise<void> {
  try {
    const queueService = getQueueService();
    const stats = await queueService.getQueueStats();
    
    const message = `
📊 <b>Статус очереди:</b>

📋 Всего заданий: ${stats.total}
⏳ В ожидании: ${stats.pending}
⚙️ Обрабатывается: ${stats.processing}
✅ Завершено: ${stats.completed}
❌ Ошибки: ${stats.failed}

${stats.processing > 0 ? '🔄 Система работает' : '💤 Система ожидает'}
`;

    await sendMessage(chatId, message);
  } catch (error) {
    console.error('[Bot] Error getting queue stats:', error);
    await sendMessage(chatId, '❌ Ошибка получения статуса очереди');
  }
}

/**
 * Handle /style command
 */
async function handleStyle(chatId: number, command?: string): Promise<void> {
  try {
    const language = getUserLanguage(chatId);
    
    // If specific style selected
    if (command) {
      let style: PublicationStyle;
      
      switch (command) {
        case '/style_news':
          style = 'news';
          break;
        case '/style_analytical':
          style = 'analytical';
          break;
        case '/style_tutorial':
          style = 'tutorial';
          break;
        case '/style_opinion':
          style = 'opinion';
          break;
        default:
          await sendMessage(chatId, t(chatId, 'unknownCommand'));
          return;
      }
      
      await setPublicationStyle(chatId, style);
      const styleName = getStyleName(chatId, style);
      await sendMessage(chatId, t(chatId, 'styleChanged').replace('{style}', styleName));
      
      console.log(`[Bot] Style changed for chat ${chatId}: ${style}`);
      return;
    }
    
    // Show style selection menu
    const currentStyle = await getPublicationStyle(chatId);
    const currentStyleName = getStyleName(chatId, currentStyle);
    const styleMessage = t(chatId, 'styleCommand') + '\n\n' + 
                         t(chatId, 'styleCurrent').replace('{style}', currentStyleName);
    
    await sendMessage(chatId, styleMessage);
    
  } catch (error) {
    console.error('[Bot] Error handling style command:', error);
    await sendMessage(chatId, '❌ Ошибка изменения стиля');
  }
}

/**
 * Get localized style name
 */
function getStyleName(chatId: number, style: PublicationStyle): string {
  const language = getUserLanguage(chatId);
  
  const styleNames: Record<string, Record<PublicationStyle, string>> = {
    ru: {
      news: t(chatId, 'styleNews'),
      analytical: t(chatId, 'styleAnalytical'),
      tutorial: t(chatId, 'styleTutorial'),
      opinion: t(chatId, 'styleOpinion'),
    },
    pl: {
      news: t(chatId, 'styleNews'),
      analytical: t(chatId, 'styleAnalytical'),
      tutorial: t(chatId, 'styleTutorial'),
      opinion: t(chatId, 'styleOpinion'),
    },
    en: {
      news: t(chatId, 'styleNews'),
      analytical: t(chatId, 'styleAnalytical'),
      tutorial: t(chatId, 'styleTutorial'),
      opinion: t(chatId, 'styleOpinion'),
    },
  };
  
  return styleNames[language]?.[style] || style;
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Handle text message (article generation)
 */
async function handleTextMessage(chatId: number, messageId: number, text: string): Promise<void> {
  try {
    // Extract title (first line) and content
    const lines = text.trim().split('\n');
    const title = lines[0].substring(0, 200); // Limit title length
    const content = text;

    // Add to queue
    const queueService = getQueueService();
    const jobId = await queueService.addJob({
      type: 'text-generate',
      max_retries: 3,
      data: {
        text: content,
        title,
        chatId,
        messageId,
      },
    });

    console.log(`[Bot] Added text job: ${jobId} for chat ${chatId}`);

    // Send confirmation
    await sendMessage(
      chatId,
      `✨ <b>Текст получен!</b>\n\n` +
      `📝 <b>Заголовок:</b> ${title}\n` +
      `📋 <b>Добавлено в очередь:</b> <code>${jobId}</code>\n\n` +
      `🤖 AI генерирует статью...\n` +
      `⏳ Ожидайте (~60 секунд)`
    );

    // Trigger queue processing (async, non-blocking)
    queueService.processQueue().catch(err => {
      console.error('[Bot] Queue processing error:', err);
    });

  } catch (error) {
    console.error('[Bot] Error handling text message:', error);
    await sendMessage(
      chatId,
      `❌ <b>Ошибка обработки</b>\n\n` +
      `Попробуйте еще раз или обратитесь к администратору.`
    );
  }
}

/**
 * Handle URL message (article parsing)
 */
async function handleUrlMessage(chatId: number, messageId: number, url: string): Promise<void> {
  try {
    // Add to queue
    const queueService = getQueueService();
    const jobId = await queueService.addJob({
      type: 'url-parse',
      max_retries: 3,
      data: {
        url,
        chatId,
        messageId,
      },
    });

    console.log(`[Bot] Added URL job: ${jobId} for chat ${chatId}`);

    // Send confirmation
    await sendMessage(
      chatId,
      `🔗 <b>URL получен!</b>\n\n` +
      `📋 <b>Добавлено в очередь:</b> <code>${jobId}</code>\n\n` +
      `🤖 Парсю и генерирую статью...\n` +
      `⏳ Ожидайте (~60 секунд)`
    );

    // Trigger queue processing (async, non-blocking)
    queueService.processQueue().catch(err => {
      console.error('[Bot] Queue processing error:', err);
    });

  } catch (error) {
    console.error('[Bot] Error handling URL message:', error);
    await sendMessage(
      chatId,
      `❌ <b>Ошибка обработки URL</b>\n\n` +
      `Попробуйте еще раз или обратитесь к администратору.`
    );
  }
}

/**
 * Detect if message contains URL
 */
function isUrl(text: string): boolean {
  try {
    const urlPattern = /https?:\/\/[^\s]+/i;
    return urlPattern.test(text);
  } catch {
    return false;
  }
}

/**
 * Extract URL from text
 */
function extractUrl(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s]+/i;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify request
    if (!verifyRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse update
    const update = await request.json();
    console.log('[Bot] Received update:', JSON.stringify(update, null, 2));

    // Extract message
    const message = update.message || update.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true, message: 'No message' });
    }

    const chatId = message.chat.id;
    const messageId = message.message_id;
    const text = message.text || '';

    // Handle commands
    if (text.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase();
      
      switch (command) {
        case '/start':
          await handleStart(chatId);
          break;
        
        case '/help':
          await handleHelp(chatId);
          break;
        
        case '/queue':
          await handleQueue(chatId);
          break;
        
        case '/style':
        case '/style_news':
        case '/style_analytical':
        case '/style_tutorial':
        case '/style_opinion':
          await handleStyle(chatId, command);
          break;
        
        default:
          await sendMessage(chatId, '❓ Неизвестная команда. Используйте /help для справки.');
      }
      
      return NextResponse.json({ ok: true });
    }

    // Handle URL
    if (isUrl(text)) {
      const url = extractUrl(text);
      if (url) {
        await handleUrlMessage(chatId, messageId, url);
      } else {
        await sendMessage(chatId, '❌ Не удалось извлечь URL');
      }
      return NextResponse.json({ ok: true });
    }

    // Handle text (must be at least 50 characters)
    if (text.length >= 50) {
      await handleTextMessage(chatId, messageId, text);
      return NextResponse.json({ ok: true });
    }

    // Text too short
    await sendMessage(
      chatId,
      '📝 <b>Текст слишком короткий</b>\n\n' +
      'Отправьте минимум 50 символов для создания статьи.\n\n' +
      'Или используйте /help для справки.'
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('[Bot] Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
