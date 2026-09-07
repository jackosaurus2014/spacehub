import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Quilty Space Analytics — Space Industry Platform Comparison',
  description: 'Comparing SpaceNexus (free-$19.99/mo) vs Quilty Space Analytics ($5,000-50,000/yr). Self-service real-time platform vs. premium analyst research reports for the space industry.',
  alternates: {
    canonical: 'https://spacenexus.us/compare/quilty-analytics',
  },
  openGraph: {
    title: 'SpaceNexus vs Quilty Analytics | SpaceNexus',
    description: 'Compare SpaceNexus with Quilty Analytics for space industry intelligence. Feature comparison, pricing, and data coverage.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
