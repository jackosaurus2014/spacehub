import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare Launch Vehicles | SpaceNexus',
  description: 'Side-by-side comparison of launch vehicles including payload capacity, cost per kg, orbit capabilities, and operational status for Falcon 9, Starship, Ariane 6, and more.',
  openGraph: {
    title: 'Compare Launch Vehicles | SpaceNexus',
    description: 'Side-by-side comparison of launch vehicles including payload capacity, cost per kg, orbit capabilities, and operational status.',
  },
};

export default function CompareLaunchVehiclesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
