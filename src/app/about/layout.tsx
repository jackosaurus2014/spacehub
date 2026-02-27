import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About SpaceNexus - Space Industry Intelligence Platform',
  description: 'Learn about SpaceNexus, the leading space industry intelligence platform providing market data, business tools, and community for space entrepreneurs and professionals.',
  openGraph: {
    title: 'About SpaceNexus - Space Industry Intelligence Platform',
    description: 'Learn about SpaceNexus, the leading space industry intelligence platform.',
    url: 'https://spacenexus.io/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
