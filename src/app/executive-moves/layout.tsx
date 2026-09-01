import { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import DatasetSchema from '@/components/seo/DatasetSchema';

export const metadata: Metadata = {
  title: 'Executive Move Tracker',
  description: 'Track C-suite and VP-level leadership changes across the space industry. Monitor hiring, departures, and promotions at SpaceX, Blue Origin, and 100+ space companies.',
  keywords: ['space executive moves', 'aerospace leadership changes', 'space industry hiring', 'space CEO changes', 'defense space executives'],
  openGraph: {
    title: 'Executive Move Tracker | SpaceNexus',
    description: 'Track C-suite and VP-level leadership changes across the space industry. Monitor hiring, departures, and promotions at SpaceX, Blue Origin, and 100+ space companies.',
    url: 'https://spacenexus.us/executive-moves',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Executive Move Tracker | SpaceNexus',
    description: 'Track C-suite and VP-level leadership changes across the space industry.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/executive-moves',
  },
};

// Structured data lives in the (server) layout: the page itself is a client
// component behind Suspense, so this is the reliable place for crawlers to
// find it. The Dataset points at the CSV export on /datasets.
export default function ExecutiveMovesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Executive Moves' }]} />
      <DatasetSchema
        name="SpaceNexus Executive Moves"
        description="Leadership changes across the space industry — hires, departures, promotions, appointments and board seats at the C-suite and VP level — recorded from primary sources since 2026-08-24 with the source URL for every row."
        url="https://spacenexus.us/executive-moves"
        distributionUrl="https://spacenexus.us/api/datasets/executive-moves/csv"
        encodingFormat="text/csv"
        temporalCoverage="2026-08-24/.."
        keywords={['executive moves', 'space industry leadership', 'CEO changes', 'aerospace executives']}
      />
    </>
  );
}
