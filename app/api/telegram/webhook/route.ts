/**
 * TELEGRAM BOT WEBHOOK
 * 
 * Handles incoming messages from Telegram bot
 * Processes URLs and text through queue system
 * 
 * Features:
 * - URL parsing and article creation
 * - Text-to-article generation
 * - Queue management for multiple requests
 * - Status updates to Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueueService } from '@/lib/queue-service';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Verify Telegram secret
function verifyTelegramRequest(request: NextRequest): boolean {
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = process.env.TELEGRAM_BOT_SECRET;
  
  if (expectedSecret && secret !== expectedSecret) {
    return false;
  }
  
  return true;
}

// Send message to Telegram
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify request
    if (!verifyTelegramRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Extract message
    const message = body.message || body.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true }); // Ignore non-message updates
    }

    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    
    if (!chatId || !text) {
      return NextResponse.json({ ok: true });
    }

    // Check for commands
    if (text.startsWith('/')) {
      return await handleCommand(chatId, text);
    }

    // Detect URL or text
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const isUrl = !!urlMatch;

    const queueService = getQueueService();

    if (isUrl) {
      // URL parsing job
      const url = urlMatch[0];
      
      const jobId = await queueService.addJob({
        type: 'url-parse',
        data: {
          url,
          chatId,
          messageId: message.message_id,
        },
        maxRetries: 2,
      });

      await sendTelegramMessage(
        chatId,
        `🔄 <b>URL получен!</b>\n\n` +
        `🔗 <code>${url}</code>\n\n` +
        `📋 Добавлено в очередь: <code>${jobId}</code>\n` +
        `⏳ Ожидайте обработки...`
      );

      // Start monitoring job
      monitorJob(jobId, chatId);

    } else {
      // Text generation job
      const lines = text.split('\n');
      const title = lines[0]?.substring(0, 100) || 'Article from Telegram';
      
      const jobId = await queueService.addJob({
        type: 'text-generate',
        data: {
          text,
          title,
          category: 'Technology',
          language: 'en',
          chatId,
          messageId: message.message_id,
        },
        maxRetries: 2,
      });

      await sendTelegramMessage(
        chatId,
        `✨ <b>Текст получен!</b>\n\n` +
        `📝 Заголовок: <i>${title}</i>\n\n` +
        `📋 Добавлено в очередь: <code>${jobId}</code>\n` +
        `🤖 AI генерирует статью...\n` +
        `⏳ Ожидайте (~30 секунд)`
      );

      // Start monitoring job
      monitorJob(jobId, chatId);
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle bot commands
 */
async function handleCommand(chatId: number, text: string) {
  const command = text.toLowerCase().split(' ')[0];

  switch (command) {
    case '/start':
      await sendTelegramMessage(
        chatId,
        `👋 <b>Привет! Я icoffio Bot</b>\n\n` +
        `Я помогу тебе создавать статьи:\n\n` +
        `📝 <b>Отправь текст</b> → Создам статью с AI\n` +
        `🔗 <b>Отправь URL</b> → Спарсю и опубликую\n\n` +
        `📋 <b>Команды:</b>\n` +
        `/help - Помощь\n` +
        `/queue - Статус очереди\n` +
        `/status - Мой статус\n\n` +
        `Powered by GPT-4o 🤖`
      );
      break;

    case '/help':
      await sendTelegramMessage(
        chatId,
        `📖 <b>Как использовать бота:</b>\n\n` +
        `<b>1. Создание статьи из текста</b>\n` +
        `Просто отправь текст (1-2 предложения или полный текст).\n` +
        `AI создаст профессиональную статью.\n\n` +
        `<b>2. Парсинг статьи с URL</b>\n` +
        `Отправь ссылку на статью.\n` +
        `Бот спарсит и добавит в систему.\n\n` +
        `<b>3. Очередь запросов</b>\n` +
        `Если отправишь несколько запросов — они обработаются по очереди.\n\n` +
        `<b>Команды:</b>\n` +
        `/start - Начало работы\n` +
        `/queue - Посмотреть очередь\n` +
        `/status - Статус системы`
      );
      break;

    case '/queue':
      const queueService = getQueueService();
      const stats = queueService.getQueueStats();
      
      await sendTelegramMessage(
        chatId,
        `📊 <b>Статус очереди:</b>\n\n` +
        `📋 Всего заданий: ${stats.total}\n` +
        `⏳ В ожидании: ${stats.pending}\n` +
        `⚙️ Обрабатывается: ${stats.processing}\n` +
        `✅ Завершено: ${stats.completed}\n` +
        `❌ Ошибки: ${stats.failed}\n\n` +
        `${stats.isProcessing ? '🔄 Система работает' : '💤 Система ожидает'}`
      );
      break;

    case '/status':
      await sendTelegramMessage(
        chatId,
        `✅ <b>Система активна</b>\n\n` +
        `🤖 AI: GPT-4o\n` +
        `🎨 Изображения: DALL-E 3 + Unsplash\n` +
        `🌍 Языки: EN, PL\n` +
        `📊 Queue: Активна\n\n` +
        `Все системы работают нормально!`
      );
      break;

    default:
      await sendTelegramMessage(
        chatId,
        `❓ Неизвестная команда: ${command}\n\n` +
        `Используй /help для списка команд.`
      );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Monitor job and send updates
 */
async function monitorJob(jobId: string, chatId: number) {
  const queueService = getQueueService();
  const maxAttempts = 60; // 5 minutes (5s intervals)
  let attempts = 0;

  const checkJob = async () => {
    attempts++;
    const job = queueService.getJobStatus(jobId);

    if (!job) {
      await sendTelegramMessage(
        chatId,
        `❌ <b>Ошибка:</b> Задание ${jobId} не найдено.`
      );
      return;
    }

    if (job.status === 'completed') {
      // Success!
      const result = job.result;
      
      await sendTelegramMessage(
        chatId,
        `✅ <b>Готово!</b>\n\n` +
        `📝 Заголовок: ${result.title || 'N/A'}\n` +
        `💬 Слов: ${result.wordCount || 'N/A'}\n` +
        `⏱️ Время: ${Math.round((job.completedAt!.getTime() - job.startedAt!.getTime()) / 1000)}s\n\n` +
        `✨ Статья создана и готова к публикации!`
      );
      return;
    }

    if (job.status === 'failed') {
      // Failed
      await sendTelegramMessage(
        chatId,
        `❌ <b>Ошибка обработки</b>\n\n` +
        `Причина: ${job.error || 'Unknown'}\n\n` +
        `Попробуйте еще раз или обратитесь к администратору.`
      );
      return;
    }

    if (attempts >= maxAttempts) {
      // Timeout
      await sendTelegramMessage(
        chatId,
        `⏱️ <b>Таймаут</b>\n\n` +
        `Обработка занимает слишком много времени.\n` +
        `Проверьте статус позже с помощью /queue`
      );
      return;
    }

    // Still processing, check again
    setTimeout(checkJob, 5000); // Check every 5 seconds
  };

  // Start checking after 3 seconds
  setTimeout(checkJob, 3000);
}

// Health check
export async function GET() {
  return NextResponse.json({
    service: 'Telegram Bot Webhook',
    version: '1.0.0',
    status: 'active',
    features: {
      urlParsing: true,
      textGeneration: true,
      queueSystem: true,
      aiPowered: true
    }
  });
}

