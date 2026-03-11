import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry News Aggregator',
  description:
    'Real-time aggregated news from 50+ space industry sources. Filter by category, source, and topic.',
  keywords: [
    'space news aggregator',
    'space industry news',
    'NASA news feed',
    'SpaceX news',
    'rocket launch updates',
    'space defense news',
    'satellite industry news',
    'commercial spaceflight news',
    'space policy news',
    'space science news',
  ],
  openGraph: {
    title: 'Space Industry News Aggregator | SpaceNexus',
    description:
      'Real-time aggregated news from 50+ space industry sources. Filter by category, source, and topic.',
    url: 'https://spacenexus.us/news-aggregator',
    images: [
      {
        url: '/og-news.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus News Aggregator - Multi-Source Space Industry Feed',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry News Aggregator | SpaceNexus',
    description:
      'Real-time aggregated news from 50+ space industry sources. Filter by category, source, and topic.',
    images: ['/og-news.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/news-aggregator',
  },
};

export default function NewsAggregatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
