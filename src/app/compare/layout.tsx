import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Compare',
    default: 'Compare Space Industry Players - Launch Vehicles, Satellites, Companies | SpaceNexus',
  },
  description:
    'Compare space industry players side-by-side: launch vehicles, satellite constellations, companies, and platforms. SpaceX vs Blue Origin, Starlink vs Kuiper, and more data-driven comparisons.',
  keywords: [
    'space industry comparison',
    'spacex vs blue origin',
    'rocket comparison',
    'satellite comparison',
    'Starlink vs Kuiper',
    'launch vehicle comparison',
    'satellite constellation comparison',
    'space company comparison',
    'SpaceNexus alternative',
    'Bloomberg Terminal space',
    'Payload Space alternative',
    'Quilty Analytics alternative',
    'space intelligence tools',
    'Rocket Lab vs SpaceX',
    'spacex vs ula',
    'starlink vs oneweb',
    'boeing vs lockheed space',
  ],
  openGraph: {
    title: 'Compare Space Industry Players | SpaceNexus',
    description:
      'Side-by-side comparisons of launch vehicles, satellite constellations, companies, and platforms across the space industry. Data-driven analysis to inform your decisions.',
    type: 'website',
    url: 'https://spacenexus.us/compare',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Compare+Space+Companies+%26+Technologies&subtitle=Side-by-side+comparisons+of+launch+vehicles%2C+satellites%2C+and+companies&type=compare',
        width: 1200,
        height: 630,
        alt: 'Compare Space Companies & Technologies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compare Space Industry Players | SpaceNexus',
    description:
      'Side-by-side comparisons of launch vehicles, satellite constellations, companies, and platforms across the space industry.',
    images: ['/api/og?title=Compare+Space+Companies+%26+Technologies&subtitle=Side-by-side+comparisons+of+launch+vehicles%2C+satellites%2C+and+companies&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare',
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
