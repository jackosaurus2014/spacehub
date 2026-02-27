import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Debris Tracker | SpaceNexus',
  description: 'Track orbital debris, collision risks, and space sustainability metrics with real-time data visualization.',
  openGraph: {
    title: 'Space Debris Tracker | SpaceNexus',
    description: 'Track orbital debris, collision risks, and space sustainability metrics with real-time data visualization.',
  },
};

export default function DebrisTrackerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
