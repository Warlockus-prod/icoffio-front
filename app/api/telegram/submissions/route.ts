/**
 * TELEGRAM SUBMISSIONS API
 * 
 * GET /api/telegram/submissions
 * Query params:
 * - limit: number (default: 50)
 * - status: 'processing' | 'published' | 'failed' (optional)
 * 
 * Returns list of telegram submissions with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTelegramSubmissions } from '@/lib/supabase-analytics';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as 'processing' | 'published' | 'failed' | undefined;

    // Validate limit
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 200' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !['processing', 'published', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: processing, published, or failed' },
        { status: 400 }
      );
    }

    // Get submissions from Supabase
    const submissions = await getTelegramSubmissions(limit, status);

    // Calculate stats
    const stats = {
      total: submissions.length,
      processing: submissions.filter(s => s.status === 'processing').length,
      published: submissions.filter(s => s.status === 'published').length,
      failed: submissions.filter(s => s.status === 'failed').length,
      url_submissions: submissions.filter(s => s.submission_type === 'url').length,
      text_submissions: submissions.filter(s => s.submission_type === 'text').length,
    };

    return NextResponse.json({
      success: true,
      stats,
      submissions,
      count: submissions.length,
      filters: {
        limit,
        status: status || 'all',
      },
    });

  } catch (error) {
    console.error('[Submissions API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


