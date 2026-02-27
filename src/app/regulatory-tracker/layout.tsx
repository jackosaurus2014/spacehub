import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulatory Tracker - Active Proceedings & Policy Changes',
  description: 'Track active regulatory proceedings affecting the space industry. Monitor FCC, FAA, NOAA, DoC, DoD, and Congressional actions on spectrum, launch licensing, debris mitigation, and more.',
  keywords: [
    'space regulatory tracker',
    'FCC space proceedings',
    'FAA Part 450',
    'space policy tracker',
    'spectrum regulation',
    'orbital debris rules',
    'launch licensing',
    'space legislation',
    'ITAR reform',
    'NOAA remote sensing',
  ],
  openGraph: {
    title: 'Space Regulatory Tracker | SpaceNexus',
    description: 'Track active regulatory proceedings affecting the space industry across FCC, FAA, NOAA, DoC, DoD, and Congress.',
    url: 'https://spacenexus.us/regulatory-tracker',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Regulatory Tracker | SpaceNexus',
    description: 'Track active regulatory proceedings affecting the space industry across FCC, FAA, NOAA, DoC, DoD, and Congress.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/regulatory-tracker',
  },
};

export default function RegulatoryTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
