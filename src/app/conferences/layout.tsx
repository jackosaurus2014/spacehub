import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Conferences & Events',
  description:
    'Comprehensive directory of space industry conferences, trade shows, and events. Find upcoming aerospace events including Space Symposium, Satellite Conference, IAC, and more.',
  keywords: [
    'space conferences',
    'aerospace events',
    'space industry trade shows',
    'Space Symposium',
    'Satellite Conference',
    'IAC',
    'SmallSat Conference',
    'space technology expo',
    'aerospace conventions',
    'space business events',
    'rocket launch events',
    'NewSpace conferences',
  ],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Industry Conferences & Events | SpaceNexus',
    description:
      'Find and filter 25+ upcoming space industry conferences, trade shows, and networking events worldwide.',
    url: 'https://spacenexus.us/conferences',
    images: [
      {
        url: '/og-conferences.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Industry Conferences & Events Directory',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Industry Conferences & Events | SpaceNexus',
    description:
      'Find and filter 25+ upcoming space industry conferences, trade shows, and networking events worldwide.',
    images: ['/og-conferences.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/conferences',
  },
};

export default function ConferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
