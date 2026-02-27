import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Newsletters & Media Directory - 30+ Sources',
  description: 'Comprehensive directory of space industry newsletters, podcasts, and media outlets. Discover SpaceNews, Payload Space, The Orbital Index, and 30+ curated sources for space business, policy, defense, and science news.',
  keywords: ['space newsletters', 'space industry media', 'space podcasts', 'aerospace news sources', 'space business newsletters', 'satellite industry media', 'space policy newsletters'],
  openGraph: {
    title: 'SpaceNexus Newsletters & Media Directory',
    description: 'Discover 30+ space industry newsletters, podcasts, and media outlets covering business, technology, policy, defense, and science.',
    url: 'https://spacenexus.us/newsletters-directory',
    images: [
      {
        url: '/og-newsletters.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Newsletters & Media Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Newsletters & Media Directory',
    description: 'Discover 30+ space industry newsletters, podcasts, and media outlets.',
    images: ['/og-newsletters.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/newsletters-directory',
  },
};

export default function NewslettersDirectoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
