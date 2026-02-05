import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space News',
  description: 'Stay up to date with the latest space industry news. Breaking stories on launches, discoveries, space agencies, commercial spaceflight, and astronomical events.',
  keywords: [
    'space news',
    'NASA news',
    'SpaceX news',
    'rocket launch news',
    'astronomy news',
    'space exploration news',
    'satellite news',
    'space industry updates',
    'space technology news',
    'commercial spaceflight',
  ],
  openGraph: {
    title: 'Space News | SpaceNexus',
    description: 'Breaking space industry news on launches, discoveries, and commercial spaceflight.',
    url: 'https://spacenexus.com/news',
    images: [
      {
        url: '/og-news.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus News - Latest Space Industry Updates',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space News | SpaceNexus',
    description: 'Breaking space industry news on launches, discoveries, and commercial spaceflight.',
    images: ['/og-news.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.com/news',
  },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
