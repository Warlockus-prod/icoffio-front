import { InfoBoardPage } from '@/components/info/InfoBoardPage';

export const dynamic = 'force-dynamic';

export default function BoardPage({ params }: { params: { boardSlug: string; locale: string } }) {
  return <InfoBoardPage slug={params.boardSlug} />;
}
