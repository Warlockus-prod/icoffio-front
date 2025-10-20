/**
 * 🚀 DEPLOY CONFIGURATION v1.4.0
 * CRITICAL SLUG FIXES DEPLOYMENT
 */

module.exports = {
  version: '1.4.0',
  deployReason: 'CRITICAL_SLUG_FIXES',
  timestamp: new Date().toISOString(),
  
  features: [
    'slug-length-validation',
    'safe-slug-generation', 
    'russian-language-exclusion',
    'react-dom-error-fixes',
    'api-validation-layer'
  ],
  
  config: {
    slugMaxLength: 48,
    supportedLanguages: ['en', 'pl', 'de', 'ro', 'cs'],
    enableValidation: true
  },
  
  forceRebuild: true,
  cacheBust: `v1.4.0_${Date.now()}`
};
