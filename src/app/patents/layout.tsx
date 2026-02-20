import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Technology Patents',
  description: 'Search space technology patents across propulsion, satellite systems, materials science, and launch vehicles. Track innovation trends and IP landscapes.',
  keywords: [
    'space patents',
    'aerospace IP',
    'rocket patents',
    'satellite technology patents',
    'space innovation',
  ],
  openGraph: {
    title: 'Space Technology Patents | SpaceNexus',
    description: 'Search space technology patents and track innovation trends.',
    url: 'https://spacenexus.us/patents',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Technology Patents | SpaceNexus',
    description: 'Search space technology patents and track innovation trends.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/patents',
  },
};

export default function PatentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
