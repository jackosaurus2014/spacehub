import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertise on SpaceNexus - Reach Space Industry Decision-Makers',
  description: 'Advertise on SpaceNexus and reach thousands of space industry decision-makers. Sponsorship tiers from $500/mo. Reach engineers, executives, investors, analysts, and government professionals.',
  keywords: [
    'space advertising',
    'aerospace marketing',
    'B2B space ads',
    'space industry advertising',
    'satellite industry sponsorship',
    'space industry decision-makers',
    'aerospace B2B marketing',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Advertise on SpaceNexus | Reach Space Industry Decision-Makers',
    description: 'Reach thousands of space industry decision-makers with Bronze, Silver, and Gold sponsorship tiers. Engineers, executives, investors, analysts, and government professionals.',
    url: 'https://spacenexus.us/advertise',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Advertise on SpaceNexus - Space Industry Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Advertise on SpaceNexus | Reach Space Industry Decision-Makers',
    description: 'Reach thousands of space industry decision-makers with Bronze, Silver, and Gold sponsorship tiers on SpaceNexus.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/advertise',
  },
};

export default function AdvertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
