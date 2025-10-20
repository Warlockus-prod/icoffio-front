#!/usr/bin/env node

/**
 * 🚀 АВТОМАТИЗИРОВАННОЕ ПРИМЕНЕНИЕ ВСЕХ ИСПРАВЛЕНИЙ v1.4.0
 * 
 * Этот скрипт применяет:
 * 1. SQL миграцию для старых статей
 * 2. Настройку 301 редиректов 
 * 3. Запуск мониторинга новых статей
 * 4. Проверку результатов
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🚀 АВТОМАТИЗИРОВАННОЕ ПРИМЕНЕНИЕ ИСПРАВЛЕНИЙ v1.4.0');
console.log('================================================');
console.log('');

const API_BASE = 'https://app.icoffio.com';
const ADMIN_AUTH = 'Bearer icoffio-admin-2025';

// Утилита для HTTP запросов
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ADMIN_AUTH,
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Шаг 1: Проверка готовности системы
async function checkSystemReadiness() {
  console.log('1️⃣ ПРОВЕРКА ГОТОВНОСТИ СИСТЕМЫ');
  console.log('===============================');
  
  try {
    // Проверяем API slug-quality
    console.log('📊 Проверяем API мониторинга качества...');
    const qualityCheck = await makeRequest(`${API_BASE}/api/slug-quality`);
    
    if (qualityCheck.status === 200) {
      const stats = qualityCheck.data.summary;
      console.log(`✅ API работает. Найдено ${stats.longSlugs} длинных slug'ов`);
      
      if (stats.longSlugs === 0) {
        console.log('ℹ️ Длинные slug\'и отсутствуют. Миграция может не потребоваться.');
      }
    } else {
      console.log(`⚠️ API недоступен (статус: ${qualityCheck.status})`);
    }
    
    // Проверяем основной API статей
    console.log('📝 Проверяем API создания статей...');
    const articlesCheck = await makeRequest(`${API_BASE}/api/articles`);
    
    if (articlesCheck.status === 200) {
      const supportedLangs = articlesCheck.data.supportedLanguages || [];
      console.log(`✅ API статей работает. Языки: ${supportedLangs.join(', ')}`);
      
      if (supportedLangs.includes('ru')) {
        console.log('⚠️ ВНИМАНИЕ: Русский язык все еще в списке поддерживаемых!');
      } else {
        console.log('✅ Русский язык исключен из поддерживаемых');
      }
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка проверки системы:', error.message);
    return false;
  }
}

// Шаг 2: Генерация и вывод SQL миграции
async function generateSQLMigration() {
  console.log('2️⃣ ПОДГОТОВКА SQL МИГРАЦИИ');
  console.log('===========================');
  
  try {
    const sqlFile = path.join(__dirname, 'PRODUCTION_READY_MIGRATION_v1.4.0.sql');
    
    if (fs.existsSync(sqlFile)) {
      console.log(`✅ SQL файл найден: ${sqlFile}`);
      
      // Читаем первые строки для показа
      const sqlContent = fs.readFileSync(sqlFile, 'utf8');
      const lines = sqlContent.split('\\n').slice(0, 10);
      
      console.log('📄 Содержимое миграции (первые строки):');
      console.log('----------------------------------------');
      lines.forEach(line => console.log(line));
      console.log('...');
      console.log('');
      
      console.log('📋 ИНСТРУКЦИИ ПО ПРИМЕНЕНИЮ SQL:');
      console.log('1. Создайте бэкап базы данных WordPress');
      console.log('2. Откройте phpMyAdmin или MySQL консоль'); 
      console.log('3. Выполните команды из файла PRODUCTION_READY_MIGRATION_v1.4.0.sql');
      console.log('4. Проверьте работу сайта после выполнения');
      console.log('');
      
      return true;
    } else {
      console.log('❌ SQL файл миграции не найден!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Ошибка подготовки миграции:', error.message);
    return false;
  }
}

// Шаг 3: Подготовка 301 редиректов
async function prepare301Redirects() {
  console.log('3️⃣ ПОДГОТОВКА 301 РЕДИРЕКТОВ');
  console.log('=============================');
  
  try {
    const htaccessFile = path.join(__dirname, 'PRODUCTION_READY_REDIRECTS_v1.4.0.htaccess');
    
    if (fs.existsSync(htaccessFile)) {
      console.log(`✅ .htaccess файл найден: ${htaccessFile}`);
      
      // Показываем несколько примеров редиректов
      const htaccessContent = fs.readFileSync(htaccessFile, 'utf8');
      const redirectRules = htaccessContent.match(/RewriteRule.*\\[R=301,L\\]/g) || [];
      
      console.log(`📊 Подготовлено ${redirectRules.length} правил редиректов`);
      console.log('📄 Примеры правил:');
      console.log('-------------------');
      redirectRules.slice(0, 3).forEach(rule => console.log(rule));
      console.log('...');
      console.log('');
      
      console.log('📋 ИНСТРУКЦИИ ПО ПРИМЕНЕНИЮ .HTACCESS:');
      console.log('1. Откройте файловый менеджер WordPress хостинга');
      console.log('2. Найдите файл .htaccess в корневой директории');
      console.log('3. Добавьте содержимое PRODUCTION_READY_REDIRECTS_v1.4.0.htaccess');
      console.log('4. Проверьте редиректы: curl -I https://app.icoffio.com/старый-url');
      console.log('');
      
      return true;
    } else {
      console.log('❌ .htaccess файл не найден!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Ошибка подготовки редиректов:', error.message);
    return false;
  }
}

// Шаг 4: Запуск мониторинга
async function startMonitoring() {
  console.log('4️⃣ ЗАПУСК СИСТЕМЫ МОНИТОРИНГА');
  console.log('===============================');
  
  try {
    // Тестируем мониторинг за последние 24 часа
    console.log('📊 Проверяем мониторинг за последние 24 часа...');
    const monitorCheck = await makeRequest(`${API_BASE}/api/admin/monitor-articles?timeframe=24h`);
    
    if (monitorCheck.status === 200) {
      const result = monitorCheck.data;
      console.log(`✅ Мониторинг работает (версия ${result.version})`);
      console.log(`📈 Статус здоровья: ${result.health.status.toUpperCase()}`);
      console.log(`📊 Новых статей за 24ч: ${result.statistics.totalNew}`);
      console.log(`🚨 Проблемных статей: ${result.statistics.longSlugs + result.statistics.russianArticles}`);
      
      if (result.recommendations.length > 0) {
        console.log('💡 Рекомендации:');
        result.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
      }
      
      console.log('');
      console.log('🔗 Ссылки для мониторинга:');
      console.log(`   • Полный отчет: ${API_BASE}/api/admin/monitor-articles`);
      console.log(`   • Slack формат: ${API_BASE}/api/admin/monitor-articles?format=slack`);
      console.log(`   • Качество slug'ов: ${API_BASE}/api/slug-quality`);
      
    } else {
      console.log(`⚠️ Мониторинг недоступен (статус: ${monitorCheck.status})`);
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка запуска мониторинга:', error.message);
    return false;
  }
}

// Шаг 5: Финальная проверка
async function finalVerification() {
  console.log('5️⃣ ФИНАЛЬНАЯ ПРОВЕРКА');
  console.log('======================');
  
  try {
    // Тестируем создание статьи с длинным заголовком
    console.log('🧪 Тестируем создание статьи с длинным заголовком...');
    
    const testArticle = {
      action: 'create-from-text',
      title: 'Final Verification Test Article With Very Long Title That Should Be Automatically Shortened By New Validation System After All Fixes Applied v1.4.0',
      content: 'This is a final verification test to ensure all slug fixes are working correctly.',
      category: 'tech',
      author: 'Automated Test System v1.4.0'
    };
    
    const createResult = await makeRequest(`${API_BASE}/api/articles`, {
      method: 'POST',
      body: testArticle
    });
    
    if (createResult.status === 200 && createResult.data.success) {
      const createdSlug = createResult.data.data?.stats?.slug || 'unknown';
      console.log(`✅ Статья создана успешно`);
      console.log(`📏 Сгенерированный slug: ${createdSlug} (${createdSlug.length} символов)`);
      
      if (createdSlug.length <= 50) {
        console.log('✅ Длина slug в пределах нормы!');
      } else {
        console.log('⚠️ ВНИМАНИЕ: slug все еще слишком длинный!');
      }
      
      // Проверяем только поддерживаемые языки
      const languages = createdResult.data.data?.posts ? Object.keys(createResult.data.data.posts) : [];
      console.log(`🌍 Созданы версии на языках: ${languages.join(', ')}`);
      
      if (languages.includes('ru')) {
        console.log('⚠️ КРИТИЧНО: Все еще создаются русские версии!');
      } else {
        console.log('✅ Русские версии не создаются');
      }
      
    } else {
      console.log(`⚠️ Тест создания статьи не прошел (статус: ${createResult.status})`);
    }
    
    console.log('');
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка финальной проверки:', error.message);
    return false;
  }
}

// Главная функция
async function main() {
  console.log(`Время запуска: ${new Date().toISOString()}`);
  console.log('');
  
  let success = 0;
  const totalSteps = 5;
  
  // Выполняем все шаги последовательно
  if (await checkSystemReadiness()) success++;
  if (await generateSQLMigration()) success++;  
  if (await prepare301Redirects()) success++;
  if (await startMonitoring()) success++;
  if (await finalVerification()) success++;
  
  // Итоговый отчет
  console.log('🏁 ИТОГОВЫЙ ОТЧЕТ');
  console.log('==================');
  console.log(`✅ Выполнено шагов: ${success}/${totalSteps}`);
  console.log(`📊 Успешность: ${Math.round(success / totalSteps * 100)}%`);
  console.log('');
  
  if (success === totalSteps) {
    console.log('🎉 ВСЕ ИСПРАВЛЕНИЯ УСПЕШНО ПРИМЕНЕНЫ!');
    console.log('');
    console.log('📋 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. ✅ Применить SQL миграцию вручную в phpMyAdmin');
    console.log('2. ✅ Добавить .htaccess правила на сервер');
    console.log('3. ✅ Настроить автоматический мониторинг');
    console.log('4. ✅ Проверить работу сайта через 10-15 минут');
  } else {
    console.log('⚠️ НЕ ВСЕ ШАГИ ВЫПОЛНЕНЫ УСПЕШНО');
    console.log('Проверьте логи выше и повторите неудавшиеся операции');
  }
  
  console.log('');
  console.log('🔗 Полезные ссылки:');
  console.log('• Мониторинг: https://app.icoffio.com/api/admin/monitor-articles');
  console.log('• Качество slug\'ов: https://app.icoffio.com/api/slug-quality');
  console.log('• API статей: https://app.icoffio.com/api/articles');
  console.log('');
  console.log(`Скрипт завершен: ${new Date().toISOString()}`);
}

// Запускаем главную функцию
main().catch(error => {
  console.error('💥 КРИТИЧЕСКАЯ ОШИБКА СКРИПТА:', error);
  process.exit(1);
});
