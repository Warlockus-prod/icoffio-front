import { describe, it, expect } from 'vitest';
import { getScanLog, deleteScanLog, isValidScanLogId } from '@/lib/ad-diagnostics-logs';

// GET /api/ad-diagnostics/logs?id=../../package used to return /app/package.json
// (and DELETE could remove any .json in the container): the id went straight
// into path.join. Only ids in the generator's own shape are accepted now.
describe('ad-diagnostics log ids', () => {
  it('accepts generated ids', () => {
    expect(isValidScanLogId('20260330092443-8b0ux2')).toBe(true);
  });

  it('rejects traversal and anything else', () => {
    for (const id of ['../../package', '..%2F..%2Fpackage', '20260330092443-8b0ux2/../../x', 'all', '', 'abc', '20260330092443-ABC']) {
      expect(isValidScanLogId(id)).toBe(false);
    }
  });

  it('never touches the filesystem for a bad id', async () => {
    expect(await getScanLog('../../package')).toBeNull();
    expect(await deleteScanLog('../../package')).toBe(false);
  });
});
