/**
 * TELEGRAM QUEUE PROCESSOR
 * 
 * Async endpoint for processing queue jobs
 * Called by webhook in fire-and-forget pattern
 * 
 * This runs independently and sends updates to Telegram when done
 */

import { NextRequest, NextResponse } from 'next/server';
import { t, translations, getUserLanguage } from '@/lib/telegram-i18n';
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
          `${t(chatId, 'error')}\n\n${t(chatId, 'jobNotFound')}`
        );
        break;
      }

      if (job.status === 'completed') {
        const processingTime = Math.round((Date.now() - startTime) / 1000);
        const result = job.result;

        console.log(`[Process Queue] Job completed: ${jobId}`, result);

        if (result.published && result.url) {
          // Format message based on published languages
          let message = `${t(chatId, 'published')}\n\n` +
            `${t(chatId, 'title')} ${result.title || 'N/A'}\n` +
            `${t(chatId, 'words')} ${result.wordCount || 'N/A'}\n` +
            `${t(chatId, 'category')} ${result.category || 'Technology'}\n` +
            `${t(chatId, 'languages')} ${result.languages?.join(', ').toUpperCase() || 'EN'}\n` +
            `${t(chatId, 'time')} ${processingTime}s\n\n`;

          // Add English URL
          message += `🇬🇧 <b>EN:</b>\n${result.url}\n\n`;

          // Add Polish URL if available
          if (result.urlPl) {
            message += `🇵🇱 <b>PL:</b>\n${result.urlPl}\n\n`;
          }

          message += `${t(chatId, 'statusPublished')}`;

          await sendTelegramMessage(chatId, message);
        } else {
          await sendTelegramMessage(
            chatId,
            `${t(chatId, 'createdNotPublished')}\n\n` +
            `${t(chatId, 'title')} ${result.title || 'N/A'}\n` +
            `${t(chatId, 'words')} ${result.wordCount || 'N/A'}\n` +
            `${t(chatId, 'time')} ${processingTime}s\n\n` +
            `⚠️ Статья создана, но не опубликована.\n` +
            `${t(chatId, 'checkSettings')}`
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
            `${t(chatId, 'errorAiGeneration')}\n\n${t(chatId, 'error')}: ${job.error || 'Unknown'}`
          );
        } else if (errorMessage.includes('parsing') || errorMessage.includes('url')) {
          await sendTelegramMessage(
            chatId,
            `${t(chatId, 'errorUrlParsing')}\n\n${t(chatId, 'error')}: ${job.error || 'Unknown'}`
          );
        } else if (errorMessage.includes('publication') || errorMessage.includes('wordpress')) {
          await sendTelegramMessage(
            chatId,
            `${t(chatId, 'errorPublication')}\n\n${t(chatId, 'error')}: ${job.error || 'Unknown'}`
          );
        } else {
          await sendTelegramMessage(
            chatId,
            `${t(chatId, 'errorProcessing')}\n\n${t(chatId, 'error')}: ${job.error || 'Unknown'}`
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
        `${t(chatId, 'timeout')}\n\n${t(chatId, 'checkLater')}`
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

