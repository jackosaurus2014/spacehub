import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Patent Tracker',
  description: 'Track patent filings, grants, and IP trends across the space industry. Monitor SpaceX, Blue Origin, Rocket Lab, and 200+ space companies. Enterprise intelligence from SpaceNexus.',
  keywords: ['space patents', 'space industry intellectual property', 'SpaceX patents', 'satellite patents', 'rocket patents', 'space technology IP'],
  openGraph: {
    title: 'Space Industry Patent Tracker | SpaceNexus',
    description: 'Track patent filings and IP trends across 200+ space companies. Enterprise-grade intelligence.',
    url: 'https://spacenexus.us/patent-tracker',
  },
  alternates: { canonical: 'https://spacenexus.us/patent-tracker' },
};

export default function PatentTrackerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
