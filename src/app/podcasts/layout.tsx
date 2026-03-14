import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Podcasts',
  description:
    'Listen to the best space industry podcasts. Curated episodes from Main Engine Cut Off, Houston We Have a Podcast, Planetary Radio, and more.',
  keywords: [
    'space podcasts',
    'space industry podcasts',
    'NASA podcast',
    'rocket podcast',
    'spaceflight podcast',
    'astronomy podcast',
    'Main Engine Cut Off',
    'Planetary Radio',
    'This Week in Space',
    'space news podcast',
  ],
  openGraph: {
    title: 'Space Podcasts | SpaceNexus',
    description:
      'Curated space industry podcast episodes from top shows covering launches, missions, and the commercial space economy.',
    url: 'https://spacenexus.us/podcasts',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Podcasts | SpaceNexus',
    description:
      'Curated space industry podcast episodes from top shows covering launches, missions, and the commercial space economy.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/podcasts',
  },
};

export default function PodcastsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
