import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Much to Launch a Satellite in 2026? $2,720/kg',
  description: 'Falcon 9 launches for about $2,720/kg; rideshare starts near $5,000/kg. See the full 2026 breakdown of satellite launch costs by vehicle, orbit, and payload.',
  alternates: {
    canonical: 'https://spacenexus.us/learn/satellite-launch-cost',
  },
  openGraph: {
    title: 'How Much to Launch a Satellite in 2026? $2,720/kg | SpaceNexus',
    description: 'Falcon 9 launches for about $2,720/kg; rideshare starts near $5,000/kg. See the full 2026 breakdown of satellite launch costs by vehicle, orbit, and payload.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
