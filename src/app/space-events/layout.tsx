import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Event Calendar 2026-2027 | SpaceNexus',
  description: 'Browse 55+ space industry conferences, trade shows, webinars, and policy events for 2026-2027. Filter by type, country, and cost. Export events to your calendar with .ics download or Google Calendar.',
  keywords: [
    'space industry events',
    'space conferences 2026',
    'satellite conference',
    'space symposium',
    'IAC 2026',
    'space expo',
    'space trade show',
    'SATELLITE conference',
    'Farnborough Airshow',
    'SmallSat conference',
    'Paris Air Show 2027',
    'space webinar',
    'COPUOS',
    'WRC-27',
  ],
  openGraph: {
    title: 'SpaceNexus - Space Industry Event Calendar 2026-2027',
    description: 'Browse 55+ space industry conferences, trade shows, webinars, and policy events. Filter by type, country, and cost. Add events to your calendar.',
    url: 'https://spacenexus.us/space-events',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Industry Event Calendar 2026-2027',
    description: 'Browse 55+ space industry conferences, trade shows, webinars, and policy events. Filter by type, country, and cost. Add events to your calendar.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-events',
  },
};

export default function SpaceEventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
