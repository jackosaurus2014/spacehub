import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus vs Quilty Analytics | SpaceNexus',
  description: 'Compare SpaceNexus with Quilty Analytics for space industry intelligence. Feature comparison, pricing, data coverage, and platform capabilities.',
  openGraph: {
    title: 'SpaceNexus vs Quilty Analytics | SpaceNexus',
    description: 'Compare SpaceNexus with Quilty Analytics for space industry intelligence. Feature comparison, pricing, and data coverage.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
