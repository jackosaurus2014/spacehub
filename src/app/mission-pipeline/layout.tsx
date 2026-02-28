import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mission Pipeline | SpaceNexus',
  description: 'Upcoming space missions 2025-2030 with confidence levels and mission details.',
  openGraph: {
    title: 'Mission Pipeline | SpaceNexus',
    description: 'Upcoming space missions 2025-2030 with confidence levels and mission details.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Mission Pipeline | SpaceNexus',
    description: 'Upcoming space missions 2025-2030 with confidence levels and mission details.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/mission-pipeline',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
