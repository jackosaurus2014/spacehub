import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cislunar Economy & Lunar Gateway',
  description: 'Track the emerging cislunar economy. Lunar missions, Artemis Gateway updates, CLPS payload deliveries, and commercial lunar industry market intelligence.',
  keywords: [
    'cislunar economy',
    'lunar gateway',
    'Artemis program',
    'CLPS',
    'moon missions',
    'lunar lander',
    'cislunar infrastructure',
  ],
  openGraph: {
    title: 'Cislunar Economy & Lunar Gateway | SpaceNexus',
    description: 'Track the emerging cislunar economy with lunar missions and Artemis Gateway updates.',
    url: 'https://spacenexus.us/cislunar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cislunar Economy & Lunar Gateway | SpaceNexus',
    description: 'Track the emerging cislunar economy with lunar missions and Artemis Gateway updates.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/cislunar',
  },
};

export default function CislunarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
