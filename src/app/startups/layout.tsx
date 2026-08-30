import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Startup & Pre-IPO Intelligence',
  description:
    'Track the space industry\'s pre-IPO watchlist, recent funding rounds, IPO pipeline, and who\'s hiring — plus a founder toolkit for building a space startup.',
  keywords: [
    'space startups',
    'pre-ipo space companies',
    'space industry ipo pipeline',
    'space startup funding',
    'space venture capital',
    'space company watchlist',
  ],
  openGraph: {
    title: 'Space Startup & Pre-IPO Intelligence',
    description:
      'The pre-IPO watchlist, recent funding rounds, IPO pipeline, and hiring signals across the space industry — built for investors and job seekers.',
    url: 'https://spacenexus.us/startups',
    // Image comes from the co-located opengraph-image.tsx file convention,
    // which renders live private-company and open-role counts.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Startup & Pre-IPO Intelligence',
    description:
      'The pre-IPO watchlist, recent funding rounds, IPO pipeline, and hiring signals across the space industry.',
    // Image comes from the co-located opengraph-image.tsx file convention.
  },
  alternates: {
    canonical: 'https://spacenexus.us/startups',
  },
};

export default function StartupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
