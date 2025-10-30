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
import { createTelegramSubmission } from '@/lib/supabase-analytics';
import {
  startComposeSession,
  addToComposeSession,
  getComposedText,
  isInComposeMode,
  endComposeSession,
  cancelComposeSession,
  getComposeStats,
  startDeleteMode,
  endDeleteMode,
  isInDeleteMode,
  wasRecentlyProcessed,
  markAsProcessed,
} from '@/lib/telegram-compose-state';

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
async function sendTelegramMessage(chatId: number, text: string, keyboard?: any): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (keyboard) {
      body.reply_markup = keyboard;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
}

/**
 * Send message with inline buttons
 */
async function sendMessageWithButtons(
  chatId: number,
  text: string,
  buttons: Array<{ text: string; callback_data: string }>
): Promise<void> {
  const keyboard = {
    inline_keyboard: [buttons.map(btn => ({
      text: btn.text,
      callback_data: btn.callback_data,
    }))],
  };

  await sendTelegramMessage(chatId, text, keyboard);
}

/**
 * Handle callback query from inline buttons
 */
async function handleCallbackQuery(callbackQuery: any): Promise<NextResponse> {
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data;
  const callbackId = callbackQuery.id;

  if (!chatId || !data) {
    return NextResponse.json({ ok: true });
  }

  // Load user language
  await loadUserLanguage(chatId);

  const token = process.env.TELEGRAM_BOT_TOKEN;

  // Answer callback query (remove loading state)
  if (token) {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId }),
    });
  }

  // Handle button actions
  if (data === 'add_more') {
    // User wants to add more text
    const stats = getComposeStats(chatId);
    if (stats) {
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'composeInfo')}\n` +
        `${t(chatId, 'composeStats').replace('{count}', stats.messageCount.toString()).replace('{length}', stats.totalLength.toString()).replace('{duration}', stats.duration.toString())}\n\n` +
        `📝 Продолжай отправлять текст...`
      );
    }
  } else if (data === 'publish_now') {
    // User wants to publish
    if (!isInComposeMode(chatId)) {
      await sendTelegramMessage(chatId, t(chatId, 'notInComposeMode'));
      return NextResponse.json({ ok: true });
    }

    const composedText = endComposeSession(chatId);
    if (!composedText) {
      await sendTelegramMessage(chatId, t(chatId, 'composeEmpty'));
      return NextResponse.json({ ok: true });
    }

    // Send to queue for processing
    await sendTelegramMessage(chatId, t(chatId, 'publish'));
    
    // Create Supabase submission first
    const publishSubmissionId = await createTelegramSubmission({
      user_id: chatId,
      submission_type: 'text',
      submission_content: composedText,
      status: 'processing',
    });
    
    const queueService = getQueueService();
    
    const publishJobId = await queueService.addJob({
      type: 'text-generate',
      data: { 
        text: composedText,
        chatId,
        submissionId: publishSubmissionId || undefined, // Add submissionId for tracking
      },
      max_retries: 3,
    });

    // Start async processing
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/process-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: publishJobId, chatId }),
    }).catch(console.error);

    // Start monitoring job for updates
    monitorJob(publishJobId, chatId);

    await sendTelegramMessage(
      chatId,
      `${t(chatId, 'addedToQueue')} ${publishJobId}\n` +
      `${t(chatId, 'aiGenerating')}\n` +
      `${t(chatId, 'pleaseWait')}`
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Handle message in compose mode
 */
async function handleComposeMessage(chatId: number, text: string, message: any): Promise<NextResponse> {
  // Add message to compose session
  addToComposeSession(chatId, text);

  // Get current stats
  const stats = getComposeStats(chatId);
  if (!stats) {
    return NextResponse.json({ ok: true });
  }

  // Send confirmation with inline buttons
  await sendMessageWithButtons(
    chatId,
    `${t(chatId, 'composeInfo')}\n` +
    `${t(chatId, 'composeStats').replace('{count}', stats.messageCount.toString()).replace('{length}', stats.totalLength.toString()).replace('{duration}', stats.duration.toString())}\n\n` +
    `Что дальше?`,
    [
      { text: t(chatId, 'btnAddMore'), callback_data: 'add_more' },
      { text: t(chatId, 'btnPublishNow'), callback_data: 'publish_now' },
    ]
  );

  return NextResponse.json({ ok: true });
}

/**
 * Handle delete article by URL
 */
async function handleDeleteArticle(chatId: number, url: string): Promise<void> {
  try {
    // Parse article URL
    // Format: https://app.icoffio.com/en/article/slug-en
    const urlPattern = /https:\/\/app\.icoffio\.com\/(en|pl)\/article\/([a-z0-9-]+)/i;
    const match = url.match(urlPattern);

    if (!match) {
      await sendTelegramMessage(chatId, t(chatId, 'invalidArticleUrl'));
      return;
    }

    const locale = match[1] as 'en' | 'pl';
    const slug = match[2];

    // Call delete API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/delete-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, locale }),
    });

    const result = await response.json();

    if (result.success) {
      await sendTelegramMessage(
        chatId,
        t(chatId, 'deleteSuccess')
          .replace('{slug}', slug)
          .replace('{lang}', locale.toUpperCase())
      );
    } else {
      await sendTelegramMessage(
        chatId,
        t(chatId, 'deleteError').replace('{error}', result.error || 'Unknown error')
      );
    }
  } catch (error: any) {
    await sendTelegramMessage(
      chatId,
      t(chatId, 'deleteError').replace('{error}', error.message || 'Unknown error')
    );
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
    
    // Handle callback_query (inline button presses)
    if (body.callback_query) {
      return await handleCallbackQuery(body.callback_query);
    }
    
    // Extract message - IGNORE edited_message to prevent duplicate processing
    const message = body.message; // Only process new messages, not edits
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

    // Check if in compose mode
    if (isInComposeMode(chatId)) {
      return await handleComposeMessage(chatId, text, message);
    }

    // Check if in delete mode
    if (isInDeleteMode(chatId)) {
      // Check if this delete request was recently processed (prevent duplicates)
      if (wasRecentlyProcessed(chatId, text)) {
        console.log(`[Webhook] Ignoring duplicate delete request for chat ${chatId}`);
        return NextResponse.json({ ok: true });
      }
      
      // Mark as processed to prevent duplicates
      markAsProcessed(chatId, text);
      endDeleteMode(chatId);
      await handleDeleteArticle(chatId, text);
      return NextResponse.json({ ok: true });
    }

    // Detect URL or text
    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    const isUrl = !!urlMatch;

    const queueService = getQueueService();

    if (isUrl) {
      // URL parsing job
      const url = urlMatch[0];
      
      // Create submission in Supabase first
      const submissionId = await createTelegramSubmission({
        user_id: chatId,
        submission_type: 'url',
        submission_content: url,
        status: 'processing',
      });
      
      const jobId = await queueService.addJob({
        type: 'url-parse',
        data: {
          url,
          chatId,
          messageId: message.message_id,
          submissionId: submissionId || undefined, // Include submissionId for tracking
        },
        max_retries: 2,
      });

      // Log usage to database
      await telegramDB.logUsage({
        chat_id: chatId,
        request_type: 'url-parse',
        request_data: { url, jobId, submissionId },
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
      
      // Create submission in Supabase first
      const submissionId = await createTelegramSubmission({
        user_id: chatId,
        submission_type: 'text',
        submission_content: text,
        status: 'processing',
      });
      
      const jobId = await queueService.addJob({
        type: 'text-generate',
        data: {
          text,
          title,
          category: 'Technology',
          language: 'en',
          chatId,
          messageId: message.message_id,
          submissionId: submissionId || undefined, // Include submissionId for tracking
        },
        max_retries: 2,
      });

      // Log usage to database
      await telegramDB.logUsage({
        chat_id: chatId,
        request_type: 'text-generate',
        request_data: { text: text.substring(0, 200), title, jobId, submissionId },
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
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/process-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, chatId }),
      }).catch(err => console.error('[Webhook] Failed to trigger text-generate processing:', err));
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
      await sendTelegramMessage(
        chatId, 
        t(chatId, 'start')
      );
      break;

    case '/help':
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'help')}\n\n${t(chatId, 'helpDetails')}`
      );
      break;

    case '/queue':
      const queueService = getQueueService();
      const stats = await queueService.getQueueStats();
      
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'queueStatus')}\n\n` +
        `${t(chatId, 'totalJobs')} ${stats.total}\n` +
        `${t(chatId, 'pending')} ${stats.pending}\n` +
        `${t(chatId, 'processing')} ${stats.processing}\n` +
        `${t(chatId, 'completed')} ${stats.completed}\n` +
        `${t(chatId, 'errors')} ${stats.failed}\n\n` +
        `${stats.processing > 0 ? t(chatId, 'systemWorking') : t(chatId, 'systemWaiting')}`
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

    case '/compose':
      // Start compose mode
      startComposeSession(chatId, getUserLanguage(chatId));
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'compose')}\n\n${t(chatId, 'composeStarted')}`
      );
      break;

    case '/publish': {
      // Publish composed article
      if (!isInComposeMode(chatId)) {
        await sendTelegramMessage(chatId, t(chatId, 'notInComposeMode'));
        break;
      }

      const composedText = endComposeSession(chatId);
      if (!composedText) {
        await sendTelegramMessage(chatId, t(chatId, 'composeEmpty'));
        break;
      }

      // Send to queue for processing
      await sendTelegramMessage(chatId, t(chatId, 'publish'));
      
      // Create Supabase submission first
      const publishSubmissionId = await createTelegramSubmission({
        user_id: chatId,
        submission_type: 'text',
        submission_content: composedText,
        status: 'processing',
      });
      
      // Process as text-generate job
      const publishQueueService = getQueueService();
      
      const publishJobId = await publishQueueService.addJob({
        type: 'text-generate',
        data: { 
        text: composedText,
        chatId,
        submissionId: publishSubmissionId || undefined, // Add submissionId for tracking
      },
      max_retries: 3,
      });

      // Start async processing
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/telegram/process-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: publishJobId, chatId }),
      }).catch(console.error);

      // Start monitoring job for updates
      monitorJob(publishJobId, chatId);

      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'addedToQueue')} ${publishJobId}\n` +
        `${t(chatId, 'aiGenerating')}\n` +
        `${t(chatId, 'pleaseWait')}`
      );
      break;
    }

    case '/cancel':
      // Cancel compose mode
      if (!isInComposeMode(chatId)) {
        await sendTelegramMessage(chatId, t(chatId, 'notInComposeMode'));
        break;
      }

      cancelComposeSession(chatId);
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'cancel')}\n\n${t(chatId, 'composeCancelled')}`
      );
      break;

    case '/delete':
      // Start delete mode
      startDeleteMode(chatId);
      await sendTelegramMessage(
        chatId,
        `${t(chatId, 'deleteCommand')}\n\n${t(chatId, 'deletePrompt')}`
      );
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

  console.log(`[MonitorJob] Starting monitoring for job: ${jobId}, chatId: ${chatId}`);

  const checkJob = async () => {
    attempts++;
    console.log(`[MonitorJob] Attempt ${attempts}/${maxAttempts} for job: ${jobId}`);
    
    const job = await queueService.getJobStatus(jobId);

    if (!job) {
      console.error(`[MonitorJob] Job not found: ${jobId}`);
      await sendTelegramMessage(
        chatId,
        `❌ <b>Ошибка:</b> Задание ${jobId} не найдено.`
      );
      return;
    }

    console.log(`[MonitorJob] Job ${jobId} status: ${job.status}`);

    if (job.status === 'completed') {
      console.log(`[MonitorJob] Job ${jobId} completed! Sending notification...`);
      // Success!
      const result = job.result;
      const startedAt = job.started_at ? new Date(job.started_at) : new Date();
      const completedAt = job.completed_at ? new Date(job.completed_at) : new Date();
      const processingTime = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);
      
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
      console.error(`[MonitorJob] Job ${jobId} FAILED! Error: ${job.error}`);
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
        `⏱️ <b>Попыток:</b> ${job.retries}/${job.max_retries}`
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
      console.error(`[MonitorJob] TIMEOUT for job ${jobId} after ${maxAttempts} attempts`);
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
    console.log(`[MonitorJob] Job ${jobId} still ${job.status}, will retry in 5s (attempt ${attempts}/${maxAttempts})`);
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

