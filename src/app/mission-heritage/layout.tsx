import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Mission Heritage Database | SpaceNexus',
  description: 'Searchable database of 40+ notable space missions spanning planetary exploration, Earth observation, human spaceflight, astronomy, and communications.',
  openGraph: {
    title: 'Space Mission Heritage Database | SpaceNexus',
    description: 'Searchable database of 40+ notable space missions spanning planetary exploration, Earth observation, human spaceflight, astronomy, and communications.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
