import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Law & Treaties Database',
  description: 'Comprehensive database of space law treaties, international agreements, national legislation, and emerging regulatory frameworks governing outer space activities.',
  keywords: [
    'space law',
    'outer space treaty',
    'space treaties',
    'space legislation',
    'Artemis Accords',
    'COPUOS',
    'space debris guidelines',
    'space resource rights',
    'international space law',
    'space regulatory framework',
  ],
  openGraph: {
    title: 'Space Law & Treaties Database | SpaceNexus',
    description: 'Comprehensive database of space law treaties, international agreements, national legislation, and emerging regulatory frameworks.',
    url: 'https://spacenexus.us/space-law',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Law & Treaties Database | SpaceNexus',
    description: 'Comprehensive database of space law treaties, international agreements, national legislation, and emerging regulatory frameworks.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-law',
  },
};

export default function SpaceLawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
