import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Propulsion Systems Database | SpaceNexus',
  description: 'Comprehensive reference of 33 space propulsion systems with specifications and heritage.',
  openGraph: {
    title: 'Propulsion Systems Database | SpaceNexus',
    description: 'Comprehensive reference of 33 space propulsion systems with specifications and heritage.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
