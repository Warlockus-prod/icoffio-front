#!/usr/bin/env node

/**
 * IMAGE AUDIT SCRIPT
 * 
 * Analyzes all articles and their images to find:
 * - Duplicate images
 * - Missing images
 * - Placeholder images
 * - Image diversity issues
 */

const fs = require('fs');
const path = require('path');

// Read local-articles.ts
const localArticlesPath = path.join(__dirname, '../lib/local-articles.ts');
const content = fs.readFileSync(localArticlesPath, 'utf-8');

// Extract all image URLs from articles
const imageRegex = /image:\s*"([^"]+)"/g;
const inlineImageRegex = /!\[.*?\]\((https?:\/\/[^)]+)\)/g;

const images = [];
const articles = [];

// Parse articles structure
const articleMatches = content.matchAll(/\{\s*slug:\s*"([^"]+)"[\s\S]*?image:\s*"([^"]+)"[\s\S]*?title:\s*"([^"]+)"/g);

for (const match of articleMatches) {
  const [, slug, image, title] = match;
  articles.push({
    slug,
    title,
    image,
    hasImage: !!image && image !== ''
  });
  
  if (image) {
    images.push(image);
  }
}

// Find inline images
const inlineImageMatches = content.matchAll(inlineImageRegex);
const inlineImages = [];
for (const match of inlineImageMatches) {
  inlineImages.push(match[1]);
}

// Analysis
console.log('\n🔍 IMAGE AUDIT REPORT\n');
console.log('='.repeat(60));

// Count stats
const totalArticles = articles.length;
const articlesWithImages = articles.filter(a => a.hasImage).length;
const articlesWithoutImages = totalArticles - articlesWithImages;

console.log(`\n📊 STATISTICS:`);
console.log(`   Total articles: ${totalArticles}`);
console.log(`   With images: ${articlesWithImages}`);
console.log(`   Without images: ${articlesWithoutImages}`);
console.log(`   Inline images found: ${inlineImages.length}`);

// Find duplicates
const imageCounts = {};
images.forEach(img => {
  imageCounts[img] = (imageCounts[img] || 0) + 1;
});

const duplicates = Object.entries(imageCounts).filter(([, count]) => count > 1);

console.log(`\n🔄 DUPLICATE IMAGES:`);
if (duplicates.length === 0) {
  console.log('   ✅ No duplicates found!');
} else {
  console.log(`   ⚠️  Found ${duplicates.length} duplicate images:\n`);
  duplicates.forEach(([img, count]) => {
    console.log(`   ${count}x: ${img.substring(0, 80)}...`);
    
    // Show which articles use this image
    const articlesWithThisImage = articles.filter(a => a.image === img);
    articlesWithThisImage.forEach(a => {
      console.log(`       - ${a.slug}`);
    });
    console.log('');
  });
}

// Find articles without images
console.log(`\n❌ ARTICLES WITHOUT IMAGES:`);
if (articlesWithoutImages === 0) {
  console.log('   ✅ All articles have images!');
} else {
  articles.filter(a => !a.hasImage).forEach(a => {
    console.log(`   - ${a.slug}: "${a.title}"`);
  });
}

// Analyze image sources
console.log(`\n🌐 IMAGE SOURCES:`);
const unsplash = images.filter(img => img.includes('unsplash.com')).length;
const other = images.length - unsplash;

console.log(`   Unsplash: ${unsplash} (${(unsplash/images.length*100).toFixed(1)}%)`);
console.log(`   Other: ${other} (${(other/images.length*100).toFixed(1)}%)`);

// Check for placeholder patterns
console.log(`\n🖼️  IMAGE QUALITY CHECK:`);
const placeholders = images.filter(img => 
  img.includes('placeholder') || 
  img.includes('example') || 
  img.includes('demo')
);

if (placeholders.length === 0) {
  console.log('   ✅ No obvious placeholders detected');
} else {
  console.log(`   ⚠️  Found ${placeholders.length} potential placeholders:`);
  placeholders.forEach(img => console.log(`      - ${img}`));
}

// Image diversity score
const uniqueImages = new Set(images).size;
const diversityScore = (uniqueImages / images.length * 100).toFixed(1);

console.log(`\n📈 DIVERSITY SCORE:`);
console.log(`   Unique images: ${uniqueImages} / ${images.length}`);
console.log(`   Diversity: ${diversityScore}%`);

if (diversityScore === '100.0') {
  console.log('   ✅ Perfect diversity!');
} else if (diversityScore >= 80) {
  console.log('   ✅ Good diversity');
} else if (diversityScore >= 60) {
  console.log('   ⚠️  Fair diversity - could be improved');
} else {
  console.log('   ❌ Low diversity - needs improvement');
}

// Recommendations
console.log(`\n💡 RECOMMENDATIONS:\n`);

if (duplicates.length > 0) {
  console.log(`   1. Generate unique images for ${duplicates.length} duplicate sets`);
  console.log(`      Estimated cost: $${(duplicates.reduce((sum, [, count]) => sum + count - 1, 0) * 0.08).toFixed(2)} (DALL-E 3)`);
}

if (articlesWithoutImages > 0) {
  console.log(`   2. Add images to ${articlesWithoutImages} articles without images`);
  console.log(`      Estimated cost: $${(articlesWithoutImages * 0.08).toFixed(2)} (DALL-E 3)`);
}

if (diversityScore < 100) {
  const needsReplacement = images.length - uniqueImages;
  console.log(`   3. Replace ${needsReplacement} duplicate images for variety`);
}

console.log(`   4. Consider using Unsplash (free) for some articles to reduce costs`);

// Total estimated cost
const totalImagesToGenerate = duplicates.reduce((sum, [, count]) => sum + count - 1, 0) + articlesWithoutImages;
const estimatedCost = totalImagesToGenerate * 0.08;

console.log(`\n💰 TOTAL ESTIMATED COST:`);
console.log(`   Images to generate: ${totalImagesToGenerate}`);
console.log(`   DALL-E 3 (HD): $${estimatedCost.toFixed(2)}`);
console.log(`   Alternative (Unsplash): $0.00 (free)`);
console.log(`   Recommended mix (20% DALL-E, 80% Unsplash): $${(estimatedCost * 0.2).toFixed(2)}`);

console.log('\n' + '='.repeat(60));
console.log('\n✅ Audit complete!\n');

// Create JSON report for further processing
const report = {
  timestamp: new Date().toISOString(),
  stats: {
    totalArticles,
    articlesWithImages,
    articlesWithoutImages,
    totalImages: images.length,
    uniqueImages,
    duplicates: duplicates.length,
    diversityScore: parseFloat(diversityScore)
  },
  duplicates: duplicates.map(([img, count]) => ({
    image: img,
    count,
    articles: articles.filter(a => a.image === img).map(a => a.slug)
  })),
  articlesWithoutImages: articles.filter(a => !a.hasImage),
  recommendations: {
    imagesToGenerate: totalImagesToGenerate,
    estimatedCostDallE: estimatedCost,
    estimatedCostUnsplash: 0,
    recommendedMixCost: estimatedCost * 0.2
  }
};

const reportPath = path.join(__dirname, '../image-audit-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`📄 Detailed report saved: ${reportPath}\n`);







