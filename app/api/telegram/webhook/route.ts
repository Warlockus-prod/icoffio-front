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
import { getUserLanguage, setUserLanguage, loadUserLanguage, t, translations, type BotLanguage } from '@/lib/telegram-i18n';
import { telegramDB } from '@/lib/telegram-database-service';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// In-memory error log (will persist during runtime)
// In production, use database or file storage
let errorLog: Array<{
  jobId: string;
  chatId: number;
  errorType: string;
  error: string;
  timestamp: string;
  jobData: any;
}> = [];

/**
 * Log error for admin review
 */
async function logErrorForReview(errorData: {
  jobId: string;
  chatId: number;
  errorType: string;
  error: string;
  timestamp: string;
  jobData: any;
}): Promise<void> {
  errorLog.push(errorData);
  
  // Keep only last 100 errors
  if (errorLog.length > 100) {
    errorLog = errorLog.slice(-100);
  }
  
  console.error('[Telegram Bot Error]', {
    jobId: errorData.jobId,
    errorType: errorData.errorType,
    timestamp: errorData.timestamp
  });

  // Also send to error log API
  try {
    await fetch('/api/telegram/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  } catch (e) {
    console.error('Failed to log error to API:', e);
  }
}

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

    // Track user activity in database
    await telegramDB.trackUser({
      chat_id: chatId,
      username: message.from?.username,
      first_name: message.from?.first_name,
      last_name: message.from?.last_name,
      is_bot: message.from?.is_bot,
      language: getUserLanguage(chatId)
    });

    // Load user language from database (cache for this session)
    await loadUserLanguage(chatId);

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

      // Log usage to database
      await telegramDB.logUsage({
        chat_id: chatId,
        request_type: 'url-parse',
        request_data: { url, jobId },
        status: 'pending'
      });

      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'urlReceived')}\n\n` +
        `🔗 <code>${url}</code>\n\n` +
        `${t(chatId, 'addedToQueue')} <code>${jobId}</code>\n` +
        `${t(chatId, 'pleaseWait')}`
      );

      // Start async processing (fire-and-forget)
      fetch('https://app.icoffio.com/api/telegram/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, chatId }),
      }).catch(err => console.error('[Webhook] Failed to trigger processing:', err));

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

      // Log usage to database
      await telegramDB.logUsage({
        chat_id: chatId,
        request_type: 'text-generate',
        request_data: { text: text.substring(0, 200), title, jobId },
        status: 'pending'
      });

      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'textReceived')}\n\n` +
        `${t(chatId, 'title')} <i>${title}</i>\n\n` +
        `${t(chatId, 'addedToQueue')} <code>${jobId}</code>\n` +
        `${t(chatId, 'aiGenerating')}\n` +
        `${t(chatId, 'pleaseWait')}`
      );

      // Start async processing (fire-and-forget)
      fetch('https://app.icoffio.com/api/telegram/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, chatId }),
      }).catch(err => console.error('[Webhook] Failed to trigger processing:', err));
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

  // Log command usage
  await telegramDB.logUsage({
    chat_id: chatId,
    request_type: 'command',
    command: command,
    status: 'success'
  });

  switch (command) {
    case '/start':
      await sendTelegramMessage(chatId, t(chatId, 'start'));
      break;

    case '/help':
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'help')}\n\n${t(chatId, 'helpDetails')}`
      );
      break;

    case '/queue':
      const queueService = getQueueService();
      const stats = queueService.getQueueStats();
      
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'queueStatus')}\n\n` +
        `${t(chatId, 'totalJobs')} ${stats.total}\n` +
        `${t(chatId, 'pending')} ${stats.pending}\n` +
        `${t(chatId, 'processing')} ${stats.processing}\n` +
        `${t(chatId, 'completed')} ${stats.completed}\n` +
        `${t(chatId, 'errors')} ${stats.failed}\n\n` +
        `${stats.isProcessing ? t(chatId, 'systemWorking') : t(chatId, 'systemWaiting')}`
      );
      break;

    case '/status':
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'systemActive')}\n\n` +
        `${t(chatId, 'aiModel')}\n` +
        `${t(chatId, 'images')}\n` +
        `${t(chatId, 'languagesSupported')}\n` +
        `${t(chatId, 'queueActive')}\n\n` +
        `${t(chatId, 'allSystemsNormal')}`
      );
      break;

    case '/language':
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'language')}\n\n` +
        `${t(chatId, 'languagePrompt')}\n\n` +
        `Текущий: ${getUserLanguage(chatId).toUpperCase()}`
      );
      break;

    case '/lang_ru':
      setUserLanguage(chatId, 'ru');
      await telegramDB.updateUserLanguage(chatId, 'ru');
      await sendTelegramMessage(chatId, '✅ Язык изменен на Русский');
      break;

    case '/lang_pl':
      setUserLanguage(chatId, 'pl');
      await telegramDB.updateUserLanguage(chatId, 'pl');
      await sendTelegramMessage(chatId, '✅ Język zmieniony na Polski');
      break;

    case '/lang_en':
      setUserLanguage(chatId, 'en');
      await telegramDB.updateUserLanguage(chatId, 'en');
      await sendTelegramMessage(chatId, '✅ Language changed to English');
      break;

    default:
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'unknownCommand')}${command ? `: ${command}` : ''}\n\n` +
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
      const processingTime = Math.round((job.completedAt!.getTime() - job.startedAt!.getTime()) / 1000);
      
      // Check if article was published
      if (result.published && result.url) {
        // Published successfully
        await sendTelegramMessage(
          chatId,
          `✅ <b>ОПУБЛИКОВАНО!</b>\n\n` +
          `📝 <b>Заголовок:</b> ${result.title || 'N/A'}\n` +
          `💬 <b>Слов:</b> ${result.wordCount || 'N/A'}\n` +
          `🌍 <b>Язык:</b> ${result.publishResult?.language || 'en'}\n` +
          `⏱️ <b>Время:</b> ${processingTime}s\n\n` +
          `🔗 <b>URL:</b>\n${result.url}\n\n` +
          `✨ <b>Статус:</b> Опубликовано на сайте!`
        );
      } else {
        // Created but not published
        await sendTelegramMessage(
          chatId,
          `✅ <b>Создано (не опубликовано)</b>\n\n` +
          `📝 Заголовок: ${result.title || 'N/A'}\n` +
          `💬 Слов: ${result.wordCount || 'N/A'}\n` +
          `⏱️ Время: ${processingTime}s\n\n` +
          `⚠️ Статья создана, но не опубликована.\n` +
          `Проверьте настройки WordPress.`
        );
      }
      return;
    }

    if (job.status === 'failed') {
      // Failed - determine error type
      const error = job.error || 'Unknown error';
      let errorType = 'Неизвестная ошибка';
      let errorDetails = error;
      let suggestion = 'Попробуйте еще раз или обратитесь к администратору.';

      // Parse error type
      if (error.includes('generation failed') || error.includes('Text generation')) {
        errorType = '🤖 Ошибка генерации AI';
        errorDetails = 'AI не смог создать статью из вашего текста.';
        suggestion = 'Попробуйте:\n• Более подробный текст\n• Другую формулировку\n• Уменьшить объем запроса';
      } else if (error.includes('parsing failed') || error.includes('URL')) {
        errorType = '🔗 Ошибка парсинга URL';
        errorDetails = 'Не удалось извлечь контент с указанного URL.';
        suggestion = 'Проверьте:\n• URL доступен?\n• Сайт не блокирует парсинг?\n• Попробуйте другой URL';
      } else if (error.includes('Publication failed') || error.includes('WordPress')) {
        errorType = '📝 Ошибка публикации';
        errorDetails = 'Статья создана, но не опубликована в WordPress.';
        suggestion = 'Статья создана локально, но публикация не удалась.\nСвяжитесь с администратором для публикации.';
      } else if (error.includes('credentials') || error.includes('authentication')) {
        errorType = '🔐 Ошибка авторизации';
        errorDetails = 'Проблема с доступом к WordPress.';
        suggestion = 'Свяжитесь с администратором для проверки настроек.';
      }

      await sendTelegramMessage(
        chatId,
        `❌ <b>${errorType}</b>\n\n` +
        `📋 <b>Детали:</b>\n${errorDetails}\n\n` +
        `💡 <b>Что делать:</b>\n${suggestion}\n\n` +
        `🆔 <b>Job ID:</b> <code>${job.id}</code>\n` +
        `⏱️ <b>Попыток:</b> ${job.retryCount}/${job.maxRetries}`
      );

      // Log error for admin review
      await logErrorForReview({
        jobId: job.id,
        chatId,
        errorType,
        error,
        timestamp: new Date().toISOString(),
        jobData: job.data
      });

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

