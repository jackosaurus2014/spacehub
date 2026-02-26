// Ordered list of all guides for prev/next navigation
// Order is thematic: overview -> markets -> sectors -> operations -> regulation -> opportunities

export interface GuideEntry {
  slug: string;
  title: string;
  shortTitle: string;
}

export const GUIDE_LIST: GuideEntry[] = [
  {
    slug: 'space-industry',
    title: 'Complete Guide to the Space Industry 2026',
    shortTitle: 'Space Industry Overview',
  },
  {
    slug: 'space-industry-market-size',
    title: 'Space Industry Market Size 2026',
    shortTitle: 'Market Size & Data',
  },
  {
    slug: 'commercial-space-economy',
    title: 'Commercial Space Economy Overview',
    shortTitle: 'Commercial Space Economy',
  },
  {
    slug: 'space-economy-investment',
    title: 'Investing in the Space Economy',
    shortTitle: 'Space Investment Guide',
  },
  {
    slug: 'space-business-opportunities',
    title: 'Space Business Opportunities in 2026',
    shortTitle: 'Business Opportunities',
  },
  {
    slug: 'space-launch-cost-comparison',
    title: 'Space Launch Cost Comparison 2026',
    shortTitle: 'Launch Cost Comparison',
  },
  {
    slug: 'space-launch-schedule-2026',
    title: '2026 Space Launch Schedule',
    shortTitle: 'Launch Schedule 2026',
  },
  {
    slug: 'satellite-tracking-guide',
    title: 'The Complete Satellite Tracking Guide',
    shortTitle: 'Satellite Tracking',
  },
  {
    slug: 'how-satellite-tracking-works',
    title: 'How Satellite Tracking Works',
    shortTitle: 'How Tracking Works',
  },
  {
    slug: 'itar-compliance-guide',
    title: 'ITAR Compliance Guide for Space Companies',
    shortTitle: 'ITAR Compliance',
  },
  {
    slug: 'space-regulatory-compliance',
    title: 'Space Regulatory Compliance Guide',
    shortTitle: 'Regulatory Compliance',
  },
];

export function getGuideNavigation(currentSlug: string): {
  prev: GuideEntry | null;
  next: GuideEntry | null;
  current: GuideEntry | null;
  currentIndex: number;
  total: number;
} {
  const index = GUIDE_LIST.findIndex((g) => g.slug === currentSlug);
  if (index === -1) {
    return { prev: null, next: null, current: null, currentIndex: -1, total: GUIDE_LIST.length };
  }
  return {
    prev: index > 0 ? GUIDE_LIST[index - 1] : null,
    next: index < GUIDE_LIST.length - 1 ? GUIDE_LIST[index + 1] : null,
    current: GUIDE_LIST[index],
    currentIndex: index,
    total: GUIDE_LIST.length,
  };
}
