import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Licensing Requirements Checker | SpaceNexus',
  description:
    'Find out what licenses and permits you need for space activities. Interactive tool covering FAA launch licenses, FCC satellite authorizations, NOAA remote sensing, ITAR/EAR export controls, and more.',
  keywords: [
    'space licensing requirements',
    'FAA launch license',
    'FCC satellite authorization',
    'NOAA remote sensing license',
    'ITAR export license',
    'EAR space hardware',
    'space regulatory requirements',
    'space tourism license',
    'ground station license',
    'Part 450 license',
    'Part 25 satellite',
    'space permit checker',
  ],
  openGraph: {
    title: 'Space Licensing Requirements Checker | SpaceNexus',
    description:
      'Interactive tool to find exactly what licenses, permits, and authorizations you need for your space activity. Covers all major U.S. regulatory agencies.',
    url: 'https://spacenexus.us/licensing-checker',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Licensing Requirements Checker | SpaceNexus',
    description:
      'Interactive tool to determine licensing requirements for space activities including launches, satellites, Earth observation, exports, and more.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/licensing-checker',
  },
};

export default function LicensingCheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
