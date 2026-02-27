import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Workforce Analytics | SpaceNexus',
  description: 'Comprehensive space industry workforce data and trends. Explore employment by sector, top employers, skills gap analysis, geographic distribution, diversity metrics, and salary benchmarks.',
  keywords: [
    'space workforce analytics',
    'space industry employment',
    'aerospace workforce data',
    'space job statistics',
    'space industry salary',
    'space talent trends',
    'aerospace hiring data',
    'space workforce diversity',
  ],
  openGraph: {
    title: 'Space Industry Workforce Analytics | SpaceNexus',
    description: 'Comprehensive space workforce data: 360K+ US workers, 20 top employers, skills gaps, and geographic hubs.',
    url: 'https://spacenexus.us/workforce-analytics',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus Workforce Analytics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Workforce Analytics | SpaceNexus',
    description: 'Comprehensive space workforce data: 360K+ US workers, 20 top employers, skills gaps, and geographic hubs.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/workforce-analytics',
  },
};

export default function WorkforceAnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
