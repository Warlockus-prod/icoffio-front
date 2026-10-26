# 📚 Library Structure - icoffio v7.31.0

This document describes the organization of the `/lib` directory.

## 📁 Directory Structure

```
lib/
├── config/                  # Configuration files
│   ├── adPlacements.ts     # Ad placement definitions
│   ├── content-prompts.ts  # AI content prompts
│   └── video-players.ts    # Video ad players config
│
├── stores/                  # State management (Zustand)
│   └── admin-store.ts      # Admin panel state
│
├── types/                   # Type definitions
│   └── image-metadata.ts   # Image-specific types
│
├── utils/                   # Utility functions
│   └── content-formatter.ts # HTML/Markdown formatting
│
├── services/                # External service integrations
│   ├── translation-service.ts
│   ├── copywriting-service.ts
│   ├── image-service.ts
│   ├── wordpress-service.ts
│   ├── url-parser-service.ts
│   └── telegram-*.ts       # Telegram bot services
│
├── api/                     # API helpers
│   ├── api-rate-limiter.ts # Rate limiting
│   ├── supabase-*.ts       # Supabase clients
│   └── queue-service.ts    # Job queue
│
├── data/                    # Data fetching
│   ├── data.ts             # Main data layer
│   ├── local-articles.ts   # Runtime article storage
│   └── mock-data.ts        # Fallback data
│
├── i18n/                    # Internationalization
│   ├── i18n.ts             # Main translations
│   ├── admin-i18n.ts       # Admin panel translations
│   └── telegram-i18n.ts    # Telegram bot translations
│
├── advertising/             # Ad system
│
└── *.ts                     # Root-level files
    ├── types.ts            # Main type definitions
    ├── format.ts           # Date/text formatting
    └── markdown.ts         # Markdown processing
```

## 🗂️ File Categories

### Configuration (`/config`)
Files that define static configurations for the application.

### State Management (`/stores`)
Zustand stores for client-side state management.

### Type Definitions (`/types`)
TypeScript type definitions and interfaces.

### Utility Functions (`/utils`)
Pure functions that perform specific transformations.

### External Services
Files that integrate with external APIs:
- `*-service.ts` - Service integrations (OpenAI, Unsplash, WordPress)
- `supabase-*.ts` - Supabase database operations
- `telegram-*.ts` - Telegram bot functionality

### Data Layer
Files responsible for data fetching and caching:
- `data.ts` - Main data fetching orchestration
- `local-articles.ts` - In-memory article storage
- `mock-data.ts` - Fallback/demo data

### Internationalization (`i18n`)
Translation files for different parts of the application.

## 📝 Naming Conventions

- **Services**: `{name}-service.ts` - External API integrations
- **Stores**: `{name}-store.ts` - Zustand state stores
- **Hooks**: `use{Name}.ts` - React hooks
- **Types**: `{name}.ts` or `types/{name}.ts` - Type definitions
- **Utils**: `{name}.ts` in `/utils/` - Utility functions

## 🔗 Import Aliases

Use the `@/lib/` path alias for imports:

```typescript
import { Post } from '@/lib/types';
import { translationService } from '@/lib/translation-service';
import { formatContentToHtml } from '@/lib/utils/content-formatter';
```

## ⚠️ Important Notes

1. **Root types.ts**: Main type definitions used across the app
2. **mock-data.ts**: Used for fallback when API is unavailable
3. **admin-store.ts**: Critical for admin panel functionality
4. **unified-article-service.ts**: Main article processing logic

## 📊 Migration Status (v7.31.0)

| Task | Status |
|------|--------|
| Centralize mock data | ✅ Done |
| Unify content formatter | ✅ Done |
| Add rate limiting | ✅ Done |
| Improve types | ✅ Done |
| Add VOX module | ✅ Done |
| Full restructure | 🔄 Planned |

