import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Guide',
    default: 'Space Industry Guides & Resources | SpaceNexus',
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
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Guides & Resources | SpaceNexus',
    description:
      'In-depth guides on the space industry covering satellite tracking, ITAR compliance, launch costs, market sizing, regulatory compliance, and business opportunities.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/guide',
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
