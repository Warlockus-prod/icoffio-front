import fs from 'fs/promises';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'data', 'ad-diagnostics-logs');
const MAX_LOGS = 500;

export interface ScanLogEntry {
  id: string;
  timestamp: string;
  url: string;
  hostname: string;
  pageSize: number;
  fetchTime: number;
  inImageDetected: boolean;
  inImageProvider: string | null;
  inImageMethod: string;
  gamDetected: boolean;
  gamNetworkId: string | null;
  adScriptCount: number;
  adContainerCount: number;
  mutationObserverCount: number;
  thirdPartyDomainCount: number;
  policyErrors: number;
  policyWarnings: number;
  policyIssues: Array<{ severity: string; category: string; message: string; detail: string }>;
}

export interface ScanLogFull extends ScanLogEntry {
  result: Record<string, unknown>;
}

async function ensureDir() {
  await fs.mkdir(LOGS_DIR, { recursive: true });
}

function generateId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 50);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveScanLog(result: any): Promise<string> {
  await ensureDir();

  const id = generateId();
  const entry: ScanLogFull = {
    id,
    timestamp: new Date().toISOString(),
    url: result.url,
    hostname: extractHostname(result.url),
    pageSize: result.pageSize,
    fetchTime: result.fetchTime,
    inImageDetected: result.inImageDetection?.detected || false,
    inImageProvider: result.inImageDetection?.provider || null,
    inImageMethod: result.inImageDetection?.integrationMethod || 'unknown',
    gamDetected: result.googleAdManager?.detected || false,
    gamNetworkId: result.googleAdManager?.networkId || null,
    adScriptCount: result.performance?.adScriptCount || 0,
    adContainerCount: result.adContainers?.length || 0,
    mutationObserverCount: result.performance?.mutationObserverCount || 0,
    thirdPartyDomainCount: result.performance?.thirdPartyDomains?.length || 0,
    policyErrors: (result.policyIssues || []).filter((i: { severity: string }) => i.severity === 'error').length,
    policyWarnings: (result.policyIssues || []).filter((i: { severity: string }) => i.severity === 'warning').length,
    policyIssues: result.policyIssues || [],
    result,
  };

  const filename = `${id}.json`;
  await fs.writeFile(path.join(LOGS_DIR, filename), JSON.stringify(entry, null, 2));

  // Prune old logs if over limit
  try {
    const files = await fs.readdir(LOGS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();
    if (jsonFiles.length > MAX_LOGS) {
      const toDelete = jsonFiles.slice(MAX_LOGS);
      await Promise.all(toDelete.map(f => fs.unlink(path.join(LOGS_DIR, f))));
    }
  } catch { /* ignore pruning errors */ }

  return id;
}

export async function listScanLogs(): Promise<ScanLogEntry[]> {
  await ensureDir();

  const files = await fs.readdir(LOGS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

  const entries: ScanLogEntry[] = [];
  for (const file of jsonFiles.slice(0, 200)) {
    try {
      const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf-8');
      const data = JSON.parse(content) as ScanLogFull;
      // Return without full result to keep response small
      const { result: _, ...entry } = data;
      entries.push(entry);
    } catch { /* skip corrupted files */ }
  }

  return entries;
}

export async function getScanLog(id: string): Promise<ScanLogFull | null> {
  await ensureDir();

  const filename = `${id}.json`;
  const filepath = path.join(LOGS_DIR, filename);

  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(content) as ScanLogFull;
  } catch {
    return null;
  }
}

export async function deleteScanLog(id: string): Promise<boolean> {
  await ensureDir();

  const filename = `${id}.json`;
  const filepath = path.join(LOGS_DIR, filename);

  try {
    await fs.unlink(filepath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteAllScanLogs(): Promise<number> {
  await ensureDir();

  const files = await fs.readdir(LOGS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  await Promise.all(jsonFiles.map(f => fs.unlink(path.join(LOGS_DIR, f))));
  return jsonFiles.length;
}
