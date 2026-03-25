import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Guide',
    default: 'Space Industry Guides & Resources',
  },
  description:
    'In-depth guides on the space industry covering satellite tracking, ITAR compliance, launch costs, market sizing, regulatory compliance, and business opportunities.',
  keywords: [
    'space industry guide',
    'satellite tracking guide',
    'ITAR compliance',
    'space launch costs',
    'space business guide',
    'space regulatory compliance',
    'space economy guide',
  ],
  openGraph: {
    title: 'Space Industry Guides & Resources | SpaceNexus',
    description:
      'In-depth guides on the space industry covering satellite tracking, ITAR compliance, launch costs, market sizing, regulatory compliance, and business opportunities.',
    type: 'website',
    url: 'https://spacenexus.us/guide',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Space+Industry+Guides+%26+Resources&subtitle=In-depth+guides+on+satellite+tracking%2C+ITAR+compliance%2C+launch+costs%2C+and+more&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Industry Guides & Resources',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Guides & Resources | SpaceNexus',
    description:
      'In-depth guides on the space industry covering satellite tracking, ITAR compliance, launch costs, market sizing, regulatory compliance, and business opportunities.',
    images: ['/api/og?title=Space+Industry+Guides+%26+Resources&subtitle=In-depth+guides+on+satellite+tracking%2C+ITAR+compliance%2C+launch+costs%2C+and+more&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide',
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
