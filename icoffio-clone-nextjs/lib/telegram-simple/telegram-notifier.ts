/**
 * TELEGRAM SIMPLE - NOTIFIER v2.0
 * 
 * Отправка сообщений и inline-клавиатур в Telegram
 */

export interface InlineButton {
  text: string;
  callback_data: string;
}

/**
 * Send message to Telegram chat (with optional inline keyboard)
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown';
    disable_web_page_preview?: boolean;
    reply_markup?: {
      inline_keyboard: InlineButton[][];
    };
  }
): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('[TelegramSimple] TELEGRAM_BOT_TOKEN not configured');
      return false;
    }

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      disable_web_page_preview: options?.disable_web_page_preview ?? false,
    };

    if (options?.reply_markup) {
      body.reply_markup = options.reply_markup;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[TelegramSimple] Failed to send message:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[TelegramSimple] Error sending message:', error);
    return false;
  }
}

/**
 * Answer a callback query (dismiss "loading" indicator on button)
 */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || undefined,
      }),
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Edit an existing message (e.g. to remove inline keyboard after selection)
 */
export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown';
    reply_markup?: {
      inline_keyboard: InlineButton[][];
    };
  }
): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
    };

    if (options?.reply_markup) {
      body.reply_markup = options.reply_markup;
    }

    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return true;
  } catch {
    return false;
  }
}

