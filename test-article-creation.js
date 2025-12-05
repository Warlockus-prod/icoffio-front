// Тест создания статьи через API
const testUrl = 'https://wylsa.com/what-is-artificial-intelligence/';

fetch('http://localhost:3000/api/articles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create-from-url',
    url: testUrl,
    category: 'ai'
  })
})
.then(res => res.json())
.then(data => {
  console.log('SUCCESS:', JSON.stringify(data, null, 2));
  if (data.success && data.imageOptions) {
    console.log('\nImage Options:', data.imageOptions.unsplash?.length || 0, 'Unsplash images');
  }
})
.catch(err => console.error('ERROR:', err));
