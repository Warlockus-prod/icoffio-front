import { NextRequest, NextResponse } from 'next/server';
import { listScanLogs, getScanLog, deleteScanLog, deleteAllScanLogs } from '@/lib/ad-diagnostics-logs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const format = searchParams.get('format');

  // Single log by ID
  if (id) {
    const log = await getScanLog(id);
    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    // Download as JSON file
    if (format === 'download') {
      const filename = `ad-scan-${log.hostname}-${log.timestamp.slice(0, 10)}-${id}.json`;
      return new NextResponse(JSON.stringify(log.result, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(log);
  }

  // List all logs
  const logs = await listScanLogs();

  // Download all as single JSON
  if (format === 'download-all') {
    const filename = `ad-diagnostics-all-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(logs, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ logs, total: logs.length });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (id === 'all') {
    const count = await deleteAllScanLogs();
    return NextResponse.json({ deleted: count });
  }

  if (id) {
    const ok = await deleteScanLog(id);
    if (!ok) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
}
