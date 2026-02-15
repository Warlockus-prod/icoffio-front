#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);

  while (true) {
    const hasClone = fs.existsSync(path.join(current, 'icoffio-clone-nextjs'));
    const hasPackage = fs.existsSync(path.join(current, 'package.json'));
    if (hasClone && hasPackage) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        'Repository root not found. Run this command from project root or icoffio-clone-nextjs.'
      );
    }
    current = parent;
  }
}

function loadManifest(repoRoot) {
  const candidates = [
    path.join(repoRoot, 'sync-manifest.json'),
    path.join(repoRoot, 'icoffio-clone-nextjs', 'sync-manifest.json')
  ];

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const raw = fs.readFileSync(candidate, 'utf8');
    const manifest = JSON.parse(raw);
    if (!manifest || !Array.isArray(manifest.paths)) {
      throw new Error(`Invalid manifest format: ${candidate}`);
    }
    return {
      path: candidate,
      sourceRoot: manifest.sourceRoot || 'icoffio-clone-nextjs',
      paths: manifest.paths
    };
  }

  throw new Error('sync-manifest.json was not found.');
}

function filesAreEqual(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return false;
  const left = fs.readFileSync(a);
  const right = fs.readFileSync(b);
  return left.equals(right);
}

function main() {
  const args = new Set(process.argv.slice(2));
  const writeMode = args.has('--write');
  const modeLabel = writeMode ? 'WRITE' : 'CHECK';
  const repoRoot = findRepoRoot(process.cwd());
  const manifest = loadManifest(repoRoot);

  const missingSource = [];
  const drift = [];
  const updated = [];

  for (const relPath of manifest.paths) {
    const sourcePath = path.join(repoRoot, manifest.sourceRoot, relPath);
    const targetPath = path.join(repoRoot, relPath);

    if (!fs.existsSync(sourcePath)) {
      missingSource.push(relPath);
      continue;
    }

    if (filesAreEqual(sourcePath, targetPath)) {
      continue;
    }

    if (!writeMode) {
      drift.push(relPath);
      continue;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    updated.push(relPath);
  }

  console.log(`[sync-mirror] mode=${modeLabel}`);
  console.log(`[sync-mirror] repoRoot=${repoRoot}`);
  console.log(`[sync-mirror] manifest=${manifest.path}`);

  if (missingSource.length > 0) {
    console.error('[sync-mirror] missing source files:');
    for (const relPath of missingSource) {
      console.error(`  - ${relPath}`);
    }
    process.exit(1);
  }

  if (!writeMode) {
    if (drift.length > 0) {
      console.error('[sync-mirror] mirror drift detected:');
      for (const relPath of drift) {
        console.error(`  - ${relPath}`);
      }
      console.error('[sync-mirror] run: npm run sync:apply');
      process.exit(1);
    }

    console.log('[sync-mirror] all mirrored files are in sync.');
    return;
  }

  if (updated.length === 0) {
    console.log('[sync-mirror] no changes were needed.');
    return;
  }

  console.log(`[sync-mirror] updated ${updated.length} file(s):`);
  for (const relPath of updated) {
    console.log(`  - ${relPath}`);
  }
}

main();
