import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Podcast Directory - 25+ Space Podcasts',
  description: 'Discover the best space industry podcasts. Browse 25+ curated podcasts covering launches, NASA missions, commercial spaceflight, space business, Mars exploration, and more.',
  keywords: [
    'space podcasts',
    'space industry podcasts',
    'NASA podcasts',
    'spaceflight podcasts',
    'astronomy podcasts',
    'rocket science podcasts',
    'space business podcasts',
    'space news podcasts',
    'Mars podcasts',
    'satellite podcasts',
    'space exploration podcasts',
    'aerospace podcasts',
  ],
  openGraph: {
    title: 'Space Industry Podcast Directory | SpaceNexus',
    description: 'Discover the best space industry podcasts covering launches, business, science, and exploration.',
    url: 'https://spacenexus.us/podcasts',
    images: [
      {
        url: '/og-podcasts.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Podcast Directory - Best Space Industry Podcasts',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Podcast Directory | SpaceNexus',
    description: 'Discover the best space industry podcasts covering launches, business, science, and exploration.',
    images: ['/og-podcasts.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/podcasts',
  },
};

export default function PodcastsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
