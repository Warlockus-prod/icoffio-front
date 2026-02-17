import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      decommissioned: true,
      error: 'WordPress integration disabled. Use Supabase cleanup endpoints.',
    },
    { status: 410 }
  );
}

