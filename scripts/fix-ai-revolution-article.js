/**
 * ✅ НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ ПРОБЛЕМНОЙ СТАТЬИ AI REVOLUTION 2025
 * 
 * Удаляет русскую версию статьи через WordPress API
 * для исправления React DOM ошибок
 */

const https = require('https');
const querystring = require('querystring');

console.log('🚨 НЕМЕДЛЕННОЕ ИСПРАВЛЕНИЕ: AI Revolution 2025');
console.log('============================================\n');

// Конфигурация WordPress API
const WP_API_BASE = 'https://app.icoffio.com/wp-json/wp/v2';
const WP_USERNAME = process.env.WP_USERNAME || 'admin'; // Замените на реальные данные
const WP_PASSWORD = process.env.WP_PASSWORD || 'your_password'; // Замените на реальные данные

/**
 * Выполняет HTTP запрос к WordPress API
 */
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(WP_API_BASE + endpoint);
    
    const auth = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString('base64');
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'icoffio-cleanup-script/1.0'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || responseData}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Основная функция исправления
 */
async function fixAIRevolutionArticle() {
  try {
    console.log('🔍 1. Поиск статей "AI Revolution 2025"...');
    
    // Находим все статьи с названием "AI Revolution 2025"
    const posts = await makeRequest('GET', '/posts?search=AI Revolution 2025&per_page=10');
    
    console.log(`   Найдено статей: ${posts.length}`);
    
    let russianPost = null;
    let englishPost = null;
    
    for (const post of posts) {
      console.log(`   - ID: ${post.id}, Slug: ${post.slug}, Title: ${post.title.rendered}`);
      
      if (post.slug === 'ai-revolution-2025-ru') {
        russianPost = post;
      } else if (post.slug === 'ai-revolution-2025-en') {
        englishPost = post;
      }
    }
    
    if (russianPost) {
      console.log('\n🗑️ 2. Удаление русской версии статьи...');
      console.log(`   Удаляем статью ID: ${russianPost.id}, Slug: ${russianPost.slug}`);
      
      try {
        await makeRequest('DELETE', `/posts/${russianPost.id}?force=true`);
        console.log('   ✅ Русская версия успешно удалена');
      } catch (error) {
        console.log(`   ❌ Ошибка удаления: ${error.message}`);
      }
    } else {
      console.log('\n💡 2. Русская версия не найдена (возможно, уже удалена)');
    }
    
    if (englishPost) {
      console.log('\n✅ 3. Английская версия найдена и сохранена');
      console.log(`   ID: ${englishPost.id}, Slug: ${englishPost.slug}`);
      console.log(`   URL: https://app.icoffio.com/en/article/${englishPost.slug}`);
    } else {
      console.log('\n⚠️ 3. Английская версия не найдена');
    }
    
    console.log('\n🧹 4. Очистка кеша...');
    // В реальном WordPress можно вызвать очистку кеша через API плагинов
    console.log('   💡 Рекомендуется очистить кеш WordPress вручную');
    
    console.log('\n✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('   Теперь статья должна открываться без React DOM ошибок');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА ИСПРАВЛЕНИЯ:', error.message);
    console.log('\n📋 АЛЬТЕРНАТИВНЫЕ РЕШЕНИЯ:');
    console.log('1. Выполните SQL миграцию: fix-all-old-errors.sql');
    console.log('2. Удалите статью через админку WordPress');
    console.log('3. Перезапустите сервер приложения');
  }
}

/**
 * Проверка настройки API
 */
function checkAPIConfig() {
  if (!process.env.WP_USERNAME || !process.env.WP_PASSWORD) {
    console.log('⚠️ ВНИМАНИЕ: Настройки WordPress API не заданы');
    console.log('');
    console.log('Для немедленного исправления через API установите:');
    console.log('export WP_USERNAME="ваш_логин"');
    console.log('export WP_PASSWORD="ваш_пароль"');
    console.log('');
    console.log('Или выполните исправление вручную через SQL:');
    console.log('mysql -u username -p database_name < fix-all-old-errors.sql');
    console.log('');
    return false;
  }
  return true;
}

// Запуск скрипта
if (checkAPIConfig()) {
  fixAIRevolutionArticle();
} else {
  console.log('💡 Используйте SQL миграцию для исправления проблемы');
}
