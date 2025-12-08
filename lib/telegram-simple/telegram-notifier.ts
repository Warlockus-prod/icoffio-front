/**
 * TELEGRAM SIMPLE - NOTIFIER
 * 
 * Отправка сообщений в Telegram
 */

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
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.error('[TelegramSimple] TELEGRAM_BOT_TOKEN not configured');
      return false;
    }

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

    if (!response.ok) {
      const error = await response.text();
      console.error('[TelegramSimple] Failed to send message:', error);
      return false;
    }

    console.log(`[TelegramSimple] ✅ Message sent to chat ${chatId}`);
    return true;

  } catch (error) {
    console.error('[TelegramSimple] Error sending message:', error);
    return false;
  }
}

