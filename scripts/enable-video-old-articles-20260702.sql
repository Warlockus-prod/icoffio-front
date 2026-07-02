-- v10.20.11: enable the instream video player on legacy articles.
-- Articles created while NEXT_PUBLIC_VIDEO_PREROLL_ENABLED was effectively false
-- got "enabledVideoPlayerIds":[] baked into their monetization-settings comment,
-- which filters the player out server-side forever. Flip [] -> the DSP preroll
-- player id. Reversible (reverse replace). Affects content_en + content_pl.

UPDATE published_articles
   SET content_en = replace(content_en, '"enabledVideoPlayerIds":[]', '"enabledVideoPlayerIds":["instream-article-end"]')
 WHERE content_en LIKE '%"enabledVideoPlayerIds":[]%';

UPDATE published_articles
   SET content_pl = replace(content_pl, '"enabledVideoPlayerIds":[]', '"enabledVideoPlayerIds":["instream-article-end"]')
 WHERE content_pl LIKE '%"enabledVideoPlayerIds":[]%';

SELECT count(*) FILTER (WHERE content_en LIKE '%"enabledVideoPlayerIds":["instream-article-end"]%') AS en_enabled,
       count(*) FILTER (WHERE content_en LIKE '%"enabledVideoPlayerIds":[]%') AS en_still_empty
  FROM published_articles;
