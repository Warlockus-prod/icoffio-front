#!/usr/bin/env node

/**
 * CONTENT QUALITY AUDIT SCRIPT
 * 
 * Analyzes all articles for:
 * - Text quality (length, structure, completeness)
 * - Grammar & readability
 * - SEO optimization (titles, excerpts, keywords)
 * - Markdown formatting consistency
 * - Content depth and engagement
 */

const fs = require('fs');
const path = require('path');

// Read local-articles.ts
const localArticlesPath = path.join(__dirname, '../lib/local-articles.ts');
const content = fs.readFileSync(localArticlesPath, 'utf-8');

// Parse articles
const articles = [];
const articleRegex = /\{[\s\S]*?slug:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"[\s\S]*?excerpt:\s*"([^"]+)"[\s\S]*?content:\s*`([\s\S]*?)`[\s\S]*?\}/g;

let match;
while ((match = articleRegex.exec(content)) !== null) {
  const [, slug, title, excerpt, articleContent] = match;
  articles.push({
    slug,
    title,
    excerpt,
    content: articleContent.trim()
  });
}

console.log('\n📝 CONTENT QUALITY AUDIT REPORT\n');
console.log('='.repeat(70));

// Statistics
console.log(`\n📊 OVERVIEW:`);
console.log(`   Total articles analyzed: ${articles.length}`);

const issues = {
  shortContent: [],
  longExcerpts: [],
  poorStructure: [],
  missingElements: [],
  seoIssues: []
};

// Analyze each article
articles.forEach(article => {
  const { slug, title, excerpt, content } = article;
  
  // Word and character counts
  const words = content.split(/\s+/).filter(w => w.length > 0).length;
  const chars = content.length;
  const excerptLength = excerpt.length;
  
  // Structure analysis
  const headings = (content.match(/^#{1,6}\s+.+$/gm) || []).length;
  const h1Count = (content.match(/^#\s+.+$/gm) || []).length;
  const h2Count = (content.match(/^##\s+.+$/gm) || []).length;
  const h3Count = (content.match(/^###\s+.+$/gm) || []).length;
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim() && !p.trim().startsWith('#')).length;
  const lists = (content.match(/^[-*+]\s+.+$/gm) || []).length;
  const links = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
  const images = (content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || []).length;
  const codeBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
  
  // Quality checks
  const hasIntro = content.substring(0, 500).length > 200;
  const hasConclusion = content.toLowerCase().includes('conclusion') || 
                        content.toLowerCase().includes('summary') ||
                        content.toLowerCase().includes('в заключение') ||
                        content.toLowerCase().includes('podsumowanie');
  
  // Title SEO (50-60 chars optimal)
  const titleLength = title.length;
  const titleSEO = titleLength >= 30 && titleLength <= 70 ? 'good' : 
                   titleLength < 30 ? 'too short' : 'too long';
  
  // Excerpt SEO (120-160 chars optimal)
  const excerptSEO = excerptLength >= 100 && excerptLength <= 160 ? 'good' :
                     excerptLength < 100 ? 'too short' : 'too long';
  
  // Content length evaluation
  const lengthEval = words >= 1000 ? 'excellent' :
                     words >= 500 ? 'good' :
                     words >= 300 ? 'fair' : 'too short';
  
  // Structure score (0-10)
  let structureScore = 0;
  if (h1Count === 1) structureScore += 2; // Single H1
  if (h2Count >= 3) structureScore += 2; // Multiple H2 sections
  if (h3Count >= 2) structureScore += 1; // Subsections
  if (paragraphs >= 5) structureScore += 2; // Good paragraph count
  if (lists >= 3) structureScore += 1; // Lists for readability
  if (images >= 1) structureScore += 1; // Visual content
  if (links >= 1) structureScore += 1; // External references
  
  article.analysis = {
    words,
    chars,
    excerptLength,
    headings,
    h1Count,
    h2Count,
    h3Count,
    paragraphs,
    lists,
    links,
    images,
    codeBlocks,
    hasIntro,
    hasConclusion,
    titleLength,
    titleSEO,
    excerptSEO,
    lengthEval,
    structureScore
  };
  
  // Collect issues
  if (words < 500) {
    issues.shortContent.push({ slug, words });
  }
  if (excerptLength > 160 || excerptLength < 100) {
    issues.longExcerpts.push({ slug, length: excerptLength, status: excerptSEO });
  }
  if (structureScore < 6) {
    issues.poorStructure.push({ slug, score: structureScore });
  }
  if (!hasIntro || !hasConclusion || h1Count !== 1) {
    issues.missingElements.push({ 
      slug, 
      missing: [
        !hasIntro && 'intro',
        !hasConclusion && 'conclusion',
        h1Count !== 1 && 'proper H1'
      ].filter(Boolean)
    });
  }
  if (titleSEO !== 'good' || excerptSEO !== 'good') {
    issues.seoIssues.push({ 
      slug, 
      title: titleSEO, 
      excerpt: excerptSEO,
      titleLen: titleLength,
      excerptLen: excerptLength
    });
  }
});

// Summary statistics
const avgWords = Math.round(articles.reduce((sum, a) => sum + a.analysis.words, 0) / articles.length);
const avgStructure = (articles.reduce((sum, a) => sum + a.analysis.structureScore, 0) / articles.length).toFixed(1);

console.log(`   Average word count: ${avgWords} words`);
console.log(`   Average structure score: ${avgStructure}/10`);

// Issue reporting
console.log(`\n⚠️  ISSUES FOUND:\n`);

if (issues.shortContent.length > 0) {
  console.log(`   📏 SHORT CONTENT (${issues.shortContent.length} articles):`);
  issues.shortContent.forEach(({ slug, words }) => {
    console.log(`      - ${slug}: ${words} words (recommend 500+ for quality)`);
  });
  console.log('');
}

if (issues.longExcerpts.length > 0) {
  console.log(`   📝 EXCERPT LENGTH ISSUES (${issues.longExcerpts.length} articles):`);
  issues.longExcerpts.forEach(({ slug, length, status }) => {
    console.log(`      - ${slug}: ${length} chars (${status}) - optimal: 100-160`);
  });
  console.log('');
}

if (issues.poorStructure.length > 0) {
  console.log(`   🏗️  POOR STRUCTURE (${issues.poorStructure.length} articles):`);
  issues.poorStructure.forEach(({ slug, score }) => {
    console.log(`      - ${slug}: ${score}/10 (needs improvement)`);
  });
  console.log('');
}

if (issues.missingElements.length > 0) {
  console.log(`   ❌ MISSING ELEMENTS (${issues.missingElements.length} articles):`);
  issues.missingElements.forEach(({ slug, missing }) => {
    console.log(`      - ${slug}: missing ${missing.join(', ')}`);
  });
  console.log('');
}

if (issues.seoIssues.length > 0) {
  console.log(`   🔍 SEO ISSUES (${issues.seoIssues.length} articles):`);
  issues.seoIssues.forEach(({ slug, title, excerpt, titleLen, excerptLen }) => {
    const problems = [];
    if (title !== 'good') problems.push(`title ${title} (${titleLen} chars, optimal: 30-70)`);
    if (excerpt !== 'good') problems.push(`excerpt ${excerpt} (${excerptLen} chars, optimal: 100-160)`);
    console.log(`      - ${slug}: ${problems.join(', ')}`);
  });
  console.log('');
}

// Quality score
const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
const maxPossibleIssues = articles.length * 5; // 5 types of issues
const qualityScore = ((1 - totalIssues / maxPossibleIssues) * 100).toFixed(1);

console.log(`\n📈 OVERALL QUALITY SCORE: ${qualityScore}/100`);

if (qualityScore >= 80) {
  console.log('   ✅ Excellent quality!');
} else if (qualityScore >= 60) {
  console.log('   ✅ Good quality - minor improvements possible');
} else if (qualityScore >= 40) {
  console.log('   ⚠️  Fair quality - improvements recommended');
} else {
  console.log('   ❌ Needs significant improvement');
}

// Detailed article breakdown
console.log(`\n\n📋 DETAILED ANALYSIS:\n`);

articles.forEach(article => {
  const { slug, title, analysis } = article;
  console.log(`\n${slug}:`);
  console.log(`   Title: "${title}" (${analysis.titleLength} chars - ${analysis.titleSEO})`);
  console.log(`   Content: ${analysis.words} words, ${analysis.chars} chars (${analysis.lengthEval})`);
  console.log(`   Excerpt: ${analysis.excerptLength} chars (${analysis.excerptSEO})`);
  console.log(`   Structure: ${analysis.structureScore}/10`);
  console.log(`      - H1: ${analysis.h1Count}, H2: ${analysis.h2Count}, H3: ${analysis.h3Count}`);
  console.log(`      - Paragraphs: ${analysis.paragraphs}, Lists: ${analysis.lists}`);
  console.log(`      - Images: ${analysis.images}, Links: ${analysis.links}`);
  console.log(`      - Intro: ${analysis.hasIntro ? '✓' : '✗'}, Conclusion: ${analysis.hasConclusion ? '✓' : '✗'}`);
});

// Recommendations
console.log(`\n\n💡 RECOMMENDATIONS:\n`);

const recommendations = [];

if (issues.shortContent.length > 0) {
  recommendations.push({
    priority: 'HIGH',
    action: `Expand ${issues.shortContent.length} short articles to 500+ words`,
    effort: 'Medium (2-4 hours)',
    impact: 'High (better SEO, engagement)'
  });
}

if (issues.seoIssues.length > 0) {
  recommendations.push({
    priority: 'HIGH',
    action: `Fix SEO for ${issues.seoIssues.length} articles (titles/excerpts)`,
    effort: 'Low (30 mins)',
    impact: 'High (better search rankings)'
  });
}

if (issues.poorStructure.length > 0) {
  recommendations.push({
    priority: 'MEDIUM',
    action: `Improve structure for ${issues.poorStructure.length} articles`,
    effort: 'Medium (1-2 hours)',
    impact: 'Medium (better readability)'
  });
}

if (issues.missingElements.length > 0) {
  recommendations.push({
    priority: 'MEDIUM',
    action: `Add missing elements to ${issues.missingElements.length} articles`,
    effort: 'Medium (1-2 hours)',
    impact: 'Medium (better completeness)'
  });
}

recommendations.forEach((rec, i) => {
  console.log(`   ${i + 1}. [${rec.priority}] ${rec.action}`);
  console.log(`      Effort: ${rec.effort}`);
  console.log(`      Impact: ${rec.impact}`);
  console.log('');
});

console.log('='.repeat(70));
console.log('\n✅ Content audit complete!\n');

// Save JSON report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalArticles: articles.length,
    avgWords,
    avgStructure: parseFloat(avgStructure),
    qualityScore: parseFloat(qualityScore),
    totalIssues
  },
  issues,
  articles: articles.map(({ slug, title, excerpt, analysis }) => ({
    slug,
    title,
    excerpt,
    analysis
  })),
  recommendations
};

const reportPath = path.join(__dirname, '../content-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 Detailed report saved: ${reportPath}\n`);



