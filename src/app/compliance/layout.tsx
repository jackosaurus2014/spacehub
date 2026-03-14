import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Regulatory Compliance Hub',
  description: 'Space industry regulatory compliance tracker. Monitor ITAR, EAR, spectrum licensing, and space debris regulations across jurisdictions.',
  keywords: [
    'space regulation',
    'FCC space filings',
    'space law',
    'FAA launch license',
    'ITU spectrum',
    'aerospace compliance',
    'space policy',
  ],
  openGraph: {
    title: 'Regulatory Compliance Hub | SpaceNexus',
    description: 'Space industry regulatory compliance tracker. Monitor ITAR, EAR, spectrum licensing, and space debris regulations across jurisdictions.',
    url: 'https://spacenexus.us/compliance',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Regulatory Compliance Hub | SpaceNexus',
    description: 'Space industry regulatory compliance tracker. Monitor ITAR, EAR, spectrum licensing, and space debris regulations across jurisdictions.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compliance',
  },
};

export default function ComplianceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
