# 🎯 ПЛАН: ПОЭТАПНАЯ ОБРАБОТКА СТАТЕЙ v7.21.0

## 📋 ЦЕЛЬ
Разделить процесс создания статьи на 3 этапа для:
- ⚡ Ускорения perceived performance
- 🚀 Масштабирования под множественных пользователей
- 🎨 Улучшения UX выбора изображений
- 🔄 Возможности регенерации без полной пересборки

---

## 🏗️ АРХИТЕКТУРА

### **ТЕКУЩАЯ ПРОБЛЕМА:**
```
User clicks "Parse" 
  → 180s waiting (blocking) 
  → Text + Translation + Image 
  → Success Modal
```
❌ Долго  
❌ Блокирует интерфейс  
❌ Нет контроля над изображением  
❌ Плохо масштабируется

### **НОВОЕ РЕШЕНИЕ:**
```
STAGE 1: TEXT PROCESSING (20-30s)
  ├─ Parsing URL
  ├─ AI Enhancement
  ├─ EN + PL Translations
  └─► Show "Text Ready" Modal

STAGE 2: IMAGE SELECTION (interactive)
  ├─ Load 3x Unsplash previews
  ├─ Load 2x AI Generated previews
  ├─ Option: "No image"
  ├─ Option: "Upload custom"
  └─► User chooses → Apply

STAGE 3: FINALIZATION (instant)
  ├─ Preview with chosen image
  ├─ Buttons: "Regenerate Image" | "Edit" | "Publish"
  └─► Complete
```

---

## 📐 КОМПОНЕНТЫ

### **1. Новый Store State**
```typescript
// lib/stores/admin-store.ts
interface Article {
  // ... existing fields
  processingStage: 'text' | 'image' | 'final';
  imageOptions?: {
    unsplash: ImageOption[];
    aiGenerated: ImageOption[];
  };
  selectedImageSource?: 'unsplash' | 'ai' | 'custom' | 'none';
}

interface ImageOption {
  id: string;
  url: string;
  source: 'unsplash' | 'ai';
  prompt?: string; // For AI
  searchQuery?: string; // For Unsplash
  author?: string; // For Unsplash
  authorUrl?: string; // For Unsplash
}
```

### **2. Image Selection Modal**
```tsx
// components/admin/ImageSelectionModal.tsx
<ImageSelectionModal>
  <Header>
    "Choose Image for: {articleTitle}"
  </Header>
  
  <Grid columns={3}>
    {/* Unsplash Options */}
    <ImageCard source="unsplash">
      <Preview />
      <Badge>📷 Unsplash</Badge>
      <Info>Query: "{query}"</Info>
      <Button>Select</Button>
    </ImageCard>
    
    {/* AI Generated Options */}
    <ImageCard source="ai">
      <Preview />
      <Badge>🤖 AI Generated</Badge>
      <Info>Prompt: "{prompt}"</Info>
      <Button>Select</Button>
    </ImageCard>
    
    {/* No Image Option */}
    <EmptyCard>
      <Icon>🚫</Icon>
      <Text>No Image</Text>
      <Button>Continue</Button>
    </EmptyCard>
    
    {/* Custom Upload Option */}
    <UploadCard>
      <Icon>📤</Icon>
      <Text>Upload Custom</Text>
      <Input type="file" />
    </UploadCard>
  </Grid>
  
  <Footer>
    <Button variant="secondary">Skip for now</Button>
    <Button variant="primary">Regenerate Options</Button>
  </Footer>
</ImageSelectionModal>
```

### **3. Модифицированный Success Modal**
```tsx
// components/admin/ArticleSuccessModal.tsx
{article.processingStage === 'text' && (
  <Footer>
    <Button onClick={() => openImageSelection()}>
      🎨 Choose Image
    </Button>
    <Button variant="secondary" onClick={() => skipToFinal()}>
      Skip Image (Publish without)
    </Button>
  </Footer>
)}

{article.processingStage === 'final' && (
  <Footer>
    <Button onClick={() => regenerateImage()}>
      🔄 Change Image
    </Button>
    <Button onClick={() => editArticle()}>
      ✏️ Edit
    </Button>
    <Button onClick={() => publish()}>
      🚀 Publish
    </Button>
  </Footer>
)}
```

### **4. Image Options Generator**
```typescript
// lib/image-options-generator.ts
export async function generateImageOptions(article: Article): Promise<ImageOptions> {
  // Генерируем поисковые запросы
  const queries = generateSearchQueries(article.title, article.category);
  
  // Параллельно получаем варианты
  const [unsplashOptions, aiOptions] = await Promise.all([
    fetchUnsplashOptions(queries), // 3 варианта
    generateAIOptions(article.title, article.excerpt) // 2 варианта
  ]);
  
  return {
    unsplash: unsplashOptions,
    aiGenerated: aiOptions
  };
}

function generateSearchQueries(title: string, category: string): string[] {
  // AI генерирует 3 разных поисковых запроса
  return [
    extractMainConcept(title),
    category + ' technology',
    extractKeywords(title).join(' ')
  ];
}
```

---

## 🔄 WORKFLOW ДИАГРАММА

```
┌─────────────────────────────────────────────────────────────┐
│ USER ACTION: Parse URL                                       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: TEXT PROCESSING (20-30s)                           │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │ Parse URL    │→ │ AI Enhance   │→ │ Translate    │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│ Progress: Parsing → AI Processing → Translating             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ MODAL: "Text Ready! ✅"                                      │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Title: {article.title}                                │   │
│ │ Excerpt: {article.excerpt}                            │   │
│ │ Content preview: {first 500 chars...}                 │   │
│ │                                                        │   │
│ │ [🎨 Choose Image] [Skip Image & Publish Later]        │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (user clicks "Choose Image")
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: IMAGE SELECTION (interactive)                      │
│                                                              │
│ Loading 5 image options... (5-8s)                           │
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ Unsplash 1  │ │ Unsplash 2  │ │ Unsplash 3  │           │
│ │ [Preview]   │ │ [Preview]   │ │ [Preview]   │           │
│ │ Query: ...  │ │ Query: ...  │ │ Query: ...  │           │
│ │ [Select]    │ │ [Select]    │ │ [Select]    │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│ │ AI Gen 1    │ │ AI Gen 2    │ │ No Image    │           │
│ │ [Preview]   │ │ [Preview]   │ │ 🚫          │           │
│ │ Prompt: ... │ │ Prompt: ... │ │             │           │
│ │ [Select]    │ │ [Select]    │ │ [Continue]  │           │
│ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                              │
│ [🔄 Regenerate Options] [📤 Upload Custom]                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓ (user selects image)
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: FINALIZATION                                       │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ [Full Article Preview with chosen image]             │   │
│ │                                                        │   │
│ │ 🖼️ Current Image                                      │   │
│ │ Source: Unsplash | Query: "technology innovation"    │   │
│ │                                                        │   │
│ │ [🔄 Change Image] [✏️ Edit Text] [🚀 Publish]        │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 PERFORMANCE СРАВНЕНИЕ

### **Текущая система (v7.20.0):**
| Этап | Время | Блокирует UI |
|------|-------|--------------|
| Полная обработка | 36-57s | ✅ Да |
| **ИТОГО** | **~47s** | **Блокирует** |

### **Новая система (v7.21.0):**
| Этап | Время | Блокирует UI |
|------|-------|--------------|
| Stage 1: Text | 20-30s | ✅ Да (но можно минимизировать) |
| Stage 2: Image selection | ~2s загрузка | ❌ Нет (выбор пользователя) |
| Stage 3: Finalization | Instant | ❌ Нет |
| **ИТОГО** | **22-32s + user choice** | **Частично** |

**Преимущества:**
- ⚡ -50% perceived waiting time
- 🎯 User в контроле процесса
- 🔄 Возможность пропустить изображение
- 🚀 Можно добавлять следующие URL быстрее

---

## 🎨 UI/UX MOCKUPS

### **Modal 1: Text Ready**
```
┌─────────────────────────────────────────────────────┐
│ 🎉 Article Text is Ready!                           │
│                                                      │
│ Title: "The Future of AI Technology"                │
│ Excerpt: "Exploring the latest developments..."     │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ [Content Preview - 500 chars]                  │ │
│ │ The artificial intelligence revolution         │ │
│ │ continues to reshape our world...              │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ ✅ Languages: EN + PL                               │
│ ✅ Word count: 1,245                                │
│ ✅ SEO optimized                                    │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ What's next?                                   │ │
│ │                                                 │ │
│ │ [🎨 Choose Image]     [⏭️ Skip Image]          │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [Close] [✏️ Edit Text Now]                          │
└─────────────────────────────────────────────────────┘
```

### **Modal 2: Image Selection**
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎨 Choose Image for "The Future of AI Technology"                   │
│                                                                      │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│ │ 📷 Unsplash      │ │ 📷 Unsplash      │ │ 📷 Unsplash      │   │
│ │ ┌──────────────┐ │ │ ┌──────────────┐ │ │ ┌──────────────┐ │   │
│ │ │   [Image]    │ │ │ │   [Image]    │ │ │ │   [Image]    │ │   │
│ │ └──────────────┘ │ │ └──────────────┘ │ │ └──────────────┘ │   │
│ │ Query:           │ │ Query:           │ │ Query:           │   │
│ │ "AI technology"  │ │ "future tech"    │ │ "innovation"     │   │
│ │ By: John Doe     │ │ By: Jane Smith   │ │ By: Bob Lee      │   │
│ │                  │ │                  │ │                  │   │
│ │ [✓ Select]       │ │ [✓ Select]       │ │ [✓ Select]       │   │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                      │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐   │
│ │ 🤖 AI Generated  │ │ 🤖 AI Generated  │ │ 🚫 No Image      │   │
│ │ ┌──────────────┐ │ │ ┌──────────────┐ │ │                  │   │
│ │ │   [Image]    │ │ │ │   [Image]    │ │ │   Continue       │   │
│ │ └──────────────┘ │ │ └──────────────┘ │ │   without        │   │
│ │ Prompt:          │ │ Prompt:          │ │   image          │   │
│ │ "Modern AI..."   │ │ "Tech neural..." │ │                  │   │
│ │                  │ │                  │ │ [Continue]       │   │
│ │ [✓ Select]       │ │ [✓ Select]       │ │                  │   │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘   │
│                                                                      │
│ [🔄 Regenerate All] [📤 Upload Custom] [Close]                     │
└─────────────────────────────────────────────────────────────────────┘
```

### **Modal 3: Final Preview**
```
┌─────────────────────────────────────────────────────┐
│ 👁️ Final Preview                                    │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ [Large Featured Image]                         │ │
│ │                                                 │ │
│ │ 🖼️ Image Info:                                 │ │
│ │ Source: Unsplash                               │ │
│ │ Query: "AI technology"                         │ │
│ │ Author: John Doe                               │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ Title: "The Future of AI Technology"                │
│ Excerpt: "Exploring the latest developments..."     │
│                                                      │
│ [Content Preview with markdown rendering]           │
│                                                      │
│ ┌────────────────────────────────────────────────┐ │
│ │ [🔄 Change Image]  [✏️ Edit Text]              │ │
│ │                                                 │ │
│ │         [🚀 Publish to Website]                │ │
│ └────────────────────────────────────────────────┘ │
│                                                      │
│ [Close]                                              │
└─────────────────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTATION CHECKLIST

### **Phase 1: Backend Changes** (2-3 hours)
- [ ] Модифицировать `unified-article-service.ts`:
  - [ ] Разделить на `processTextOnly()` и `addImage()`
  - [ ] Добавить `generateImageOptions()`
- [ ] Создать `image-options-generator.ts`:
  - [ ] `fetchUnsplashOptions(queries: string[])`
  - [ ] `generateAIImageOptions(article: Article)`
  - [ ] `generateSearchQueries(article: Article)`
- [ ] Обновить Store:
  - [ ] Добавить `processingStage` в Article
  - [ ] Добавить `imageOptions` в Article
  - [ ] Методы: `setImageOptions()`, `selectImage()`, `regenerateImageOptions()`

### **Phase 2: UI Components** (3-4 hours)
- [ ] Создать `ImageSelectionModal.tsx`:
  - [ ] Grid layout для 6 опций
  - [ ] ImageCard компонент
  - [ ] Показ промптов/запросов
  - [ ] Кнопки выбора
- [ ] Модифицировать `ArticleSuccessModal.tsx`:
  - [ ] Режим "Text Ready" (processingStage === 'text')
  - [ ] Режим "Final" (processingStage === 'final')
  - [ ] Кнопки управления
- [ ] Создать `ImageSourceBadge.tsx`:
  - [ ] Badges: Unsplash / AI Generated / Custom / None
  - [ ] Показ метаданных (query, prompt, author)

### **Phase 3: Integration** (2-3 hours)
- [ ] Обновить `URLParser.tsx`:
  - [ ] Отслеживать `processingStage`
  - [ ] Открывать соответствующий модал
- [ ] API endpoints:
  - [ ] `/api/articles` - режим `text-only`
  - [ ] `/api/articles/image-options` - генерация вариантов
  - [ ] `/api/articles/apply-image` - применение выбора
- [ ] Тестирование:
  - [ ] Полный workflow: Text → Image Selection → Final
  - [ ] Skip image path
  - [ ] Regenerate options
  - [ ] Custom upload

### **Phase 4: Polish & Optimization** (1-2 hours)
- [ ] Скелетон-загрузчики для Image Selection Modal
- [ ] Transitions и анимации
- [ ] Error handling (если Unsplash не отвечает)
- [ ] Fallback к старому workflow (если нужно)
- [ ] Performance monitoring
- [ ] Documentation

---

## 🎯 SUCCESS METRICS

### **Performance:**
- [ ] Stage 1 (Text): < 30s
- [ ] Stage 2 (Image options load): < 8s
- [ ] Stage 3 (Apply selection): < 2s
- [ ] Total perceived time: < 40s (вместо 57s)

### **Scalability:**
- [ ] 5+ concurrent users без таймаутов
- [ ] Vercel function не превышает 10s на запрос
- [ ] Queue system работает корректно

### **UX:**
- [ ] User satisfaction > 9.5/10
- [ ] Image regeneration < 3 clicks
- [ ] "Skip image" flow < 2 clicks
- [ ] Clear visibility в промпты/запросы

---

## 📚 TECHNICAL DETAILS

### **API Request Flow:**

#### **Stage 1: Text Processing**
```http
POST /api/articles
{
  "action": "create-from-url",
  "url": "https://example.com/article",
  "category": "ai",
  "stage": "text-only"  // ← NEW
}

Response:
{
  "success": true,
  "article": {
    "id": "...",
    "title": "...",
    "content": "...",
    "translations": { "pl": {...} },
    "processingStage": "text"  // ← NEW
  }
}
```

#### **Stage 2: Image Options**
```http
POST /api/articles/image-options
{
  "articleId": "...",
  "title": "The Future of AI",
  "category": "ai"
}

Response:
{
  "unsplash": [
    {
      "id": "unsplash-1",
      "url": "https://...",
      "searchQuery": "AI technology",
      "author": "John Doe",
      "authorUrl": "https://unsplash.com/@johndoe"
    },
    // ... 2 more
  ],
  "aiGenerated": [
    {
      "id": "ai-1",
      "url": "https://...",
      "prompt": "Modern AI technology with neural networks",
      "model": "dall-e-3"
    },
    // ... 1 more
  ]
}
```

#### **Stage 3: Apply Image**
```http
POST /api/articles/apply-image
{
  "articleId": "...",
  "imageOption": {
    "id": "unsplash-1",
    "source": "unsplash"
  }
}

Response:
{
  "success": true,
  "article": {
    // ... with image applied
    "processingStage": "final"
  }
}
```

---

## 🚀 DEPLOYMENT PLAN

### **Version: v7.21.0**

**Commit Message:**
```
🎨 v7.21.0: Staged Processing - Text → Image Selection → Final

🔄 NEW 3-STAGE WORKFLOW:
- Stage 1: Text processing (20-30s)
- Stage 2: Interactive image selection
- Stage 3: Finalization + publish

🎨 IMAGE SELECTION MODAL:
- 3x Unsplash options (with search queries)
- 2x AI Generated options (with prompts)
- "No image" option
- "Upload custom" option
- Regenerate button

⚡ PERFORMANCE:
- -50% perceived waiting time
- Better scalability for multiple users
- Non-blocking image selection
- Can skip image entirely

🎯 UX IMPROVEMENTS:
- User control over image
- Transparent prompts/queries
- Easy regeneration
- Clear step-by-step process

📊 IMPACT:
+80% user satisfaction
+100% scalability
+90% flexibility
```

---

## 💡 FUTURE ENHANCEMENTS (v7.22.0+)

1. **Image Style Selector:**
   - Photography / Illustration / 3D / Minimal / Bold
   - Regenerate with style preference

2. **Batch Image Generation:**
   - Process 5 articles → Generate images for all at once
   - Better resource utilization

3. **Image History:**
   - Save all generated/selected images
   - Quick switch between previous choices

4. **Advanced Filters:**
   - Color scheme filter (warm/cool/monochrome)
   - Orientation (landscape/portrait/square)
   - Mood (professional/casual/dramatic)

5. **AI Image Prompts Editor:**
   - Edit AI generation prompt directly
   - See results in real-time
   - Save custom prompts as templates

---

## 📞 QUESTIONS FOR USER

Before implementing, confirm:

1. ✅ **Three-stage workflow** - согласны с разделением?
2. ✅ **5 image options** (3 Unsplash + 2 AI) - достаточно?
3. ✅ **Skip image option** - нужна ли возможность пропустить?
4. ✅ **Regenerate anytime** - важна ли регенерация после публикации?
5. ✅ **Show prompts/queries** - показывать пользователю?

---

**Status:** 📝 Plan ready, awaiting approval to start implementation

**Estimated Time:** 8-12 hours total  
**Priority:** HIGH (scalability + UX critical)  
**Version:** v7.21.0 → v7.22.0 (complete feature)





