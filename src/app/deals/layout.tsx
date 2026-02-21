import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Deal Flow Database | SpaceNexus',
  description: 'Track 100+ space industry deals including funding rounds, M&A, IPOs, SPACs, and major contract wins. Comprehensive deal flow intelligence for SpaceX, Rocket Lab, Blue Origin, and the entire space ecosystem.',
  keywords: [
    'space industry deals',
    'space M&A',
    'space startup funding',
    'space SPAC',
    'space contracts',
    'space IPO',
    'space venture capital',
    'space industry funding tracker',
    'aerospace acquisitions',
    'defense space contracts',
  ],
  openGraph: {
    title: 'SpaceNexus - Space Industry Deal Flow Database',
    description: 'Track 100+ space industry deals including funding rounds, M&A, IPOs, SPACs, and major contract wins across the global space economy.',
    url: 'https://spacenexus.us/deals',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Deal Flow Database',
    description: 'Track 100+ space industry deals including funding rounds, M&A, IPOs, SPACs, and major contract wins across the global space economy.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/deals',
  },
};

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
