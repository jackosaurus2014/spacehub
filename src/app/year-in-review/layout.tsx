import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SpaceNexus 2026: Year in Review — Platform Milestones & Growth',
  description:
    'A look back at everything SpaceNexus built in 2026: 133 blog articles, 600+ routes, 70+ development waves, SpaceX API integration, livestream detection, and a comprehensive free space intelligence platform.',
  keywords: [
    'spacenexus year in review',
    'space platform milestones',
    'spacenexus 2026',
    'space industry platform',
    'space intelligence platform growth',
  ],
  openGraph: {
    title: 'SpaceNexus 2026: Year in Review',
    description:
      '133 blog articles, 600+ routes, 70+ development waves. The story of building a free space intelligence platform.',
    url: 'https://spacenexus.us/year-in-review',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus 2026: Year in Review',
    description:
      '133 blog articles, 600+ routes, 70+ development waves. The story of building a free space intelligence platform.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/year-in-review',
  },
};

export default function YearInReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
