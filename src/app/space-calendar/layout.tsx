import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Calendar — Key Dates 2026',
  description:
    'Month-by-month visual calendar of the most important space industry events, launches, and milestones for 2026. Artemis II, SATELLITE 2026, SpaceX IPO, IAC Milan, and more.',
  keywords: [
    'space industry calendar',
    'space events 2026',
    'Artemis II launch date',
    'SATELLITE 2026',
    'SpaceX IPO date',
    'IAC 2026 Milan',
    'space conferences 2026',
    'launch schedule 2026',
    'space industry key dates',
    'Reuters Space conference',
  ],
  openGraph: {
    title: 'Space Industry Calendar — Key Dates 2026 | SpaceNexus',
    description:
      'Month-by-month visual calendar of major space industry events, launches, and milestones for 2026.',
    url: 'https://spacenexus.us/space-calendar',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Industry Calendar 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Calendar — Key Dates 2026 | SpaceNexus',
    description:
      'Month-by-month visual calendar of major space industry events, launches, and milestones for 2026.',
    images: ['/og-default.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-calendar',
  },
};

export default function SpaceCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
