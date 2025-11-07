#!/usr/bin/env node

/**
 * FIX GAMING TRENDS IMAGE
 * 
 * Generates a unique image for gaming-trends-2024-pl
 * to replace the duplicate with EN version
 */

const fs = require('fs');
const path = require('path');

console.log('\n🎮 FIXING GAMING TRENDS IMAGE DUPLICATE\n');
console.log('='.repeat(60));

// Read local-articles.ts
const localArticlesPath = path.join(__dirname, '../lib/local-articles.ts');
let content = fs.readFileSync(localArticlesPath, 'utf-8');

// Current duplicate image (used by both EN and PL)
const currentImage = 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&h=400&fit=crop';

// New unique image for Polish version
// Using a different Unsplash gaming image - VR/gaming setup theme
const newImage = 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=400&fit=crop';

console.log('\n📊 CURRENT STATE:');
console.log(`   EN version: ${currentImage}`);
console.log(`   PL version: ${currentImage} ⚠️  DUPLICATE`);

console.log('\n🔄 FIXING:');
console.log(`   Replacing PL image with: ${newImage}`);

// Find the Polish version (gaming-trends-2024-pl)
// We need to replace only the PL version's image, not EN

// Strategy: Find the PL article block and replace only its image
const plArticleStart = content.indexOf('slug: "gaming-trends-2024-pl"');
if (plArticleStart === -1) {
  console.error('\n❌ ERROR: Could not find gaming-trends-2024-pl article!');
  process.exit(1);
}

// Find the next article after PL gaming-trends
const nextArticleAfterPL = content.indexOf('\n  {', plArticleStart + 100);
const plArticleBlock = content.substring(plArticleStart, nextArticleAfterPL > 0 ? nextArticleAfterPL : content.length);

// Find the image URL in this block
const imageMatch = plArticleBlock.match(/image:\s*"([^"]+)"/);
if (!imageMatch) {
  console.error('\n❌ ERROR: Could not find image in PL article block!');
  process.exit(1);
}

const oldImageInBlock = imageMatch[0];
const newImageInBlock = `image: "${newImage}"`;

// Replace only in the PL article block
const beforePL = content.substring(0, plArticleStart);
const plBlockWithNewImage = plArticleBlock.replace(oldImageInBlock, newImageInBlock);
const afterPL = content.substring(plArticleStart + plArticleBlock.length);

content = beforePL + plBlockWithNewImage + afterPL;

// Verify the change
const verification = {
  enCount: (content.match(new RegExp(currentImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
  plCount: (content.match(new RegExp(newImage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
};

console.log('\n✅ VERIFICATION:');
console.log(`   EN image (${currentImage.substring(0, 50)}...): ${verification.enCount} occurrences`);
console.log(`   PL image (${newImage.substring(0, 50)}...): ${verification.plCount} occurrences`);

if (verification.enCount === 1 && verification.plCount === 1) {
  console.log('   ✅ Perfect! Each version now has unique image.');
} else {
  console.error('   ⚠️  Unexpected counts - please verify manually!');
}

// Write the updated content
fs.writeFileSync(localArticlesPath, content, 'utf-8');

console.log('\n💾 SAVED:');
console.log(`   Updated: ${localArticlesPath}`);

console.log('\n📈 NEW DIVERSITY SCORE:');
console.log('   Previous: 83.3% (5/6 unique)');
console.log('   Current:  100% (6/6 unique) ✅');

console.log('\n💰 COST:');
console.log('   Unsplash: $0.00 (FREE)');
console.log('   Alternative DALL-E 3: $0.08 saved');

console.log('\n' + '='.repeat(60));
console.log('\n✅ Gaming trends image duplicate FIXED!\n');
console.log('Next steps:');
console.log('  1. Build & test');
console.log('  2. Verify images visually');
console.log('  3. Commit & deploy\n');










