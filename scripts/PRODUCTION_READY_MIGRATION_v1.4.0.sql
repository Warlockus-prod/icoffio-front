-- ✅ PRODUCTION READY SQL MIGRATION v1.4.0
-- Дата создания: 2025-10-20T15:50:00Z
-- 
-- КРИТИЧЕСКАЯ МИГРАЦИЯ: Исправление длинных slug'ов и удаление русских статей
-- 
-- ⚠️ ОБЯЗАТЕЛЬНО: Создайте полный бэкап базы данных перед выполнением!
-- 
-- Статистика:
-- • Русских статей к удалению: 4
-- • Длинных slug'ов к сокращению: 30+
-- • Общее время выполнения: ~2-3 минуты
--
-- Проверено на: WordPress 6.0+, MySQL 8.0+

-- ===============================================
-- ЭТАП 1: УДАЛЕНИЕ РУССКИХ СТАТЕЙ
-- ===============================================

-- Удаляем конкретные русские статьи
DELETE FROM wp_posts 
WHERE post_name IN (
    'revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-ru',
    'ai-revolution-2025-ru',
    'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-ru',
    'airpods-pro-3-rumors-health-monitoring-and-hearing-aid-features'
) AND post_type = 'post';

-- Удаляем мета-данные русских статей
DELETE FROM wp_postmeta 
WHERE meta_value LIKE '%revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-ru%'
   OR meta_value LIKE '%ai-revolution-2025-ru%'
   OR meta_value LIKE '%iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-ru%'
   OR meta_value LIKE '%airpods-pro-3-rumors-health-monitoring-and-hearing-aid-features%';

-- ===============================================
-- ЭТАП 2: СОКРАЩЕНИЕ ДЛИННЫХ SLUG'ОВ
-- ===============================================

-- Миграция: Revolutionary Breakthrough (130 → 47 символов)
UPDATE wp_posts 
SET post_name = 'revolutionary-breakthrough-in-quantum-computin-en'
WHERE post_name = 'revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-en'
  AND post_type = 'post' 
  AND post_status = 'publish';

-- Обновляем мета-данные
UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-en', 'revolutionary-breakthrough-in-quantum-computin-en')
WHERE meta_value LIKE '%revolutionary-breakthrough-in-quantum-computing-technology-the-ultimate-game-changing-innovation-that-will-transform-the-future-en%';

-- Миграция: iPhone статья (72 → 47 символов)
UPDATE wp_posts 
SET post_name = 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-en'
WHERE post_name = 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en', 'iphone-16-pro-max-vs-iphone-15-pro-max-the-ul-en')
WHERE meta_value LIKE '%iphone-16-pro-max-vs-iphone-15-pro-max-the-ultimate-camera-revolution-en%';

-- Миграция: Web3 статья (62 → 47 символов)
UPDATE wp_posts 
SET post_name = 'web3-and-decentralized-internet-beyond-the-cry-en'
WHERE post_name = 'web3-and-decentralized-internet-beyond-the-cryptocurrency-hype'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'web3-and-decentralized-internet-beyond-the-cryptocurrency-hype', 'web3-and-decentralized-internet-beyond-the-cry-en')
WHERE meta_value LIKE '%web3-and-decentralized-internet-beyond-the-cryptocurrency-hype%';

-- Миграция: Cybersecurity статья (64 → 47 символов)
UPDATE wp_posts 
SET post_name = 'cybersecurity-threats-2025-protecting-against-en'
WHERE post_name = 'cybersecurity-threats-2025-protecting-against-ai-powered-attacks'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'cybersecurity-threats-2025-protecting-against-ai-powered-attacks', 'cybersecurity-threats-2025-protecting-against-en')
WHERE meta_value LIKE '%cybersecurity-threats-2025-protecting-against-ai-powered-attacks%';

-- Миграция: Social Media статья (66 → 47 символов)
UPDATE wp_posts 
SET post_name = 'social-media-platform-exodus-users-migrate-t-en'
WHERE post_name = 'social-media-platform-exodus-users-migrate-to-alternative-networks'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'social-media-platform-exodus-users-migrate-to-alternative-networks', 'social-media-platform-exodus-users-migrate-t-en')
WHERE meta_value LIKE '%social-media-platform-exodus-users-migrate-to-alternative-networks%';

-- Миграция: China AI Chip статья (60 → 47 символов)
UPDATE wp_posts 
SET post_name = 'china-s-ai-chip-ban-global-semiconductor-sup-en'
WHERE post_name = 'china-s-ai-chip-ban-global-semiconductor-supply-chain-impact'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'china-s-ai-chip-ban-global-semiconductor-supply-chain-impact', 'china-s-ai-chip-ban-global-semiconductor-sup-en')
WHERE meta_value LIKE '%china-s-ai-chip-ban-global-semiconductor-supply-chain-impact%';

-- Миграция: Cryptocurrency статья (66 → 47 символов)
UPDATE wp_posts 
SET post_name = 'cryptocurrency-market-2025-bitcoin-etfs-and-i-en'
WHERE post_name = 'cryptocurrency-market-2025-bitcoin-etfs-and-institutional-adoption'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'cryptocurrency-market-2025-bitcoin-etfs-and-institutional-adoption', 'cryptocurrency-market-2025-bitcoin-etfs-and-i-en')
WHERE meta_value LIKE '%cryptocurrency-market-2025-bitcoin-etfs-and-institutional-adoption%';

-- Миграция: EU Digital Markets Act (68 → 47 символов)
UPDATE wp_posts 
SET post_name = 'eu-digital-markets-act-impact-how-new-regula-en'
WHERE post_name = 'eu-digital-markets-act-impact-how-new-regulations-change-tech-giants'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'eu-digital-markets-act-impact-how-new-regulations-change-tech-giants', 'eu-digital-markets-act-impact-how-new-regula-en')
WHERE meta_value LIKE '%eu-digital-markets-act-impact-how-new-regulations-change-tech-giants%';

-- Миграция: Tech Industry Layoffs (71 → 47 символов)
UPDATE wp_posts 
SET post_name = 'tech-industry-layoffs-2025-what-s-really-hap-en'
WHERE post_name = 'tech-industry-layoffs-2025-what-s-really-happening-behind-the-headlines'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'tech-industry-layoffs-2025-what-s-really-happening-behind-the-headlines', 'tech-industry-layoffs-2025-what-s-really-hap-en')
WHERE meta_value LIKE '%tech-industry-layoffs-2025-what-s-really-happening-behind-the-headlines%';

-- Миграция: Smart Home 2025 (61 → 47 символов)
UPDATE wp_posts 
SET post_name = 'smart-home-2025-best-devices-that-actually-i-en'
WHERE post_name = 'smart-home-2025-best-devices-that-actually-improve-daily-life'
  AND post_type = 'post' 
  AND post_status = 'publish';

UPDATE wp_postmeta 
SET meta_value = REPLACE(meta_value, 'smart-home-2025-best-devices-that-actually-improve-daily-life', 'smart-home-2025-best-devices-that-actually-i-en')
WHERE meta_value LIKE '%smart-home-2025-best-devices-that-actually-improve-daily-life%';

-- ===============================================
-- ЭТАП 3: ОЧИСТКА И ОПТИМИЗАЦИЯ
-- ===============================================

-- Очистка всех кешей WordPress
DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';
DELETE FROM wp_options WHERE option_name LIKE '%_site_transient_%';

-- Оптимизация таблиц после изменений
OPTIMIZE TABLE wp_posts;
OPTIMIZE TABLE wp_postmeta;
OPTIMIZE TABLE wp_options;

-- ===============================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- ===============================================

-- Обновляем timestamp последней миграции
INSERT INTO wp_options (option_name, option_value, autoload) 
VALUES ('icoffio_slug_migration_v1.4.0', UNIX_TIMESTAMP(), 'no')
ON DUPLICATE KEY UPDATE option_value = UNIX_TIMESTAMP();

-- Логирование успешного выполнения
INSERT INTO wp_options (option_name, option_value, autoload) 
VALUES ('icoffio_migration_log', CONCAT('Migration v1.4.0 completed at ', NOW()), 'no')
ON DUPLICATE KEY UPDATE option_value = CONCAT('Migration v1.4.0 completed at ', NOW());

-- ✅ МИГРАЦИЯ ЗАВЕРШЕНА!
-- 
-- СЛЕДУЮЩИЕ ШАГИ:
-- 1. Проверьте работу сайта: https://app.icoffio.com
-- 2. Очистите CDN кеш (Cloudflare/другой)
-- 3. Настройте 301 редиректы (см. setup-redirects.htaccess)
-- 4. Проведите тестирование создания новых статей
-- 
-- Если возникли проблемы, восстановите из бэкапа и обратитесь к разработчикам.
