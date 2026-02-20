import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Space Industry Services',
  description: 'Search and filter space industry products and services. Compare launch providers, satellite manufacturers, ground stations, and engineering services by category, pricing, and certification.',
  keywords: [
    'space services search',
    'satellite services',
    'launch provider comparison',
    'space industry marketplace',
    'aerospace vendor search',
    'space engineering services',
  ],
  openGraph: {
    title: 'Search Space Industry Services | SpaceNexus',
    description: 'Search and filter space industry products and services. Compare providers by category, pricing, and certification.',
    url: 'https://spacenexus.us/marketplace/search',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Space Industry Services | SpaceNexus',
    description: 'Search and filter space industry products and services. Compare providers by category, pricing, and certification.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/marketplace/search',
  },
};

export default function MarketplaceSearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
