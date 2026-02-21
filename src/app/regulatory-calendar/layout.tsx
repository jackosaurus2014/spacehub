import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulatory Deadline Calendar | SpaceNexus',
  description:
    'Track 100+ space industry regulatory deadlines including FCC space filings, FAA launch license windows, ITU coordination milestones, DoD procurement, and international treaty sessions for 2026-2027.',
  keywords: [
    'space regulatory calendar',
    'FCC space deadlines',
    'FAA launch license deadlines',
    'ITU WRC-27',
    'space policy deadlines',
    'NGSO filing deadlines',
    'satellite licensing deadlines',
    'space procurement calendar',
    'ITAR compliance deadlines',
    'space debris regulations',
    'COPUOS sessions',
    'Artemis Accords review',
    'SDA tranche procurement',
    'NSSL Phase 3',
  ],
  openGraph: {
    title: 'Space Regulatory Deadline Calendar | SpaceNexus',
    description:
      'Track 100+ space industry regulatory deadlines. FCC, FAA, ITU, DoD, NASA, and international milestones for 2026-2027.',
    url: 'https://spacenexus.us/regulatory-calendar',
    images: [
      { url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus Regulatory Calendar' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Regulatory Deadline Calendar | SpaceNexus',
    description:
      'Track 100+ space industry regulatory deadlines. FCC, FAA, ITU, DoD, NASA, and international milestones.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/regulatory-calendar',
  },
};

export default function RegulatoryCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
