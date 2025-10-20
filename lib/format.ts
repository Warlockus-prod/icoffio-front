export const slugify = (s: string) => s
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/(^-|-$)/g, "")
  .substring(0, 50); // ✅ ИСПРАВЛЕНИЕ: ограничиваем длину до 50 символов
