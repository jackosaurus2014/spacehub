import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Market Size',
  description: 'Data-driven analysis of the global space industry market size, growth trends, and forecasts. Sector breakdowns and investment insights.',
  openGraph: {
    title: 'Space Industry Market Size | SpaceNexus',
    description: 'Data-driven analysis of the global space industry market size, growth trends, and forecasts. Sector breakdowns and investment insights.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
