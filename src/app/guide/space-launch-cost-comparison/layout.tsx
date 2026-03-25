import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Cost Comparison Guide',
  description: 'Compare space launch costs across providers and vehicles. Cost per kilogram data for SpaceX, ULA, Arianespace, Rocket Lab, and more.',
  openGraph: {
    title: 'Space Launch Cost Comparison Guide | SpaceNexus',
    description: 'Compare space launch costs across providers and vehicles. Cost per kilogram data for SpaceX, ULA, Arianespace, Rocket Lab, and more.',
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
