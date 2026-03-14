import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Intelligence for Professionals | SpaceNexus',
  description:
    'Make faster, data-driven decisions in the space industry. SpaceNexus aggregates 200+ sources into one platform for market intel, satellite tracking, regulatory compliance, and company profiles.',
  keywords: [
    'space industry intelligence',
    'space professional tools',
    'space market data',
    'satellite tracking platform',
    'space regulatory compliance',
    'space industry research',
    'space data platform',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Industry Intelligence for Professionals | SpaceNexus',
    description:
      'Make faster, data-driven decisions in the space industry. One platform for market intel, satellite tracking, regulatory compliance, and company profiles.',
    url: 'https://spacenexus.us/solutions/space-professionals',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Industry Intelligence for Professionals',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Industry Intelligence for Professionals | SpaceNexus',
    description:
      'Make faster, data-driven decisions in the space industry. One platform for market intel, satellite tracking, regulatory compliance, and company profiles.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/solutions/space-professionals',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SpaceProfessionalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
