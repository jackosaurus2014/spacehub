import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulatory Agencies: Complete Directory | SpaceNexus',
  description: 'Comprehensive directory of every agency that regulates space activities worldwide. Search by jurisdiction and regulatory area. Covers FAA AST, FCC Space Bureau, NOAA CRSRA, ITU, COPUOS, and 25+ national agencies.',
  keywords: [
    'space regulatory agencies',
    'FAA AST',
    'FCC Space Bureau',
    'NOAA CRSRA',
    'ITU',
    'COPUOS',
    'UNOOSA',
    'space regulation directory',
    'satellite licensing agencies',
    'space law authorities',
    'commercial space regulation',
    'space agency directory',
    'export control agencies',
    'BIS',
    'DDTC',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Regulatory Agencies: Complete Directory | SpaceNexus',
    description: 'Comprehensive directory of every agency that regulates space activities worldwide. FAA, FCC, NOAA, ITU, COPUOS, and 25+ national agencies.',
    url: 'https://spacenexus.us/regulatory-agencies',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Space Regulatory Agencies Directory - SpaceNexus',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Regulatory Agencies Directory | SpaceNexus',
    description: 'Complete directory of every agency that regulates space activities worldwide.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/regulatory-agencies',
  },
};

export default function RegulatoryAgenciesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
