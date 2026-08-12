/**
 * SITE_STATS — the single source of truth for every numeric marketing claim.
 *
 * Rule: no landing/marketing/trust page may hardcode a platform statistic.
 * Import from here instead. Keep values honest and rounded DOWN to what we
 * can defend (audited 2026-08: 123 company profiles, 26 named data sources,
 * 412 page routes, 256 original articles + AI insights).
 *
 * When a number changes materially, update it here once.
 */
export const SITE_STATS = {
  /** Company profiles in the directory (actual: 123) */
  companies: '120+',
  /** Original articles: blog posts + published AI insights (actual: ~270) */
  articles: '250+',
  /** Named external data sources — matches /data-sources page inventory */
  dataSources: '26',
  /** Active satellites tracked via live CelesTrak TLE data */
  satellites: '10,000+',
  /** Distinct pages & tools on the platform (actual: 412 routes) */
  pagesAndTools: '400+',
  /** Consolidated content/tool modules */
  modules: '40+',
  /** Automated data-refresh jobs (cron roster, actual: 56 scheduled jobs) */
  automatedFeeds: '50+',
  /** RSS/news feeds ingested (actual: 63 in news-fetcher RSS_FEEDS after Aug 2026 dead-feed prune) */
  newsFeeds: '60+',
  /** Global space economy, current (single canonical figure — do not fork) */
  spaceEconomyNow: '$630B',
  /** Global space economy, projected — always cite with the year */
  spaceEconomyProjection: '$1.8T by 2035',
} as const;

export type SiteStatKey = keyof typeof SITE_STATS;
