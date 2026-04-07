import { InfoBoardPage } from '@/components/info/InfoBoardPage';
import { InfoWatchPage } from '@/components/info/InfoWatchPage';

export const dynamic = 'force-dynamic';

export default function BoardPage({ params }: { params: { boardSlug: string; locale: string } }) {
  if (params.boardSlug === 'watch') {
    return <InfoWatchPage />;
  }
  return <InfoBoardPage slug={params.boardSlug} />;
}
