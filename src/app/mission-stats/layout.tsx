import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Statistics | SpaceNexus',
  description: 'Launch provider leaderboards, site statistics, and orbital data from 2018-2024.',
  openGraph: {
    title: 'Mission Statistics | SpaceNexus',
    description: 'Launch provider leaderboards, site statistics, and orbital data from 2018-2024.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
