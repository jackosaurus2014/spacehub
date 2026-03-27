import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceX vs ULA: Space Industry Comparison | SpaceNexus',
  description:
    'Compare SpaceX and United Launch Alliance side-by-side: Falcon 9 vs Vulcan Centaur, launch costs, government contracts, reliability records, and national security missions.',
  keywords: [
    'SpaceX vs ULA',
    'Falcon 9 vs Vulcan Centaur',
    'Falcon Heavy vs Delta IV Heavy',
    'commercial launch comparison',
    'NSSL launch providers',
    'government space contracts',
    'United Launch Alliance comparison',
  ],
  openGraph: {
    title: 'SpaceX vs ULA: Space Industry Comparison | SpaceNexus',
    description:
      'Compare SpaceX and United Launch Alliance side-by-side: Falcon 9 vs Vulcan Centaur, launch costs, reliability records, and national security missions.',
    type: 'website',
    url: 'https://spacenexus.us/compare/spacex-vs-ula',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=SpaceX+vs+ULA&type=compare',
        width: 1200,
        height: 630,
        alt: 'SpaceX vs ULA Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceX vs ULA: Space Industry Comparison | SpaceNexus',
    description:
      'Compare SpaceX and United Launch Alliance side-by-side: Falcon 9 vs Vulcan Centaur, launch costs, reliability records, and national security missions.',
    images: ['/api/og?title=SpaceX+vs+ULA&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/spacex-vs-ula',
  },
};

export default function SpaceXVsULALayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
