import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertise on SpaceNexus - Media Kit for Space Industry Sponsors',
  description: 'Sponsor space industry intelligence on SpaceNexus: the weekly State of the Space Economy brief, the weekly Who\'s Hiring in Space article, the live jobs widget, and site display. Sponsorships open — inquire for details.',
  keywords: [
    'space advertising',
    'aerospace marketing',
    'B2B space ads',
    'space industry advertising',
    'satellite industry sponsorship',
    'space industry decision-makers',
    'aerospace B2B marketing',
    'space media kit',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Advertise on SpaceNexus | Media Kit for Space Industry Sponsors',
    description: 'Sponsor space industry intelligence on SpaceNexus: the weekly State of the Space Economy brief, the weekly Who\'s Hiring in Space article, the live jobs widget, and site display. Sponsorships open — inquire for details.',
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
    title: 'Advertise on SpaceNexus | Media Kit for Space Industry Sponsors',
    description: 'Sponsor space industry intelligence on SpaceNexus. Sponsorships open — inquire for details.',
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
