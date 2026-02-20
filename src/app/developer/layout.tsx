import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Developer API Portal',
  description: 'Access the SpaceNexus API for space industry data. Satellite tracking, launch schedules, news feeds, and market intelligence endpoints with comprehensive docs.',
  keywords: [
    'SpaceNexus API',
    'space data API',
    'satellite API',
    'space industry API',
    'developer portal',
  ],
  openGraph: {
    title: 'Developer API Portal | SpaceNexus',
    description: 'Access the SpaceNexus API for space industry data. Satellite tracking, launch schedules, news feeds, and market intelligence endpoints with comprehensive docs.',
    url: 'https://spacenexus.us/developer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Developer API Portal | SpaceNexus',
    description: 'Access the SpaceNexus API for space industry data. Satellite tracking, launch schedules, news feeds, and market intelligence endpoints with comprehensive docs.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/developer',
  },
};

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
