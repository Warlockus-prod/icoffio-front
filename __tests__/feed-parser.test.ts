/**
 * Tests for the Info Portal feed parser (v10.20.x).
 *
 * Locks down the auto-detect fix: the DB `feed_type` hint is frequently wrong
 * (The Verge/Reddit stored as 'rss' but serve Atom; TechMeme/HuggingFace stored
 * as 'atom' but serve RSS). parseFeed() must extract items regardless.
 */

import { describe, it, expect } from 'vitest';
import { parseRss, parseAtom, parseFeed } from '../lib/info/feed-fetcher';

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <item>
    <title>RSS Item One</title>
    <link>https://example.com/1</link>
    <description>First description</description>
    <pubDate>Wed, 03 Jun 2026 10:00:00 GMT</pubDate>
    <guid>guid-1</guid>
  </item>
  <item>
    <title><![CDATA[RSS Item Two & friends]]></title>
    <link>https://example.com/2</link>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom Entry One</title>
    <link href="https://example.com/a1" rel="alternate"/>
    <summary>Atom summary</summary>
    <updated>2026-06-03T10:00:00Z</updated>
    <id>atom-1</id>
  </entry>
</feed>`;

describe('parseRss', () => {
  it('extracts RSS items with title + link', () => {
    const items = parseRss(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('RSS Item One');
    expect(items[0].url).toBe('https://example.com/1');
    expect(items[0].guid).toBe('guid-1');
  });
  it('decodes CDATA + entities in titles', () => {
    const items = parseRss(RSS);
    expect(items[1].title).toBe('RSS Item Two & friends');
  });
  it('returns [] for an Atom document (no <item>)', () => {
    expect(parseRss(ATOM)).toHaveLength(0);
  });
});

describe('parseAtom', () => {
  it('extracts Atom entries with title + link href', () => {
    const items = parseAtom(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Atom Entry One');
    expect(items[0].url).toBe('https://example.com/a1');
    expect(items[0].guid).toBe('atom-1');
  });
  it('returns [] for an RSS document (no <entry>)', () => {
    expect(parseAtom(RSS)).toHaveLength(0);
  });
});

describe('v10.20.9 hardening', () => {
  it('Atom entries now extract media images', () => {
    const atomWithImg = `<feed><entry>
      <title>T</title><link href="https://e.com/1"/>
      <media:content url="https://img.com/a.jpg"/>
      <id>1</id></entry></feed>`;
    expect(parseAtom(atomWithImg)[0].image_url).toBe('https://img.com/a.jpg');
  });
  it('Atom extracts <img> from content html when no media tag', () => {
    const atom = `<feed><entry><title>T</title><link href="https://e.com/1"/>
      <content type="html">&lt;p&gt;hi&lt;/p&gt;<img src="https://img.com/b.png"></content>
      <id>1</id></entry></feed>`;
    expect(parseAtom(atom)[0].image_url).toBe('https://img.com/b.png');
  });
  it('future-dated items are clamped (not stored in the future)', () => {
    const future = new Date(Date.now() + 5 * 86400_000).toUTCString();
    const rss = `<rss><channel><item><title>T</title><link>https://e.com/1</link><pubDate>${future}</pubDate></item></channel></rss>`;
    const pub = parseRss(rss)[0].published_at!;
    expect(new Date(pub).getTime()).toBeLessThanOrEqual(Date.now() + 3600_000 + 1000);
  });
  it('invalid date → null', () => {
    const rss = `<rss><channel><item><title>T</title><link>https://e.com/1</link><pubDate>not-a-date</pubDate></item></channel></rss>`;
    expect(parseRss(rss)[0].published_at).toBeNull();
  });
});

describe('parseFeed auto-detect (the v10.20.1 fix)', () => {
  it('parses RSS when hint is correct', () => {
    expect(parseFeed(RSS, 'rss')).toHaveLength(2);
  });
  it('parses Atom when hint is correct', () => {
    expect(parseFeed(ATOM, 'atom')).toHaveLength(1);
  });
  it('RECOVERS when hint says rss but body is Atom (The Verge / Reddit case)', () => {
    const items = parseFeed(ATOM, 'rss');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Atom Entry One');
  });
  it('RECOVERS when hint says atom but body is RSS (TechMeme / HuggingFace case)', () => {
    const items = parseFeed(RSS, 'atom');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('RSS Item One');
  });
  it('returns [] for unparseable content (HTML challenge page)', () => {
    expect(parseFeed('<html><body>Just a Moment...</body></html>', 'rss')).toHaveLength(0);
  });
});
