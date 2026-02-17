import { NextResponse } from 'next/server';

function decommissionedResponse() {
  return NextResponse.json(
    {
      success: false,
      decommissioned: true,
      error: 'WordPress integration disabled. This endpoint is no longer available.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return decommissionedResponse();
}

export async function POST() {
  return decommissionedResponse();
}

