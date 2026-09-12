import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cape Canaveral Launch Schedule 2026: Dates, Times & How to Watch (Updated Weekly)',
  description: 'Every Cape Canaveral and Kennedy launch in 2026, month by month: SpaceX, ULA and Blue Origin missions from SLC-40, SLC-41 and LC-39A with dates, times, live streams and viewing spots. Plus the worldwide manifest.',
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-schedule-2026',
  },
  openGraph: {
    title: 'Cape Canaveral Launch Schedule 2026: Dates, Times & How to Watch (Updated Weekly) | SpaceNexus',
    description: 'Every Cape Canaveral and Kennedy launch in 2026, month by month: SpaceX, ULA and Blue Origin missions from SLC-40, SLC-41 and LC-39A with dates, times, live streams and viewing spots. Plus the worldwide manifest.',
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
    title: 'Cape Canaveral Launch Schedule 2026: Dates, Times & How to Watch (Updated Weekly) | SpaceNexus',
    description: 'See every Cape Canaveral rocket launch in 2026 -- dates, times, launch vehicles, and how to watch live.',
    images: ['/api/og?title=Space+Launch+Schedule+2026&subtitle=Upcoming+launches%2C+mission+details%2C+launch+vehicles%2C+and+payload+information&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
