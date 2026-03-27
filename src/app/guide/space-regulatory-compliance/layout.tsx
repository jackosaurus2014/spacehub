import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulatory Compliance Guide',
  description: 'Navigate space regulatory compliance with this guide. FCC licensing, FAA launch permits, ITU spectrum coordination, ITAR/EAR export controls, and international treaties.',
  openGraph: {
    title: 'Space Regulatory Compliance Guide | SpaceNexus',
    description: 'Navigate space regulatory compliance. FCC licensing, FAA launch permits, ITU spectrum coordination, and export controls.',
    images: [
      {
        url: '/api/og?title=Space+Regulatory+Compliance+Guide&subtitle=FCC+licensing%2C+FAA+launch+permits%2C+ITU+spectrum+coordination%2C+and+export+controls&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Regulatory Compliance Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Regulatory Compliance Guide | SpaceNexus',
    description: 'FCC licensing, FAA launch permits, ITU spectrum coordination, and export controls.',
    images: ['/api/og?title=Space+Regulatory+Compliance+Guide&subtitle=FCC+licensing%2C+FAA+launch+permits%2C+ITU+spectrum+coordination%2C+and+export+controls&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-regulatory-compliance',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
