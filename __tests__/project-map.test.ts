import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Keeps AGENTS.md / ARCHITECTURE.md honest: every source file is on the map,
// every path the map quotes exists, and CLAUDE.md still imports AGENTS.md.
const root = path.resolve(__dirname, '..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

const agents = read('AGENTS.md');
const architecture = read('ARCHITECTURE.md');

function trackedFiles(): string[] {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const MAPPED = /^(app|lib|components|styles|scripts|supabase|public|__tests__|\.github|backups|tests)\//;
const ROOT_CONFIG = new Set([
  'middleware.ts', 'Dockerfile', 'docker-compose.vps.yml', 'next.config.mjs', 'tailwind.config.ts',
  'postcss.config.js', 'tsconfig.json', 'vitest.config.ts', 'package.json', '.env.example',
]);

describe('project map', () => {
  it('CLAUDE.md imports AGENTS.md', () => {
    expect(read('CLAUDE.md').split('\n')[0].trim()).toBe('@AGENTS.md');
  });

  it('lists every source file in ARCHITECTURE.md', () => {
    const files = trackedFiles();
    if (files.length === 0) return; // no git (e.g. inside a Docker build context)
    const missing = files.filter((file) => (MAPPED.test(file) || ROOT_CONFIG.has(file)) && !architecture.includes(file));
    expect(missing).toEqual([]);
  });

  it('every repo path quoted in the map exists', () => {
    const quoted = [...`${agents}\n${architecture}`.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]);
    const repoPaths = quoted.filter((p) =>
      /^(app|lib|components|styles|scripts|supabase|public|__tests__|docs|\.github|\.husky|backups|tests)\//.test(p)
      && !p.includes('<') && !p.includes('*'));
    const missing = [...new Set(repoPaths)].filter((p) => !existsSync(path.join(root, p.replace(/\/$/, ''))));
    expect(missing).toEqual([]);
  });
});
