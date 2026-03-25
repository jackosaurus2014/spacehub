import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Launch Schedule 2026',
  description: 'Complete space launch schedule for 2026. Upcoming launches, mission details, launch vehicles, and payload information from SpaceX, ULA, Arianespace, and more.',
  openGraph: {
    title: 'Space Launch Schedule 2026 | SpaceNexus',
    description: 'Complete space launch schedule for 2026. Upcoming launches, mission details, launch vehicles, and payload information.',
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
    title: 'Space Launch Schedule 2026 | SpaceNexus',
    description: 'Complete space launch schedule for 2026. Upcoming launches, mission details, and payload information.',
    images: ['/api/og?title=Space+Launch+Schedule+2026&subtitle=Upcoming+launches%2C+mission+details%2C+launch+vehicles%2C+and+payload+information&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
