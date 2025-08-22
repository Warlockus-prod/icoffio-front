import Link from "next/link";

export function CategoryNav({ categories, locale = 'en' }: { categories: { name: string; slug: string }[]; locale?: string }) {
  return (
    <nav className="flex gap-3 overflow-x-auto py-4 no-scrollbar text-sm">
      {categories.map((c) => (
        <Link key={c.slug} href={`/${locale}/category/${c.slug}`} className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 hover:bg-neutral-50">
          {c.name}
        </Link>
      ))}
    </nav>
  );
}