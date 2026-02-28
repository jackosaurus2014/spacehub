import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Weather Dashboard | SpaceNexus',
  description: 'Real-time space weather conditions, 7-day forecast, and impact assessments for satellite operations.',
  openGraph: {
    title: 'Space Weather Dashboard | SpaceNexus',
    description: 'Real-time space weather conditions, 7-day forecast, and impact assessments for satellite operations.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Weather Dashboard | SpaceNexus',
    description: 'Real-time space weather conditions, 7-day forecast, and impact assessments for satellite operations.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-weather',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
