import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'New to space? Start here. Learn the basics of satellites, rockets, orbits, and the space industry — with links to deeper content on SpaceNexus.',
  alternates: {
    canonical: 'https://spacenexus.us/beginners',
  },
  openGraph: {
    title: 'Space for Beginners | SpaceNexus',
    description: 'New to space? Start here. Learn the basics of satellites, rockets, orbits, and the space industry.',
    images: [{ url: '/api/og?title=Beginners+Guide&type=guide', width: 1200, height: 630, alt: 'Beginners Guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space for Beginners | SpaceNexus',
    description: 'New to space? Start here. Learn the basics of satellites, rockets, orbits, and the space industry.',
    images: ['/api/og?title=Beginners+Guide&type=guide'],
  },
};

export default function BeginnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
