import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Pipeline | SpaceNexus',
  description: 'Upcoming space missions 2025-2030 with confidence levels and mission details.',
  openGraph: {
    title: 'Mission Pipeline | SpaceNexus',
    description: 'Upcoming space missions 2025-2030 with confidence levels and mission details.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
