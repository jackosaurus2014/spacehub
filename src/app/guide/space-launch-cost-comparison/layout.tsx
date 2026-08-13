import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Cost 2026: From $3,070/kg',
  description: 'Falcon 9 lands near $3,070/kg to LEO, the cheapest ride to orbit in 2026. Compare cost per kilogram across Starship, Electron, Ariane 6, New Glenn, and more.',
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-cost-comparison',
  },
  openGraph: {
    title: 'Space Launch Cost 2026: From $3,070/kg | SpaceNexus',
    description: 'Falcon 9 lands near $3,070/kg to LEO, the cheapest ride to orbit in 2026. Compare cost per kilogram across Starship, Electron, Ariane 6, New Glenn, and more.',
    images: [
      {
        url: '/api/og?title=Space+Launch+Cost+Comparison&subtitle=Cost+per+kilogram+data+for+SpaceX%2C+ULA%2C+Arianespace%2C+Rocket+Lab%2C+and+more&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Launch Cost Comparison Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Launch Cost Comparison Guide | SpaceNexus',
    description: 'Compare space launch costs across providers. Cost per kilogram data for SpaceX, ULA, Arianespace, and more.',
    images: ['/api/og?title=Space+Launch+Cost+Comparison&subtitle=Cost+per+kilogram+data+for+SpaceX%2C+ULA%2C+Arianespace%2C+Rocket+Lab%2C+and+more&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
