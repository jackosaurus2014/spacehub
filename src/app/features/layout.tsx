import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Features & Modules',
  description: 'Explore 30+ space industry intelligence modules. Market data, satellite tracking, regulatory compliance, mission planning, and more — all in one platform.',
  keywords: [
    'space industry platform features',
    'satellite tracking tools',
    'space market intelligence',
    'aerospace data platform',
    'space industry modules',
    'mission planning tools',
    'regulatory compliance space',
    'space economy analytics',
  ],
  openGraph: {
    title: 'Features & Modules | SpaceNexus',
    description: 'Explore 30+ space industry intelligence modules in one platform.',
    url: 'https://spacenexus.us/features',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Features & Modules | SpaceNexus',
    description: 'Explore 30+ space industry intelligence modules in one platform.',
  },
  alternates: { canonical: 'https://spacenexus.us/features' },
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
