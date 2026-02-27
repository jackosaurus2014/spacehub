import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Business Opportunities Guide | SpaceNexus',
  description: 'Discover business opportunities in the space industry. Government contracts, commercial partnerships, emerging markets, and startup opportunities in aerospace.',
  openGraph: {
    title: 'Space Business Opportunities Guide | SpaceNexus',
    description: 'Discover business opportunities in the space industry. Government contracts, commercial partnerships, and emerging markets.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
