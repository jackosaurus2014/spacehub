import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starlink vs Amazon Leo (Kuiper): 10,000+ vs 3,236 Satellites (2026)',
  description:
    'Starlink has more than 10,000 satellites in orbit and about 12 million subscribers; Amazon Leo (formerly Project Kuiper) is licensed for 3,236 and is in early deployment. Altitude, latency, speed, terminals, launch providers and the FCC deadline, side by side.',
  keywords: [
    'Starlink vs Kuiper',
    'Starlink vs Amazon Kuiper',
    'satellite internet comparison',
    'SpaceX Starlink vs Project Kuiper',
    'LEO broadband comparison',
    'satellite constellation comparison',
    'internet from space',
  ],
  openGraph: {
    title: 'Starlink vs Amazon Leo (Kuiper): 10,000+ vs 3,236 Satellites (2026)',
    description:
      'Compare Starlink and Amazon Kuiper side-by-side: satellite counts, coverage areas, latency, pricing, and deployment timelines.',
    type: 'website',
    url: 'https://spacenexus.us/compare/starlink-vs-kuiper',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Starlink+vs+Kuiper&type=compare',
        width: 1200,
        height: 630,
        alt: 'Starlink vs Kuiper Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starlink vs Amazon Leo (Kuiper): 10,000+ vs 3,236 Satellites (2026)',
    description:
      'Compare Starlink and Amazon Kuiper side-by-side: satellite counts, coverage areas, latency, pricing, and deployment timelines.',
    images: ['/api/og?title=Starlink+vs+Kuiper&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/starlink-vs-kuiper',
  },
};

export default function StarlinkVsKuiperLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
