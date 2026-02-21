import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Cost Calculator | Estimate Satellite Launch Pricing',
  description:
    'Calculate how much it costs to launch a satellite to space. Compare launch vehicle pricing for LEO, GTO, GEO, lunar, and Mars missions. Real cost data from SpaceX, ULA, Rocket Lab, Arianespace, Blue Origin, and more.',
  keywords: [
    'space launch cost calculator',
    'satellite launch cost',
    'how much does it cost to launch to space',
    'launch vehicle pricing',
    'cost per kg to orbit',
    'satellite launch price comparison',
    'SpaceX launch cost',
    'Falcon 9 price',
    'rideshare launch cost',
    'LEO launch cost',
    'GTO launch cost',
    'GEO launch cost',
    'lunar mission cost',
    'Mars launch cost',
  ],
  openGraph: {
    title: 'Space Launch Cost Calculator | SpaceNexus',
    description:
      'Estimate satellite launch costs across 20+ vehicles. Compare $/kg to LEO, SSO, GTO, GEO, TLI, Mars, and heliocentric orbits from every major launch provider.',
    url: 'https://spacenexus.us/launch-cost-calculator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Launch Cost Calculator | SpaceNexus',
    description:
      'Estimate satellite launch costs across 20+ vehicles. Compare $/kg to LEO, SSO, GTO, GEO, TLI, Mars, and heliocentric orbits from every major launch provider.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/launch-cost-calculator',
  },
};

export default function LaunchCostCalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
