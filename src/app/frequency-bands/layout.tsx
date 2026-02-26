import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Frequency Allocations | SpaceNexus',
  description: 'Visual reference for RF frequency bands used in space communications with spectrum chart and band comparison.',
  openGraph: {
    title: 'Space Frequency Allocations | SpaceNexus',
    description: 'Visual reference for RF frequency bands used in space communications with spectrum chart and band comparison.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
