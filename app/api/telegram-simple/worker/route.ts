/**
 * TELEGRAM SIMPLE QUEUE WORKER
 *
 * Processes queued telegram-simple jobs from Supabase `telegram_jobs`.
 * Designed to run from cron (Vercel Cron or external scheduler).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  claimPendingTelegramSimpleJobs,
  completeTelegramSimpleJob,
  failTelegramSimpleJob,
  recycleStaleTelegramSimpleJobs,
  type TelegramSimpleJob,
  type TelegramSimpleQueuePayload,
} from '@/lib/telegram-simple/job-queue';
import { processSubmission } from '@/app/api/telegram-simple/webhook/route';

export const runtime = 'nodejs';
export const maxDuration = 300;

type WorkerAuthResult = {
  ok: boolean;
  status: number;
  error?: string;
};

function getWorkerSecret(): string {
  return (process.env.TELEGRAM_WORKER_SECRET || process.env.CRON_SECRET || '').trim();
}

function isWorkerAuthorized(request: NextRequest): WorkerAuthResult {
  if (request.headers.get('x-vercel-cron')) {
    return { ok: true, status: 200 };
  }

  const secret = getWorkerSecret();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return {
        ok: false,
        status: 503,
        error: 'Worker secret is not configured',
      };
    }
    return { ok: true, status: 200 };
  }

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const queryToken = request.nextUrl.searchParams.get('token') || '';
  if (bearer === secret || queryToken === secret) {
    return { ok: true, status: 200 };
  }

  return {
    ok: false,
    status: 401,
    error: 'Unauthorized worker call',
  };
}

async function processClaimedJob(job: TelegramSimpleJob) {
  const payload = (job.data || {}) as TelegramSimpleQueuePayload;
  const existingSubmissionId = Number(payload.existingSubmissionId || 0) || null;

  const result = await processSubmission({
    ...payload,
    existingSubmissionId,
    skipDuplicateCheck: true,
    sendProgressMessage: payload.sendProgressMessage ?? true,
    sendResultMessage: payload.sendResultMessage ?? true,
  });

  if (result.success) {
    await completeTelegramSimpleJob(job.id, {
      submissionId: result.submissionId,
      enUrl: result.enUrl || null,
      plUrl: result.plUrl || null,
      durationMs: result.durationMs,
      queued: result.queued || false,
    });
    return { success: true, retried: false };
  }

  const retryInfo = await failTelegramSimpleJob(job, result.error || 'Unknown queue error');
  return { success: false, retried: retryInfo.retried };
}

async function runWorker(limit: number) {
  const stale = await recycleStaleTelegramSimpleJobs();
  const claimed = await claimPendingTelegramSimpleJobs(limit);

  let completed = 0;
  let failed = 0;
  let retried = 0;

  for (const job of claimed) {
    try {
      const outcome = await processClaimedJob(job);
      if (outcome.success) {
        completed += 1;
      } else {
        failed += 1;
        if (outcome.retried) retried += 1;
      }
    } catch (error: any) {
      console.error('[TelegramSimpleWorker] Unexpected job error:', job.id, error?.message || error);
      const retryInfo = await failTelegramSimpleJob(
        job,
        error instanceof Error ? error.message : 'Unexpected worker error'
      );
      failed += 1;
      if (retryInfo.retried) retried += 1;
    }
  }

  return {
    ok: true,
    claimed: claimed.length,
    completed,
    failed,
    retried,
    staleRequeued: stale.requeued,
    staleFailed: stale.failed,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const auth = isWorkerAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error || 'Unauthorized worker call' },
      { status: auth.status }
    );
  }

  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || '2'), 1), 10);
  const summary = await runWorker(limit);
  return NextResponse.json(summary);
}

export async function POST(request: NextRequest) {
  const auth = isWorkerAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error || 'Unauthorized worker call' },
      { status: auth.status }
    );
  }

  let limit = 2;
  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body.limit === 'number') {
      limit = body.limit;
    }
  } catch {
    // no-op, keep default
  }

  limit = Math.min(Math.max(Number(limit || 2), 1), 10);
  const summary = await runWorker(limit);
  return NextResponse.json(summary);
}
