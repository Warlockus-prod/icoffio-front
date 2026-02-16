/**
 * TELEGRAM SIMPLE - WEBHOOK
 *
 * Single production webhook for Telegram ingestion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { answerCallbackQuery, sendTelegramMessage } from '@/lib/telegram-simple/telegram-notifier';
import { parseUrl } from '@/lib/telegram-simple/url-parser';
import { processText } from '@/lib/telegram-simple/content-processor';
import { publishArticle } from '@/lib/telegram-simple/publisher';
import { loadTelegramSettings } from '@/lib/telegram-simple/settings-loader';
import {
  enqueueTelegramSimpleJob,
  type TelegramSimpleQueuePayload,
} from '@/lib/telegram-simple/job-queue';
import type {
  ContentStyle,
  InterfaceLanguage,
  ImagesSource,
  TelegramSettings,
} from '@/lib/telegram-simple/types';
import {
  createTelegramSubmission,
  getTelegramSubmissions,
  updateTelegramSubmission,
} from '@/lib/supabase-analytics';
import { getSiteBaseUrl } from '@/lib/site-url';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BATCH_URLS = 5;
const STALE_SUBMISSION_TIMEOUT_MS = 20 * 60 * 1000;
const DEDUP_WINDOW_MS = 15 * 60 * 1000;
const PROCESSED_UPDATE_TTL_MS = 60 * 60 * 1000;
const processedUpdateIds = new Map<number, number>();

interface TelegramActivityInput {
  chatId: number;
  username?: string;
  firstName?: string;
  action: 'parse' | 'publish';
  actionLabel: string;
  entityType?: 'article' | 'image' | 'settings' | 'queue';
  entityId?: string;
  entityTitle?: string;
  entityUrl?: string;
  entityUrlPl?: string;
  metadata?: Record<string, any>;
}

export interface ProcessSubmissionInput {
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  rawText: string;
  url?: string;
  urls?: string[];
  combineUrlsAsSingle?: boolean;
  additionalContext?: string;
  settingsOverride?: TelegramSettings;
  existingSubmissionId?: number | null;
  skipDuplicateCheck?: boolean;
  sendProgressMessage?: boolean;
  sendResultMessage?: boolean;
  progressLabel?: string;
}

interface SubmissionMeta {
  candidateUrls: string[];
  combineUrlsAsSingle: boolean;
  additionalContext: string;
  singleUrl: string | null;
  submissionType: 'url' | 'text';
  submissionContent: string;
}

export interface ProcessSubmissionResult {
  success: boolean;
  submissionId: number | null;
  submissionType: 'url' | 'text';
  queued?: boolean;
  jobId?: string | null;
  title?: string;
  enUrl?: string;
  plUrl?: string;
  error?: string;
  durationMs: number;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStyleLabel(style: ContentStyle | string): string {
  const labels: Record<string, string> = {
    journalistic: 'Journalistic',
    keep_as_is: 'Keep As Is',
    seo_optimized: 'SEO',
    academic: 'Academic',
    casual: 'Casual',
    technical: 'Technical',
  };
  return labels[style] || style;
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  const normalized = matches.map((url) => url.replace(/[),.;!?]+$/g, '').trim());
  return Array.from(new Set(normalized.filter(Boolean)));
}

function normalizeContentStyle(rawValue?: string): ContentStyle | null {
  if (!rawValue) return null;

  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, ContentStyle> = {
    journalistic: 'journalistic',
    journal: 'journalistic',
    keep_as_is: 'keep_as_is',
    'keep-as-is': 'keep_as_is',
    keepasis: 'keep_as_is',
    asis: 'keep_as_is',
    original: 'keep_as_is',
    seo_optimized: 'seo_optimized',
    'seo-optimized': 'seo_optimized',
    seo: 'seo_optimized',
    academic: 'academic',
    casual: 'casual',
    technical: 'technical',
    tech: 'technical',
  };

  return aliases[value] || null;
}

function normalizeImagesSource(rawValue?: string): ImagesSource | null {
  if (!rawValue) return null;

  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, ImagesSource> = {
    unsplash: 'unsplash',
    stock: 'unsplash',
    ai: 'ai',
    dalle: 'ai',
    none: 'none',
    off: 'none',
    no: 'none',
  };

  return aliases[value] || null;
}

function normalizeAutoPublish(rawValue?: string): boolean | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  if (['on', 'true', '1', 'yes', 'y', 'enable'].includes(value)) return true;
  if (['off', 'false', '0', 'no', 'n', 'disable'].includes(value)) return false;
  return null;
}

function normalizeCombineMode(rawValue?: string): boolean | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  if (['single', 'one', 'combined', 'on', 'true', '1', 'yes'].includes(value)) return true;
  if (['batch', 'multi', 'off', 'false', '0', 'no'].includes(value)) return false;
  return null;
}

function normalizeInterfaceLanguage(rawValue?: string): InterfaceLanguage | null {
  if (!rawValue) return null;
  const value = rawValue.trim().toLowerCase();
  const aliases: Record<string, InterfaceLanguage> = {
    ru: 'ru',
    russian: 'ru',
    русский: 'ru',
    en: 'en',
    english: 'en',
    eng: 'en',
    pl: 'pl',
    polish: 'pl',
    polski: 'pl',
  };
  return aliases[value] || null;
}

function getLanguageFromTelegramCode(languageCode?: string): InterfaceLanguage {
  if (!languageCode) return 'ru';
  const normalized = languageCode.toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('pl')) return 'pl';
  return 'ru';
}

function localize(
  lang: InterfaceLanguage,
  ru: string,
  en: string,
  pl: string
): string {
  if (lang === 'en') return en;
  if (lang === 'pl') return pl;
  return ru;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAdditionalContext(text: string, urls: string[]): string {
  if (!text || urls.length === 0) return text.trim();
  let normalized = text;
  for (const url of urls) {
    normalized = normalized.replace(new RegExp(escapeRegExp(url), 'g'), ' ');
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function buildSubmissionMeta(input: ProcessSubmissionInput): SubmissionMeta {
  const normalizedText = input.rawText.trim();
  const detectedUrls = extractUrls(normalizedText);
  const candidateUrls = Array.from(
    new Set(
      [
        ...(input.urls || []),
        ...(input.url ? [input.url] : []),
        ...detectedUrls,
      ]
        .map((url) => url.trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_BATCH_URLS);

  const combineUrlsAsSingle = Boolean(input.combineUrlsAsSingle && candidateUrls.length > 1);
  const additionalContext = (
    input.additionalContext || extractAdditionalContext(normalizedText, candidateUrls)
  ).trim();
  const singleUrl = candidateUrls[0] || null;
  const submissionType: 'url' | 'text' = singleUrl ? 'url' : 'text';
  const submissionContent = (
    combineUrlsAsSingle
      ? `single:${candidateUrls.join('|')}${additionalContext ? `|context:${additionalContext}` : ''}`
      : singleUrl || normalizedText
  ).slice(0, 8000);

  return {
    candidateUrls,
    combineUrlsAsSingle,
    additionalContext,
    singleUrl,
    submissionType,
    submissionContent,
  };
}

function buildQuickActionsKeyboard(
  settings: Pick<TelegramSettings, 'combineUrlsAsSingle' | 'interfaceLanguage'>
) {
  const lang = settings.interfaceLanguage || 'ru';
  const languageLabel = localize(lang, '🌍 Язык', '🌍 Language', '🌍 Język');
  const modeLabel = settings.combineUrlsAsSingle
    ? localize(lang, '🧩 Режим: Single', '🧩 Mode: Single', '🧩 Tryb: Single')
    : localize(lang, '📦 Режим: Batch', '📦 Mode: Batch', '📦 Tryb: Batch');
  const modeAction = settings.combineUrlsAsSingle ? 'mode:batch' : 'mode:single';
  const reloadLabel = localize(lang, '🔄 Сброс зависших', '🔄 Reload stuck', '🔄 Reset zawieszonych');

  return {
    inline_keyboard: [
      [{ text: languageLabel, callback_data: 'lang:menu' }],
      [{ text: modeLabel, callback_data: modeAction }],
      [{ text: reloadLabel, callback_data: 'reload:stale' }],
    ],
  };
}

function buildLanguageSelectionKeyboard(
  currentLanguage: InterfaceLanguage,
  options: { includeBack?: boolean } = {}
) {
  const { includeBack = false } = options;
  const buttons: Array<{ text: string; callback_data: string }> = [
    { text: `${currentLanguage === 'ru' ? '✅ ' : ''}🇷🇺 RU`, callback_data: 'lang:ru' },
    { text: `${currentLanguage === 'en' ? '✅ ' : ''}🇬🇧 EN`, callback_data: 'lang:en' },
    { text: `${currentLanguage === 'pl' ? '✅ ' : ''}🇵🇱 PL`, callback_data: 'lang:pl' },
  ];

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [buttons];
  if (includeBack) {
    keyboard.push([
      {
        text: localize(currentLanguage, '⬅️ Назад', '⬅️ Back', '⬅️ Wstecz'),
        callback_data: 'actions:menu',
      },
    ]);
  }

  return { inline_keyboard: keyboard };
}

function isDuplicateTelegramUpdate(updateId: number): boolean {
  const now = Date.now();

  for (const [id, seenAt] of processedUpdateIds) {
    if (now - seenAt > PROCESSED_UPDATE_TTL_MS) {
      processedUpdateIds.delete(id);
    }
  }

  const seenAt = processedUpdateIds.get(updateId);
  if (seenAt && now - seenAt <= PROCESSED_UPDATE_TTL_MS) {
    return true;
  }

  processedUpdateIds.set(updateId, now);
  return false;
}

function getEffectiveImageMode(
  settings: Pick<TelegramSettings, 'imagesCount' | 'imagesSource'>
): 'none' | 'unsplash' | 'ai' | 'mixed' {
  if (settings.imagesCount <= 0 || settings.imagesSource === 'none') {
    return 'none';
  }

  // Base rule: with two images we always publish one stock + one generated.
  if (settings.imagesCount === 2) {
    return 'mixed';
  }

  return settings.imagesSource === 'ai' ? 'ai' : 'unsplash';
}

function getEffectiveImageLabel(
  settings: Pick<TelegramSettings, 'imagesCount' | 'imagesSource'>,
  lang: InterfaceLanguage = 'ru'
): string {
  const mode = getEffectiveImageMode(settings);
  if (mode === 'none') return localize(lang, 'Нет', 'None', 'Brak');
  if (mode === 'mixed') return 'Mixed (Unsplash + AI)';
  if (mode === 'ai') return 'AI';
  return 'Unsplash';
}

function verifyTelegramRequest(request: NextRequest): boolean {
  const configuredSecrets = Array.from(
    new Set(
      [process.env.TELEGRAM_SECRET_TOKEN, process.env.TELEGRAM_BOT_SECRET]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  if (configuredSecrets.length === 0) {
    console.warn(
      '[TelegramSimple] Secret token is not configured; request accepted without verification'
    );
    return true;
  }

  if (configuredSecrets.length > 1) {
    console.warn('[TelegramSimple] Multiple webhook secrets configured; accepting either configured value');
  }

  const receivedSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!receivedSecret || !configuredSecrets.includes(receivedSecret)) {
    console.warn('[TelegramSimple] Invalid webhook secret token');
    return false;
  }

  return true;
}

function getActivitySupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function isDuplicateTelegramUpdatePersistent(
  updateId: number,
  chatId?: number,
  userId?: number,
  updateType?: string
): Promise<boolean> {
  const supabase = getActivitySupabaseClient();
  if (!supabase) {
    return isDuplicateTelegramUpdate(updateId);
  }

  const { error } = await supabase.from('telegram_webhook_updates').insert([
    {
      update_id: updateId,
      chat_id: chatId || null,
      user_id: userId || null,
      update_type: updateType || null,
      received_at: new Date().toISOString(),
    },
  ]);

  if (!error) return false;

  // Unique violation means this update was already processed.
  if (error.code === '23505') {
    return true;
  }

  // Missing table (migration not applied yet) -> fallback to in-memory dedup.
  if (error.code === '42P01') {
    return isDuplicateTelegramUpdate(updateId);
  }

  console.warn('[TelegramSimple] Failed to persist webhook update id:', error.message);
  return isDuplicateTelegramUpdate(updateId);
}

async function logTelegramActivity(input: TelegramActivityInput): Promise<void> {
  const supabase = getActivitySupabaseClient();
  if (!supabase) return;

  const userName = input.username ? `@${input.username}` : input.firstName || `User ${input.chatId}`;

  const { error } = await supabase.from('activity_logs').insert([
    {
      user_name: userName,
      user_source: 'telegram',
      telegram_username: input.username || null,
      telegram_chat_id: input.chatId,
      action: input.action,
      action_label: input.actionLabel,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      entity_title: input.entityTitle || null,
      entity_url: input.entityUrl || null,
      entity_url_pl: input.entityUrlPl || null,
      metadata: input.metadata || {},
    },
  ]);

  if (error && error.code !== '42P01') {
    console.warn('[TelegramSimple] Failed to write activity log:', error.message);
  }
}

async function saveTelegramSettings(
  chatId: number,
  patch: Partial<
    Pick<
      TelegramSettings,
      | 'contentStyle'
      | 'imagesCount'
      | 'imagesSource'
      | 'autoPublish'
      | 'interfaceLanguage'
      | 'combineUrlsAsSingle'
    >
  >,
  fallbackLanguageCode?: string
): Promise<TelegramSettings> {
  const current = await loadTelegramSettings(chatId, fallbackLanguageCode);
  const merged: TelegramSettings = {
    ...current,
    ...patch,
    chatId,
  };

  const supabase = getActivitySupabaseClient();
  if (!supabase) {
    console.warn('[TelegramSimple] Supabase not configured, settings change cannot be persisted');
    return merged;
  }

  const basePayload = {
    chat_id: chatId,
    content_style: merged.contentStyle,
    images_count: merged.imagesCount,
    images_source: merged.imagesSource,
    auto_publish: merged.autoPublish,
    language: merged.interfaceLanguage,
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from('telegram_user_preferences')
    .upsert(
      {
        ...basePayload,
        combine_urls_as_single: merged.combineUrlsAsSingle,
      },
      { onConflict: 'chat_id' }
    );

  // Backward compatibility if migration was not applied yet.
  if (error && error.code === '42703') {
    const retry = await supabase
      .from('telegram_user_preferences')
      .upsert(basePayload, { onConflict: 'chat_id' });
    error = retry.error || null;
  }

  if (error) {
    throw new Error(error.message || 'Failed to save settings');
  }

  return merged;
}

function buildSettingsMessage(settings: TelegramSettings): string {
  const lang = settings.interfaceLanguage || 'ru';
  const languageLabel = localize(
    lang,
    lang === 'ru' ? 'Русский' : lang === 'en' ? 'English' : 'Polski',
    lang === 'ru' ? 'Russian' : lang === 'en' ? 'English' : 'Polish',
    lang === 'ru' ? 'Rosyjski' : lang === 'en' ? 'Angielski' : 'Polski'
  );
  const publicationLabel = settings.autoPublish
    ? localize(lang, 'Автоматически', 'Auto publish', 'Auto publikacja')
    : localize(lang, 'Черновик', 'Draft', 'Szkic');
  const multiUrlModeLabel = settings.combineUrlsAsSingle
    ? localize(lang, 'Одна статья (single)', 'One article (single)', 'Jeden artykuł (single)')
    : localize(lang, 'Пакет (batch)', 'Batch mode', 'Tryb pakietowy');

  return (
    `${localize(lang, '⚙️ <b>Настройки публикации</b>', '⚙️ <b>Publishing Settings</b>', '⚙️ <b>Ustawienia publikacji</b>')}\n\n` +
    `${localize(lang, '🌍 Язык:', '🌍 Interface:', '🌍 Język:')} ${escapeHtml(languageLabel)}\n` +
    `${localize(lang, '📝 Стиль:', '📝 Style:', '📝 Styl:')} ${escapeHtml(getStyleLabel(settings.contentStyle))}\n` +
    `${localize(lang, '🖼️ Картинок:', '🖼️ Images:', '🖼️ Obrazy:')} ${settings.imagesCount}\n` +
    `${localize(lang, '📸 Источник:', '📸 Source:', '📸 Źródło:')} ${escapeHtml(getEffectiveImageLabel(settings, lang))}\n` +
    `${localize(lang, '🧩 Multi URL:', '🧩 Multi URL:', '🧩 Multi URL:')} ${escapeHtml(multiUrlModeLabel)}\n` +
    `${settings.autoPublish ? '✅' : '📝'} ${localize(lang, 'Публикация:', 'Publish mode:', 'Tryb publikacji:')} ${publicationLabel}\n\n` +
    `${localize(lang, '<b>Быстрые команды:</b>', '<b>Quick commands:</b>', '<b>Szybkie komendy:</b>')}\n` +
    `• /language ru|en|pl\n` +
    `• /mode single|batch\n` +
    `• /style journalistic|keep_as_is|seo|academic|casual|technical\n` +
    `• /images 0|1|2|3\n` +
    `• /source unsplash|ai|none\n` +
    `• /single &lt;url1&gt; &lt;url2&gt; ...\n` +
    `• /reload\n` +
    `• /autopublish on|off\n\n` +
    `${localize(lang, '🎨 Полные настройки:', '🎨 Full settings:', '🎨 Pełne ustawienia:')} https://www.icoffio.com/en/admin`
  );
}

async function handleQueueCommand(
  chatId: number,
  userId: number,
  lang: InterfaceLanguage
): Promise<void> {
  try {
    const submissions = await getTelegramSubmissions(100);
    const userSubmissions = submissions.filter((item) => item.user_id === userId);

    if (userSubmissions.length === 0) {
      await sendTelegramMessage(
        chatId,
        localize(
          lang,
          '📭 <b>История пуста</b>\n\nЕще нет обработанных запросов. Отправьте ссылку или текст.',
          '📭 <b>No History Yet</b>\n\nNo processed requests found. Send a URL or text.',
          '📭 <b>Historia jest pusta</b>\n\nBrak przetworzonych żądań. Wyślij URL lub tekst.'
        )
      );
      return;
    }

    const processing = userSubmissions.filter((item) => item.status === 'processing').length;
    const queued = userSubmissions.filter((item) => item.status === 'queued').length;
    const published = userSubmissions.filter((item) => item.status === 'published').length;
    const failed = userSubmissions.filter((item) => item.status === 'failed').length;

    const recentLines = userSubmissions
      .slice(0, 5)
      .map((item, index) => {
        const icon =
          item.status === 'published'
            ? '✅'
            : item.status === 'failed'
              ? '❌'
              : item.status === 'queued'
                ? '📥'
                : '⏳';
        const typeLabel = item.submission_type === 'url' ? 'URL' : 'TEXT';
        if (item.status === 'published' && item.article_url_en) {
          return `${index + 1}. ${icon} ${typeLabel} • <a href="${item.article_url_en}">EN</a>${
            item.article_url_pl ? ` | <a href="${item.article_url_pl}">PL</a>` : ''
          }`;
        }
        return `${index + 1}. ${icon} ${typeLabel} • ${item.status}`;
      })
      .join('\n');

    await sendTelegramMessage(
      chatId,
      localize(
        lang,
        `📊 <b>Ваш статус обработки</b>\n\n` +
          `• Всего: ${userSubmissions.length}\n` +
          `• В очереди: ${queued}\n` +
          `• В обработке: ${processing}\n` +
          `• Успешно: ${published}\n` +
          `• Ошибки: ${failed}\n\n` +
          `🕒 <b>Последние 5:</b>\n${recentLines}`,
        `📊 <b>Your processing status</b>\n\n` +
          `• Total: ${userSubmissions.length}\n` +
          `• Queued: ${queued}\n` +
          `• Processing: ${processing}\n` +
          `• Published: ${published}\n` +
          `• Failed: ${failed}\n\n` +
          `🕒 <b>Last 5:</b>\n${recentLines}`,
        `📊 <b>Status przetwarzania</b>\n\n` +
          `• Łącznie: ${userSubmissions.length}\n` +
          `• W kolejce: ${queued}\n` +
          `• W trakcie: ${processing}\n` +
          `• Opublikowane: ${published}\n` +
          `• Błędy: ${failed}\n\n` +
          `🕒 <b>Ostatnie 5:</b>\n${recentLines}`
      )
    );
  } catch (error) {
    console.error('[TelegramSimple] Queue command failed:', error);
    await sendTelegramMessage(
      chatId,
      localize(
        lang,
        '❌ Не удалось получить статус. Попробуйте позже.',
        '❌ Failed to fetch status. Try again later.',
        '❌ Nie udało się pobrać statusu. Spróbuj ponownie później.'
      )
    );
  }
}

async function markStaleSubmissionsAsFailed(userId: number): Promise<number> {
  const submissions = await getTelegramSubmissions(300);
  const now = Date.now();
  const stale = submissions.filter((item) => {
    if (item.user_id !== userId) return false;
    if (!['queued', 'processing'].includes(item.status)) return false;
    if (!item.submitted_at) return false;
    const submittedAt = new Date(item.submitted_at).getTime();
    if (!Number.isFinite(submittedAt)) return false;
    return now - submittedAt > STALE_SUBMISSION_TIMEOUT_MS;
  });

  for (const item of stale) {
    if (!item.id) continue;
    await updateTelegramSubmission(item.id, {
      status: 'failed',
      error_message: 'Marked as stale by /reload command',
      error_details: {
        reason: 'stale_submission',
        staleTimeoutMs: STALE_SUBMISSION_TIMEOUT_MS,
      },
    });
  }

  return stale.length;
}

function isRecentSubmission(submittedAt?: string, windowMs: number = DEDUP_WINDOW_MS): boolean {
  if (!submittedAt) return false;
  const ts = new Date(submittedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= windowMs;
}

async function findRecentDuplicateSubmission(
  userId: number,
  submissionContent: string
) {
  const submissions = await getTelegramSubmissions(200);
  return submissions.find(
    (item) =>
      item.user_id === userId &&
      item.submission_content === submissionContent &&
      ['queued', 'processing', 'published'].includes(item.status) &&
      isRecentSubmission(item.submitted_at)
  );
}

async function buildCombinedUrlContent(urls: string[], additionalContext?: string): Promise<{
  title: string;
  content: string;
  parsedUrls: string[];
  failedUrls: Array<{ url: string; error: string }>;
}> {
  const blocks: string[] = [];
  const parsedUrls: string[] = [];
  const failedUrls: Array<{ url: string; error: string }> = [];

  if (additionalContext?.trim()) {
    blocks.push(`### Additional context\n\n${additionalContext.trim()}`);
  }

  for (const [index, url] of urls.entries()) {
    try {
      const parsed = await parseUrl(url);
      parsedUrls.push(url);
      blocks.push(
        `### Source ${index + 1}: ${parsed.title}\nURL: ${url}\n\n${parsed.content}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parse error';
      failedUrls.push({ url, error: message });
    }
  }

  if (parsedUrls.length === 0) {
    throw new Error('Failed to parse all URLs in single-article mode');
  }

  const title =
    parsedUrls.length === 1
      ? 'Single source article'
      : `Combined analysis from ${parsedUrls.length} URLs`;

  return {
    title,
    content: blocks.join('\n\n---\n\n'),
    parsedUrls,
    failedUrls,
  };
}

export async function processSubmission(input: ProcessSubmissionInput): Promise<ProcessSubmissionResult> {
  const startTime = Date.now();
  const normalizedText = input.rawText.trim();
  const meta = buildSubmissionMeta(input);
  const {
    candidateUrls,
    combineUrlsAsSingle,
    additionalContext,
    singleUrl,
    submissionType,
    submissionContent,
  } = meta;
  let submissionId: number | null = input.existingSubmissionId || null;

  try {
    const settings = input.settingsOverride || (await loadTelegramSettings(input.chatId, input.languageCode));
    const uiLang = settings.interfaceLanguage || getLanguageFromTelegramCode(input.languageCode);

    if (!singleUrl && normalizedText.length < 100) {
      if (input.sendResultMessage !== false) {
        await sendTelegramMessage(
          input.chatId,
          localize(
            uiLang,
            `📝 <b>Текст слишком короткий</b>\n\n` +
              `Минимум: 100 символов\n` +
              `Сейчас: ${normalizedText.length}\n\n` +
              `Либо отправьте ссылку на статью.`,
            `📝 <b>Text is too short</b>\n\n` +
              `Minimum: 100 characters\n` +
              `Current: ${normalizedText.length}\n\n` +
              `Or send a URL to parse.`,
            `📝 <b>Tekst jest za krótki</b>\n\n` +
              `Minimum: 100 znaków\n` +
              `Aktualnie: ${normalizedText.length}\n\n` +
              `Lub wyślij URL artykułu.`
          )
        );
      }

      return {
        success: false,
        submissionId: null,
        submissionType,
        error: 'Text is too short',
        durationMs: Date.now() - startTime,
      };
    }

    if (!input.skipDuplicateCheck && !submissionId) {
      const duplicate = await findRecentDuplicateSubmission(input.userId, submissionContent);
      if (duplicate) {
        const durationMs = Date.now() - startTime;
        if (['queued', 'processing'].includes(duplicate.status)) {
          if (input.sendResultMessage !== false) {
            await sendTelegramMessage(
              input.chatId,
              localize(
                uiLang,
                '⏳ <b>Запрос уже в очереди/обработке</b>\n\nПодождите завершения или используйте /queue.',
                '⏳ <b>This request is already queued/processing</b>\n\nPlease wait or use /queue.',
                '⏳ <b>To żądanie jest już w kolejce lub w trakcie</b>\n\nPoczekaj lub użyj /queue.'
              )
            );
          }

          return {
            success: false,
            submissionId: duplicate.id || null,
            submissionType,
            error: 'Duplicate processing request',
            durationMs,
          };
        }

        if (duplicate.status === 'published' && duplicate.article_url_en) {
          if (input.sendResultMessage !== false) {
            await sendTelegramMessage(
              input.chatId,
              localize(
                uiLang,
                `✅ <b>Уже обработано</b>\n\n` +
                  `🔗 EN: ${duplicate.article_url_en}\n` +
                  `${duplicate.article_url_pl ? `🇵🇱 PL: ${duplicate.article_url_pl}\n` : ''}`,
                `✅ <b>Already processed</b>\n\n` +
                  `🔗 EN: ${duplicate.article_url_en}\n` +
                  `${duplicate.article_url_pl ? `🇵🇱 PL: ${duplicate.article_url_pl}\n` : ''}`,
                `✅ <b>Już przetworzone</b>\n\n` +
                  `🔗 EN: ${duplicate.article_url_en}\n` +
                  `${duplicate.article_url_pl ? `🇵🇱 PL: ${duplicate.article_url_pl}\n` : ''}`
              )
            );
          }

          return {
            success: true,
            submissionId: duplicate.id || null,
            submissionType,
            enUrl: duplicate.article_url_en,
            plUrl: duplicate.article_url_pl,
            durationMs,
          };
        }
      }
    }

    if (submissionId) {
      await updateTelegramSubmission(submissionId, {
        status: 'processing',
        error_message: '',
        error_details: {},
      });
    } else {
      submissionId = await createTelegramSubmission({
        user_id: input.userId,
        username: input.username,
        first_name: input.firstName,
        last_name: input.lastName,
        submission_type: submissionType,
        submission_content: submissionContent,
        status: 'processing',
        language: settings.interfaceLanguage,
      });
    }

    await logTelegramActivity({
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
      action: 'parse',
      actionLabel: submissionId && input.existingSubmissionId
        ? 'Started queued Telegram submission'
        : singleUrl
          ? 'Received URL from Telegram'
          : 'Received text from Telegram',
      entityType: 'article',
      entityId: submissionId ? String(submissionId) : undefined,
      metadata: {
        source: 'telegram-simple',
        submissionId,
        submissionType,
        combineUrlsAsSingle,
        sourceUrlsCount: candidateUrls.length,
        status: 'processing',
      },
    });

    const effectiveImageMode = getEffectiveImageMode(settings);
    const estimatedTime =
      settings.imagesCount > 0
        ? localize(uiLang, '20-35 секунд', '20-35 seconds', '20-35 sekund')
        : localize(uiLang, '15-25 секунд', '15-25 seconds', '15-25 sekund');

    if (input.sendProgressMessage !== false) {
      await sendTelegramMessage(
        input.chatId,
        `${input.progressLabel ? `${escapeHtml(input.progressLabel)}\n` : ''}` +
          `${localize(uiLang, '⏳ <b>Обрабатываю...</b>', '⏳ <b>Processing...</b>', '⏳ <b>Przetwarzam...</b>')}\n\n` +
          `${
            combineUrlsAsSingle
              ? localize(
                  uiLang,
                  `🧩 Собираю одну статью из ${candidateUrls.length} URL`,
                  `🧩 Building one article from ${candidateUrls.length} URLs`,
                  `🧩 Tworzę jeden artykuł z ${candidateUrls.length} URL`
                )
              : singleUrl
                ? localize(uiLang, '🔗 Обрабатываю ссылку', '🔗 Parsing URL', '🔗 Przetwarzam URL')
                : localize(uiLang, '📝 Обрабатываю текст', '📝 Processing text', '📝 Przetwarzam tekst')
          }\n` +
          `${localize(uiLang, '📝 Стиль:', '📝 Style:', '📝 Styl:')} ${escapeHtml(getStyleLabel(settings.contentStyle))}\n` +
          `${localize(uiLang, '🖼️ Картинок:', '🖼️ Images:', '🖼️ Obrazy:')} ${settings.imagesCount}${
            settings.imagesCount > 0 ? ` (${escapeHtml(getEffectiveImageLabel(settings, uiLang))})` : ''
          }\n` +
          `⏱️ ${localize(uiLang, 'Ориентировочно:', 'Estimated:', 'Szacowany czas:')} ${estimatedTime}`
      );
    }

    let article;
    if (combineUrlsAsSingle) {
      const combined = await buildCombinedUrlContent(candidateUrls, additionalContext);
      article = await processText(combined.content, combined.title, settings.contentStyle);
    } else if (singleUrl) {
      const parsed = await parseUrl(singleUrl);
      article = await processText(parsed.content, parsed.title, settings.contentStyle);
    } else {
      article = await processText(normalizedText, undefined, settings.contentStyle);
    }

    const publishResult = await publishArticle(article, input.chatId, settings.autoPublish, {
      imagesCount: settings.imagesCount,
      imagesSource: settings.imagesSource,
    });

    if (!publishResult.success) {
      throw new Error(publishResult.error || 'Publication failed');
    }

    const durationMs = Date.now() - startTime;
    const durationSec = Math.round(durationMs / 1000);

    if (submissionId) {
      await updateTelegramSubmission(submissionId, {
        status: 'published',
        article_slug_en: publishResult.en.slug,
        article_slug_pl: publishResult.pl.slug,
        article_url_en: publishResult.en.url,
        article_url_pl: publishResult.pl.url,
        processing_time_ms: durationMs,
        category: article.category,
      });
    }

    await logTelegramActivity({
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
      action: 'publish',
      actionLabel: settings.autoPublish
        ? 'Published article from Telegram'
        : 'Saved Telegram article as draft',
      entityType: 'article',
      entityId: submissionId ? String(submissionId) : undefined,
      entityTitle: article.title,
      entityUrl: publishResult.en.url,
      entityUrlPl: publishResult.pl.url,
      metadata: {
        source: 'telegram-simple',
        submissionId,
        submissionType,
        autoPublish: settings.autoPublish,
        imagesCount: settings.imagesCount,
        imagesSource: settings.imagesSource,
        interfaceLanguage: settings.interfaceLanguage,
        effectiveImageMode,
        durationMs,
      },
    });

    if (input.sendResultMessage !== false) {
      const statusText = settings.autoPublish
        ? localize(uiLang, 'ОПУБЛИКОВАНО', 'PUBLISHED', 'OPUBLIKOWANO')
        : localize(uiLang, 'СОХРАНЕНО КАК ЧЕРНОВИК', 'SAVED AS DRAFT', 'ZAPISANO JAKO SZKIC');
      const statusNote = settings.autoPublish
        ? localize(uiLang, 'Статья опубликована на сайте.', 'Article is published on the site.', 'Artykuł został opublikowany.')
        : localize(uiLang, 'Черновик сохранен. Опубликуйте через админ панель.', 'Draft saved. Publish from admin panel.', 'Szkic zapisany. Opublikuj w panelu admina.');

      await sendTelegramMessage(
        input.chatId,
        `${settings.autoPublish ? '✅' : '📝'} <b>${statusText}</b>\n\n` +
          `${localize(uiLang, '📝 <b>Заголовок:</b>', '📝 <b>Title:</b>', '📝 <b>Tytuł:</b>')} ${escapeHtml(article.title)}\n` +
          `${localize(uiLang, '📊 <b>Статистика:</b>', '📊 <b>Stats:</b>', '📊 <b>Statystyki:</b>')}\n` +
          `• ${localize(uiLang, 'Слов', 'Words', 'Słów')}: ${article.wordCount}\n` +
          `• ${localize(uiLang, 'Категория', 'Category', 'Kategoria')}: ${escapeHtml(article.category)}\n` +
          `• ${localize(uiLang, 'Время', 'Time', 'Czas')}: ${durationSec}s\n\n` +
          `${localize(uiLang, '🔗 <b>Ссылки:</b>', '🔗 <b>Links:</b>', '🔗 <b>Linki:</b>')}\n` +
          `🇬🇧 EN: ${publishResult.en.url}\n` +
          `🇵🇱 PL: ${publishResult.pl.url}\n\n` +
          `${statusNote}\n` +
          `🎨 Редактирование: https://www.icoffio.com/en/admin`,
        { disable_web_page_preview: false }
      );
    }

    return {
      success: true,
      submissionId,
      submissionType,
      title: article.title,
      enUrl: publishResult.en.url,
      plUrl: publishResult.pl.url,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown processing error';
    console.error('[TelegramSimple] Processing error:', message, error);

    if (submissionId) {
      await updateTelegramSubmission(submissionId, {
        status: 'failed',
        error_message: message,
        error_details: { message },
        processing_time_ms: durationMs,
      });
    }

    await logTelegramActivity({
      chatId: input.chatId,
      username: input.username,
      firstName: input.firstName,
      action: 'parse',
      actionLabel: 'Telegram processing failed',
      entityType: 'article',
      entityId: submissionId ? String(submissionId) : undefined,
      metadata: {
        source: 'telegram-simple',
        submissionId,
        submissionType,
        status: 'failed',
        error: message,
        durationMs,
      },
    });

    if (input.sendResultMessage !== false) {
      const failureLang =
        input.settingsOverride?.interfaceLanguage || getLanguageFromTelegramCode(input.languageCode);
      await sendTelegramMessage(
        input.chatId,
        `❌ <b>${localize(
          failureLang,
          'Ошибка обработки',
          'Processing error',
          'Błąd przetwarzania'
        )}</b>\n\n` +
          `${localize(
            failureLang,
            'Причина',
            'Reason',
            'Powód'
          )}: ${escapeHtml(message)}\n` +
          `⏱️ ${localize(
            failureLang,
            'Время',
            'Time',
            'Czas'
          )}: ${Math.round(durationMs / 1000)}s\n\n` +
          `${localize(
            failureLang,
            'Попробуйте снова через пару минут.',
            'Please try again in a few minutes.',
            'Spróbuj ponownie za kilka minut.'
          )}`
      );
    }

    return {
      success: false,
      submissionId,
      submissionType,
      error: message,
      durationMs,
    };
  }
}

async function enqueueSubmission(input: ProcessSubmissionInput): Promise<ProcessSubmissionResult> {
  const startTime = Date.now();
  const normalizedText = input.rawText.trim();
  const meta = buildSubmissionMeta(input);
  const {
    candidateUrls,
    combineUrlsAsSingle,
    additionalContext,
    singleUrl,
    submissionType,
    submissionContent,
  } = meta;

  const settings =
    input.settingsOverride || (await loadTelegramSettings(input.chatId, input.languageCode));
  const uiLang = settings.interfaceLanguage || getLanguageFromTelegramCode(input.languageCode);

  if (!singleUrl && normalizedText.length < 100) {
    if (input.sendResultMessage !== false) {
      await sendTelegramMessage(
        input.chatId,
        localize(
          uiLang,
          `📝 <b>Текст слишком короткий</b>\n\nМинимум: 100 символов`,
          `📝 <b>Text is too short</b>\n\nMinimum: 100 characters`,
          `📝 <b>Tekst jest za krótki</b>\n\nMinimum: 100 znaków`
        )
      );
    }

    return {
      success: false,
      submissionId: null,
      submissionType,
      error: 'Text is too short',
      durationMs: Date.now() - startTime,
    };
  }

  const duplicate = await findRecentDuplicateSubmission(input.userId, submissionContent);
  if (duplicate) {
    const durationMs = Date.now() - startTime;
    if (['queued', 'processing'].includes(duplicate.status)) {
      if (input.sendResultMessage !== false) {
        await sendTelegramMessage(
          input.chatId,
          localize(
            uiLang,
            '⏳ <b>Запрос уже в очереди/обработке</b>\n\nИспользуйте /queue для статуса.',
            '⏳ <b>This request is already queued/processing</b>\n\nUse /queue for status.',
            '⏳ <b>To żądanie jest już w kolejce lub w trakcie</b>\n\nUżyj /queue, aby sprawdzić status.'
          )
        );
      }
      return {
        success: false,
        submissionId: duplicate.id || null,
        submissionType,
        error: 'Duplicate processing request',
        durationMs,
      };
    }
    if (duplicate.status === 'published' && duplicate.article_url_en) {
      if (input.sendResultMessage !== false) {
        await sendTelegramMessage(
          input.chatId,
          localize(
            uiLang,
            `✅ <b>Уже обработано</b>\n\n🔗 EN: ${duplicate.article_url_en}`,
            `✅ <b>Already processed</b>\n\n🔗 EN: ${duplicate.article_url_en}`,
            `✅ <b>Już przetworzone</b>\n\n🔗 EN: ${duplicate.article_url_en}`
          )
        );
      }
      return {
        success: true,
        submissionId: duplicate.id || null,
        submissionType,
        enUrl: duplicate.article_url_en,
        plUrl: duplicate.article_url_pl,
        durationMs,
      };
    }
  }

  let submissionId = await createTelegramSubmission({
    user_id: input.userId,
    username: input.username,
    first_name: input.firstName,
    last_name: input.lastName,
    submission_type: submissionType,
    submission_content: submissionContent,
    status: 'queued',
    language: settings.interfaceLanguage,
  });

  // Backward compatibility if DB status check does not include "queued" yet.
  if (!submissionId) {
    submissionId = await createTelegramSubmission({
      user_id: input.userId,
      username: input.username,
      first_name: input.firstName,
      last_name: input.lastName,
      submission_type: submissionType,
      submission_content: submissionContent,
      status: 'processing',
      language: settings.interfaceLanguage,
    });
  }

  if (!submissionId) {
    return {
      success: false,
      submissionId: null,
      submissionType,
      error: 'Failed to create queued submission',
      durationMs: Date.now() - startTime,
    };
  }

  const payload: TelegramSimpleQueuePayload = {
    chatId: input.chatId,
    userId: input.userId,
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName,
    languageCode: input.languageCode,
    rawText: normalizedText,
    url: singleUrl || undefined,
    urls: candidateUrls,
    combineUrlsAsSingle,
    additionalContext,
    settingsOverride: settings,
    existingSubmissionId: submissionId,
    sendProgressMessage: input.sendProgressMessage ?? true,
    sendResultMessage: input.sendResultMessage ?? true,
  };

  const jobId = await enqueueTelegramSimpleJob(payload, 2);
  if (!jobId) {
    await updateTelegramSubmission(submissionId, {
      status: 'failed',
      error_message: 'Queue insertion failed',
    });
    return {
      success: false,
      submissionId,
      submissionType,
      error: 'Queue insertion failed',
      durationMs: Date.now() - startTime,
    };
  }

  await logTelegramActivity({
    chatId: input.chatId,
    username: input.username,
    firstName: input.firstName,
    action: 'parse',
    actionLabel: 'Queued Telegram submission',
    entityType: 'queue',
    entityId: jobId,
    metadata: {
      source: 'telegram-simple',
      submissionId,
      jobId,
      submissionType,
      combineUrlsAsSingle,
      sourceUrlsCount: candidateUrls.length,
      status: 'queued',
    },
  });

  if (input.sendResultMessage !== false) {
    await sendTelegramMessage(
      input.chatId,
      localize(
        uiLang,
        `📥 <b>Добавлено в очередь</b>\n\n` +
          `ID: <code>${jobId}</code>\n` +
          `Проверьте прогресс через /queue.`,
        `📥 <b>Queued for processing</b>\n\n` +
          `ID: <code>${jobId}</code>\n` +
          `Track progress with /queue.`,
        `📥 <b>Dodano do kolejki</b>\n\n` +
          `ID: <code>${jobId}</code>\n` +
          `Sprawdź postęp przez /queue.`
      )
    );
  }

  return {
    success: true,
    queued: true,
    jobId,
    submissionId,
    submissionType,
    durationMs: Date.now() - startTime,
  };
}

function triggerTelegramSimpleWorker(request: NextRequest): void {
  const origin = request.nextUrl?.origin || process.env.NEXT_PUBLIC_APP_URL || getSiteBaseUrl();
  const workerSecret = process.env.TELEGRAM_WORKER_SECRET || process.env.CRON_SECRET;
  const headers: Record<string, string> = {};
  if (workerSecret) {
    headers.Authorization = `Bearer ${workerSecret}`;
  }

  fetch(`${origin}/api/telegram-simple/worker`, {
    method: 'POST',
    headers,
  }).catch((error) => {
    console.warn('[TelegramSimple] Failed to trigger worker:', error);
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyTelegramRequest(request)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    let update: any;
    try {
      update = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const callbackQuery = update.callback_query;
    const callbackChatId = Number(callbackQuery?.message?.chat?.id || 0) || undefined;
    const callbackUserId = Number(callbackQuery?.from?.id || 0) || undefined;
    const messageChatId =
      Number(update?.message?.chat?.id || update?.channel_post?.chat?.id || 0) || undefined;
    const messageUserId =
      Number(update?.message?.from?.id || update?.channel_post?.from?.id || 0) || undefined;

    const updateId = Number(update?.update_id);
    if (
      Number.isInteger(updateId) &&
      (await isDuplicateTelegramUpdatePersistent(
        updateId,
        callbackChatId || messageChatId,
        callbackUserId || messageUserId,
        callbackQuery ? 'callback_query' : 'message'
      ))
    ) {
      return NextResponse.json({ ok: true, message: 'Duplicate update ignored' });
    }

    if (callbackQuery?.message?.chat?.id) {
      const chatId = Number(callbackQuery.message.chat.id);
      const userId = callbackQuery.from?.id || chatId;
      const username = callbackQuery.from?.username;
      const firstName = callbackQuery.from?.first_name;
      const languageCode = callbackQuery.from?.language_code;
      const settings = await loadTelegramSettings(chatId, languageCode);
      const uiLang = settings.interfaceLanguage || getLanguageFromTelegramCode(languageCode);
      const callbackData = String(callbackQuery.data || '');

      if (callbackData === 'lang:menu') {
        await sendTelegramMessage(
          chatId,
          localize(
            uiLang,
            '🌍 <b>Выберите язык интерфейса:</b>',
            '🌍 <b>Choose interface language:</b>',
            '🌍 <b>Wybierz język interfejsu:</b>'
          ),
          {
            reply_markup: buildLanguageSelectionKeyboard(uiLang, { includeBack: true }),
          }
        );
        await answerCallbackQuery(
          callbackQuery.id,
          localize(uiLang, 'Выбор языка', 'Language selector', 'Wybór języka')
        );
        return NextResponse.json({ ok: true, callback: callbackData });
      }

      if (callbackData === 'actions:menu') {
        await sendTelegramMessage(
          chatId,
          localize(uiLang, '⚡ Быстрые кнопки:', '⚡ Quick actions:', '⚡ Szybkie akcje:'),
          {
            reply_markup: buildQuickActionsKeyboard(settings),
          }
        );
        await answerCallbackQuery(
          callbackQuery.id,
          localize(uiLang, 'Готово', 'Done', 'Gotowe')
        );
        return NextResponse.json({ ok: true, callback: callbackData });
      }

      if (callbackData.startsWith('lang:')) {
        const selectedLanguage = normalizeInterfaceLanguage(callbackData.replace('lang:', ''));
        if (selectedLanguage) {
          const updated = await saveTelegramSettings(
            chatId,
            { interfaceLanguage: selectedLanguage },
            languageCode
          );
          await sendTelegramMessage(
            chatId,
            localize(
              updated.interfaceLanguage,
              `✅ Язык обновлен: <b>${updated.interfaceLanguage.toUpperCase()}</b>`,
              `✅ Language updated: <b>${updated.interfaceLanguage.toUpperCase()}</b>`,
              `✅ Zaktualizowano język: <b>${updated.interfaceLanguage.toUpperCase()}</b>`
            ),
            {
              reply_markup: buildQuickActionsKeyboard(updated),
            }
          );
          await answerCallbackQuery(
            callbackQuery.id,
            localize(
              updated.interfaceLanguage,
              'Язык обновлен',
              'Language updated',
              'Zaktualizowano język'
            )
          );
        } else {
          await answerCallbackQuery(
            callbackQuery.id,
            localize(uiLang, 'Некорректный язык', 'Invalid language', 'Nieprawidłowy język')
          );
        }

        return NextResponse.json({ ok: true, callback: callbackData });
      }

      if (callbackData.startsWith('mode:')) {
        const modeValue = callbackData.replace('mode:', '');
        const combineUrlsAsSingle = normalizeCombineMode(modeValue);
        if (combineUrlsAsSingle === null) {
          await answerCallbackQuery(
            callbackQuery.id,
            localize(uiLang, 'Некорректный режим', 'Invalid mode', 'Nieprawidłowy tryb')
          );
          return NextResponse.json({ ok: true, callback: callbackData });
        }

        const updated = await saveTelegramSettings(
          chatId,
          { combineUrlsAsSingle },
          languageCode
        );
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram multi URL mode',
          entityType: 'settings',
          metadata: {
            source: 'telegram-simple',
            combineUrlsAsSingle,
            trigger: 'callback_query',
          },
        });
        await sendTelegramMessage(chatId, buildSettingsMessage(updated), {
          reply_markup: buildQuickActionsKeyboard(updated),
        });
        await answerCallbackQuery(
          callbackQuery.id,
          combineUrlsAsSingle
            ? localize(updated.interfaceLanguage, 'Single режим включен', 'Single mode enabled', 'Włączono tryb single')
            : localize(updated.interfaceLanguage, 'Batch режим включен', 'Batch mode enabled', 'Włączono tryb batch')
        );

        return NextResponse.json({ ok: true, callback: callbackData });
      }

      if (callbackData === 'reload:stale') {
        const resetCount = await markStaleSubmissionsAsFailed(userId);
        await sendTelegramMessage(
          chatId,
          localize(
            uiLang,
            `🔄 <b>Сброшено задач:</b> ${resetCount}\nПроверьте /queue.`,
            `🔄 <b>Reset jobs:</b> ${resetCount}\nCheck /queue.`,
            `🔄 <b>Zresetowane zadania:</b> ${resetCount}\nSprawdź /queue.`
          )
        );
        await answerCallbackQuery(
          callbackQuery.id,
          localize(uiLang, 'Сброс выполнен', 'Reload complete', 'Przeładowanie zakończone')
        );
        return NextResponse.json({ ok: true, callback: callbackData });
      }

      await answerCallbackQuery(
        callbackQuery.id,
        localize(uiLang, 'Команда не распознана', 'Unknown action', 'Nieznana akcja')
      );
      return NextResponse.json({ ok: true, callback: callbackData });
    }

    if (update.edited_message || update.edited_channel_post) {
      return NextResponse.json({ ok: true, message: 'Edited message updates are ignored' });
    }

    const message = update.message || update.channel_post;
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true, message: 'No message payload' });
    }

    const chatId = Number(message.chat.id);
    const userId = message.from?.id || chatId;
    const username = message.from?.username;
    const firstName = message.from?.first_name;
    const lastName = message.from?.last_name;
    const languageCode = message.from?.language_code;
    const text =
      typeof message.text === 'string'
        ? message.text.trim()
        : typeof message.caption === 'string'
          ? message.caption.trim()
          : '';

    if (!text) {
      return NextResponse.json({ ok: true, message: 'Empty text message' });
    }

    console.log(`[TelegramSimple] Incoming message from chat ${chatId}: "${text.slice(0, 80)}"`);

    const settings = await loadTelegramSettings(chatId, languageCode);
    const uiLang = settings.interfaceLanguage || getLanguageFromTelegramCode(languageCode);

    const sendLocalized = async (ru: string, en: string, pl: string) =>
      sendTelegramMessage(chatId, localize(uiLang, ru, en, pl));

    if (text.startsWith('/')) {
      const parts = text.split(/\s+/);
      const rawCommand = (parts[0] || '').toLowerCase();
      const command = rawCommand.split('@')[0];
      const args = parts.slice(1);
      const firstArg = args[0];

      if (command === '/start') {
        await sendLocalized(
          `🤖 <b>Привет! Я icoffio Bot</b>\n\n` +
            `Отправь ссылку или текст, и я создам публикацию.\n` +
            `Можно отправить сразу несколько URL (до ${MAX_BATCH_URLS} за сообщение).\n` +
            `Для одной статьи из нескольких URL используй /single.\n\n` +
            `⚙️ Команды:\n` +
            `/settings - Твои настройки\n` +
            `/queue - История и статус\n` +
            `/language ru|en|pl - Язык интерфейса\n` +
            `/mode single|batch - Режим multi URL\n` +
            `/reload - Сброс зависших задач\n` +
            `/help - Справка`,
          `🤖 <b>Hello! I'm icoffio Bot</b>\n\n` +
            `Send a URL or text and I will create a publication.\n` +
            `You can send multiple URLs (up to ${MAX_BATCH_URLS} per message).\n` +
            `Use /single to build one article from multiple URLs.\n\n` +
            `⚙️ Commands:\n` +
            `/settings - Your settings\n` +
            `/queue - History and status\n` +
            `/language ru|en|pl - Interface language\n` +
            `/mode single|batch - Multi URL mode\n` +
            `/reload - Reset stuck jobs\n` +
            `/help - Help`,
          `🤖 <b>Cześć! Jestem icoffio Bot</b>\n\n` +
            `Wyślij URL lub tekst, a przygotuję publikację.\n` +
            `Możesz wysłać kilka URL (do ${MAX_BATCH_URLS} w jednej wiadomości).\n` +
            `Użyj /single, aby stworzyć jeden artykuł z wielu URL.\n\n` +
            `⚙️ Komendy:\n` +
            `/settings - Twoje ustawienia\n` +
            `/queue - Historia i status\n` +
            `/language ru|en|pl - Język interfejsu\n` +
            `/mode single|batch - Tryb multi URL\n` +
            `/reload - Reset zawieszonych zadań\n` +
            `/help - Pomoc`
        );
        await sendTelegramMessage(
          chatId,
          localize(
            settings.interfaceLanguage,
            '⚡ Быстрые кнопки:',
            '⚡ Quick actions:',
            '⚡ Szybkie akcje:'
          ),
          {
            reply_markup: buildQuickActionsKeyboard(settings),
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/help') {
        await sendLocalized(
          `📚 <b>Как использовать:</b>\n\n` +
            `1. Отправь URL статьи или текст (от 100 символов)\n` +
            `2. Подожди обработку\n` +
            `3. Получи EN + PL ссылки\n\n` +
            `<b>Мульти URL:</b>\n` +
            `• Пакет (несколько статей): просто отправь несколько URL\n` +
            `• Одна статья из нескольких URL: /single &lt;url1&gt; &lt;url2&gt; ...\n\n` +
            `<b>Команды:</b>\n` +
            `/settings\n` +
            `/queue (или /status)\n` +
            `/language ru|en|pl\n` +
            `/mode single|batch\n` +
            `/style &lt;value&gt;\n` +
            `/images &lt;0-3&gt;\n` +
            `/source &lt;unsplash|ai|none&gt;\n` +
            `/autopublish &lt;on|off&gt;\n` +
            `/reload\n` +
            `/admin`,
          `📚 <b>How to use:</b>\n\n` +
            `1. Send a URL or text (100+ chars)\n` +
            `2. Wait for processing\n` +
            `3. Receive EN + PL links\n\n` +
            `<b>Multi URL:</b>\n` +
            `• Batch (multiple articles): send multiple URLs\n` +
            `• One article from multiple URLs: /single &lt;url1&gt; &lt;url2&gt; ...\n\n` +
            `<b>Commands:</b>\n` +
            `/settings\n` +
            `/queue (or /status)\n` +
            `/language ru|en|pl\n` +
            `/mode single|batch\n` +
            `/style &lt;value&gt;\n` +
            `/images &lt;0-3&gt;\n` +
            `/source &lt;unsplash|ai|none&gt;\n` +
            `/autopublish &lt;on|off&gt;\n` +
            `/reload\n` +
            `/admin`,
          `📚 <b>Jak używać:</b>\n\n` +
            `1. Wyślij URL lub tekst (100+ znaków)\n` +
            `2. Poczekaj na przetworzenie\n` +
            `3. Otrzymaj linki EN + PL\n\n` +
            `<b>Multi URL:</b>\n` +
            `• Pakiet (wiele artykułów): wyślij wiele URL\n` +
            `• Jeden artykuł z wielu URL: /single &lt;url1&gt; &lt;url2&gt; ...\n\n` +
            `<b>Komendy:</b>\n` +
            `/settings\n` +
            `/queue (lub /status)\n` +
            `/language ru|en|pl\n` +
            `/mode single|batch\n` +
            `/style &lt;value&gt;\n` +
            `/images &lt;0-3&gt;\n` +
            `/source &lt;unsplash|ai|none&gt;\n` +
            `/autopublish &lt;on|off&gt;\n` +
            `/reload\n` +
            `/admin`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/settings') {
        await sendTelegramMessage(chatId, buildSettingsMessage(settings), {
          reply_markup: buildQuickActionsKeyboard(settings),
        });
        return NextResponse.json({ ok: true });
      }

      if (command === '/queue' || command === '/status') {
        await handleQueueCommand(chatId, userId, uiLang);
        return NextResponse.json({ ok: true });
      }

      if (command === '/language' || command === '/lang') {
        if (!firstArg) {
          await sendTelegramMessage(
            chatId,
            localize(
              uiLang,
              '🌍 <b>Выберите язык интерфейса:</b>',
              '🌍 <b>Choose interface language:</b>',
              '🌍 <b>Wybierz język interfejsu:</b>'
            ),
            {
              reply_markup: buildLanguageSelectionKeyboard(uiLang, { includeBack: true }),
            }
          );
          return NextResponse.json({ ok: true });
        }

        const interfaceLanguage = normalizeInterfaceLanguage(firstArg);
        if (!interfaceLanguage) {
          await sendLocalized(
            '❌ Некорректный язык. Доступно: ru, en, pl.',
            '❌ Invalid language. Available: ru, en, pl.',
            '❌ Nieprawidłowy język. Dostępne: ru, en, pl.'
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(
          chatId,
          { interfaceLanguage },
          languageCode
        );

        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram interface language',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', interfaceLanguage: updated.interfaceLanguage },
        });

        await sendTelegramMessage(chatId, buildSettingsMessage(updated), {
          reply_markup: buildQuickActionsKeyboard(updated),
        });
        return NextResponse.json({ ok: true });
      }

      if (command === '/mode') {
        if (!firstArg) {
          await sendLocalized(
            `🧩 <b>Режим multi URL</b>\n\n` +
              `single — несколько URL как одна статья\n` +
              `batch — каждый URL как отдельная статья\n\n` +
              `Пример: <code>/mode single</code>`,
            `🧩 <b>Multi URL mode</b>\n\n` +
              `single — several URLs as one article\n` +
              `batch — each URL as separate article\n\n` +
              `Example: <code>/mode single</code>`,
            `🧩 <b>Tryb multi URL</b>\n\n` +
              `single — wiele URL jako jeden artykuł\n` +
              `batch — każdy URL jako osobny artykuł\n\n` +
              `Przykład: <code>/mode single</code>`
          );
          return NextResponse.json({ ok: true });
        }

        const combineUrlsAsSingle = normalizeCombineMode(firstArg);
        if (combineUrlsAsSingle === null) {
          await sendLocalized(
            '❌ Некорректный режим. Используйте: single или batch.',
            '❌ Invalid mode. Use: single or batch.',
            '❌ Nieprawidłowy tryb. Użyj: single albo batch.'
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(
          chatId,
          { combineUrlsAsSingle },
          languageCode
        );
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram multi URL mode',
          entityType: 'settings',
          metadata: {
            source: 'telegram-simple',
            combineUrlsAsSingle,
            trigger: 'command',
          },
        });

        await sendTelegramMessage(chatId, buildSettingsMessage(updated), {
          reply_markup: buildQuickActionsKeyboard(updated),
        });
        return NextResponse.json({ ok: true });
      }

      if (command === '/reload') {
        const resetCount = await markStaleSubmissionsAsFailed(userId);
        await sendLocalized(
          `🔄 <b>Перезагрузка выполнена</b>\n\n` +
            `Сброшено зависших задач: ${resetCount}\n` +
            `Проверьте статус командой /queue.`,
          `🔄 <b>Reload complete</b>\n\n` +
            `Stale jobs reset: ${resetCount}\n` +
            `Use /queue to check current status.`,
          `🔄 <b>Przeładowanie zakończone</b>\n\n` +
            `Zresetowano zawieszone zadania: ${resetCount}\n` +
            `Użyj /queue, aby sprawdzić status.`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/single') {
        const commandPayload = args.join(' ').trim();
        const urlsForSingle = extractUrls(commandPayload).slice(0, MAX_BATCH_URLS);
        if (urlsForSingle.length === 0) {
          await sendLocalized(
            `🧩 <b>Одна статья из нескольких URL</b>\n\n` +
              `Пример:\n<code>/single https://site.com/a https://site.com/b</code>`,
            `🧩 <b>One article from multiple URLs</b>\n\n` +
              `Example:\n<code>/single https://site.com/a https://site.com/b</code>`,
            `🧩 <b>Jeden artykuł z wielu URL</b>\n\n` +
              `Przykład:\n<code>/single https://site.com/a https://site.com/b</code>`
          );
          return NextResponse.json({ ok: true });
        }

        const singleResult = await enqueueSubmission({
          chatId,
          userId,
          username,
          firstName,
          lastName,
          languageCode,
          rawText: commandPayload,
          urls: urlsForSingle,
          combineUrlsAsSingle: true,
          additionalContext: extractAdditionalContext(commandPayload, urlsForSingle),
          settingsOverride: settings,
          sendProgressMessage: true,
          sendResultMessage: true,
        });
        if (singleResult.success) {
          triggerTelegramSimpleWorker(request);
        }

        return NextResponse.json({
          ok: singleResult.success,
          submissionId: singleResult.submissionId,
          durationMs: singleResult.durationMs,
          error: singleResult.error,
        });
      }

      if (command === '/style') {
        if (!firstArg) {
          await sendLocalized(
            `📝 <b>Выбор стиля</b>\n\n` +
              `Пример: <code>/style technical</code>\n\n` +
              `Доступно:\n` +
              `• journalistic\n` +
              `• keep_as_is\n` +
              `• seo\n` +
              `• academic\n` +
              `• casual\n` +
              `• technical`,
            `📝 <b>Style selection</b>\n\n` +
              `Example: <code>/style technical</code>\n\n` +
              `Available:\n` +
              `• journalistic\n` +
              `• keep_as_is\n` +
              `• seo\n` +
              `• academic\n` +
              `• casual\n` +
              `• technical`,
            `📝 <b>Wybór stylu</b>\n\n` +
              `Przykład: <code>/style technical</code>\n\n` +
              `Dostępne:\n` +
              `• journalistic\n` +
              `• keep_as_is\n` +
              `• seo\n` +
              `• academic\n` +
              `• casual\n` +
              `• technical`
          );
          return NextResponse.json({ ok: true });
        }

        const style = normalizeContentStyle(firstArg);
        if (!style) {
          await sendLocalized(
            `❌ Неизвестный стиль: <code>${escapeHtml(firstArg)}</code>\n` +
              `Используйте /style и один из доступных вариантов.`,
            `❌ Unknown style: <code>${escapeHtml(firstArg)}</code>\n` +
              `Use /style with one of available values.`,
            `❌ Nieznany styl: <code>${escapeHtml(firstArg)}</code>\n` +
              `Użyj /style i jednego z dostępnych wariantów.`
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { contentStyle: style }, languageCode);
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram content style',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', contentStyle: style },
        });

        await sendLocalized(
          `✅ Стиль обновлен: <b>${escapeHtml(getStyleLabel(updated.contentStyle))}</b>`,
          `✅ Style updated: <b>${escapeHtml(getStyleLabel(updated.contentStyle))}</b>`,
          `✅ Zaktualizowano styl: <b>${escapeHtml(getStyleLabel(updated.contentStyle))}</b>`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/images') {
        if (!firstArg) {
          await sendLocalized(
            `🖼️ <b>Количество картинок</b>\n\n` +
              `Пример: <code>/images 2</code>\n` +
              `Допустимо: 0, 1, 2, 3`,
            `🖼️ <b>Number of images</b>\n\n` +
              `Example: <code>/images 2</code>\n` +
              `Allowed: 0, 1, 2, 3`,
            `🖼️ <b>Liczba obrazów</b>\n\n` +
              `Przykład: <code>/images 2</code>\n` +
              `Dozwolone: 0, 1, 2, 3`
          );
          return NextResponse.json({ ok: true });
        }

        const imagesCount = Number(firstArg);
        if (!Number.isInteger(imagesCount) || imagesCount < 0 || imagesCount > 3) {
          await sendLocalized(
            '❌ Некорректное значение. Используйте /images 0..3',
            '❌ Invalid value. Use /images 0..3',
            '❌ Nieprawidłowa wartość. Użyj /images 0..3'
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { imagesCount }, languageCode);
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram images count',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', imagesCount },
        });

        await sendLocalized(
          `✅ Количество картинок: <b>${updated.imagesCount}</b>${
            updated.imagesCount === 2
              ? '\n📸 Режим 2 изображений: <b>1 Unsplash + 1 AI</b>'
              : ''
          }`,
          `✅ Images count: <b>${updated.imagesCount}</b>${
            updated.imagesCount === 2
              ? '\n📸 2-image mode: <b>1 Unsplash + 1 AI</b>'
              : ''
          }`,
          `✅ Liczba obrazów: <b>${updated.imagesCount}</b>${
            updated.imagesCount === 2
              ? '\n📸 Tryb 2 obrazów: <b>1 Unsplash + 1 AI</b>'
              : ''
          }`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/source') {
        if (!firstArg) {
          await sendLocalized(
            `📸 <b>Источник изображений</b>\n\n` +
              `Пример: <code>/source unsplash</code>\n` +
              `Доступно: unsplash, ai, none`,
            `📸 <b>Image source</b>\n\n` +
              `Example: <code>/source unsplash</code>\n` +
              `Available: unsplash, ai, none`,
            `📸 <b>Źródło obrazów</b>\n\n` +
              `Przykład: <code>/source unsplash</code>\n` +
              `Dostępne: unsplash, ai, none`
          );
          return NextResponse.json({ ok: true });
        }

        const source = normalizeImagesSource(firstArg);
        if (!source) {
          await sendLocalized(
            '❌ Некорректный источник. Используйте unsplash, ai или none.',
            '❌ Invalid source. Use unsplash, ai, or none.',
            '❌ Nieprawidłowe źródło. Użyj unsplash, ai lub none.'
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { imagesSource: source }, languageCode);
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram image source',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', imagesSource: source },
        });

        await sendLocalized(
          `✅ Источник картинок: <b>${escapeHtml(updated.imagesSource.toUpperCase())}</b>${
            updated.imagesCount === 2
              ? '\nℹ️ При 2 картинках автоматически используется <b>1 Unsplash + 1 AI</b>.'
              : ''
          }`,
          `✅ Image source: <b>${escapeHtml(updated.imagesSource.toUpperCase())}</b>${
            updated.imagesCount === 2
              ? '\nℹ️ With 2 images, mode is always <b>1 Unsplash + 1 AI</b>.'
              : ''
          }`,
          `✅ Źródło obrazów: <b>${escapeHtml(updated.imagesSource.toUpperCase())}</b>${
            updated.imagesCount === 2
              ? '\nℹ️ Przy 2 obrazach tryb to zawsze <b>1 Unsplash + 1 AI</b>.'
              : ''
          }`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/autopublish') {
        if (!firstArg) {
          await sendLocalized(
            `🚀 <b>Автопубликация</b>\n\n` +
              `Пример: <code>/autopublish on</code>\n` +
              `Значения: on или off`,
            `🚀 <b>Auto publish</b>\n\n` +
              `Example: <code>/autopublish on</code>\n` +
              `Values: on or off`,
            `🚀 <b>Auto publikacja</b>\n\n` +
              `Przykład: <code>/autopublish on</code>\n` +
              `Wartości: on lub off`
          );
          return NextResponse.json({ ok: true });
        }

        const autoPublish = normalizeAutoPublish(firstArg);
        if (autoPublish === null) {
          await sendLocalized(
            '❌ Некорректное значение. Используйте /autopublish on|off',
            '❌ Invalid value. Use /autopublish on|off',
            '❌ Nieprawidłowa wartość. Użyj /autopublish on|off'
          );
          return NextResponse.json({ ok: true });
        }

        const updated = await saveTelegramSettings(chatId, { autoPublish }, languageCode);
        await logTelegramActivity({
          chatId,
          username,
          firstName,
          action: 'parse',
          actionLabel: 'Updated Telegram auto-publish mode',
          entityType: 'settings',
          metadata: { source: 'telegram-simple', autoPublish },
        });

        await sendLocalized(
          `✅ Режим публикации: <b>${updated.autoPublish ? 'Автоматически' : 'Черновик'}</b>`,
          `✅ Publish mode: <b>${updated.autoPublish ? 'Auto publish' : 'Draft'}</b>`,
          `✅ Tryb publikacji: <b>${updated.autoPublish ? 'Auto publikacja' : 'Szkic'}</b>`
        );
        return NextResponse.json({ ok: true });
      }

      if (command === '/admin') {
        await sendLocalized(
          '🎨 Админ-панель: https://www.icoffio.com/en/admin',
          '🎨 Admin panel: https://www.icoffio.com/en/admin',
          '🎨 Panel admina: https://www.icoffio.com/en/admin'
        );
        return NextResponse.json({ ok: true });
      }

      await sendLocalized(
        `❓ Неизвестная команда.\n\n` +
          `Поддерживается:\n` +
          `/help\n/settings\n/queue\n/language\n/mode\n/style\n/images\n/source\n/single\n/reload\n/autopublish\n/admin`,
        `❓ Unknown command.\n\n` +
          `Available:\n` +
          `/help\n/settings\n/queue\n/language\n/mode\n/style\n/images\n/source\n/single\n/reload\n/autopublish\n/admin`,
        `❓ Nieznana komenda.\n\n` +
          `Dostępne:\n` +
          `/help\n/settings\n/queue\n/language\n/mode\n/style\n/images\n/source\n/single\n/reload\n/autopublish\n/admin`
      );
      return NextResponse.json({ ok: true });
    }

    const urls = extractUrls(text);
    if (urls.length > 1) {
      const lowerText = text.toLowerCase();
      const singleArticleMarkers = ['#single', '#one', 'one article', 'одна статья', 'jeden artykuł'];
      const shouldCombineIntoSingle =
        settings.combineUrlsAsSingle ||
        singleArticleMarkers.some((marker) => lowerText.includes(marker));
      const batchUrls = urls.slice(0, MAX_BATCH_URLS);

      if (shouldCombineIntoSingle) {
        const singleResult = await enqueueSubmission({
          chatId,
          userId,
          username,
          firstName,
          lastName,
          languageCode,
          rawText: text,
          urls: batchUrls,
          combineUrlsAsSingle: true,
          additionalContext: extractAdditionalContext(text, batchUrls),
          settingsOverride: settings,
          sendProgressMessage: true,
          sendResultMessage: true,
        });
        triggerTelegramSimpleWorker(request);

        return NextResponse.json({
          ok: singleResult.success,
          submissionId: singleResult.submissionId,
          durationMs: singleResult.durationMs,
          error: singleResult.error,
        });
      }

      await sendLocalized(
        `📦 <b>Пакетная обработка</b>\n\n` +
          `Получено URL: ${urls.length}\n` +
          `В очередь: ${batchUrls.length}${urls.length > MAX_BATCH_URLS ? ` (лимит ${MAX_BATCH_URLS})` : ''}\n\n` +
          `Добавляю задания в очередь.`,
        `📦 <b>Batch processing</b>\n\n` +
          `Received URLs: ${urls.length}\n` +
          `Queued: ${batchUrls.length}${urls.length > MAX_BATCH_URLS ? ` (limit ${MAX_BATCH_URLS})` : ''}\n\n` +
          `Adding jobs to queue.`,
        `📦 <b>Przetwarzanie pakietowe</b>\n\n` +
          `Otrzymane URL: ${urls.length}\n` +
          `W kolejce: ${batchUrls.length}${urls.length > MAX_BATCH_URLS ? ` (limit ${MAX_BATCH_URLS})` : ''}\n\n` +
          `Dodaję zadania do kolejki.`
      );

      const results: Array<{ url: string; result: ProcessSubmissionResult }> = [];
      for (let index = 0; index < batchUrls.length; index++) {
        const url = batchUrls[index];
        const result = await enqueueSubmission({
          chatId,
          userId,
          username,
          firstName,
          lastName,
          languageCode,
          rawText: url,
          url,
          settingsOverride: settings,
          sendProgressMessage: false,
          sendResultMessage: false,
        });
        results.push({ url, result });
      }

      const success = results.filter((item) => item.result.success);
      const failed = results.filter((item) => !item.result.success);
      const failedLines = failed
        .slice(0, 5)
        .map(
          (item, idx) =>
            `${idx + 1}. ❌ ${escapeHtml(item.result.error || 'Unknown error')} (${escapeHtml(item.url)})`
        )
        .join('\n');

      await sendLocalized(
        `📊 <b>Пакет поставлен в очередь</b>\n\n` +
          `• Всего: ${batchUrls.length}\n` +
          `• В очереди: ${success.length}\n` +
          `• Ошибки валидации: ${failed.length}\n\n` +
          `${failedLines ? `❌ <b>Ошибки:</b>\n${failedLines}` : ''}`,
        `📊 <b>Batch queued</b>\n\n` +
          `• Total: ${batchUrls.length}\n` +
          `• Queued: ${success.length}\n` +
          `• Validation failures: ${failed.length}\n\n` +
          `${failedLines ? `❌ <b>Errors:</b>\n${failedLines}` : ''}`,
        `📊 <b>Pakiet dodany do kolejki</b>\n\n` +
          `• Łącznie: ${batchUrls.length}\n` +
          `• W kolejce: ${success.length}\n` +
          `• Błędy walidacji: ${failed.length}\n\n` +
          `${failedLines ? `❌ <b>Błędy:</b>\n${failedLines}` : ''}`
      );
      if (success.length > 0) {
        triggerTelegramSimpleWorker(request);
      }

      return NextResponse.json({
        ok: true,
        batch: true,
        total: batchUrls.length,
        queued: success.length,
        failed: failed.length,
      });
    }

    const singleResult = await enqueueSubmission({
      chatId,
      userId,
      username,
      firstName,
      lastName,
      languageCode,
      rawText: text,
      settingsOverride: settings,
      sendProgressMessage: true,
      sendResultMessage: true,
    });
    if (singleResult.success) {
      triggerTelegramSimpleWorker(request);
    }

    return NextResponse.json({
      ok: singleResult.success,
      submissionId: singleResult.submissionId,
      durationMs: singleResult.durationMs,
      error: singleResult.error,
    });
  } catch (error: any) {
    console.error('[TelegramSimple] Unexpected webhook error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown webhook error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-simple-webhook',
    version: '1.5.0',
    timestamp: new Date().toISOString(),
  });
}
