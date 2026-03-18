import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus Alternatives & Competitors | Space Industry Intelligence Tools Compared',
  description:
    'Compare SpaceNexus to Quilty Space, SpaceNews, Payload Space, and free tools. See why SpaceNexus is the best value space industry intelligence platform at $19.99/mo.',
  keywords: [
    'space industry intelligence tools',
    'Quilty Space alternatives',
    'SpaceNews alternatives',
    'Payload Space alternatives',
    'space market data platform',
    'space industry analytics',
    'space intelligence platform comparison',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'SpaceNexus Alternatives & Competitors',
    description:
      'Honest comparison of SpaceNexus vs Quilty Space, SpaceNews, Payload Space, and free tools. Find the right space intelligence platform for you.',
    url: 'https://spacenexus.us/alternatives',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Alternatives & Competitors Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'SpaceNexus Alternatives & Competitors',
    description:
      'Compare SpaceNexus to Quilty Space, SpaceNews, Payload Space, and free tools.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/alternatives',
  },
};

export default function AlternativesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
