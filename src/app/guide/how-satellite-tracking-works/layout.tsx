import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Satellite Tracking Works',
  description: 'Understand how satellite tracking works from ground stations to orbit determination. Radar, optical tracking, TLE propagation, and Space Surveillance Network explained.',
  openGraph: {
    title: 'How Satellite Tracking Works | SpaceNexus',
    description: 'Understand how satellite tracking works from ground stations to orbit determination. Radar, optical tracking, and TLE propagation explained.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
