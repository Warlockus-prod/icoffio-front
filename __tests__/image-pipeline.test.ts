import { describe, expect, it } from 'vitest';
import { extractImageKeywords, buildImageKeywordPhrase } from '@/lib/image-keywords';
import { renderContent } from '@/lib/markdown';

describe('image keywords', () => {
  it('uses title and context keywords', () => {
    const keywords = extractImageKeywords(
      {
        title: 'Garmin Fenix 7 Pro now costs less',
        excerpt: 'Battery lasts 22 days with solar charging and GPS workouts.',
        category: 'gadgets',
      },
      8
    );

    expect(keywords).toContain('garmin');
    expect(keywords).toContain('fenix');
    expect(keywords).toContain('battery');
  });

  it('builds a compact phrase from mixed context', () => {
    const phrase = buildImageKeywordPhrase(
      {
        title: 'AI Camera Drone Review',
        excerpt: '4K stabilization and obstacle detection in mountain flights',
        category: 'tech',
      },
      6
    );

    expect(phrase).toMatch(/camera|drone/i);
  });
});

describe('content image sanitization', () => {
  it('removes invalid unsplash photo-1 image placeholders', () => {
    const html = renderContent(
      '<p>Before</p><p><img src="https://images.unsplash.com/photo-1?q=garmin&w=1200&h=400&fit=crop" alt="bad"></p><p>After</p>'
    );

    expect(html).not.toContain('photo-1?q=garmin');
    expect(html).toContain('<p>Before</p>');
    expect(html).toContain('<p>After</p>');
  });

  it('keeps valid image tags intact', () => {
    const html = renderContent(
      '<p><img src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop" alt="ok"></p>'
    );

    expect(html).toContain('photo-1518770660439-4636190af475');
  });
});
