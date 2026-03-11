import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Jobs',
  description:
    'Browse 500+ space industry job openings from top companies like SpaceX, Blue Origin, and NASA. Filter by role, location, salary, and experience level.',
  keywords: [
    'space industry jobs',
    'aerospace jobs',
    'SpaceX careers',
    'Blue Origin jobs',
    'NASA jobs',
    'rocket engineer jobs',
    'satellite engineer careers',
    'space startup jobs',
    'orbital mechanics jobs',
    'space defense jobs',
    'remote space jobs',
    'space internship',
  ],
  openGraph: {
    title: 'Space Industry Jobs | SpaceNexus',
    description:
      'Browse 500+ space industry job openings from top companies like SpaceX, Blue Origin, and NASA. Filter by role, location, salary, and experience level.',
    url: 'https://spacenexus.us/jobs',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Industry Jobs Board',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Jobs | SpaceNexus',
    description:
      'Browse 500+ space industry job openings from top companies like SpaceX, Blue Origin, and NASA.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/jobs',
  },
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
