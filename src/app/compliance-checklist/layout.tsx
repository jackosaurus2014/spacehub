import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Compliance Checklist',
  description: 'Interactive compliance checklist for space industry operations. Track FAA launch licensing, FCC satellite authorization, ITAR/EAR export controls, NOAA remote sensing, and workforce security requirements.',
  keywords: [
    'space compliance checklist',
    'FAA launch license checklist',
    'FCC satellite authorization',
    'ITAR compliance checklist',
    'space regulatory requirements',
    'orbital debris compliance',
    'space industry regulations',
    'export control checklist',
    'NOAA remote sensing license',
    'space workforce security',
  ],
  openGraph: {
    title: 'Space Industry Compliance Checklist | SpaceNexus',
    description: 'Interactive compliance checklist for space industry operations. Track FAA launch licensing, FCC satellite authorization, ITAR/EAR export controls, NOAA remote sensing, and workforce security requirements.',
    url: 'https://spacenexus.us/compliance-checklist',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Compliance Checklist | SpaceNexus',
    description: 'Interactive compliance checklist for space industry operations. Track regulatory requirements across launch, satellite, export control, remote sensing, and workforce categories.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compliance-checklist',
  },
};

export default function ComplianceChecklistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
