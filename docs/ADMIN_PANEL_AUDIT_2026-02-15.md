# Admin Panel Audit - 2026-02-15

## Scope
- URL/Text/AI article creation flow in admin panel
- Image selection and hero image persistence
- Publication pipeline to Supabase/runtime
- `All Articles` list quality (thumbnails, views, links)
- Excerpt/summary markdown artifact sanitation (EN/PL)

## Fixed In This Cycle
- Hero image selection is now deterministic and prioritizes user-selected/generated images.
- Publication flow no longer keeps default placeholder as article cover when real image is selected.
- AI Generate flow was stabilized to reduce failed text jobs in queue.
- Text pipeline now supports control flags for heavy steps (`enhanceContent`, `generateImage`, `translateToAll`, `stage`).
- Queue retry behavior for `text:` jobs was made safe (no invalid URL parser retry).
- `All Articles` no longer uses random fake views and now has thumbnail fallback on image load errors.
- Excerpt sanitation was improved to remove hidden markdown artifacts.

## Cleanup Check
- Checked tracked files for temporary artifacts (`.tmp`, `.bak`, `.log`, `.orig`, `.rej`, archives).
- No critical temporary files are tracked in git.
- Local `.DS_Store` may appear on macOS but is ignored by `.gitignore`.

## Current Risks
- Repository contains dual app trees (`/` and `/icoffio-clone-nextjs`) that can drift and create inconsistent fixes.
- Root and clone store/auth logic are not fully identical.
- Some legacy code still uses broad fallbacks where explicit error reasons would improve debugging speed.

## Recommended Next Improvements
1. Consolidate to a single source app directory for production code to remove root/clone drift.
2. Add small integration tests for:
   - AI Generate -> Queue -> Ready
   - Selected hero image -> publish -> All Articles thumbnail
   - Excerpt sanitation for EN/PL.
3. Add structured error codes for admin pipeline failures (network, timeout, validation, provider).
4. Add lightweight health diagnostics panel for OpenAI/Supabase/image provider availability.
5. Normalize release process:
   - version bump
   - changelog entry
   - deployment id record
   - quick smoke checklist.
