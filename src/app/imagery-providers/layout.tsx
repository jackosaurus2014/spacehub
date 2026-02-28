import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Earth Observation & Imagery Providers | SpaceNexus',
  description: 'Directory of satellite imagery and Earth observation service providers with resolution, coverage, and pricing data.',
  openGraph: {
    title: 'Earth Observation & Imagery Providers | SpaceNexus',
    description: 'Directory of satellite imagery and Earth observation service providers with resolution, coverage, and pricing data.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Earth Observation & Imagery Providers | SpaceNexus',
    description: 'Directory of satellite imagery and Earth observation service providers with resolution, coverage, and pricing data.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/imagery-providers',
  },
};

export default function ImageryProvidersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
