import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Satellite Tracking Works',
  description: 'Understand how satellite tracking works from ground stations to orbit determination. Radar, optical tracking, TLE propagation, and Space Surveillance Network explained.',
  openGraph: {
    title: 'How Satellite Tracking Works | SpaceNexus',
    description: 'Understand how satellite tracking works from ground stations to orbit determination. Radar, optical tracking, and TLE propagation explained.',
    images: [
      {
        url: '/api/og?title=How+Satellite+Tracking+Works&subtitle=Ground+stations%2C+orbit+determination%2C+radar%2C+optical+tracking%2C+and+TLE+propagation&type=guide',
        width: 1200,
        height: 630,
        alt: 'How Satellite Tracking Works',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Satellite Tracking Works | SpaceNexus',
    description: 'From ground stations to orbit determination. Radar, optical tracking, and TLE propagation explained.',
    images: ['/api/og?title=How+Satellite+Tracking+Works&subtitle=Ground+stations%2C+orbit+determination%2C+radar%2C+optical+tracking%2C+and+TLE+propagation&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
