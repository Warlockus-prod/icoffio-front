/**
 * ✅ ТЕСТ ИСПРАВЛЕНИЯ ПРОБЛЕМЫ С ДЛИННЫМИ SLUG'АМИ
 * 
 * Скрипт для проверки работы новых slug утилит
 */

const { generateSafeSlug, addLanguageSuffix, validateSlug } = require('../lib/slug-utils.ts');

console.log('🧪 Тестирование исправления проблемы с длинными slug\'ами...\n');

// Тестовые заголовки
const testTitles = [
  "iPhone 16 Pro Max vs iPhone 15 Pro Max: The Ultimate Camera Revolution",
  "Очень длинный заголовок с множеством слов для проверки ограничения длины slug",
  "AI Revolution 2024: Transformative Breakthroughs Reshaping Technology and Business",
  "Short title",
  "Title with special chars!@#$%^&*()+={}[]|\\:;\"'<>?,./",
  "HTML <script>alert('test')</script> Content",
  ""
];

console.log('📝 Тестирование генерации безопасных slug\'ов:\n');

testTitles.forEach((title, index) => {
  console.log(`${index + 1}. Заголовок: "${title}"`);
  
  const safeSlug = generateSafeSlug(title);
  console.log(`   Безопасный slug: "${safeSlug}"`);
  console.log(`   Длина: ${safeSlug.length} символов`);
  
  const withLanguage = addLanguageSuffix(safeSlug, 'en');
  console.log(`   С языком: "${withLanguage}"`);
  
  const isValid = validateSlug(withLanguage);
  console.log(`   Валидный: ${isValid ? '✅' : '❌'}`);
  console.log('');
});

// Тест проблемного заголовка
console.log('🔍 Тестирование проблемного заголовка:\n');
const problematicTitle = "iPhone 16 Pro Max vs iPhone 15 Pro Max: The Ultimate Camera Revolution";
const oldSlug = problematicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-en";
const newSlug = addLanguageSuffix(generateSafeSlug(problematicTitle), 'en');

console.log(`Старый slug: "${oldSlug}" (${oldSlug.length} символов)`);
console.log(`Новый slug: "${newSlug}" (${newSlug.length} символов)`);
console.log(`Улучшение: ${oldSlug.length - newSlug.length} символов сокращено`);
console.log('');

console.log('✅ Тестирование завершено!');
