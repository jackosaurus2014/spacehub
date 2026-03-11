import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book a Demo',
  description: 'Schedule a personalized demo of SpaceNexus. See how our space industry intelligence platform can accelerate your team\'s research and decision-making.',
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Book a Demo | SpaceNexus',
    description: 'Schedule a personalized demo of SpaceNexus. See how our space industry intelligence platform can accelerate your team\'s research and decision-making.',
    url: 'https://spacenexus.us/book-demo',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Book a Demo | SpaceNexus',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Book a Demo | SpaceNexus',
    description: 'Schedule a personalized demo of SpaceNexus. See how our space industry intelligence platform can accelerate your team\'s research and decision-making.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/book-demo',
  },
};

export default function BookDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
