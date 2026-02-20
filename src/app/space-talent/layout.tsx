import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Jobs & Workforce Intelligence',
  description: 'Find space industry jobs and workforce data. Browse aerospace job postings, salary benchmarks, talent trends, and skills demand across the space sector.',
  keywords: [
    'space jobs',
    'aerospace careers',
    'space industry jobs',
    'space workforce',
    'satellite engineer jobs',
    'rocket scientist salary',
  ],
  openGraph: {
    title: 'Space Jobs & Workforce Intelligence | SpaceNexus',
    description: 'Find space industry jobs, salary benchmarks, and workforce intelligence.',
    url: 'https://spacenexus.us/space-talent',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SpaceNexus' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Jobs & Workforce Intelligence | SpaceNexus',
    description: 'Find space industry jobs, salary benchmarks, and workforce intelligence.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-talent',
  },
};

export default function SpaceTalentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
