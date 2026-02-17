import { describe, expect, it } from 'vitest';
import {
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  evaluateTitlePolicy,
  normalizeTitleForPublishing,
} from '@/lib/utils/title-policy';

describe('title policy', () => {
  it('trims markdown artifacts and keeps plain readable title', () => {
    const title = normalizeTitleForPublishing('## **Breaking:** AI update for 2026');
    expect(title).toBe('Breaking: AI update for 2026');
  });

  it('cuts overlong titles to max length without adding ellipsis', () => {
    const longTitle =
      'This is an extremely long headline that keeps going far beyond the allowed length and should be cut cleanly at a word boundary for publication safety';
    const normalized = normalizeTitleForPublishing(longTitle);
    expect(normalized.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
    expect(normalized.endsWith('...')).toBe(false);
  });

  it('reports too-short titles as quality issue', () => {
    const result = evaluateTitlePolicy('Short title');
    expect(result.length).toBeLessThan(TITLE_MIN_LENGTH);
    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('Title is too short');
  });

  it('accepts titles inside the target window', () => {
    const result = evaluateTitlePolicy(
      'WhatsApp receives long-awaited update and starts supporting old laptops globally'
    );
    expect(result.isValid).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(TITLE_MIN_LENGTH);
    expect(result.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
  });
});
