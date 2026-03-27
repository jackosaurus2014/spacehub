import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceX vs Rocket Lab: Space Industry Comparison | SpaceNexus',
  description:
    'Compare SpaceX and Rocket Lab side-by-side: Falcon 9 vs Electron and Neutron, small-sat vs heavy-lift markets, launch cadence, reusability approaches, and business models.',
  keywords: [
    'SpaceX vs Rocket Lab',
    'Falcon 9 vs Electron',
    'Falcon 9 vs Neutron',
    'small satellite launch comparison',
    'RKLB vs SpaceX',
    'commercial launch providers',
    'reusable rocket comparison',
  ],
  openGraph: {
    title: 'SpaceX vs Rocket Lab: Space Industry Comparison | SpaceNexus',
    description:
      'Compare SpaceX and Rocket Lab side-by-side: Falcon 9 vs Electron and Neutron, launch cadence, reusability approaches, and business models.',
    type: 'website',
    url: 'https://spacenexus.us/compare/spacex-vs-rocket-lab',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=SpaceX+vs+Rocket+Lab&type=compare',
        width: 1200,
        height: 630,
        alt: 'SpaceX vs Rocket Lab Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceX vs Rocket Lab: Space Industry Comparison | SpaceNexus',
    description:
      'Compare SpaceX and Rocket Lab side-by-side: Falcon 9 vs Electron and Neutron, launch cadence, reusability approaches, and business models.',
    images: ['/api/og?title=SpaceX+vs+Rocket+Lab&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/spacex-vs-rocket-lab',
  },
};

export default function SpaceXVsRocketLabLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
