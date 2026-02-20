import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Event Calendar 2026',
  description: 'Browse 40+ space industry conferences, expos, and networking events for 2026. Export events to your calendar and never miss a key space industry gathering.',
  keywords: ['space industry events', 'space conferences 2026', 'satellite conference', 'space symposium', 'IAC 2026', 'space expo'],
  openGraph: {
    title: 'SpaceNexus - Space Industry Event Calendar 2026',
    description: 'Browse 40+ space industry conferences, expos, and networking events for 2026. Export events to your calendar and never miss a key space industry gathering.',
    url: 'https://spacenexus.us/space-events',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Event Calendar 2026',
    description: 'Browse 40+ space industry conferences, expos, and networking events for 2026. Export events to your calendar and never miss a key space industry gathering.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-events',
  },
};

export default function SpaceEventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
