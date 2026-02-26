import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Space Digest | SpaceNexus',
  description: 'Quick-scan daily headlines covering launches, funding, regulatory changes, and technology breakthroughs.',
  openGraph: {
    title: 'Daily Space Digest | SpaceNexus',
    description: 'Quick-scan daily headlines covering launches, funding, regulatory changes, and technology breakthroughs.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
