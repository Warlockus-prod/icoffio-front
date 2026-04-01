export interface InfoBoard {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfoBlock {
  id: number;
  board_id: number;
  title: string;
  layout: 'full' | 'half';
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface InfoFeed {
  id: number;
  block_id: number;
  title: string;
  feed_url: string | null;
  site_url: string | null;
  telegram_channel: string | null;
  feed_type: 'rss' | 'atom' | 'telegram';
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  last_fetched_at: string | null;
  created_at: string;
}

export interface InfoFeedItem {
  id: number;
  feed_id: number;
  title: string;
  url: string;
  description: string | null;
  image_url: string | null;
  published_at: string | null;
  guid: string | null;
  created_at: string;
}

export interface InfoBlockWithFeeds extends InfoBlock {
  feeds: (InfoFeed & { items: InfoFeedItem[] })[];
}

export interface InfoBoardFull extends InfoBoard {
  blocks: InfoBlockWithFeeds[];
}
