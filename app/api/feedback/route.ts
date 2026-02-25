/**
 * PUBLIC ENDPOINT: Submit feedback report
 *
 * Accepts bug reports / feature requests from any visitor.
 * No auth required, rate-limited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/api-rate-limiter';
import { createClient } from '@/lib/pg-client';

export const runtime = 'nodejs';

const VALID_CATEGORIES = ['bug', 'ui_issue', 'content_error', 'feature_request', 'other'] as const;

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateCheck = checkRateLimit(request, 'FEEDBACK_SUBMIT');
  if (!rateCheck.allowed) {
    return createRateLimitResponse('FEEDBACK_SUBMIT', rateCheck);
  }

  try {
    const body = await request.json();
    const {
      description,
      category = 'bug',
      screenshot_url,
      email,
      page_url,
      viewport_width,
      viewport_height,
      user_agent,
      color_scheme,
      locale,
      console_errors = [],
    } = body;

    // Validate required fields
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Description is required (min 10 characters)' },
        { status: 400 }
      );
    }

    if (!page_url || typeof page_url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Page URL is required' },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Optional email validation
    if (email && typeof email === 'string' && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('feedback_reports')
      .insert({
        description: description.trim().substring(0, 5000), // Max 5000 chars
        category,
        screenshot_url: screenshot_url || null,
        email: email?.trim() || null,
        page_url: page_url.substring(0, 2000),
        viewport_width: viewport_width || null,
        viewport_height: viewport_height || null,
        user_agent: (user_agent || '').substring(0, 500) || null,
        color_scheme: color_scheme || null,
        locale: locale || null,
        console_errors: Array.isArray(console_errors)
          ? JSON.stringify(console_errors.slice(0, 10))
          : '[]',
      })
      .select('id');

    if (error) {
      console.error('[Feedback API] DB insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    const id = Array.isArray(data) && data.length > 0 ? data[0].id : null;
    console.log(`[Feedback API] ✅ New feedback #${id}: ${category} — ${description.substring(0, 80)}...`);

    return NextResponse.json({
      success: true,
      id,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('[Feedback API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
