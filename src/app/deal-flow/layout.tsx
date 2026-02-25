import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deal Flow Database | SpaceNexus',
  description: 'Track space industry funding rounds, M&A, partnerships, and government contracts.',
  openGraph: {
    title: 'Deal Flow Database | SpaceNexus',
    description: 'Track space industry funding rounds, M&A, partnerships, and government contracts.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
