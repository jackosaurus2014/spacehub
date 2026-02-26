import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Career Guide | SpaceNexus',
  description: 'Comprehensive guide to 25+ career paths in the space industry with salary data and growth projections.',
  openGraph: {
    title: 'Space Industry Career Guide | SpaceNexus',
    description: 'Comprehensive guide to 25+ career paths in the space industry with salary data and growth projections.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
