import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Info Portal',
  description: 'News feed aggregator — curated sources in one place',
};

export default function InfoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
