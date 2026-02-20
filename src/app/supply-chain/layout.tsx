import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Supply Chain Intelligence',
  description: 'Map the space industry supply chain from raw materials to launch. Component suppliers, lead times, bottleneck analysis, and vendor risk assessment tools.',
  keywords: [
    'space supply chain',
    'aerospace suppliers',
    'satellite components',
    'launch vehicle parts',
    'space vendor',
  ],
  openGraph: {
    title: 'Space Supply Chain Intelligence | SpaceNexus',
    description: 'Map the space industry supply chain from raw materials to launch.',
    url: 'https://spacenexus.us/supply-chain',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Supply Chain Intelligence | SpaceNexus',
    description: 'Map the space industry supply chain from raw materials to launch.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/supply-chain',
  },
};

export default function SupplyChainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
