// lib/telegram.ts - Telegram Bot Integration
import { NextResponse } from 'next/server';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    first_name: string;
    username?: string;
    type: string;
  };
  date: number;
  text?: string;
}

export interface TelegramWebhook {
  update_id: number;
  message?: TelegramMessage;
}

// Send message to Telegram
export async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      console.error('Telegram API error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return null;
  }
}

// Process article creation from Telegram
export async function processArticleFromTelegram(message: TelegramMessage) {
  const text = message.text || '';
  
  // Check if it's an article creation command
  if (text.startsWith('/create_article') || text.includes('новая статья')) {
    return {
      action: 'create_article' as const,
      content: text,
      userId: message.from.id,
      chatId: message.chat.id
    };
  }
  
  // Check for site information requests
  if (text.includes('статистика') || text.includes('/stats')) {
    return {
      action: 'get_stats' as const,
      content: text,
      userId: message.from.id,
      chatId: message.chat.id
    };
  }
  
  return {
    action: 'unknown' as const,
    content: text,
    userId: message.from.id,
    chatId: message.chat.id
  };
}

// Format article for WordPress from Telegram message
export function formatArticleFromTelegram(content: string) {
  // Extract title (first line or after "Заголовок:")
  const lines = content.split('\n');
  let title = lines[0].replace('/create_article', '').trim();
  
  if (content.includes('Заголовок:')) {
    const titleMatch = content.match(/Заголовок:\s*(.+)/i);
    if (titleMatch) title = titleMatch[1].trim();
  }
  
  // Extract category
  let category = 'news-2'; // default
  if (content.toLowerCase().includes('ai') || content.toLowerCase().includes('ии')) {
    category = 'ai';
  } else if (content.toLowerCase().includes('apple')) {
    category = 'apple';
  } else if (content.toLowerCase().includes('игры') || content.toLowerCase().includes('games')) {
    category = 'games';
  } else if (content.toLowerCase().includes('техника') || content.toLowerCase().includes('tech')) {
    category = 'tech';
  } else if (content.toLowerCase().includes('digital')) {
    category = 'digital';
  }
  
  // Extract content (everything after title/commands)
  let articleContent = content
    .replace(/^\/create_article/i, '')
    .replace(/Заголовок:\s*.+/i, '')
    .replace(/Категория:\s*.+/i, '')
    .trim();
  
  if (articleContent.length < 50) {
    articleContent = `${title}\n\nСтатья автоматически создана через Telegram бот. Требует дополнительного редактирования.`;
  }
  
  return {
    title: title || 'Новая статья из Telegram',
    category,
    content: articleContent,
    excerpt: articleContent.substring(0, 160) + '...',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'
  };
}

// Get site statistics
export async function getSiteStatistics() {
  // This would integrate with your WordPress API or analytics
  return {
    total_articles: 30,
    languages: 5,
    categories: 6,
    last_update: new Date().toISOString(),
    status: '🟢 Online',
    uptime: 'Active'
  };
}

// Telegram inline keyboard for article management
export const articleManagementKeyboard = {
  inline_keyboard: [
    [
      { text: '📝 Создать статью', callback_data: 'create_article' },
      { text: '📊 Статистика', callback_data: 'get_stats' }
    ],
    [
      { text: '🔄 Обновить сайт', callback_data: 'update_site' },
      { text: '📱 Проверить сайт', callback_data: 'check_site' }
    ]
  ]
};
