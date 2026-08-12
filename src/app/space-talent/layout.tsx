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
    // Image comes from the co-located opengraph-image.tsx file convention,
    // which renders the live open-job count — do not add a static images array here.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Jobs & Workforce Intelligence | SpaceNexus',
    description: 'Find space industry jobs, salary benchmarks, and workforce intelligence.',
    // Image comes from the co-located opengraph-image.tsx file convention.
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
