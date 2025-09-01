import Link from 'next/link';
import { getTranslation } from '@/lib/i18n';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  locale: string;
}

export function Breadcrumbs({ items, locale }: BreadcrumbsProps) {
  const t = getTranslation(locale as any);
  
  // Всегда добавляем Home в начало
  const allItems: BreadcrumbItem[] = [
    { label: t.home, href: `/${locale}` },
    ...items
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg 
                className="w-4 h-4 mx-2 text-neutral-400 dark:text-neutral-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            
            {item.href && index < allItems.length - 1 ? (
              <Link 
                href={item.href}
                className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span 
                className={index === allItems.length - 1 
                  ? "text-neutral-900 dark:text-neutral-100 font-medium" 
                  : ""}
                aria-current={index === allItems.length - 1 ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

