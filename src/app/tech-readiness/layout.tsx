import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology Readiness Tracker | SpaceNexus',
  description: 'Track emerging space technologies from lab research to flight-ready across propulsion, materials, comms, and AI.',
  openGraph: {
    title: 'Technology Readiness Tracker | SpaceNexus',
    description: 'Track emerging space technologies from lab research to flight-ready across propulsion, materials, comms, and AI.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
