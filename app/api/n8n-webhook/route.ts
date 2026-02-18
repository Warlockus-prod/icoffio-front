import { NextResponse } from 'next/server';

/**
 * N8N webhook — DEPRECATED and DISABLED.
 * This endpoint is no longer active. Use /api/articles instead.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'This endpoint is deprecated. Use /api/articles instead.' },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'This endpoint is deprecated. Use /api/articles instead.' },
    { status: 410 }
  );
}
