import { mkdir, readFile, writeFile, appendFile } from 'fs/promises';
import path from 'path';

export type ServerLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ServerLogCategory = 'parser' | 'queue' | 'api' | 'system' | 'telegram';

export interface ServerLogEntry {
  id: string;
  timestamp: string;
  level: ServerLogLevel;
  category: ServerLogCategory;
  action: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ServerLogQuery {
  level?: ServerLogLevel;
  category?: ServerLogCategory;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}

const LOG_DIR = path.join(process.cwd(), 'runtime-logs');
const LOG_FILE = path.join(LOG_DIR, 'system-events.ndjson');
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

function clampLimit(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Number(limit)));
}

function parseDate(value?: string): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function matchesQuery(entry: ServerLogEntry, query: ServerLogQuery): boolean {
  if (query.level && entry.level !== query.level) return false;
  if (query.category && entry.category !== query.category) return false;

  const fromTs = parseDate(query.from);
  if (fromTs && new Date(entry.timestamp).getTime() < fromTs) return false;

  const toTs = parseDate(query.to);
  if (toTs && new Date(entry.timestamp).getTime() > toTs) return false;

  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = `${entry.action} ${entry.message} ${JSON.stringify(entry.details || {})}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export async function appendServerLog(
  level: ServerLogLevel,
  category: ServerLogCategory,
  action: string,
  message: string,
  details?: Record<string, unknown>
): Promise<void> {
  const entry: ServerLogEntry = {
    id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    action,
    message,
    details,
  };

  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[ServerLogStore] Failed to append log:', error);
  }
}

export async function readServerLogs(query: ServerLogQuery = {}): Promise<ServerLogEntry[]> {
  try {
    const raw = await readFile(LOG_FILE, 'utf8');
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: ServerLogEntry[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ServerLogEntry;
        if (entry && entry.id && entry.timestamp) {
          parsed.push(entry);
        }
      } catch {
        // Skip malformed lines to keep reader resilient.
      }
    }

    const filtered = parsed
      .filter((entry) => matchesQuery(entry, query))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return filtered.slice(0, clampLimit(query.limit));
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    console.error('[ServerLogStore] Failed to read logs:', error);
    return [];
  }
}

export async function clearServerLogs(): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await writeFile(LOG_FILE, '', 'utf8');
  } catch (error) {
    console.error('[ServerLogStore] Failed to clear logs:', error);
  }
}

