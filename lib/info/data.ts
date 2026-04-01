import { getPool } from '@/lib/pg-pool';
import type { InfoBoard, InfoBoardFull, InfoBlock, InfoFeed, InfoFeedItem } from './types';

export async function getBoards(): Promise<InfoBoard[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM info_boards WHERE is_active = true ORDER BY sort_order ASC'
  );
  return rows;
}

export async function getBoardBySlug(slug: string): Promise<InfoBoardFull | null> {
  const pool = getPool();

  const { rows: boardRows } = await pool.query(
    'SELECT * FROM info_boards WHERE slug = $1 AND is_active = true LIMIT 1',
    [slug]
  );
  if (boardRows.length === 0) return null;

  const board = boardRows[0] as InfoBoard;

  const { rows: blockRows } = await pool.query(
    'SELECT * FROM info_blocks WHERE board_id = $1 AND is_active = true ORDER BY sort_order ASC',
    [board.id]
  );

  const blocks: InfoBoardFull['blocks'] = [];

  for (const block of blockRows as InfoBlock[]) {
    const { rows: feedRows } = await pool.query(
      'SELECT * FROM info_feeds WHERE block_id = $1 AND is_active = true ORDER BY sort_order ASC',
      [block.id]
    );

    const feeds = [];
    for (const feed of feedRows as InfoFeed[]) {
      const { rows: itemRows } = await pool.query(
        `SELECT * FROM info_feed_items WHERE feed_id = $1
         ORDER BY published_at DESC NULLS LAST
         LIMIT 20`,
        [feed.id]
      );
      feeds.push({ ...feed, items: itemRows as InfoFeedItem[] });
    }

    blocks.push({ ...block, feeds });
  }

  return { ...board, blocks };
}

export async function getAllBoardsAdmin(): Promise<InfoBoard[]> {
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM info_boards ORDER BY sort_order ASC');
  return rows;
}

export async function getBlocksForBoard(boardId: number): Promise<InfoBlock[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM info_blocks WHERE board_id = $1 ORDER BY sort_order ASC',
    [boardId]
  );
  return rows;
}

export async function getFeedsForBlock(blockId: number): Promise<InfoFeed[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM info_feeds WHERE block_id = $1 ORDER BY sort_order ASC',
    [blockId]
  );
  return rows;
}
