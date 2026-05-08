/**
 * Self-hosted error logger — replaces Sentry.
 *
 * v10.8.0 — replaces ad-hoc `console.error` calls with structured logging that:
 *   - Always writes to console (so docker logs still has it)
 *   - INSERTs into `errors_log` table (visible via /api/admin/errors-log)
 *   - On level='critical' — fires Telegram notification to ADMIN_TELEGRAM_CHAT_ID
 *
 * Usage:
 *   import { logError } from '@/lib/error-logger';
 *   try { ... } catch (err) {
 *     await logError({
 *       source: 'telegram-webhook',
 *       message: 'AI processing failed',
 *       error: err,
 *       metadata: { chatId, jobId },
 *       level: 'error',
 *     });
 *   }
 *
 * Designed to NEVER throw — error logging itself failing should not break the caller.
 */

import { getPool } from './pg-pool';

export type ErrorLevel = 'info' | 'warn' | 'error' | 'critical';

export interface LogErrorOptions {
  /** Severity. Default: 'error'. */
  level?: ErrorLevel;
  /** Free-form source identifier — e.g. 'admin-auth', 'telegram-webhook', 'info-watch-analyze'. */
  source: string;
  /** Short human-readable message. Required. */
  message: string;
  /** Original Error instance — stack will be auto-captured. */
  error?: unknown;
  /** Free-form structured context (chat_id, job_id, url, etc.). Goes into JSONB column. */
  metadata?: Record<string, unknown>;
  /** Request path if known. */
  requestPath?: string;
  /** HTTP method if known. */
  requestMethod?: string;
  /** Authenticated user email if known. */
  userEmail?: string;
  /** Client IP if known. */
  userIp?: string;
  /** When true, also fire Telegram alert regardless of level. Default: only critical. */
  alertTelegram?: boolean;
}

/**
 * Log an error to console + DB. Never throws.
 */
export async function logError(opts: LogErrorOptions): Promise<void> {
  const level: ErrorLevel = opts.level ?? 'error';
  const stack = opts.error instanceof Error ? opts.error.stack : undefined;
  const errorMessage = opts.error instanceof Error ? opts.error.message : String(opts.error ?? '');

  // 1. Always console (so docker logs has it as fallback when DB write fails)
  const prefix = `[${level.toUpperCase()}] [${opts.source}]`;
  if (level === 'info') console.info(prefix, opts.message, opts.metadata ?? '');
  else if (level === 'warn') console.warn(prefix, opts.message, opts.metadata ?? '');
  else console.error(prefix, opts.message, errorMessage || '', stack || '');

  // 2. Insert into DB (best-effort)
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO errors_log
        (level, source, message, stack, metadata, request_path, request_method, user_email, user_ip)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        level,
        opts.source.slice(0, 100),
        opts.message.slice(0, 5000) + (errorMessage ? ` :: ${errorMessage}`.slice(0, 5000) : ''),
        stack?.slice(0, 10000) ?? null,
        JSON.stringify(opts.metadata ?? {}),
        opts.requestPath?.slice(0, 500) ?? null,
        opts.requestMethod?.slice(0, 10) ?? null,
        opts.userEmail?.slice(0, 255) ?? null,
        opts.userIp?.slice(0, 45) ?? null,
      ],
    );
  } catch (dbErr) {
    // Don't throw — error logging must not break the caller
    console.error('[error-logger] DB write failed:', dbErr);
  }

  // 3. Fire Telegram alert on critical (or when explicitly requested)
  if (level === 'critical' || opts.alertTelegram) {
    void notifyTelegram({
      level,
      source: opts.source,
      message: opts.message,
      error: errorMessage,
      metadata: opts.metadata,
    }).catch((notifyErr) => {
      console.error('[error-logger] Telegram notify failed:', notifyErr);
    });
  }
}

/**
 * Send a critical-error alert to the admin Telegram chat.
 * Best-effort: failures are logged to console but do not throw.
 */
async function notifyTelegram(payload: {
  level: ErrorLevel;
  source: string;
  message: string;
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return; // not configured — silently skip

  const lines: string[] = [
    `🚨 *${payload.level.toUpperCase()}* in \`${payload.source}\``,
    '',
    payload.message,
  ];
  if (payload.error) lines.push('', `\`\`\`\n${payload.error.slice(0, 500)}\n\`\`\``);
  if (payload.metadata && Object.keys(payload.metadata).length > 0) {
    lines.push('', `\`\`\`json\n${JSON.stringify(payload.metadata, null, 2).slice(0, 800)}\n\`\`\``);
  }

  const body = {
    chat_id: chatId,
    text: lines.join('\n'),
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  };

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // swallow — already logged at outer level
  }
}

/**
 * Convenience wrappers.
 */
export const logInfo = (opts: Omit<LogErrorOptions, 'level'>) => logError({ ...opts, level: 'info' });
export const logWarn = (opts: Omit<LogErrorOptions, 'level'>) => logError({ ...opts, level: 'warn' });
export const logCritical = (opts: Omit<LogErrorOptions, 'level'>) => logError({ ...opts, level: 'critical' });
