import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Case Studies | SpaceNexus',
  description: 'See how space industry organizations use SpaceNexus to accelerate research, improve deal flow, and gain competitive intelligence.',
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Case Studies | SpaceNexus',
    description: 'See how space industry organizations use SpaceNexus to accelerate research, improve deal flow, and gain competitive intelligence.',
    url: 'https://spacenexus.us/case-studies',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Case Studies | SpaceNexus',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Case Studies | SpaceNexus',
    description: 'See how space industry organizations use SpaceNexus to accelerate research, improve deal flow, and gain competitive intelligence.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/case-studies',
  },
};

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
