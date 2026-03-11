import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Economy Investment Guide',
  description: 'Guide to investing in the space economy. Venture capital trends, public space companies, SPACs, and emerging investment opportunities in aerospace.',
  openGraph: {
    title: 'Space Economy Investment Guide | SpaceNexus',
    description: 'Guide to investing in the space economy. Venture capital trends, public space companies, and emerging investment opportunities.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
