import { InfoHome } from '@/components/info/InfoHome';

export const dynamic = 'force-dynamic';

export default function InfoPage({ params }: { params: { locale: string } }) {
  return <InfoHome locale={params.locale} />;
}
