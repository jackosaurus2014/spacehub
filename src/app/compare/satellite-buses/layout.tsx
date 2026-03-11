import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Bus Comparison',
  description: 'Compare 22 commercial satellite bus platforms by mass, power, lifetime, and cost.',
  openGraph: {
    title: 'Satellite Bus Comparison | SpaceNexus',
    description: 'Compare 22 commercial satellite bus platforms by mass, power, lifetime, and cost.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
