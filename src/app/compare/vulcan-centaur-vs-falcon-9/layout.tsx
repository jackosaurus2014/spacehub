import type { Metadata } from 'next';

const OG = '/api/og?title=Vulcan+Centaur+vs+Falcon+9&type=compare';

export const metadata: Metadata = {
  title: 'Vulcan Centaur vs Falcon 9: Cost, Payload, Reliability, Cadence (2026)',
  description:
    'ULA Vulcan Centaur vs SpaceX Falcon 9 side by side: list price and cost per kilogram, LEO/GTO/TLI payload, career record and success rate, live launch cadence, reusability, and which missions fly on which.',
  keywords: [
    'Vulcan Centaur vs Falcon 9',
    'Falcon 9 vs Vulcan',
    'ULA vs SpaceX rockets',
    'Vulcan Centaur cost',
    'Falcon 9 cost per kg',
    'Vulcan payload capacity',
    'NSSL launch vehicles',
  ],
  openGraph: {
    title: 'Vulcan Centaur vs Falcon 9 | SpaceNexus',
    description:
      'ULA Vulcan Centaur vs SpaceX Falcon 9: price, cost per kilogram, payload to LEO/GTO/TLI, reliability and live launch cadence.',
    type: 'article',
    url: 'https://spacenexus.us/compare/vulcan-centaur-vs-falcon-9',
    siteName: 'SpaceNexus',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Vulcan Centaur vs Falcon 9' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vulcan Centaur vs Falcon 9 | SpaceNexus',
    description: 'Price, cost per kilogram, payload, reliability and live cadence — ULA Vulcan Centaur vs SpaceX Falcon 9.',
    images: [OG],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/vulcan-centaur-vs-falcon-9',
  },
};

export default function VulcanVsFalcon9Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
