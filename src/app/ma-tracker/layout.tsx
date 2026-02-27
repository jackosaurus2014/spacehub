import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'M&A Tracker — Space Industry Mergers & Acquisitions',
  description: 'Track mergers, acquisitions, SPACs, and take-private deals across the space industry. Real-time deal database with trend analysis and acquirer profiles.',
  keywords: [
    'space industry mergers',
    'space acquisitions',
    'aerospace M&A',
    'space SPAC deals',
    'satellite company acquisition',
    'defense space mergers',
    'NewSpace acquisitions',
    'space industry consolidation',
    'rocket company merger',
    'space deal tracker',
  ],
  openGraph: {
    title: 'M&A Tracker | SpaceNexus',
    description: 'Track mergers, acquisitions, and consolidation across the space industry.',
    url: 'https://spacenexus.us/ma-tracker',
    images: [
      {
        url: '/og-ma-tracker.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus M&A Tracker - Space Industry Deal Database',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'M&A Tracker | SpaceNexus',
    description: 'Track mergers, acquisitions, and consolidation across the space industry.',
    images: ['/og-ma-tracker.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/ma-tracker',
  },
};

export default function MATrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
