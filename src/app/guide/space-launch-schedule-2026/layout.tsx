import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Schedule 2026',
  description: 'Complete space launch schedule for 2026. Upcoming launches, mission details, launch vehicles, and payload information from SpaceX, ULA, Arianespace, and more.',
  openGraph: {
    title: 'Space Launch Schedule 2026 | SpaceNexus',
    description: 'Complete space launch schedule for 2026. Upcoming launches, mission details, launch vehicles, and payload information.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
