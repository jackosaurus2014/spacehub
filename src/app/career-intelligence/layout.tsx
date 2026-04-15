import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Career Intelligence | SpaceNexus',
  description:
    'Data-driven career intelligence for the space industry. Salary benchmarks, clearance premiums, skills demand, workforce trends, and career path guides across aerospace sectors.',
  keywords: [
    'space career intelligence',
    'aerospace salary data',
    'space industry salary benchmarks',
    'clearance premium space jobs',
    'space workforce trends',
    'aerospace career path',
    'space industry skills demand',
  ],
  openGraph: {
    title: 'Space Career Intelligence | SpaceNexus',
    description:
      'Salary benchmarks, clearance premiums, skills demand, and career path data for the space industry.',
    url: 'https://spacenexus.us/career-intelligence',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Career Intelligence | SpaceNexus',
    description:
      'Salary benchmarks, clearance premiums, skills demand, and career path data for the space industry.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/career-intelligence',
  },
};

export default function CareerIntelligenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
