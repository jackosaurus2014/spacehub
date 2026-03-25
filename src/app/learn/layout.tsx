import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Learning Center',
    default: 'Space Industry Learning Center',
  },
  description:
    'Comprehensive guides, data, and analysis on the space industry. Learn about satellite launch costs, market sizing, satellite tracking, and leading space companies.',
  keywords: [
    'space industry guide',
    'space industry education',
    'satellite launch guide',
    'space market analysis',
    'space companies guide',
    'satellite tracking tutorial',
    'space industry resources',
  ],
  openGraph: {
    title: 'Space Industry Learning Center | SpaceNexus',
    description:
      'Comprehensive guides, data, and analysis on the space industry.',
    type: 'website',
    url: 'https://spacenexus.us/learn',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Space+Industry+Learning+Hub&subtitle=Comprehensive+guides%2C+data%2C+and+analysis+on+the+space+industry&type=learn',
        width: 1200,
        height: 630,
        alt: 'Space Industry Learning Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Learning Center | SpaceNexus',
    description:
      'Comprehensive guides, data, and analysis on the space industry.',
    images: ['/api/og?title=Space+Industry+Learning+Hub&subtitle=Comprehensive+guides%2C+data%2C+and+analysis+on+the+space+industry&type=learn'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn',
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
