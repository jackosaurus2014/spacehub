import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compliance Checklist Engine',
  description:
    'Interactive compliance checklist for space industry regulations. Track FAA launch licenses, FCC satellite permits, ITAR/EAR export controls, and upcoming regulatory deadlines.',
  keywords: [
    'space compliance checklist',
    'FAA launch license checklist',
    'FCC satellite license',
    'ITAR compliance',
    'EAR export controls',
    'space regulatory deadlines',
    'aerospace compliance tracker',
  ],
  openGraph: {
    title: 'Compliance Checklist Engine | SpaceNexus',
    description:
      'Interactive compliance checklist for space industry regulations. Track FAA launch licenses, FCC satellite permits, ITAR/EAR export controls, and upcoming regulatory deadlines.',
    url: 'https://spacenexus.us/compliance-engine',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compliance Checklist Engine | SpaceNexus',
    description:
      'Interactive compliance checklist for space industry regulations. Track FAA launch licenses, FCC satellite permits, ITAR/EAR export controls, and upcoming regulatory deadlines.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compliance-engine',
  },
};

export default function ComplianceEngineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
