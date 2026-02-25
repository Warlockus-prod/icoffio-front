/**
 * PUBLIC ENDPOINT: Upload feedback screenshot
 *
 * Uploads annotated screenshot to Vercel Blob for feedback reports.
 * No auth required, rate-limited to prevent abuse.
 */

import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/api-rate-limiter';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateCheck = checkRateLimit(request, 'FEEDBACK_SUBMIT');
  if (!rateCheck.allowed) {
    return createRateLimitResponse('FEEDBACK_SUBMIT', rateCheck);
  }

  try {
    const formData = await request.formData();
    const file = formData.get('screenshot') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No screenshot provided' },
        { status: 400 }
      );
    }

    // Only PNG allowed (html2canvas output)
    if (file.type !== 'image/png') {
      return NextResponse.json(
        { success: false, error: 'Only PNG screenshots allowed' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `Screenshot too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const filename = `feedback/${timestamp}-${randomSuffix}.png`;

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error('[Feedback Upload] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
