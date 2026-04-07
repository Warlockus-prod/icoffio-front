import { getPool } from '@/lib/pg-pool';
import type { WatchTopic, WatchItem, WatchReport, WatchTopicFull } from './watch-types';

export async function getWatchTopics(): Promise<WatchTopic[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM info_watch_topics WHERE is_active = true ORDER BY sort_order, created_at'
  );
  return rows;
}

export async function getAllWatchTopics(): Promise<WatchTopic[]> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM info_watch_topics ORDER BY sort_order, created_at');
  return rows;
}

export async function getWatchTopicFull(topicId: number): Promise<WatchTopicFull | null> {
  const pool = getPool();

  const { rows: [topic] } = await pool.query(
    'SELECT * FROM info_watch_topics WHERE id = $1', [topicId]
  );
  if (!topic) return null;

  const { rows: items } = await pool.query(
    `SELECT * FROM info_watch_items WHERE topic_id = $1
     ORDER BY published_at DESC NULLS LAST LIMIT 50`,
    [topicId]
  );

  const { rows: [report] } = await pool.query(
    `SELECT * FROM info_watch_reports WHERE topic_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [topicId]
  );

  const { rows: [countRow] } = await pool.query(
    'SELECT COUNT(*) as cnt FROM info_watch_items WHERE topic_id = $1',
    [topicId]
  );

  return {
    ...topic,
    items,
    latest_report: report || null,
    item_count: parseInt(countRow.cnt, 10),
  };
}

export async function getWatchTopicsWithItems(): Promise<WatchTopicFull[]> {
  const pool = getPool();
  const { rows: topics } = await pool.query(
    'SELECT * FROM info_watch_topics WHERE is_active = true ORDER BY sort_order, created_at'
  );

  const result: WatchTopicFull[] = [];
  for (const topic of topics) {
    const { rows: items } = await pool.query(
      `SELECT * FROM info_watch_items WHERE topic_id = $1
       ORDER BY published_at DESC NULLS LAST LIMIT 15`,
      [topic.id]
    );

    const { rows: [report] } = await pool.query(
      `SELECT * FROM info_watch_reports WHERE topic_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [topic.id]
    );

    const { rows: [countRow] } = await pool.query(
      'SELECT COUNT(*) as cnt FROM info_watch_items WHERE topic_id = $1',
      [topic.id]
    );

    result.push({
      ...topic,
      items,
      latest_report: report || null,
      item_count: parseInt(countRow.cnt, 10),
    });
  }

  return result;
}

export async function getWatchReports(topicId: number, limit = 10): Promise<WatchReport[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM info_watch_reports WHERE topic_id = $1 ORDER BY created_at DESC LIMIT $2',
    [topicId, limit]
  );
  return rows;
}
