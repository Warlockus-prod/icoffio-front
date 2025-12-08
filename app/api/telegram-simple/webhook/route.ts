/**
 * TELEGRAM SIMPLE - WEBHOOK
 * 
 * Упрощенная версия Telegram бота
 * Быстро, надежно, просто
 * 
 * @version 1.0.0
 * @date 2025-12-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram-simple/telegram-notifier';
import { parseUrl } from '@/lib/telegram-simple/url-parser';
import { processText } from '@/lib/telegram-simple/content-processor';
import { publishArticle } from '@/lib/telegram-simple/publisher';
import { loadTelegramSettings } from '@/lib/telegram-simple/settings-loader';
import { systemLogger } from '@/lib/system-logger';
import { getTranslations, getLanguageName, type BotLanguage } from '@/lib/telegram-simple/translations';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const timer = systemLogger.startTimer('telegram', 'webhook', 'Processing Telegram message');
  
  try {
    // Parse update from Telegram
    const update = await request.json();
    console.log('[TelegramSimple] 📨 Webhook called');
    
    await systemLogger.info('telegram', 'webhook_received', 'Telegram webhook called', {
      updateId: update.update_id,
    });

    // Extract message
    const message = update.message || update.edited_message;
    if (!message) {
      return NextResponse.json({ ok: true, message: 'No message' });
    }

    const chatId = message.chat.id;
    const text = message.text?.trim() || '';

    if (!text) {
      return NextResponse.json({ ok: true, message: 'Empty message' });
    }

    console.log(`[TelegramSimple] 💬 From chat ${chatId}: "${text.substring(0, 50)}..."`);

    // ========================================
    // LOAD SETTINGS & TRANSLATIONS
    // ========================================
    
    const settings = await loadTelegramSettings(chatId);
    const t = getTranslations(settings.interfaceLanguage);
    
    console.log(`[TelegramSimple] 🌐 Language: ${settings.interfaceLanguage}, Style: ${settings.contentStyle}`);

    // ========================================
    // HANDLE COMMANDS
    // ========================================
    
    if (text.startsWith('/')) {
      const command = text.toLowerCase().split(/\s/)[0]; // Только команда, без параметров

      if (command === '/start') {
        await sendTelegramMessage(
          chatId,
          `${t.welcome.title}\n\n` +
          `${t.welcome.description}\n\n` +
          `${t.welcome.howTo}\n\n` +
          `${t.welcome.commands}\n` +
          `${t.commands.settings}\n` +
          `${t.commands.language}\n` +
          `${t.commands.help}`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/help') {
        await sendTelegramMessage(
          chatId,
          `${t.help.title}\n\n` +
          `${t.help.description}\n\n` +
          `${t.help.urlExample}\n\n` +
          `${t.help.textExample}\n\n` +
          `${t.help.availableCommands}\n` +
          `${t.commands.start}\n` +
          `${t.commands.settings}\n` +
          `${t.commands.language}\n` +
          `${t.commands.help}`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/settings') {
        const styleLabel = t.styles[settings.contentStyle as keyof typeof t.styles] || settings.contentStyle;
        const sourceLabel = settings.imagesSource === 'unsplash' ? 'Unsplash' : 
                           settings.imagesSource === 'ai' ? 'AI' : 
                           t.disabled;
        
        await sendTelegramMessage(
          chatId,
          `${t.settings.title}\n\n` +
          `${t.settings.currentSettings}\n` +
          `${t.settings.contentStyle}: ${styleLabel}\n` +
          `${t.settings.images}: ${settings.imagesCount} (${sourceLabel})\n` +
          `${t.settings.autoPublish}: ${settings.autoPublish ? t.enabled : t.disabled}\n` +
          `${t.settings.language}: ${getLanguageName(settings.interfaceLanguage)}\n\n` +
          `${t.settings.changeInAdmin}`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/language') {
        await sendTelegramMessage(
          chatId,
          `${t.languageSelection.title}\n\n` +
          `${t.languageSelection.current}: ${getLanguageName(settings.interfaceLanguage)}\n\n` +
          `${t.languageSelection.choose}`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🇷🇺 Русский', callback_data: 'lang_ru' },
                  { text: '🇬🇧 English', callback_data: 'lang_en' },
                  { text: '🇵🇱 Polski', callback_data: 'lang_pl' },
                ],
              ],
            },
          }
        );
        return NextResponse.json({ ok: true });
      }

      // Unknown command
      await sendTelegramMessage(chatId, `❓ ${t.error.generic}. ${t.commands.help}`);
      return NextResponse.json({ ok: true });
    }

    // ========================================
    // HANDLE CALLBACK QUERY (Language selection)
    // ========================================
    
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackChatId = callbackQuery.message.chat.id;
      const callbackData = callbackQuery.data;

      if (callbackData?.startsWith('lang_')) {
        const newLang = callbackData.replace('lang_', '') as BotLanguage;
        
        // Save to database
        const response = await fetch('https://app.icoffio.com/api/telegram/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...settings,
            chatId: callbackChatId,
            interfaceLanguage: newLang,
          }),
        });

        if (response.ok) {
          const newT = getTranslations(newLang);
          await sendTelegramMessage(
            callbackChatId,
            `${newT.languageSelection.changed} ${getLanguageName(newLang)}! ✅\n\n` +
            `${newT.commands.help}`
          );
        }

        // Answer callback query to remove loading state
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackQuery.id }),
        });

        return NextResponse.json({ ok: true });
      }
    }

    // ========================================
    // VALIDATE TEXT LENGTH
    // ========================================
    
    if (text.length < 100 && !isUrl(text)) {
      await sendTelegramMessage(
        chatId,
        `📝 <b>${t.error.title}</b>\n\n` +
        `${t.error.generic}\n\n` +
        `${t.error.tryAgain}`
      );
      return NextResponse.json({ ok: true });
    }

    // ========================================
    // USER SETTINGS ALREADY LOADED ABOVE (v8.5.0)
    // ========================================
    
    console.log('[TelegramSimple] ⚙️ Using loaded settings:', {
      contentStyle: settings.contentStyle,
      imagesCount: settings.imagesCount,
      imagesSource: settings.imagesSource,
      autoPublish: settings.autoPublish,
    });

    // ========================================
    // PROCESS ARTICLE
    // ========================================
    
    const estimatedTime = settings.imagesCount > 0 ? '20-35' : '15-25';
    const styleLabel = t.styles[settings.contentStyle as keyof typeof t.styles] || settings.contentStyle;
    
    await sendTelegramMessage(
      chatId,
      `${t.processing.title}\n\n` +
      `${isUrl(text) ? t.processing.parsingUrl : t.processing.processingText}\n` +
      `${t.processing.style}: ${styleLabel}\n` +
      `${t.processing.images}: ${settings.imagesCount} ${settings.imagesCount > 0 ? `(${settings.imagesSource})` : ''}\n` +
      `${t.processing.estimatedTime} ${estimatedTime} ${t.seconds}`
    );

    let article;

    if (isUrl(text)) {
      // URL → Parse → Process
      console.log('[TelegramSimple] 🔗 Processing URL...');
      const parsed = await parseUrl(text);
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
    } else {
      // Text → Process directly
      console.log('[TelegramSimple] 📝 Processing text...');
      article = await processText(text, undefined, settings.contentStyle);
    }

    // ========================================
    // PUBLISH TO SUPABASE (with autoPublish + images)
    // ========================================
    
    console.log(`[TelegramSimple] 📤 ${settings.autoPublish ? 'Publishing' : 'Saving as draft'}...`);
    const result = await publishArticle(
      article, 
      chatId, 
      settings.autoPublish,
      {
        imagesCount: settings.imagesCount,
        imagesSource: settings.imagesSource,
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Publication failed');
    }

    // ========================================
    // SEND SUCCESS NOTIFICATION (DUAL-LANGUAGE)
    // ========================================
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    const statusEmoji = settings.autoPublish ? '✅' : '💾';
    const statusText = settings.autoPublish ? t.success.published : t.success.savedAsDraft;
    const statusNote = settings.autoPublish 
      ? t.success.note.published
      : t.success.note.draft;
    
    const imagesInfo = settings.imagesCount > 0 
      ? `${t.success.imagesCount}: ${settings.imagesCount} (${settings.imagesSource})\n`
      : '';
    
    // Use styleLabel defined earlier (line 218)
    
    await sendTelegramMessage(
      chatId,
      `${statusEmoji} <b>${statusText}!</b>\n\n` +
      `${t.success.title}\n${article.title}\n\n` +
      `${t.success.statistics}\n` +
      `${t.success.style}: ${styleLabel}\n` +
      `${t.success.words}: ${article.wordCount}\n` +
      `${imagesInfo}` +
      `${t.success.category}: ${article.category}\n` +
      `${t.success.time}: ${duration}s\n\n` +
      `${t.success.links}\n` +
      `🇬🇧 <b>EN:</b> ${result.en.url}\n` +
      `🇵🇱 <b>PL:</b> ${result.pl.url}\n\n` +
      `${statusNote}\n` +
      `${t.success.editLink}: app.icoffio.com/en/admin`,
      { disable_web_page_preview: false }
    );

    console.log(`[TelegramSimple] ✅ SUCCESS (${duration}s):`);
    console.log(`  🇬🇧 EN: ${result.en.url}`);
    console.log(`  🇵🇱 PL: ${result.pl.url}`);

    // ✅ Log success to system logs
    await timer.success('Article published successfully', {
      chatId,
      title: article.title,
      contentStyle: settings.contentStyle,
      imagesCount: settings.imagesCount,
      autoPublish: settings.autoPublish,
      enUrl: result.en.url,
      plUrl: result.pl.url,
      duration_seconds: duration,
    });

    return NextResponse.json({ ok: true, result });

  } catch (error: any) {
    console.error('[TelegramSimple] ❌ ERROR:', error);

    const duration = Math.round((Date.now() - startTime) / 1000);

    // ❌ Log error to system logs
    await timer.error('Telegram processing failed', {
      errorMessage: error.message,
      duration_seconds: duration,
    }, error.stack);

    // Try to send error notification
    try {
      const update = await request.json();
      const chatId = update.message?.chat?.id;
      
      if (chatId) {
        // Load settings for error message language
        const errorSettings = await loadTelegramSettings(chatId);
        const errorT = getTranslations(errorSettings.interfaceLanguage);
        
        await sendTelegramMessage(
          chatId,
          `❌ <b>${errorT.error.title}</b>\n\n` +
          `📋 ${error.message}\n\n` +
          `⏱️ Время: ${duration}s\n\n` +
          `Попробуйте еще раз или обратитесь к администратору.`
        );
      }
    } catch (notifyError) {
      console.error('[TelegramSimple] Failed to send error notification:', notifyError);
    }

    return NextResponse.json(
      { 
        ok: false, 
        error: error.message,
        duration 
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-simple-webhook',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get human-readable style label
 */
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

/**
 * Check if text is URL
 */
function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

