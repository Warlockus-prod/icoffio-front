import Link from "next/link";
import { CategoryIcon, getCategoryColor } from "./CategoryIcon";

export function CategoryNav({ categories, locale = 'en' }: { categories: { name: string; slug: string }[]; locale?: string }) {
  return (
    <nav className="flex gap-3 overflow-x-auto py-4 no-scrollbar text-sm">
      {categories.map((c) => (
        <Link 
          key={c.slug} 
          href={`/${locale}/category/${c.slug}`} 
          className={`shrink-0 flex items-center gap-1.5 rounded-full border-0 px-3 py-1.5 hover:scale-105 transition-all duration-200 font-medium ${getCategoryColor(c.name)}`}
        >
          <CategoryIcon category={c.name} size="sm" />
          {c.name}
        </Link>
      ))}
    </nav>
  );
}