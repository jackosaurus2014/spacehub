import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '25 Space Companies to Watch in 2026',
  description: 'The 25 space companies to watch in 2026: SpaceX, Rocket Lab, Axiom Space, Planet Labs, and rising startups in launch, satellites, defense, and stations.',
  alternates: {
    canonical: 'https://spacenexus.us/learn/space-companies-to-watch',
  },
  openGraph: {
    title: '25 Space Companies to Watch in 2026 | SpaceNexus',
    description: 'The 25 space companies to watch in 2026: SpaceX, Rocket Lab, Axiom Space, Planet Labs, and rising startups in launch, satellites, defense, and stations.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
