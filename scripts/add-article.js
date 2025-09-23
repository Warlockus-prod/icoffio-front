#!/usr/bin/env node

/**
 * Скрипт для добавления статей в icoffio
 * 
 * Использование:
 * node scripts/add-article.js --url "https://example.com/article"
 * node scripts/add-article.js --title "Заголовок" --content "Контент статьи" --category "tech"
 * node scripts/add-article.js --file "path/to/article.txt"
 */

const fs = require('fs');
const path = require('path');

// Симулируем ES модули в CommonJS среде
async function importESM() {
  try {
    const { articleGenerator } = await import('../lib/article-generator.js');
    return { articleGenerator };
  } catch (error) {
    console.error('❌ Ошибка импорта:', error.message);
    console.log('ℹ️  Убедитесь, что проект собран: npm run build');
    process.exit(1);
  }
}

// Парсинг аргументов командной строки
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    options[key] = value;
  }
  
  return options;
}

// Чтение файла с контентом
function readContentFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Попытка извлечь заголовок из первой строки
    const lines = content.split('\n');
    const title = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    
    return { title, content: body };
  } catch (error) {
    throw new Error(`Не удалось прочитать файл: ${error.message}`);
  }
}

// Валидация входных данных
function validateInput(options) {
  const { url, title, content, file } = options;
  
  if (!url && !title && !file) {
    throw new Error('Необходимо указать --url, --title или --file');
  }
  
  if (title && !content && !file) {
    throw new Error('При указании --title необходимо также указать --content или --file');
  }
  
  return true;
}

// Отображение прогресса
function showProgress(step, total, message) {
  const progress = Math.round((step / total) * 100);
  const bar = '█'.repeat(Math.round(progress / 5)) + '░'.repeat(20 - Math.round(progress / 5));
  process.stdout.write(`\r[${bar}] ${progress}% - ${message}`);
}

// Главная функция
async function main() {
  try {
    console.log('🚀 Генератор статей icoffio\n');
    
    const options = parseArguments();
    
    // Показать справку, если нет аргументов
    if (Object.keys(options).length === 0) {
      console.log(`Использование:
  
📋 Добавление статьи из URL:
  node scripts/add-article.js --url "https://example.com/article"

📝 Добавление статьи из текста:
  node scripts/add-article.js --title "Заголовок" --content "Контент" --category "tech"

📄 Добавление статьи из файла:
  node scripts/add-article.js --file "path/to/article.txt" --category "ai"

🏷️  Доступные категории: ai, apple, games, tech
`);
      process.exit(0);
    }
    
    // Валидация
    validateInput(options);
    
    // Импорт модулей
    showProgress(1, 6, 'Инициализация...');
    const { articleGenerator } = await importESM();
    
    // Подготовка входных данных
    showProgress(2, 6, 'Подготовка данных...');
    let articleInput = {};
    
    if (options.url) {
      articleInput.url = options.url;
    } else if (options.file) {
      const fileData = readContentFile(options.file);
      articleInput.title = fileData.title;
      articleInput.content = fileData.content;
      articleInput.category = options.category || 'tech';
    } else {
      articleInput.title = options.title;
      articleInput.content = options.content;
      articleInput.category = options.category || 'tech';
    }
    
    console.log(`\n\n📝 Обрабатываем: ${articleInput.title || articleInput.url}`);
    
    // Генерация статьи
    showProgress(3, 6, 'Генерация контента...');
    const posts = await articleGenerator.processArticle(articleInput);
    
    // Добавление в систему
    showProgress(4, 6, 'Добавление в систему...');
    await articleGenerator.addArticleToSystem(posts);
    
    // Сохранение в файл
    showProgress(5, 6, 'Сохранение...');
    const outputFile = path.join(__dirname, '..', 'generated-articles.json');
    const existingData = fs.existsSync(outputFile) ? JSON.parse(fs.readFileSync(outputFile, 'utf-8')) : [];
    existingData.push({
      timestamp: new Date().toISOString(),
      input: articleInput,
      posts: posts
    });
    fs.writeFileSync(outputFile, JSON.stringify(existingData, null, 2));
    
    showProgress(6, 6, 'Завершено!');
    
    console.log(`\n\n✅ Статья успешно добавлена!`);
    console.log(`📊 Статистика:`);
    console.log(`   • Заголовок: ${posts.ru?.title || 'Не определен'}`);
    console.log(`   • Категория: ${posts.ru?.category?.name || 'Не определена'}`);
    console.log(`   • Языков: ${Object.keys(posts).length}`);
    console.log(`   • Slug: ${posts.ru?.slug || 'Не определен'}`);
    console.log(`\n📁 Данные сохранены в: ${outputFile}`);
    
  } catch (error) {
    console.error(`\n❌ Ошибка: ${error.message}`);
    
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('\n🔍 Стек ошибки:', error.stack);
    }
    
    process.exit(1);
  }
}

// Обработка прерывания
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Операция прервана пользователем');
  process.exit(1);
});

// Запуск
if (require.main === module) {
  main().catch(error => {
    console.error('Критическая ошибка:', error);
    process.exit(1);
  });
}

module.exports = { main, parseArguments, validateInput };

