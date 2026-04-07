export interface WatchTopic {
  id: number;
  name: string;
  keywords: string[];
  topic_type: 'competitor' | 'trend' | 'industry';
  search_langs: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface WatchItem {
  id: number;
  topic_id: number;
  title: string;
  url: string;
  source_name: string | null;
  description: string | null;
  language: string | null;
  published_at: string | null;
  fetched_at: string;
}

export interface WatchReport {
  id: number;
  topic_id: number;
  content: string;
  model: string | null;
  sources_count: number;
  created_at: string;
}

export interface WatchTopicFull extends WatchTopic {
  items: WatchItem[];
  latest_report: WatchReport | null;
  item_count: number;
}
