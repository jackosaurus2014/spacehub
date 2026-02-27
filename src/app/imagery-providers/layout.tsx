import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earth Observation & Imagery Providers | SpaceNexus',
  description: 'Directory of satellite imagery and Earth observation service providers with resolution, coverage, and pricing data.',
  openGraph: {
    title: 'Earth Observation & Imagery Providers | SpaceNexus',
    description: 'Directory of satellite imagery and Earth observation service providers with resolution, coverage, and pricing data.',
  },
};

export default function ImageryProvidersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
