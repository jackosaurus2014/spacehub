import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Communications Intelligence | SATCOM Providers, Optical Links & Deep Space Network',
  description:
    'Comprehensive space communications directory covering RF, optical/laser, quantum key distribution, DTN protocols, DSN architecture, and 15+ commercial SATCOM providers including Starlink, SES O3b mPOWER, Telesat Lightspeed, and AST SpaceMobile.',
  keywords: [
    'space communications',
    'SATCOM',
    'satellite communications',
    'Deep Space Network',
    'laser communications',
    'optical comms',
    'LCRD',
    'SES O3b mPOWER',
    'Telesat Lightspeed',
    'AST SpaceMobile',
    'direct-to-cell',
    'inter-satellite links',
    'Ka-band',
    'V-band',
    'quantum key distribution',
    'DTN protocol',
    'Starlink',
    'Iridium NEXT',
    'Viasat',
  ],
  openGraph: {
    title: 'Space Communications Intelligence | SpaceNexus',
    description:
      'RF, optical/laser, quantum, and DTN technologies. 15+ commercial SATCOM provider profiles with key metrics. Emerging trends in direct-to-device and lunar relay networks.',
    url: 'https://spacenexus.us/space-comms',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Communications Intelligence | SpaceNexus',
    description:
      'Comprehensive SATCOM provider directory and space communications technology overview.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-comms',
  },
};

export default function SpaceCommsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
