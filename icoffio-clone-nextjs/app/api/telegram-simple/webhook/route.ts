/**
 * TELEGRAM SIMPLE - WEBHOOK v2.0
 * 
 * Features:
 * - Inline keyboard for category selection
 * - Preview before publishing  
 * - /my_articles command
 * - /start, /help, /settings commands
 * 
 * @version 2.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage, answerCallbackQuery, editTelegramMessage } from '@/lib/telegram-simple/telegram-notifier';
import { parseUrl } from '@/lib/telegram-simple/url-parser';
import { processText } from '@/lib/telegram-simple/content-processor';
import { publishArticle } from '@/lib/telegram-simple/publisher';
import { loadTelegramSettings } from '@/lib/telegram-simple/settings-loader';
import { setPendingArticle, getPendingArticle, removePendingArticle, updatePendingCategory } from '@/lib/telegram-simple/pending-articles';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CATEGORIES = [
  { slug: 'ai', label: '🤖 AI', name: 'Artificial Intelligence' },
  { slug: 'apple', label: '🍎 Apple', name: 'Apple' },
  { slug: 'games', label: '🎮 Games', name: 'Games' },
  { slug: 'tech', label: '⚡ Tech', name: 'Technology' },
];

// ========================================
// MAIN WEBHOOK HANDLER
// ========================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let extractedChatId: number | null = null;

  try {
    const update = await request.json();

    // --- Handle callback queries (inline button presses) ---
    if (update.callback_query) {
      return handleCallbackQuery(update.callback_query, startTime);
    }

    // --- Handle text messages ---
    const message = update.message || update.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true, message: 'No message' });
    }

    const chatId: number = message.chat.id;
    extractedChatId = chatId;
    const text = message.text?.trim() || '';

    if (!text) {
      return NextResponse.json({ ok: true, message: 'Empty message' });
    }

    // --- Commands ---
    if (text.startsWith('/')) {
      return handleCommand(text.toLowerCase(), chatId);
    }

    // --- Validate text length ---
    if (text.length < 100 && !isUrl(text)) {
      await sendTelegramMessage(
        chatId,
        `📝 <b>Текст слишком короткий</b>\n\n` +
        `Минимум: 100 символов\nУ вас: ${text.length}\n\n` +
        `Или отправьте URL статьи для парсинга.`
      );
      return NextResponse.json({ ok: true });
    }

    // --- Process content ---
    const settings = await loadTelegramSettings(chatId);

    await sendTelegramMessage(chatId,
      `⏳ <b>Обрабатываю${isUrl(text) ? ' URL' : ' текст'}...</b>\n` +
      `Стиль: ${getStyleLabel(settings.contentStyle)}`
    );

    let article;
    if (isUrl(text)) {
      const parsed = await parseUrl(text);
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
    } else {
      article = await processText(text, undefined, settings.contentStyle);
    }

    // --- Store pending article and show category selection ---
    setPendingArticle(chatId, {
      article,
      isUrl: isUrl(text),
      originalText: text,
    });

    const processingTime = Math.round((Date.now() - startTime) / 1000);

    await sendTelegramMessage(
      chatId,
      `📝 <b>Статья готова!</b>\n\n` +
      `<b>Заголовок:</b> ${article.title}\n` +
      `<b>Слов:</b> ${article.wordCount}\n` +
      `<b>Категория:</b> ${article.category}\n` +
      `⏱ Обработка: ${processingTime}s\n\n` +
      `<b>Выберите категорию:</b>`,
      {
        reply_markup: {
          inline_keyboard: [
            CATEGORIES.map(c => ({ text: c.label, callback_data: `cat:${c.slug}` })),
            [
              { text: '✅ Опубликовать (авто)', callback_data: 'publish:auto' },
              { text: '❌ Отмена', callback_data: 'publish:cancel' },
            ],
          ],
        },
      }
    );

    return NextResponse.json({ ok: true });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    console.error('[TelegramSimple] ❌ ERROR:', err.message);
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (extractedChatId) {
      try {
        await sendTelegramMessage(extractedChatId,
          `❌ <b>Ошибка обработки</b>\n\n📋 ${err.message}\n⏱ ${duration}s\n\nПопробуйте ещё раз.`
        );
      } catch { /* ignore notification error */ }
    }

    return NextResponse.json({ ok: false, error: err.message, duration }, { status: 500 });
  }
}

// ========================================
// CALLBACK QUERY HANDLER (inline buttons)
// ========================================

async function handleCallbackQuery(
  callbackQuery: { id: string; from: { id: number }; message?: { chat: { id: number }; message_id: number }; data?: string },
  startTime: number
) {
  const chatId = callbackQuery.message?.chat.id || callbackQuery.from.id;
  const messageId = callbackQuery.message?.message_id || 0;
  const data = callbackQuery.data || '';

  await answerCallbackQuery(callbackQuery.id);

  // --- Category selection ---
  if (data.startsWith('cat:')) {
    const categorySlug = data.replace('cat:', '');
    const category = CATEGORIES.find(c => c.slug === categorySlug);
    if (!category) return NextResponse.json({ ok: true });

    const pending = getPendingArticle(chatId);
    if (!pending) {
      await editTelegramMessage(chatId, messageId, '⏰ Сессия истекла. Отправьте текст заново.');
      return NextResponse.json({ ok: true });
    }

    updatePendingCategory(chatId, categorySlug);

    await editTelegramMessage(
      chatId, messageId,
      `📝 <b>${pending.article.title}</b>\n\n` +
      `📁 Категория: <b>${category.name}</b>\n` +
      `📊 Слов: ${pending.article.wordCount}\n\n` +
      `<b>Опубликовать?</b>`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Опубликовать', callback_data: 'publish:yes' },
              { text: '📝 Черновик', callback_data: 'publish:draft' },
            ],
            [{ text: '❌ Отмена', callback_data: 'publish:cancel' }],
          ],
        },
      }
    );

    return NextResponse.json({ ok: true });
  }

  // --- Publish with auto-detected category ---
  if (data === 'publish:auto') {
    return doPublish(chatId, messageId, true, startTime);
  }

  // --- Publish confirmed ---
  if (data === 'publish:yes') {
    return doPublish(chatId, messageId, true, startTime);
  }

  // --- Save as draft ---
  if (data === 'publish:draft') {
    return doPublish(chatId, messageId, false, startTime);
  }

  // --- Cancel ---
  if (data === 'publish:cancel') {
    removePendingArticle(chatId);
    await editTelegramMessage(chatId, messageId, '❌ Публикация отменена.');
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// ========================================
// PUBLISH LOGIC
// ========================================

async function doPublish(chatId: number, messageId: number, autoPublish: boolean, startTime: number) {
  const pending = getPendingArticle(chatId);
  if (!pending) {
    await editTelegramMessage(chatId, messageId, '⏰ Сессия истекла. Отправьте текст заново.');
    return NextResponse.json({ ok: true });
  }

  await editTelegramMessage(chatId, messageId, '⏳ <b>Публикую...</b>');

  try {
    const settings = await loadTelegramSettings(chatId);

    const result = await publishArticle(
      pending.article,
      chatId,
      autoPublish,
      {
        imagesCount: settings.imagesCount,
        imagesSource: settings.imagesSource,
      }
    );

    removePendingArticle(chatId);

    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    const status = autoPublish ? '✅ ОПУБЛИКОВАНО' : '📝 ЧЕРНОВИК';

    await editTelegramMessage(
      chatId, messageId,
      `${autoPublish ? '✅' : '📝'} <b>${status}!</b>\n\n` +
      `📝 <b>${pending.article.title}</b>\n` +
      `📁 ${pending.article.category} • ${pending.article.wordCount} слов • ${duration}s\n\n` +
      `🇬🇧 <b>EN:</b> ${result.en.url}\n` +
      `🇵🇱 <b>PL:</b> ${result.pl.url}\n\n` +
      `${autoPublish ? '✨ Статья на сайте!' : '💡 Опубликуйте через админку.'}`
    );

    return NextResponse.json({ ok: true, result });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    removePendingArticle(chatId);
    await editTelegramMessage(chatId, messageId, `❌ Ошибка: ${err.message}`);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// ========================================
// COMMAND HANDLERS
// ========================================

async function handleCommand(command: string, chatId: number) {
  if (command === '/start') {
    await sendTelegramMessage(
      chatId,
      `🤖 <b>icoffio Bot v2.0</b>\n\n` +
      `📝 <b>Что я умею:</b>\n` +
      `• Создавать статьи из текста или URL\n` +
      `• Выбор категории перед публикацией\n` +
      `• Предпросмотр перед отправкой\n` +
      `• Публикация на EN + PL 🇬🇧🇵🇱\n\n` +
      `💡 <b>Просто отправь:</b>\n` +
      `• URL статьи\n` +
      `• Текст (100+ символов)\n\n` +
      `⚙️ <b>Команды:</b>\n` +
      `/my_articles — Ваши статьи\n` +
      `/settings — Настройки\n` +
      `/help — Справка`
    );
    return NextResponse.json({ ok: true });
  }

  if (command === '/help') {
    await sendTelegramMessage(
      chatId,
      `📚 <b>Справка icoffio Bot</b>\n\n` +
      `<b>Как это работает:</b>\n` +
      `1. Отправьте URL или текст\n` +
      `2. Бот обработает контент (~15-25 сек)\n` +
      `3. Выберите категорию кнопками\n` +
      `4. Подтвердите публикацию\n\n` +
      `<b>Команды:</b>\n` +
      `/my_articles — Последние 5 статей\n` +
      `/settings — Текущие настройки\n` +
      `/help — Эта справка`
    );
    return NextResponse.json({ ok: true });
  }

  if (command === '/settings') {
    const settings = await loadTelegramSettings(chatId);
    await sendTelegramMessage(
      chatId,
      `⚙️ <b>Настройки</b>\n\n` +
      `📝 Стиль: ${getStyleLabel(settings.contentStyle)}\n` +
      `🖼️ Картинок: ${settings.imagesCount}\n` +
      `📸 Источник: ${settings.imagesSource === 'unsplash' ? 'Unsplash' : settings.imagesSource === 'ai' ? 'AI' : 'Нет'}\n` +
      `${settings.autoPublish ? '✅' : '📝'} Публикация: ${settings.autoPublish ? 'Авто' : 'Черновик'}\n\n` +
      `💡 Изменить: <a href="https://app.icoffio.com/en/admin">Админ панель → Telegram</a>`
    );
    return NextResponse.json({ ok: true });
  }

  if (command === '/my_articles') {
    return handleMyArticles(chatId);
  }

  await sendTelegramMessage(chatId, '❓ Неизвестная команда. /help для справки.');
  return NextResponse.json({ ok: true });
}

// ========================================
// /my_articles — LAST 5 ARTICLES
// ========================================

async function handleMyArticles(chatId: number) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      await sendTelegramMessage(chatId, '⚠️ База данных не настроена.');
      return NextResponse.json({ ok: true });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('published_articles')
      .select('title, slug_en, url_en, url_pl, published, created_at, category')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      await sendTelegramMessage(chatId, '📭 У вас пока нет статей.\n\nОтправьте текст или URL чтобы создать первую!');
      return NextResponse.json({ ok: true });
    }

    const lines = data.map((a, i) => {
      const status = a.published ? '✅' : '📝';
      const date = new Date(a.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      return `${i + 1}. ${status} <b>${a.title}</b>\n   📁 ${a.category} • ${date}\n   🇬🇧 ${a.url_en}`;
    });

    await sendTelegramMessage(
      chatId,
      `📚 <b>Ваши последние статьи (${data.length}):</b>\n\n` +
      lines.join('\n\n'),
      { disable_web_page_preview: true } as any
    );

  } catch (err) {
    console.error('[TelegramSimple] /my_articles error:', err);
    await sendTelegramMessage(chatId, '❌ Ошибка загрузки статей. Попробуйте позже.');
  }

  return NextResponse.json({ ok: true });
}

// ========================================
// HEALTH CHECK
// ========================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-simple-webhook',
    version: '2.0.0',
    features: ['inline-keyboard', 'category-selection', 'preview', 'my_articles'],
    timestamp: new Date().toISOString(),
  });
}

// ========================================
// HELPERS
// ========================================

function getStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    'journalistic': '📰 Journalistic',
    'keep_as_is': '✋ Keep As Is',
    'seo_optimized': '🔍 SEO',
    'academic': '🎓 Academic',
    'casual': '💬 Casual',
    'technical': '⚙️ Technical',
  };
  return labels[style] || style;
}

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}
