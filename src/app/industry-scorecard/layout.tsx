import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Scorecard — Q1 2026',
  description:
    'Comprehensive quarterly scorecard grading the space industry across launch activity, investment, government spending, workforce, regulatory environment, and technology. Overall grade: A- for Q1 2026.',
  keywords: [
    'space industry scorecard',
    'space industry report card',
    'space industry grades',
    'space industry health',
    'space industry 2026',
    'launch activity 2026',
    'space investment',
    'SpaceX IPO',
    'Artemis program',
    'mega-constellations',
    'space workforce',
    'space regulatory',
  ],
  openGraph: {
    title: 'Space Industry Scorecard — Q1 2026 | SpaceNexus',
    description:
      'Quarterly report card grading the space industry across 6 dimensions: launches, investment, government spending, workforce, regulatory, and technology.',
    url: 'https://spacenexus.us/industry-scorecard',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Industry Scorecard Q1 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Scorecard — Q1 2026 | SpaceNexus',
    description:
      'Quarterly report card grading the space industry across 6 dimensions. Overall grade: A-.',
    images: ['/og-default.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/industry-scorecard',
  },
};

export default function IndustryScorecardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
