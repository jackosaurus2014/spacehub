import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Supply Chain Risk Dashboard',
  description:
    'Assess and monitor space industry supply chain risks. Track critical materials, manufacturing bottlenecks, geopolitical dependencies, lead times, and mitigation strategies.',
  keywords: [
    'space supply chain',
    'supply chain risk',
    'space industry risk assessment',
    'critical materials space',
    'rad-hard components',
    'space manufacturing',
    'ITAR compliance',
    'space component lead times',
    'geopolitical risk space',
    'supply chain mitigation',
  ],
  openGraph: {
    title: 'Supply Chain Risk Dashboard | SpaceNexus',
    description:
      'Monitor and assess space industry supply chain risks across critical materials, manufacturing, geopolitical, and workforce dimensions.',
    url: 'https://spacenexus.us/supply-chain-risk',
    images: [
      {
        url: '/og-supply-chain-risk.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Supply Chain Risk Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Supply Chain Risk Dashboard | SpaceNexus',
    description:
      'Track space industry supply chain risks, critical components, and lead times.',
    images: ['/og-supply-chain-risk.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/supply-chain-risk',
  },
};

export default function SupplyChainRiskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
