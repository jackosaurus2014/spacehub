import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Cost Comparison Guide | SpaceNexus',
  description: 'Compare space launch costs across providers and vehicles. Cost per kilogram data for SpaceX, ULA, Arianespace, Rocket Lab, and more.',
  openGraph: {
    title: 'Space Launch Cost Comparison Guide | SpaceNexus',
    description: 'Compare space launch costs across providers and vehicles. Cost per kilogram data for SpaceX, ULA, Arianespace, Rocket Lab, and more.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
