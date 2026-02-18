/**
 * TELEGRAM SIMPLE - NOTIFIER v2.1
 *
 * Sending messages and callback answers to Telegram.
 */

export interface InlineButton {
  text: string;
  callback_data: string;
}

export type TelegramReplyMarkup =
  | { inline_keyboard: InlineButton[][] }
  | { keyboard: { text: string }[][]; resize_keyboard?: boolean; is_persistent?: boolean };

/**
 * Send message to Telegram chat (supports inline keyboard + reply keyboard)
 */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown';
    disable_web_page_preview?: boolean;
    reply_markup?: TelegramReplyMarkup;
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
 * Edit an existing message (text + optional inline keyboard).
 * Falls back to sendMessage if editing fails (e.g. message too old).
 */
export async function editTelegramMessage(
  chatId: number,
  messageId: number,
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
    if (!token) return false;

    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: options?.parse_mode || 'HTML',
      disable_web_page_preview: options?.disable_web_page_preview ?? false,
    };

    if (options?.reply_markup) {
      body.reply_markup = options.reply_markup;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      // If message can't be edited (too old, deleted, etc.), send a new one
      if (error.includes('message is not modified') || error.includes('message to edit not found')) {
        return sendTelegramMessage(chatId, text, options);
      }
      console.error('[TelegramSimple] Failed to edit message:', error);
      return sendTelegramMessage(chatId, text, options);
    }

    return true;
  } catch (error) {
    console.error('[TelegramSimple] Error editing message:', error);
    return sendTelegramMessage(chatId, text, options);
  }
}

/**
 * Answer callback query to stop Telegram loading spinner
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;

    const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || undefined,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
