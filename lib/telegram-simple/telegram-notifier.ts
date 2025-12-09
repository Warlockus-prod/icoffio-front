/**
 * TELEGRAM SIMPLE - NOTIFIER
 * 
 * Отправка сообщений в Telegram
 * ✅ v8.7.5: Full logging integration
 */

import { systemLogger } from '@/lib/system-logger';

/**
 * Send message to Telegram chat
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown';
    disable_web_page_preview?: boolean;
    reply_markup?: any; // Telegram inline keyboard markup
  }
): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      await systemLogger.error('telegram', 'send_message', 'TELEGRAM_BOT_TOKEN not configured', {
        chatId,
        messageLength: text.length,
      });
      return false;
    }

    await systemLogger.debug('telegram', 'send_message', 'Sending Telegram message', {
      chatId,
      messageLength: text.length,
      hasReplyMarkup: !!options?.reply_markup,
    });

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode || 'HTML',
        disable_web_page_preview: options?.disable_web_page_preview || false,
        ...(options?.reply_markup && { reply_markup: options.reply_markup }),
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const error = await response.text();
      await systemLogger.error('telegram', 'send_message', 'Failed to send Telegram message', {
        chatId,
        status: response.status,
        statusText: response.statusText,
        error: error.substring(0, 200),
        duration_ms: duration,
      });
      return false;
    }

    const responseData = await response.json();
    
    await systemLogger.info('telegram', 'send_message', 'Telegram message sent successfully', {
      chatId,
      messageId: responseData.result?.message_id,
      duration_ms: duration,
      messageLength: text.length,
    });

    return true;

  } catch (error: any) {
    const duration = Date.now() - startTime;
    await systemLogger.error('telegram', 'send_message', 'Exception sending Telegram message', {
      chatId,
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
    });
    return false;
  }
}

