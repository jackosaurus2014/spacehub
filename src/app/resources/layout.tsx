import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Resources',
  description: 'Central directory of all SpaceNexus tools, trackers, calculators, and content — from market intelligence to mission planning.',
  openGraph: {
    title: 'Platform Resources | SpaceNexus',
    description: 'Central directory of all SpaceNexus tools, trackers, calculators, and content — from market intelligence to mission planning.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Platform Resources | SpaceNexus',
    description: 'Central directory of all SpaceNexus tools, trackers, calculators, and content — from market intelligence to mission planning.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/resources',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
