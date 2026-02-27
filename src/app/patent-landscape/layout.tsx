import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Technology Patent Landscape',
  description: 'Analyze space industry patent trends, top patent holders, emerging technology areas, and category breakdowns across satellite communications, propulsion, Earth observation, and more.',
  keywords: [
    'space patents',
    'space technology patents',
    'satellite communications patents',
    'SpaceX patents',
    'rocket propulsion patents',
    'space industry IP',
    'aerospace patents',
    'space patent trends',
    'orbital technology patents',
    'space innovation',
  ],
  openGraph: {
    title: 'Space Technology Patent Landscape | SpaceNexus',
    description: 'Analyze space industry patent trends, top holders, and emerging technology areas.',
    url: 'https://spacenexus.us/patent-landscape',
    images: [
      {
        url: '/og-patent-landscape.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Patent Landscape - Space Industry Patent Analysis',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Technology Patent Landscape | SpaceNexus',
    description: 'Analyze space industry patent trends and top patent holders.',
    images: ['/og-patent-landscape.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/patent-landscape',
  },
};

export default function PatentLandscapeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
