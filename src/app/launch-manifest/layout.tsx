import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Manifest Calendar | SpaceNexus',
  description:
    'Visual calendar of all upcoming space launches worldwide. Track Falcon 9, Starship, Electron, and more with real-time schedule updates.',
};

export default function LaunchManifestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
