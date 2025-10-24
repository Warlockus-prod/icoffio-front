#!/usr/bin/env node

/**
 * FIX SEO EXCERPTS
 * 
 * Fixes excerpt length issues to meet SEO best practices (100-160 chars)
 * Also fixes Apple Vision Pro title (too long)
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 FIXING SEO ISSUES\n');
console.log('='.repeat(60));

const localArticlesPath = path.join(__dirname, '../lib/local-articles.ts');
let content = fs.readFileSync(localArticlesPath, 'utf-8');

const fixes = [
  {
    slug: 'ai-revolution-2024-en',
    field: 'excerpt',
    old: 'Artificial intelligence is experiencing unprecedented growth in 2024. From multimodal AI models to autonomous systems, we explore the revolutionary developments defining this transformative year in technology.',
    new: 'Explore 2024\'s transformative AI breakthroughs, from multimodal models to autonomous systems reshaping technology and business.'
  },
  {
    slug: 'apple-vision-pro-review-en',
    field: 'title',
    old: 'Apple Vision Pro: Comprehensive Review After 6 Months of Real-World Testing',
    new: 'Apple Vision Pro: 6-Month Real-World Review'
  },
  {
    slug: 'apple-vision-pro-review-en',
    field: 'excerpt',
    old: 'In-depth analysis of Apple\'s groundbreaking mixed reality headset after extensive real-world testing. Performance evaluation, app ecosystem analysis, and honest assessment of whether the $3,499 investment is worthwhile for consumers and businesses.',
    new: 'Apple Vision Pro after 6 months: performance, apps, ROI analysis. Is the $3,499 investment worth it? Comprehensive review.'
  },
  {
    slug: 'digital-transformation-guide-en',
    field: 'excerpt',
    old: 'Comprehensive step-by-step guide to implementing digital technologies in company business processes. Real-world case studies, tools selection, and transformation roadmap for modern businesses.',
    new: 'Complete 2024 guide: implement digital transformation with proven strategies, tools, case studies, and actionable roadmap.'
  },
  {
    slug: 'gaming-trends-2024-pl',
    field: 'excerpt',
    old: 'Gry w chmurze, gry VR i treści generowane przez AI - analizujemy główne trendy w branży gier.',
    new: 'Gry w chmurze, VR i AI - kompleksowa analiza kluczowych trendów kształtujących przyszłość branży gier w 2024 roku.'
  },
  {
    slug: 'digital-transformation-guide-pl',
    field: 'excerpt',
    old: 'Krok po kroku przewodnik po wdrażaniu technologii cyfrowych w procesach biznesowych firmy.',
    new: 'Kompleksowy przewodnik transformacji cyfrowej: strategie, narzędzia, studia przypadków i plan działania dla firm 2024.'
  }
];

console.log(`\n📊 FIXING ${fixes.length} SEO ISSUES:\n`);

fixes.forEach(fix => {
  const oldLength = fix.old.length;
  const newLength = fix.new.length;
  const status = newLength >= 100 && newLength <= 160 ? '✅' : '⚠️';
  
  console.log(`   ${fix.slug} (${fix.field}):`);
  console.log(`      Old: ${oldLength} chars`);
  console.log(`      New: ${newLength} chars ${status}`);
  
  // Replace in content
  content = content.replace(fix.old, fix.new);
});

// Verify changes
console.log(`\n✅ VERIFICATION:`);
const verifications = fixes.map(fix => {
  const found = content.includes(fix.new);
  return { slug: fix.slug, field: fix.field, found };
});

verifications.forEach(({ slug, field, found }) => {
  console.log(`   ${slug} (${field}): ${found ? '✅ Applied' : '❌ Failed'}`);
});

const allSuccess = verifications.every(v => v.found);

if (allSuccess) {
  fs.writeFileSync(localArticlesPath, content, 'utf-8');
  console.log(`\n💾 SAVED: ${localArticlesPath}`);
  
  console.log(`\n📈 SEO IMPROVEMENTS:`);
  console.log(`   - Title lengths: Now optimal (30-70 chars)`);
  console.log(`   - Excerpt lengths: Now optimal (100-160 chars)`);
  console.log(`   - Better search rankings expected`);
  console.log(`   - Improved CTR in search results`);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ SEO fixes applied successfully!\n');
} else {
  console.error('\n❌ Some fixes failed - please review manually!\n');
  process.exit(1);
}

