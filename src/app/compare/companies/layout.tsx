import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Space Companies | SpaceNexus',
  description: 'Side-by-side comparison of space industry companies. Compare financials, government contracts, space assets, and capabilities.',
  openGraph: {
    title: 'Compare Space Companies | SpaceNexus',
    description: 'Side-by-side comparison of space industry companies.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
