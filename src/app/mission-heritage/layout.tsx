import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Mission Heritage Database',
  description: 'Searchable database of 40+ notable space missions spanning planetary exploration, Earth observation, human spaceflight, astronomy, and communications.',
  openGraph: {
    title: 'Space Mission Heritage Database | SpaceNexus',
    description: 'Searchable database of 40+ notable space missions spanning planetary exploration, Earth observation, human spaceflight, astronomy, and communications.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Mission Heritage Database | SpaceNexus',
    description: 'Searchable database of 40+ notable space missions spanning planetary exploration, Earth observation, human spaceflight, astronomy, and communications.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/mission-heritage',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
