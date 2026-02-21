import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Supply Chain Relationship Map | SpaceNexus',
  description:
    'Interactive visualization of supplier-customer relationships across the space industry. Explore 80+ companies and 150+ connections spanning launch, satellite, defense, and infrastructure sectors.',
  keywords: [
    'space supply chain map',
    'aerospace supplier relationships',
    'space industry graph',
    'defense contractor network',
    'satellite supply chain',
    'launch provider relationships',
  ],
  openGraph: {
    title: 'Supply Chain Relationship Map | SpaceNexus',
    description:
      'Interactive visualization of supplier-customer relationships across the space industry.',
    url: 'https://spacenexus.us/supply-chain-map',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Supply Chain Relationship Map | SpaceNexus',
    description:
      'Interactive visualization of supplier-customer relationships across the space industry.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/supply-chain-map',
  },
};

export default function SupplyChainMapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
