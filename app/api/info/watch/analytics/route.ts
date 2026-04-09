import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/pg-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pool = getPool();
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'keywords', 'correlation', 'report_diff'
    const topicId = searchParams.get('topic_id');
    const days = parseInt(searchParams.get('days') || '14', 10);

    if (type === 'keywords') {
      // Keyword cloud: extract most frequent words from article titles for a topic or all
      const query = topicId
        ? `SELECT title FROM info_watch_items WHERE topic_id = $1 AND is_duplicate = false AND (published_at > NOW() - INTERVAL '1 day' * $2 OR published_at IS NULL)`
        : `SELECT title FROM info_watch_items WHERE is_duplicate = false AND (published_at > NOW() - INTERVAL '1 day' * $1 OR published_at IS NULL)`;
      const params = topicId ? [topicId, days] : [days];
      const { rows } = await pool.query(query, params);

      // Count word frequency (exclude common stopwords)
      const stopwords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
        'it', 'its', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they',
        'me', 'us', 'him', 'her', 'them', 'my', 'our', 'your', 'his', 'their', 'who', 'which',
        'what', 'when', 'where', 'how', 'why', 'not', 'no', 'nor', 'than', 'then', 'so', 'if',
        'as', 'up', 'out', 'about', 'into', 'over', 'after', 'before', 'between', 'under',
        'again', 'further', 'once', 'here', 'there', 'all', 'each', 'every', 'both', 'few',
        'more', 'most', 'other', 'some', 'such', 'own', 'same', 'too', 'very', 'just',
        'new', 'also', 'now', 'says', 'said', 'per', 'via', 'vs', 'etc',
        'will', 'one', 'two', 'first', 'last', 'next', 'get', 'set',
        // Polish/Russian stopwords
        'i', 'w', 'na', 'z', 'do', 'o', 'nie', 'się', 'to', 'jest', 'za', 'jak', 'co',
        'и', 'в', 'на', 'с', 'по', 'не', 'для', 'от', 'что', 'это', 'как', 'из',
      ]);

      const wordCounts: Record<string, number> = {};
      for (const row of rows) {
        const words = (row.title as string)
          .toLowerCase()
          .replace(/[^a-zA-Zа-яА-ЯёЁąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s-]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopwords.has(w));
        for (const word of words) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      }

      // Top 50 words sorted by frequency
      const keywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([word, count]) => ({ word, count }));

      return NextResponse.json({ keywords, total_articles: rows.length });
    }

    if (type === 'correlation') {
      // Cross-topic correlation: find topics that share article sources or keywords
      const { rows } = await pool.query(`
        SELECT
          t1.id as topic1_id, t1.name as topic1_name,
          t2.id as topic2_id, t2.name as topic2_name,
          COUNT(*) as shared_sources
        FROM info_watch_items w1
        JOIN info_watch_items w2 ON w1.source_name = w2.source_name
          AND w1.topic_id < w2.topic_id
          AND w1.is_duplicate = false AND w2.is_duplicate = false
          AND w1.published_at > NOW() - INTERVAL '1 day' * $1
          AND w2.published_at > NOW() - INTERVAL '1 day' * $1
        JOIN info_watch_topics t1 ON t1.id = w1.topic_id AND t1.is_active = true
        JOIN info_watch_topics t2 ON t2.id = w2.topic_id AND t2.is_active = true
        GROUP BY t1.id, t1.name, t2.id, t2.name
        HAVING COUNT(*) >= 2
        ORDER BY shared_sources DESC
        LIMIT 30
      `, [days]);

      return NextResponse.json({ correlations: rows });
    }

    if (type === 'report_diff') {
      if (!topicId) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

      // Get last 2 reports for comparison
      const { rows: reports } = await pool.query(
        `SELECT id, content, created_at FROM info_watch_reports
         WHERE topic_id = $1 ORDER BY created_at DESC LIMIT 2`,
        [topicId]
      );

      if (reports.length < 2) {
        return NextResponse.json({ diff: null, message: 'Need at least 2 reports for comparison' });
      }

      const [current, previous] = reports;

      // Extract key sections from both reports for comparison
      const extractSections = (content: string) => {
        const sections: Record<string, string> = {};
        const parts = content.split(/^## /gm);
        for (const part of parts) {
          if (!part.trim()) continue;
          const firstLine = part.split('\n')[0].trim();
          sections[firstLine] = part;
        }
        return sections;
      };

      const currentSections = extractSections(current.content);
      const previousSections = extractSections(previous.content);

      // Simple diff: find new sections, changed sections, removed sections
      const changes: { section: string; status: 'new' | 'changed' | 'removed'; current?: string; previous?: string }[] = [];

      for (const [key, val] of Object.entries(currentSections)) {
        if (!previousSections[key]) {
          changes.push({ section: key, status: 'new', current: val.substring(0, 200) });
        } else if (previousSections[key] !== val) {
          changes.push({ section: key, status: 'changed', current: val.substring(0, 200), previous: previousSections[key].substring(0, 200) });
        }
      }
      for (const key of Object.keys(previousSections)) {
        if (!currentSections[key]) {
          changes.push({ section: key, status: 'removed', previous: previousSections[key].substring(0, 200) });
        }
      }

      return NextResponse.json({
        diff: {
          current_date: current.created_at,
          previous_date: previous.created_at,
          changes,
          current_length: current.content.length,
          previous_length: previous.content.length,
        },
      });
    }

    return NextResponse.json({ error: 'type parameter required (keywords, correlation, report_diff)' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
