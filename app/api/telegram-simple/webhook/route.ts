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

      await systemLogger.info('telegram', 'command', 'Telegram command received', {
        chatId,
        command,
        fullText: text.substring(0, 100),
      });

      if (command === '/start') {
        await systemLogger.info('telegram', 'command_start', 'Processing /start command', { chatId });
        
        const sent = await sendTelegramMessage(
          chatId,
          `${t.welcome.title}\n\n` +
          `${t.welcome.description}\n\n` +
          `${t.welcome.howTo}\n\n` +
          `${t.welcome.commands}\n` +
          `${t.commands.settings}\n` +
          `${t.commands.language}\n` +
          `${t.commands.help}`
        );
        
        if (!sent) {
          await systemLogger.error('telegram', 'command_start', 'Failed to send /start response', { chatId });
        }
        
        return NextResponse.json({ ok: true });
      }

      if (command === '/help') {
        await systemLogger.info('telegram', 'command_help', 'Processing /help command', { chatId });
        
        const sent = await sendTelegramMessage(
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
        
        if (!sent) {
          await systemLogger.error('telegram', 'command_help', 'Failed to send /help response', { chatId });
        }
        
        return NextResponse.json({ ok: true });
      }

      if (command === '/settings') {
        await systemLogger.info('telegram', 'command_settings', 'Processing /settings command', {
          chatId,
          currentSettings: {
            contentStyle: settings.contentStyle,
            imagesCount: settings.imagesCount,
            imagesSource: settings.imagesSource,
            autoPublish: settings.autoPublish,
            interfaceLanguage: settings.interfaceLanguage,
          },
        });
        
        const styleLabel = t.styles[settings.contentStyle as keyof typeof t.styles] || settings.contentStyle;
        const sourceLabel = settings.imagesSource === 'unsplash' ? 'Unsplash' : 
                           settings.imagesSource === 'ai' ? 'AI' : 
                           t.disabled;
        
        const sent = await sendTelegramMessage(
          chatId,
          `${t.settings.title}\n\n` +
          `${t.settings.currentSettings}\n` +
          `${t.settings.contentStyle}: ${styleLabel}\n` +
          `${t.settings.images}: ${settings.imagesCount} (${sourceLabel})\n` +
          `${t.settings.autoPublish}: ${settings.autoPublish ? t.enabled : t.disabled}\n` +
          `${t.settings.language}: ${getLanguageName(settings.interfaceLanguage)}\n\n` +
          `${t.settings.changeInAdmin}`
        );
        
        if (!sent) {
          await systemLogger.error('telegram', 'command_settings', 'Failed to send /settings response', { chatId });
        }
        
        return NextResponse.json({ ok: true });
      }

      if (command === '/language') {
        await systemLogger.info('telegram', 'command_language', 'Processing /language command', {
          chatId,
          currentLanguage: settings.interfaceLanguage,
        });
        
        const sent = await sendTelegramMessage(
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
        
        if (!sent) {
          await systemLogger.error('telegram', 'command_language', 'Failed to send /language response', { chatId });
        } else {
          await systemLogger.info('telegram', 'command_language', 'Language selection menu sent', { chatId });
        }
        
        return NextResponse.json({ ok: true });
      }

      // Unknown command
      await systemLogger.warn('telegram', 'command_unknown', 'Unknown command received', {
        chatId,
        command,
      });
      
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

      await systemLogger.info('telegram', 'callback_query', 'Callback query received', {
        chatId: callbackChatId,
        callbackData: callbackData,
      });

      if (callbackData?.startsWith('lang_')) {
        const newLang = callbackData.replace('lang_', '') as BotLanguage;
        
        await systemLogger.info('telegram', 'language_change', 'Changing interface language', {
          chatId: callbackChatId,
          oldLanguage: settings.interfaceLanguage,
          newLanguage: newLang,
        });
        
        // ✅ FIX: Load current settings first (may have been changed in admin panel)
        const currentSettings = await loadTelegramSettings(callbackChatId);
        
        // Save to database with all current settings
        const response = await fetch('https://app.icoffio.com/api/telegram/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentSettings,
            chatId: callbackChatId,
            interfaceLanguage: newLang,
          }),
        });

        if (response.ok) {
          const responseData = await response.json();
          
          await systemLogger.info('telegram', 'language_change', 'Language changed successfully', {
            chatId: callbackChatId,
            newLanguage: newLang,
            settingsSaved: responseData.success,
          });
          
          const newT = getTranslations(newLang);
          const successMessage = await sendTelegramMessage(
            callbackChatId,
            `${newT.languageSelection.changed} ${getLanguageName(newLang)}! ✅\n\n` +
            `${newT.commands.help}`
          );
          
          if (!successMessage) {
            await systemLogger.warn('telegram', 'language_change', 'Failed to send confirmation message', {
              chatId: callbackChatId,
              newLanguage: newLang,
            });
          }
        } else {
          const errorText = await response.text();
          await systemLogger.error('telegram', 'language_change', 'Failed to save language settings', {
            chatId: callbackChatId,
            newLanguage: newLang,
            status: response.status,
            error: errorText,
          });
        }

        // Answer callback query to remove loading state
        try {
          const answerResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackQuery.id }),
        });
          
          if (!answerResponse.ok) {
            await systemLogger.warn('telegram', 'callback_query', 'Failed to answer callback query', {
              callbackQueryId: callbackQuery.id,
              status: answerResponse.status,
            });
          }
        } catch (error: any) {
          await systemLogger.error('telegram', 'callback_query', 'Error answering callback query', {
            callbackQueryId: callbackQuery.id,
            error: error.message,
          });
        }

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
      chatId: chatId,
      contentStyle: settings.contentStyle,
      imagesCount: settings.imagesCount,
      imagesSource: settings.imagesSource,
      autoPublish: settings.autoPublish,
      interfaceLanguage: settings.interfaceLanguage,
    });
    
    // ✅ FIX: Validate settings are loaded correctly
    if (!settings.contentStyle || settings.imagesCount === undefined) {
      console.error('[TelegramSimple] ⚠️ Settings incomplete! Using defaults...');
      console.error('[TelegramSimple] Settings object:', JSON.stringify(settings, null, 2));
    }

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
      await systemLogger.info('telegram', 'url_parsing', 'Starting URL parsing', {
        chatId,
        url: text.substring(0, 100),
        contentStyle: settings.contentStyle,
      });
      
      const parseTimer = systemLogger.startTimer('telegram', 'url_parsing', 'Parsing URL');
      const parsed = await parseUrl(text);
      await parseTimer.success('URL parsed successfully', {
        title: parsed.title,
        contentLength: parsed.content.length,
      });
      
      await systemLogger.info('telegram', 'content_processing', 'Processing parsed content with AI', {
        chatId,
        contentLength: parsed.content.length,
        contentStyle: settings.contentStyle,
      });
      
      const processTimer = systemLogger.startTimer('telegram', 'content_processing', 'AI content processing');
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
      await processTimer.success('Content processed successfully', {
        title: article.title,
        wordCount: article.wordCount,
        category: article.category,
      });
    } else {
      // Text → Process directly
      await systemLogger.info('telegram', 'text_processing', 'Processing text directly', {
        chatId,
        textLength: text.length,
        contentStyle: settings.contentStyle,
      });
      
      const processTimer = systemLogger.startTimer('telegram', 'text_processing', 'AI text processing');
      article = await processText(text, undefined, settings.contentStyle);
      await processTimer.success('Text processed successfully', {
        title: article.title,
        wordCount: article.wordCount,
        category: article.category,
      });
    }

    // ========================================
    // PUBLISH TO SUPABASE (with autoPublish + images)
    // ========================================
    
    await systemLogger.info('telegram', 'publishing', 'Starting article publication', {
      chatId,
      title: article.title,
      autoPublish: settings.autoPublish,
      imagesCount: settings.imagesCount,
      imagesSource: settings.imagesSource,
    });
    
    const publishTimer = systemLogger.startTimer('telegram', 'publishing', 'Publishing article');
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
      await publishTimer.error('Publication failed', {
        error: result.error,
        title: article.title,
      });
      throw new Error(result.error || 'Publication failed');
    }
    
    await publishTimer.success('Article published successfully', {
      enUrl: result.en.url,
      plUrl: result.pl.url,
      enSlug: result.en.slug,
      plSlug: result.pl.slug,
    });

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

