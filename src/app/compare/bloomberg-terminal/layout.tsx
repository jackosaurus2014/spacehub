import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Bloomberg Terminal for Space | SpaceNexus',
  description: 'Compare SpaceNexus with Bloomberg Terminal for space industry data. Purpose-built space intelligence vs general financial terminal. Features, pricing, and coverage.',
  openGraph: {
    title: 'SpaceNexus vs Bloomberg Terminal for Space | SpaceNexus',
    description: 'Compare SpaceNexus with Bloomberg Terminal for space industry data. Purpose-built space intelligence vs general financial terminal.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
