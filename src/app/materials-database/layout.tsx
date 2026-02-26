import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Materials Database | SpaceNexus',
  description: 'Reference of 28 spacecraft materials with properties, temperature ranges, and radiation resistance.',
  openGraph: {
    title: 'Space Materials Database | SpaceNexus',
    description: 'Reference of 28 spacecraft materials with properties, temperature ranges, and radiation resistance.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
