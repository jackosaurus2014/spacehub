import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Status',
  description: 'SpaceNexus platform status and system health. Live database, API, and data pipeline monitoring.',
  alternates: { canonical: 'https://spacenexus.us/status' },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
