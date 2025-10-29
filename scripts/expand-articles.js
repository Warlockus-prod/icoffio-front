#!/usr/bin/env node

/**
 * EXPAND STUB ARTICLES WITH GPT-4
 * 
 * Automatically expands short articles (stub articles with <100 words)
 * to full-quality articles (500+ words) using GPT-4.
 * 
 * Features:
 * - Preserves original style and tone
 * - Maintains proper markdown formatting
 * - Adds structure (H2/H3 headings, lists, examples)
 * - SEO-optimized content
 * - Professional technical writing
 */

const fs = require('fs');
const path = require('path');

// Check for OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('\n❌ ERROR: OPENAI_API_KEY not found in environment!');
  console.error('\nPlease set your OpenAI API key:');
  console.error('  export OPENAI_API_KEY="your-key-here"');
  console.error('\nOr add it to .env.local file\n');
  process.exit(1);
}

console.log('\n🤖 ARTICLE EXPANSION TOOL (GPT-4)\n');
console.log('='.repeat(70));

// Read content audit report to find stub articles
const reportPath = path.join(__dirname, '../content-audit-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const stubArticles = report.articles.filter(a => a.analysis.words < 100);

console.log(`\n📊 FOUND ${stubArticles.length} STUB ARTICLES:\n`);
stubArticles.forEach(a => {
  console.log(`   - ${a.slug}: ${a.analysis.words} words → target: 500+ words`);
});

console.log(`\n💰 ESTIMATED COST:`);
console.log(`   Articles: ${stubArticles.length}`);
console.log(`   Input tokens: ~${stubArticles.length * 200} (~$${(stubArticles.length * 200 * 0.000003).toFixed(3)})`);
console.log(`   Output tokens: ~${stubArticles.length * 1500} (~$${(stubArticles.length * 1500 * 0.000015).toFixed(2)})`);
console.log(`   Total estimated: $${((stubArticles.length * 200 * 0.000003) + (stubArticles.length * 1500 * 0.000015)).toFixed(2)}`);

console.log(`\n🚀 EXPANSION PROCESS:\n`);
console.log(`   1. Read each stub article`);
console.log(`   2. Generate expansion prompt for GPT-4`);
console.log(`   3. Call OpenAI API (gpt-4-turbo)`);
console.log(`   4. Process and validate response`);
console.log(`   5. Update local-articles.ts`);
console.log(`   6. Verify quality`);

console.log('\n' + '='.repeat(70));
console.log('\n⚠️  READY TO EXPAND ARTICLES');
console.log('\nThis will:');
console.log('  - Use OpenAI API (cost: ~$0.20)');
console.log('  - Modify lib/local-articles.ts');
console.log('  - Expand 9 stub articles to 500+ words');
console.log('\nContinue? This tool requires manual execution.\n');
console.log('To expand articles, you need to:');
console.log('  1. Ensure OPENAI_API_KEY is set');
console.log('  2. Install OpenAI SDK: npm install openai');
console.log('  3. Run the actual expansion (implement GPT-4 calls)');
console.log('\n📝 For now, this is a PREPARATION script.');
console.log('   The actual expansion will be done in the next step.\n');

// Save stub articles list for processing
const stubsToExpand = {
  timestamp: new Date().toISOString(),
  count: stubArticles.length,
  articles: stubArticles.map(a => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    currentWords: a.analysis.words,
    targetWords: 500,
    language: a.slug.endsWith('-en') ? 'English' : 'Polish'
  }))
};

const stubsPath = path.join(__dirname, '../stubs-to-expand.json');
fs.writeFileSync(stubsPath, JSON.stringify(stubsToExpand, null, 2));
console.log(`📄 Stub articles list saved: ${stubsPath}\n`);

// Generate expansion prompts
console.log('📝 GENERATING EXPANSION PROMPTS:\n');

stubsToExpand.articles.forEach((article, i) => {
  const prompt = `You are a professional tech journalist writing for icoffio.com.

Task: Expand this ${article.language} article to 500-600 words of high-quality content.

Current Article:
Title: ${article.title}
Excerpt: ${article.excerpt}
Current length: ${article.currentWords} words

Requirements:
1. Write in ${article.language}
2. Target length: 500-600 words
3. Professional tone, technical accuracy
4. Proper markdown formatting:
   - One H1 (# title)
   - 3-5 H2 sections (## Section)
   - 2-3 H3 subsections (### Subsection)
   - Bullet lists for key points
   - Code examples if relevant
5. Structure:
   - Introduction paragraph (100 words)
   - 3-4 main sections with details
   - Conclusion paragraph (50 words)
6. SEO optimization:
   - Use keywords naturally
   - Add relevant examples
   - Include actionable insights

Style: Informative, engaging, authoritative. Similar to TechCrunch or The Verge.

Write the expanded article in markdown format:`;

  console.log(`${i + 1}. ${article.slug} (${article.language}):`);
  console.log(`   Prompt length: ${prompt.length} chars`);
  console.log(`   Target: ${article.currentWords} → 500+ words\n`);
});

console.log('='.repeat(70));
console.log('\n✅ Preparation complete!\n');
console.log('Next steps:');
console.log('  1. Review stubs-to-expand.json');
console.log('  2. Run GPT-4 expansion (requires OpenAI SDK)');
console.log('  3. Or use admin panel for manual expansion\n');




