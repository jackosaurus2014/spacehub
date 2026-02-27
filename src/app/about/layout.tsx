import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About SpaceNexus - Space Industry Intelligence Platform',
  description: 'Learn about SpaceNexus, the leading space industry intelligence platform providing market data, business tools, and community for space entrepreneurs and professionals.',
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'About SpaceNexus - Space Industry Intelligence Platform',
    description: 'Learn about SpaceNexus, the leading space industry intelligence platform.',
    url: 'https://spacenexus.us/about',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'About SpaceNexus - Space Industry Intelligence Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'About SpaceNexus | SpaceNexus',
    description: 'Learn about SpaceNexus, the leading space industry intelligence platform providing market data, business tools, and community for space entrepreneurs and professionals.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.io/about',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
