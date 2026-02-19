import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Learning Center',
    default: 'Space Industry Learning Center | SpaceNexus',
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Learning Center | SpaceNexus',
    description:
      'Comprehensive guides, data, and analysis on the space industry.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/learn',
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
