import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satellite Launch Cost Guide',
  description: 'How much does it cost to launch a satellite? Comprehensive breakdown of launch costs by vehicle, orbit, and payload size.',
  openGraph: {
    title: 'Satellite Launch Cost Guide | SpaceNexus',
    description: 'How much does it cost to launch a satellite? Comprehensive breakdown of launch costs by vehicle, orbit, and payload size.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
