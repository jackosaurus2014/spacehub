// In-app changelog data — "What's New" display after updates

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  title: string;
  description: string;
  changes: {
    type: 'feature' | 'improvement' | 'fix';
    text: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-02-14',
    title: 'Marketing & SEO Improvements',
    description: 'Enhanced SEO, new content pages, and email infrastructure.',
    changes: [
      { type: 'feature', text: 'New original blog at /blog with 6 articles' },
      { type: 'feature', text: 'RSS feed for blog content at /api/feed/rss' },
      { type: 'feature', text: 'City-specific pages for 5 major space industry hubs' },
      { type: 'feature', text: 'Press kit page at /press' },
      { type: 'feature', text: 'Space Launch Schedule 2026 guide page' },
      { type: 'improvement', text: 'Enhanced structured data for Google Rich Results' },
      { type: 'improvement', text: 'Added page-level SEO metadata to 10 key pages' },
      { type: 'improvement', text: 'Homepage trust signals showing data sources and platform stats' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-12',
    title: 'Marketplace & Mobile',
    description: 'Space marketplace, native mobile apps, and ad integration.',
    changes: [
      { type: 'feature', text: 'Space Marketplace with listings, RFQs, and AI Copilot' },
      { type: 'feature', text: 'Android app available on Google Play' },
      { type: 'feature', text: 'iOS app with Face ID and push notifications' },
      { type: 'feature', text: 'Non-intrusive ad integration on 8 pages' },
      { type: 'improvement', text: 'Account deletion (self-service) at /account' },
      { type: 'fix', text: 'Security hardening from full audit' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-10',
    title: 'Company Intelligence',
    description: '200+ space company profiles with deep data.',
    changes: [
      { type: 'feature', text: '200+ space company profiles with 9-tab detail pages' },
      { type: 'feature', text: 'Company watchlists and saved searches' },
      { type: 'feature', text: 'Company-tagged news articles' },
      { type: 'improvement', text: 'News cards show company badges linking to profiles' },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-02-08',
    title: 'Platform Expansion',
    description: 'Stripe payments, API product, alerts, and procurement intelligence.',
    changes: [
      { type: 'feature', text: 'Stripe payment integration for Pro and Enterprise tiers' },
      { type: 'feature', text: 'Commercial API v1 with developer portal' },
      { type: 'feature', text: 'Smart alert system with email delivery' },
      { type: 'feature', text: 'SAM.gov procurement intelligence' },
      { type: 'feature', text: 'Custom dashboard builder' },
      { type: 'feature', text: 'Real-time launch day dashboard with chat' },
    ],
  },
];

/**
 * Get changelog entries newer than a given version
 */
export function getNewEntries(lastSeenVersion: string | null): ChangelogEntry[] {
  if (!lastSeenVersion) return CHANGELOG;

  const idx = CHANGELOG.findIndex((e) => e.version === lastSeenVersion);
  if (idx <= 0) return [];

  return CHANGELOG.slice(0, idx);
}

/**
 * Get the latest version string
 */
export function getLatestVersion(): string {
  return CHANGELOG[0]?.version || '0.0.0';
}
