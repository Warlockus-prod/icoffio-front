/**
 * TELEGRAM BOT ERROR LOG API
 * 
 * View errors from Telegram bot for admin review
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory error log (shared with webhook)
// This is a simple implementation - in production use database
let errorLog: Array<{
  jobId: string;
  chatId: number;
  errorType: string;
  error: string;
  timestamp: string;
  jobData: any;
}> = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const errorType = searchParams.get('type');

    let filteredErrors = errorLog;

    // Filter by error type if specified
    if (errorType) {
      filteredErrors = errorLog.filter(e => e.errorType === errorType);
    }

    // Get last N errors
    const errors = filteredErrors.slice(-limit).reverse();

    return NextResponse.json({
      total: errorLog.length,
      filtered: filteredErrors.length,
      errors,
      errorTypes: [...new Set(errorLog.map(e => e.errorType))]
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Add error (used by webhook)
export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    errorLog.push({
      ...errorData,
      timestamp: errorData.timestamp || new Date().toISOString()
    });

    // Keep only last 100 errors
    if (errorLog.length > 100) {
      errorLog = errorLog.slice(-100);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Clear errors
export async function DELETE() {
  const count = errorLog.length;
  errorLog = [];
  
  return NextResponse.json({
    success: true,
    cleared: count
  });
}








