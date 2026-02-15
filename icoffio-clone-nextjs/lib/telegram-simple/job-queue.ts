import { createClient } from '@supabase/supabase-js';
import type { TelegramSettings } from './types';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TelegramSimpleQueuePayload {
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
  sendProgressMessage?: boolean;
  sendResultMessage?: boolean;
}

export interface TelegramSimpleJob {
  id: string;
  type: string;
  status: JobStatus;
  data: TelegramSimpleQueuePayload;
  result?: any;
  error?: string | null;
  retries: number;
  max_retries: number;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
}

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

function buildJobId(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `simple_${Date.now()}_${suffix}`;
}

export async function enqueueTelegramSimpleJob(
  payload: TelegramSimpleQueuePayload,
  maxRetries: number = 2
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const id = buildJobId();
  const { error } = await supabase
    .from('telegram_jobs')
    .insert({
      id,
      type: 'telegram-simple',
      status: 'pending',
      data: payload,
      retries: 0,
      max_retries: maxRetries,
    });

  if (error) {
    console.error('[TelegramSimpleQueue] Failed to enqueue job:', error.message);
    return null;
  }

  return id;
}

export async function claimPendingTelegramSimpleJobs(limit: number = 1): Promise<TelegramSimpleJob[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: pending, error } = await supabase
    .from('telegram_jobs')
    .select('*')
    .eq('type', 'telegram-simple')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !pending?.length) {
    if (error) {
      console.error('[TelegramSimpleQueue] Failed to fetch pending jobs:', error.message);
    }
    return [];
  }

  const claimed: TelegramSimpleJob[] = [];
  const startedAt = new Date().toISOString();

  for (const job of pending) {
    const { data: updated, error: updateError } = await supabase
      .from('telegram_jobs')
      .update({
        status: 'processing',
        started_at: startedAt,
      })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('*')
      .maybeSingle();

    if (!updateError && updated) {
      claimed.push(updated as TelegramSimpleJob);
    }
  }

  return claimed;
}

export async function recycleStaleTelegramSimpleJobs(
  staleAfterMs: number = 10 * 60 * 1000
): Promise<{ requeued: number; failed: number }> {
  const supabase = getSupabase();
  if (!supabase) return { requeued: 0, failed: 0 };

  const staleBeforeIso = new Date(Date.now() - staleAfterMs).toISOString();
  const { data: staleJobs, error } = await supabase
    .from('telegram_jobs')
    .select('*')
    .eq('type', 'telegram-simple')
    .eq('status', 'processing')
    .lt('started_at', staleBeforeIso)
    .limit(50);

  if (error || !staleJobs?.length) {
    if (error) {
      console.error('[TelegramSimpleQueue] Failed to fetch stale jobs:', error.message);
    }
    return { requeued: 0, failed: 0 };
  }

  let requeued = 0;
  let failed = 0;

  for (const stale of staleJobs) {
    const retries = Number(stale.retries || 0) + 1;
    const maxRetries = Number(stale.max_retries || 2);
    if (retries <= maxRetries) {
      const { error: updateError } = await supabase
        .from('telegram_jobs')
        .update({
          status: 'pending',
          retries,
          error: 'Requeued stale processing job',
          started_at: null,
        })
        .eq('id', stale.id)
        .eq('status', 'processing');
      if (!updateError) requeued += 1;
    } else {
      const { error: updateError } = await supabase
        .from('telegram_jobs')
        .update({
          status: 'failed',
          retries,
          error: 'Stale processing job exceeded retries',
          completed_at: new Date().toISOString(),
        })
        .eq('id', stale.id)
        .eq('status', 'processing');
      if (!updateError) failed += 1;
    }
  }

  return { requeued, failed };
}

export async function completeTelegramSimpleJob(jobId: string, result: any): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('telegram_jobs')
    .update({
      status: 'completed',
      result,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error('[TelegramSimpleQueue] Failed to complete job:', jobId, error.message);
  }
}

export async function failTelegramSimpleJob(
  job: Pick<TelegramSimpleJob, 'id' | 'retries' | 'max_retries'>,
  errorMessage: string
): Promise<{ retried: boolean; retries: number }> {
  const supabase = getSupabase();
  if (!supabase) return { retried: false, retries: job.retries || 0 };

  const retries = Number(job.retries || 0) + 1;
  const maxRetries = Number(job.max_retries || 2);

  if (retries <= maxRetries) {
    const { error } = await supabase
      .from('telegram_jobs')
      .update({
        status: 'pending',
        retries,
        error: errorMessage,
        started_at: null,
      })
      .eq('id', job.id);

    if (error) {
      console.error('[TelegramSimpleQueue] Failed to requeue job:', job.id, error.message);
      return { retried: false, retries };
    }

    return { retried: true, retries };
  }

  const { error } = await supabase
    .from('telegram_jobs')
    .update({
      status: 'failed',
      retries,
      error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  if (error) {
    console.error('[TelegramSimpleQueue] Failed to mark job as failed:', job.id, error.message);
  }

  return { retried: false, retries };
}
