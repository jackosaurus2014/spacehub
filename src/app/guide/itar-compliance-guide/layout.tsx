import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ITAR Compliance Guide for Space Companies',
  description: 'Complete ITAR compliance guide for space and defense companies. Export control requirements, registration process, and best practices for aerospace firms.',
  openGraph: {
    title: 'ITAR Compliance Guide for Space Companies | SpaceNexus',
    description: 'Complete ITAR compliance guide for space and defense companies. Export control requirements, registration process, and best practices.',
    images: [
      {
        url: '/api/og?title=ITAR+Compliance+Guide&subtitle=Export+control+requirements%2C+registration+process%2C+and+best+practices+for+aerospace&type=guide',
        width: 1200,
        height: 630,
        alt: 'ITAR Compliance Guide for Space Companies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ITAR Compliance Guide for Space Companies | SpaceNexus',
    description: 'Complete ITAR compliance guide. Export control requirements, registration process, and best practices.',
    images: ['/api/og?title=ITAR+Compliance+Guide&subtitle=Export+control+requirements%2C+registration+process%2C+and+best+practices+for+aerospace&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
