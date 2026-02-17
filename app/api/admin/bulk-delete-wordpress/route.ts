import { NextRequest, NextResponse } from 'next/server';
import { requireAdminRole } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireAdminRole(request, 'admin', { allowRefresh: false });
  if (!auth.ok) return auth.response;

  return NextResponse.json(
    {
      success: false,
      decommissioned: true,
      error: 'WordPress integration disabled. Use Supabase cleanup endpoints.',
    },
    { status: 410 }
  );
}
