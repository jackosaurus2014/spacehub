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
    slug: 'space-economy-value-chain',
    title: 'The Space Economy Value Chain',
    shortTitle: 'Value Chain',
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
    slug: 'watch-a-launch-cape-canaveral',
    title: 'Where to Watch a Rocket Launch at Cape Canaveral',
    shortTitle: 'Watch a Launch: Cape Canaveral',
  },
  {
    slug: 'watch-a-launch-vandenberg',
    title: 'Where to Watch a Rocket Launch at Vandenberg',
    shortTitle: 'Watch a Launch: Vandenberg',
  },
  {
    slug: 'watch-a-launch-starbase',
    title: 'Where to Watch a Starship Launch at Starbase',
    shortTitle: 'Watch a Launch: Starbase',
  },
  {
    slug: 'watch-a-launch-wallops',
    title: 'Where to Watch a Rocket Launch at Wallops',
    shortTitle: 'Watch a Launch: Wallops',
  },
  {
    slug: 'watch-a-launch-kourou',
    title: 'Where to Watch a Rocket Launch at Kourou',
    shortTitle: 'Watch a Launch: Kourou',
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
  {
    slug: 'blue-origin-vs-spacex',
    title: 'Blue Origin vs SpaceX: The Complete 2026 Guide',
    shortTitle: 'Blue Origin vs SpaceX',
  },
  {
    slug: 'space-economy-games',
    title: 'Best Space Economy Games in 2026',
    shortTitle: 'Space Economy Games',
  },
  {
    slug: 'nssl-phase-3',
    title: 'NSSL Phase 3 Explained: Lane 1, Lane 2, and Who Wins National Security Launches',
    shortTitle: 'NSSL Phase 3',
  },
  {
    slug: 'kuiper-vs-starlink',
    title: 'Amazon Leo vs Starlink: Constellation Size, Speed, Price and Coverage Compared',
    shortTitle: 'Amazon Leo vs Starlink',
  },
  {
    slug: 'space-debris-and-traffic-management',
    title: 'Space Debris and Space Traffic Management: The 2026 Guide',
    shortTitle: 'Space Debris & Traffic Management',
  },
  {
    slug: 'space-weather-risk-for-operators',
    title: 'Space Weather Risk for Satellite Operators: Kp, Flares, CMEs and What to Do',
    shortTitle: 'Space Weather Risk',
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
