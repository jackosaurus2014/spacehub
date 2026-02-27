import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Sustainability Scorecard',
  description: 'Comprehensive sustainability ratings for space operators. Track debris mitigation compliance, post-mission disposal plans, collision avoidance capabilities, and environmental impact across the global space industry.',
  keywords: [
    'space sustainability',
    'debris mitigation',
    'space operator ratings',
    'orbital debris',
    'space environment',
    'sustainability scorecard',
    'space debris compliance',
    'collision avoidance',
    'FCC 5-year rule',
    'ISO 24113',
  ],
  openGraph: {
    title: 'Space Sustainability Scorecard | SpaceNexus',
    description: 'Sustainability ratings for space operators — debris mitigation, disposal plans, collision avoidance, and environmental impact.',
    url: 'https://spacenexus.us/sustainability-scorecard',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Sustainability Scorecard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Sustainability Scorecard | SpaceNexus',
    description: 'Sustainability ratings for space operators — debris mitigation, disposal plans, collision avoidance, and environmental impact.',
    images: ['/og-default.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/sustainability-scorecard',
  },
};

export default function SustainabilityScorecardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
