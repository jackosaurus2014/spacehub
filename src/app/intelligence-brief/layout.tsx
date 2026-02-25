import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weekly Intelligence Brief | SpaceNexus',
  description: 'Curated weekly summary of space industry developments, funding, launches, and regulatory changes.',
  openGraph: {
    title: 'Weekly Intelligence Brief | SpaceNexus',
    description: 'Curated weekly summary of space industry developments, funding, launches, and regulatory changes.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
