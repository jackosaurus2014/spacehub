import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Market Map | SpaceNexus',
  description: 'Visual landscape of the space industry organized by sector with company profiles.',
  openGraph: {
    title: 'Space Industry Market Map | SpaceNexus',
    description: 'Visual landscape of the space industry organized by sector with company profiles.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
