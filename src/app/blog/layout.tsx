import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog - Space Industry Analysis & Insights | SpaceNexus',
  description:
    'Original analysis, market intelligence, guides, and insights on the space industry from the SpaceNexus team. Space economy, satellite tracking, procurement, and more.',
  keywords: [
    'space industry blog',
    'space economy analysis',
    'satellite tracking guide',
    'space market intelligence',
    'aerospace industry insights',
    'space business analysis',
  ],
  openGraph: {
    title: 'SpaceNexus Blog — Space Industry Analysis & Insights',
    description:
      'Original analysis, market intelligence, guides, and insights on the space industry from the SpaceNexus team.',
    url: 'https://spacenexus.us/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Blog — Space Industry Analysis & Insights',
    description: 'Original analysis, market intelligence, guides, and insights on the space industry from the SpaceNexus team.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/blog',
    types: {
      'application/rss+xml': 'https://spacenexus.us/api/feed/rss',
    },
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
