import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investment Tracker | SpaceNexus',
  description: 'Track space industry investment trends, top deals, and leading investors.',
  openGraph: {
    title: 'Investment Tracker | SpaceNexus',
    description: 'Track space industry investment trends, top deals, and leading investors.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
