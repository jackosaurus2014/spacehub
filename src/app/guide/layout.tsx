import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Guide',
    default: 'Space Industry Guides & Resources',
  },
  description:
    'In-depth guides to the space industry: market size and data, investing, launch costs, satellite tracking, regulatory compliance, and where to watch a launch.',
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
      'In-depth guides to the space industry: market size and data, investing, launch costs, satellite tracking, regulatory compliance, and where to watch a launch.',
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
      'In-depth guides to the space industry: market size and data, investing, launch costs, satellite tracking, regulatory compliance, and where to watch a launch.',
    images: ['/api/og?title=Space+Industry+Guides+%26+Resources&subtitle=In-depth+guides+on+satellite+tracking%2C+ITAR+compliance%2C+launch+costs%2C+and+more&type=guide'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide',
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
