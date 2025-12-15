const slugs = ['apple-pl','apple-en','pl-2','en-5','google-android-sms-ios-pl','google-android-sms-ios-en','en-4','en-3','pl','en-2','test-article-benefits-of-coffee-for-productivity-en','siri-google-gemini-pl-4','siri-google-gemini-pl-3','siri-google-gemini-en-4','siri-google-gemini-en-3','siri-google-gemini-pl-2','siri-google-gemini-en-2','siri-google-gemini-pl','siri-google-gemini-en','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-4','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-3','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-4','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-3','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl-2','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en-2','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-pl','ai-revolutionizes-healthcare-doctors-use-machine-learning-for-diagnostics-en','ai-edited-test-en-2','en'];

let deleted = 0, failed = 0;

async function deleteAll() {
  console.log(`🗑️  Удаление ${slugs.length} статей...\n`);
  for (const slug of slugs) {
    try {
      const res = await fetch('https://app.icoffio.com/api/admin/delete-article', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({slug})
      });
      const data = await res.json();
      if (data.success) {
        console.log(`✅ ${slug}`);
        deleted++;
      } else {
        console.log(`❌ ${slug}: ${data.error || 'error'}`);
        failed++;
      }
      await new Promise(r => setTimeout(r, 800));
    } catch(e) {
      console.log(`❌ ${slug}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n📊 Удалено: ${deleted}, Ошибок: ${failed}`);
}

deleteAll();
