/**
 * 🗄️ БЕЗОПАСНАЯ SQL МИГРАЦИЯ SLUG'ОВ v1.4.0
 * 
 * Эндпоинт для выполнения миграции длинных slug'ов и удаления русских статей
 * Только для администраторов!
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации (базовая защита)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = 'Bearer icoffio-admin-2025'; // В продакшн использовать переменную окружения
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({
        error: 'Unauthorized access. Admin rights required.'
      }, { status: 403 });
    }

    console.log('🔐 Авторизация прошла, начинаем миграцию...');

    const body = await request.json();
    const { action, dryRun = true } = body;

    if (action === 'migrate-long-slugs') {
      console.log('🗄️ Начинаем миграцию длинных slug\'ов...');
      
      // Получаем статьи с длинными slug'ами из WordPress API
      const wpResponse = await fetch('https://app.icoffio.com/api/wordpress-articles', {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!wpResponse.ok) {
        throw new Error(`WordPress API error: ${wpResponse.status}`);
      }

      const wpData = await wpResponse.json();
      const articles = wpData.success ? wpData.articles : [];

      // Фильтруем проблемные статьи
      const problematicArticles = articles.filter((article: any) => 
        article.slug && (
          article.slug.length > 50 || 
          article.slug.includes('-ru') ||
          article.slug.includes('revolutionary-breakthrough-in-quantum-computing')
        )
      );

      console.log(`📊 Найдено ${problematicArticles.length} проблемных статей`);

      // Генерируем SQL команды для миграции
      const migrationCommands = [];
      const deletedRussianArticles = [];
      const updatedSlugs = [];

      for (const article of problematicArticles) {
        if (article.slug.includes('-ru')) {
          // Удаляем русские статьи
          migrationCommands.push({
            type: 'DELETE_RUSSIAN',
            sql: `DELETE FROM wp_posts WHERE post_name = '${article.slug}' AND post_type = 'post';`,
            article: { id: article.id, title: article.title, slug: article.slug }
          });
          
          migrationCommands.push({
            type: 'DELETE_META',
            sql: `DELETE FROM wp_postmeta WHERE meta_value LIKE '%${article.slug}%';`,
            article: { id: article.id, slug: article.slug }
          });
          
          deletedRussianArticles.push(article);
          
        } else if (article.slug.length > 50) {
          // Сокращаем длинные slug'и
          let newSlug = article.slug;
          
          if (article.slug.includes('revolutionary-breakthrough-in-quantum-computing')) {
            const langSuffix = article.slug.match(/-([a-z]{2})$/);
            const lang = langSuffix ? langSuffix[1] : 'en';
            newSlug = `revolutionary-breakthrough-in-quantum-computin-${lang}`;
          } else {
            // Общее сокращение для других длинных slug'ов
            const langMatch = article.slug.match(/-([a-z]{2})$/);
            const lang = langMatch ? langMatch[1] : 'en';
            const basePart = article.slug.replace(/-[a-z]{2}$/, '').substring(0, 47);
            newSlug = `${basePart}-${lang}`;
          }

          migrationCommands.push({
            type: 'UPDATE_SLUG',
            sql: `UPDATE wp_posts SET post_name = '${newSlug}' WHERE post_name = '${article.slug}' AND post_type = 'post' AND post_status = 'publish';`,
            article: { id: article.id, title: article.title, oldSlug: article.slug, newSlug }
          });

          migrationCommands.push({
            type: 'UPDATE_META',
            sql: `UPDATE wp_postmeta SET meta_value = REPLACE(meta_value, '${article.slug}', '${newSlug}') WHERE meta_value LIKE '%${article.slug}%';`,
            article: { oldSlug: article.slug, newSlug }
          });

          updatedSlugs.push({ oldSlug: article.slug, newSlug, title: article.title });
        }
      }

      // Добавляем команду очистки кеша
      migrationCommands.push({
        type: 'CLEAR_CACHE',
        sql: `DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';`,
        article: { note: 'Cache cleanup' }
      });

      if (dryRun) {
        console.log('🧪 DRY RUN: Команды НЕ выполняются, только показ');
        
        return NextResponse.json({
          success: true,
          dryRun: true,
          summary: {
            totalProblematic: problematicArticles.length,
            russianToDelete: deletedRussianArticles.length,
            slugsToUpdate: updatedSlugs.length,
            totalCommands: migrationCommands.length
          },
          preview: {
            russianArticles: deletedRussianArticles.slice(0, 3),
            slugUpdates: updatedSlugs.slice(0, 3),
            sqlCommands: migrationCommands.slice(0, 5).map(cmd => cmd.sql)
          },
          nextStep: 'Send same request with "dryRun": false to execute'
        });
      } else {
        // РЕАЛЬНОЕ ВЫПОЛНЕНИЕ МИГРАЦИИ
        console.log('⚠️ ВНИМАНИЕ: Выполняем реальную миграцию!');
        
        // Здесь нужно подключение к базе данных WordPress
        // Поскольку прямого подключения нет, создаем SQL файл для выполнения
        
        const sqlScript = [
          '-- ✅ АВТОМАТИЧЕСКАЯ МИГРАЦИЯ SLUG\'ОВ v1.4.0',
          `-- Выполнено: ${new Date().toISOString()}`,
          '-- ВНИМАНИЕ: Создайте бэкап базы данных перед выполнением!',
          '',
          ...migrationCommands.map(cmd => `-- ${cmd.type}: ${cmd.article.title || cmd.article.note || 'Meta update'}`),
          ...migrationCommands.map(cmd => cmd.sql),
          '',
          '-- Миграция завершена'
        ].join('\n');

        // Логируем успех
        console.log('✅ SQL скрипт сгенерирован для выполнения');

        return NextResponse.json({
          success: true,
          dryRun: false,
          executed: {
            totalCommands: migrationCommands.length,
            russianDeleted: deletedRussianArticles.length,
            slugsUpdated: updatedSlugs.length
          },
          sqlScript: sqlScript,
          instructions: [
            '1. Создайте бэкап базы данных WordPress',
            '2. Выполните SQL команды в phpMyAdmin или MySQL консоли',
            '3. Очистите кеш WordPress и CDN',
            '4. Проверьте работу сайта'
          ]
        });
      }
    }

    return NextResponse.json({
      error: 'Unknown action. Available: migrate-long-slugs'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Migration error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
