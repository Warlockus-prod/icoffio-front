/**
 * TELEGRAM QUEUE PROCESSOR
 * 
 * Async endpoint for processing queue jobs
 * Called by webhook in fire-and-forget pattern
 * 
 * This runs independently and sends updates to Telegram when done
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueueService } from '@/lib/queue-service';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes (Pro tier only, but we set it anyway)

/**
 * Send message to Telegram
 */
async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!botToken) {
    console.error('[Process Queue] TELEGRAM_BOT_TOKEN not configured');
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

    if (!response.ok) {
      const error = await response.text();
      console.error('[Process Queue] Failed to send Telegram message:', error);
    }
  } catch (error: any) {
    console.error('[Process Queue] Error sending message:', error.message);
  }
}

/**
 * Process a single job and send result to Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const { jobId, chatId } = await request.json();

    if (!jobId || !chatId) {
      return NextResponse.json(
        { error: 'jobId and chatId are required' },
        { status: 400 }
      );
    }

    console.log(`[Process Queue] Starting processing for job: ${jobId}, chat: ${chatId}`);

    const queueService = getQueueService();
    const startTime = Date.now();

    // Wait for job to complete (with timeout)
    const maxWaitTime = 120000; // 2 minutes
    const checkInterval = 2000; // 2 seconds
    let totalWaited = 0;

    while (totalWaited < maxWaitTime) {
      const job = queueService.getJobStatus(jobId);

      if (!job) {
        console.error(`[Process Queue] Job not found: ${jobId}`);
        await sendTelegramMessage(
          chatId,
          `❌ <b>Ошибка</b>\n\nЗадание не найдено. Попробуйте снова.`
        );
        break;
      }

      if (job.status === 'completed') {
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        const result = job.result;

        console.log(`[Process Queue] Job completed: ${jobId}`, result);

        if (result.published && result.url) {
          // Format message based on published languages
          let message = `✅ <b>ОПУБЛИКОВАНО!</b>\n\n` +
            `📝 <b>Заголовок:</b> ${result.title || 'N/A'}\n` +
            `💬 <b>Слов:</b> ${result.wordCount || 'N/A'}\n` +
            `📁 <b>Категория:</b> ${result.category || 'Technology'}\n` +
            `🌍 <b>Языки:</b> ${result.languages?.join(', ').toUpperCase() || 'EN'}\n` +
            `⏱️ <b>Время:</b> ${processingTime}s\n\n`;

          // Add English URL
          message += `🇬🇧 <b>EN:</b>\n${result.url}\n\n`;

          // Add Polish URL if available
          if (result.urlPl) {
            message += `🇵🇱 <b>PL:</b>\n${result.urlPl}\n\n`;
          }

          message += `✨ <b>Статус:</b> Опубликовано на сайте!`;

          await sendTelegramMessage(chatId, message);
        } else {
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
        break;
      }

      if (job.status === 'failed') {
        console.error(`[Process Queue] Job failed: ${jobId}`, job.error);

        // Determine error type and send appropriate message
        const errorMessage = job.error?.toLowerCase() || '';
        
        if (errorMessage.includes('generation') || errorMessage.includes('openai')) {
          await sendTelegramMessage(
            chatId,
            `❌ <b>Ошибка AI генерации</b>\n\n` +
            `Не удалось создать контент статьи.\n` +
            `Причина: ${job.error || 'Unknown'}\n\n` +
            `Попробуйте снова или используйте другой запрос.`
          );
        } else if (errorMessage.includes('parsing') || errorMessage.includes('url')) {
          await sendTelegramMessage(
            chatId,
            `❌ <b>Ошибка парсинга URL</b>\n\n` +
            `Не удалось получить контент по ссылке.\n` +
            `Причина: ${job.error || 'Unknown'}\n\n` +
            `Убедитесь, что ссылка корректна и доступна.`
          );
        } else if (errorMessage.includes('publication') || errorMessage.includes('wordpress')) {
          await sendTelegramMessage(
            chatId,
            `❌ <b>Ошибка публикации</b>\n\n` +
            `Статья создана, но не опубликована.\n` +
            `Причина: ${job.error || 'Unknown'}\n\n` +
            `Свяжитесь с администратором.`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `❌ <b>Ошибка обработки</b>\n\n` +
            `${job.error || 'Неизвестная ошибка'}\n\n` +
            `Попробуйте снова позже.`
          );
        }
        break;
      }

      // Still processing
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      totalWaited += checkInterval;
    }

    // Timeout
    if (totalWaited >= maxWaitTime) {
      console.error(`[Process Queue] Job timeout: ${jobId}`);
      await sendTelegramMessage(
        chatId,
        `⏱️ <b>Timeout</b>\n\n` +
        `Обработка занимает слишком много времени.\n` +
        `Проверьте статус позже командой /queue`
      );
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('[Process Queue] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

