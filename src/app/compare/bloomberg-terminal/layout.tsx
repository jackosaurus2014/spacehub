import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Bloomberg Terminal for Space Industry | SpaceNexus',
  description: 'Comparing SpaceNexus (free-$19.99/mo) vs Bloomberg Terminal ($25,000/yr) for space industry professionals. Feature-by-feature comparison of data coverage, space-specific tools, pricing, and API access.',
  alternates: {
    canonical: 'https://spacenexus.us/compare/bloomberg-terminal',
  },
  openGraph: {
    title: 'SpaceNexus vs Bloomberg Terminal for Space | SpaceNexus',
    description: 'Compare SpaceNexus with Bloomberg Terminal for space industry data. Purpose-built space intelligence vs general financial terminal.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
