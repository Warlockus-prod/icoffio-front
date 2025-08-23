// app/api/telegram/route.ts - Telegram Webhook Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { 
  TelegramWebhook, 
  processArticleFromTelegram, 
  sendTelegramMessage, 
  formatArticleFromTelegram,
  getSiteStatistics,
  articleManagementKeyboard
} from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body: TelegramWebhook = await request.json();
    
    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message;
    const action = await processArticleFromTelegram(message);
    
    switch (action.action) {
      case 'create_article':
        await handleArticleCreation(action.chatId, action.content);
        break;
        
      case 'get_stats':
        await handleStatsRequest(action.chatId);
        break;
        
      default:
        await sendWelcomeMessage(action.chatId);
        break;
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleArticleCreation(chatId: number, content: string) {
  const article = formatArticleFromTelegram(content);
  
  // Send confirmation
  await sendTelegramMessage(
    chatId,
    `📝 <b>Статья подготовлена к публикации!</b>

<b>Заголовок:</b> ${article.title}
<b>Категория:</b> ${article.category}
<b>Превью:</b> ${article.excerpt}

Статья будет опубликована на всех 5 языках сайта:
🌐 <a href="http://77.55.211.1:8001">icoffio.com</a>

<i>В будущем добавим автоматическую публикацию в WordPress!</i>`,
    articleManagementKeyboard
  );
  
  // TODO: Integrate with WordPress API to actually create the post
  console.log('Article to be created:', article);
}

async function handleStatsRequest(chatId: number) {
  const stats = await getSiteStatistics();
  
  await sendTelegramMessage(
    chatId,
    `📊 <b>Статистика сайта icoffio.com</b>

🌐 <b>Статус:</b> ${stats.status}
📰 <b>Всего статей:</b> ${stats.total_articles}
🗣️ <b>Языков:</b> ${stats.languages} (EN, PL, DE, RO, CS)
📂 <b>Категорий:</b> ${stats.categories}
🔄 <b>Последнее обновление:</b> ${new Date(stats.last_update).toLocaleString('ru')}

<b>Ссылки:</b>
🇺🇸 <a href="http://77.55.211.1:8001/en">English</a>
🇵🇱 <a href="http://77.55.211.1:8001/pl">Polski</a> 
🇩🇪 <a href="http://77.55.211.1:8001/de">Deutsch</a>
🇷🇴 <a href="http://77.55.211.1:8001/ro">Română</a>
🇨🇿 <a href="http://77.55.211.1:8001/cs">Čeština</a>

<i>Сайт работает стабильно! 🚀</i>`,
    articleManagementKeyboard
  );
}

async function sendWelcomeMessage(chatId: number) {
  await sendTelegramMessage(
    chatId,
    `🤖 <b>Добро пожаловать в ICOFFIO BOT!</b>

Я помогу вам управлять многоязычным новостным сайтом:
🌐 <a href="http://77.55.211.1:8001">icoffio.com</a>

<b>Доступные команды:</b>

📝 <b>Создать статью:</b>
<code>/create_article Заголовок статьи
Содержание статьи...</code>

📊 <b>Статистика:</b>
<code>/stats</code>

<b>Быстрые действия:</b>`,
    articleManagementKeyboard
  );
}

// GET endpoint for webhook verification (if needed)
export async function GET() {
  return NextResponse.json({ 
    status: 'Telegram webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
}
