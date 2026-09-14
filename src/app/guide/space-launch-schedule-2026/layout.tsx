import type { Metadata } from 'next';

export const metadata: Metadata = {
  // CTR pass (2026-09-14): 99 visible characters before. `absolute` keeps the
  // query phrase whole inside the ~60-character budget.
  title: { absolute: 'Cape Canaveral Launch Schedule 2026: Dates & How to Watch' },
  description: 'Every Cape Canaveral and Kennedy launch in 2026, month by month: dates, times, live streams and viewing spots for SLC-40, SLC-41 and LC-39A.',
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-schedule-2026',
  },
  openGraph: {
    title: 'Cape Canaveral Launch Schedule 2026: Dates & How to Watch | SpaceNexus',
    description: 'Every Cape Canaveral and Kennedy launch in 2026, month by month: dates, times, live streams and viewing spots for SLC-40, SLC-41 and LC-39A.',
    images: [
      {
        url: '/api/og?title=Space+Launch+Schedule+2026&subtitle=Upcoming+launches%2C+mission+details%2C+launch+vehicles%2C+and+payload+information&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Launch Schedule 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cape Canaveral Launch Schedule 2026: Dates & How to Watch | SpaceNexus',
    description: 'Every Cape Canaveral and Kennedy launch in 2026, month by month: dates, times, live streams and viewing spots for SLC-40, SLC-41 and LC-39A.',
    images: ['/api/og?title=Space+Launch+Schedule+2026&subtitle=Upcoming+launches%2C+mission+details%2C+launch+vehicles%2C+and+payload+information&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
