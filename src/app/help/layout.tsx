import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center',
  description:
    'Everything you need to get the most out of SpaceNexus. Browse FAQs on getting started, account & billing, satellite tracking, market intelligence, data & APIs, and contact support.',
  keywords: [
    'SpaceNexus help',
    'SpaceNexus support',
    'space platform help center',
    'satellite tracking help',
    'market intelligence support',
    'SpaceNexus FAQ',
    'space data API help',
    'SpaceNexus billing',
  ],
  openGraph: {
    title: 'SpaceNexus Help Center',
    description:
      'Find answers, tutorials, and support for the SpaceNexus space industry intelligence platform.',
    url: 'https://spacenexus.us/help',
    type: 'website',
    images: ['/api/og?title=Help%20Center&subtitle=SpaceNexus%20support%20%26%20resources'],
  },
  twitter: {
    card: 'summary',
    title: 'SpaceNexus Help Center',
    description:
      'Everything you need to get the most out of SpaceNexus. FAQs, guides, and support resources.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/help',
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
