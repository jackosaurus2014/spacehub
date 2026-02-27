import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Funding Rounds Database',
  description: 'Searchable database of space industry funding rounds. Track venture capital, private equity, and institutional investments across launch, satellite, defense, and more.',
  keywords: [
    'space funding rounds',
    'space startup investment',
    'space venture capital',
    'SpaceX funding',
    'space industry VC',
    'satellite company funding',
    'space defense investment',
    'rocket company Series A',
    'space SPAC',
    'space IPO tracker',
  ],
  openGraph: {
    title: 'Space Industry Funding Rounds | SpaceNexus',
    description: 'Comprehensive database of 80+ space industry funding rounds. Track deals from Seed to IPO across launch, satellite, defense, and Earth observation sectors.',
    url: 'https://spacenexus.us/funding-rounds',
    images: [
      {
        url: '/og-funding-rounds.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Industry Funding Rounds Database',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Funding Rounds | SpaceNexus',
    description: 'Track 80+ space industry funding rounds from Seed to IPO. Investor leaderboard, trend analysis, and sortable data.',
    images: ['/og-funding-rounds.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/funding-rounds',
  },
};

export default function FundingRoundsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
