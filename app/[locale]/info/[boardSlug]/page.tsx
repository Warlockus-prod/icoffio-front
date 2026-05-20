import dynamicImport from 'next/dynamic';
import { InfoBoardPage } from '@/components/info/InfoBoardPage';

// v10.10.0: InfoWatchPage is 1338 lines + heavy (admin forms, sparklines, AI report renderer).
// Code-split it from the route bundle so other /info/<board> users don't pay for it.
// SSR kept on (ssr: true is the default) — preserves SEO + initial paint.
const InfoWatchPage = dynamicImport(
  () => import('@/components/info/InfoWatchPage').then((m) => m.InfoWatchPage),
  { loading: () => <div className="p-8 text-center text-gray-500">Loading Market Watch…</div> },
);

// Next.js page-level `export const dynamic` controls SSR mode (force-dynamic / force-static / etc).
export const dynamic = 'force-dynamic';

export default function BoardPage({ params }: { params: { boardSlug: string; locale: string } }) {
  if (params.boardSlug === 'watch') {
    return <InfoWatchPage />;
  }
  return <InfoBoardPage slug={params.boardSlug} locale={params.locale} />;
}
