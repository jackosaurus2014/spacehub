import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Commercial Space Economy Guide | SpaceNexus',
  description: 'In-depth guide to the commercial space economy. Market dynamics, key players, revenue streams, and emerging business models in the space sector.',
  openGraph: {
    title: 'Commercial Space Economy Guide | SpaceNexus',
    description: 'In-depth guide to the commercial space economy. Market dynamics, key players, revenue streams, and emerging business models.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
