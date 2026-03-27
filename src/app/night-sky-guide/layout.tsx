import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Your guide to observing the night sky. See satellites, the ISS, planets, and astronomical events visible tonight.',
  alternates: {
    canonical: 'https://spacenexus.us/night-sky-guide',
  },
  openGraph: {
    title: 'Night Sky Guide | SpaceNexus',
    description: "Your guide to observing the night sky. Learn what's visible tonight — planets, satellites, meteor showers, and ISS passes.",
    images: [{ url: '/api/og?title=Night+Sky+Guide&type=guide', width: 1200, height: 630, alt: 'Night Sky Guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Night Sky Guide | SpaceNexus',
    description: "Your guide to observing the night sky. Learn what's visible tonight — planets, satellites, meteor showers, and ISS passes.",
    images: ['/api/og?title=Night+Sky+Guide&type=guide'],
  },
};

export default function NightSkyGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
