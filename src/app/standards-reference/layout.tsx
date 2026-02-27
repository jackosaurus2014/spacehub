import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Standards Reference',
  description: 'Comprehensive reference of space industry standards from CCSDS, ECSS, NASA, MIL-STD, ISO, AIAA, ITAR/EAR, and ITU-R. Search 30+ standards with compliance checklists for mission types.',
  keywords: [
    'space standards',
    'CCSDS',
    'ECSS',
    'NASA standards',
    'MIL-STD',
    'ISO space',
    'AIAA',
    'ITAR',
    'EAR',
    'ITU-R',
    'space compliance',
    'aerospace standards',
    'space engineering standards',
  ],
  openGraph: {
    title: 'Space Industry Standards Reference | SpaceNexus',
    description: 'Comprehensive reference of space industry standards from CCSDS, ECSS, NASA, MIL-STD, ISO, AIAA, ITAR/EAR, and ITU-R.',
    url: 'https://spacenexus.us/standards-reference',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Standards Reference | SpaceNexus',
    description: 'Comprehensive reference of space industry standards from CCSDS, ECSS, NASA, MIL-STD, ISO, AIAA, ITAR/EAR, and ITU-R.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/standards-reference',
  },
};

export default function StandardsReferenceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
