import type { Metadata } from 'next';
import { SITE_STATS } from '@/lib/site-stats';

export const metadata: Metadata = {
  title: 'SpaceNexus 2026: Year in Review — Platform Milestones & Growth',
  description:
    `A look back at everything SpaceNexus built in 2026: ${SITE_STATS.articles} original articles, ${SITE_STATS.pagesAndTools} pages and tools, Artemis II live coverage, a live satellite tracker, a real jobs board with ${SITE_STATS.jobListings} ATS-synced listings, and a weekly space economy data brief.`,
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
      '250+ original articles, 400+ pages and tools, a live satellite tracker, and a real jobs board. The story of building a free space intelligence platform, February through August 2026.',
    url: 'https://spacenexus.us/year-in-review',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus 2026: Year in Review',
    description:
      '250+ original articles, 400+ pages and tools, a live satellite tracker, and a real jobs board. The story of building a free space intelligence platform, February through August 2026.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/year-in-review',
  },
};

export default function YearInReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
