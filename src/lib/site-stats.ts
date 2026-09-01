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
  /** Company profiles in the directory (actual: 319 CompanyProfile rows after the Aug 2026 DB merge) */
  companies: '300+',
  /** Original articles: blog posts + published AI insights (actual: ~270) */
  articles: '250+',
  /** Named external data sources — matches /data-sources page inventory */
  dataSources: '26',
  /** Active satellites tracked via live CelesTrak TLE data (actual ~16,300, Aug 2026) */
  satellites: '16,000+',
  /** Distinct pages & tools on the platform (actual: 412 routes) */
  pagesAndTools: '400+',
  /** Consolidated content/tool modules */
  modules: '40+',
  /** Automated data-refresh jobs (cron roster, actual: 56 scheduled jobs) */
  automatedFeeds: '50+',
  /** Live ATS-synced job listings (actual: ~6,540 active Aug 2026, resyncs daily) */
  jobListings: '6,500+',
  /** RSS/news feeds ingested (actual: 63 in news-fetcher RSS_FEEDS after Aug 2026 dead-feed prune) */
  newsFeeds: '60+',
  /** Global space economy, current (single canonical figure — do not fork; Space Foundation 2025, corrected from $630B in the 2026-09-01 audit) */
  spaceEconomyNow: '$626B',
  /** Global space economy, projected — always cite with the year */
  spaceEconomyProjection: '$1.8T by 2035',
  /** Artemis Accords signatory nations (actual: 71 — Türkiye signed Aug 31, 2026, per NASA; verified 2026-09-01) */
  accordsNations: '71',
  /**
   * Orbital launch ATTEMPTS worldwide in 2025 (the record-setting year), per the
   * space-launch-schedule-2026 guide's sourcing. This is an attempts count, not a
   * successes count — see space-stats' separate "96% Overall Launch Success Rate"
   * stat for the reliability figure. Do not fork this number elsewhere; cite both
   * precisely if a page needs to distinguish attempts from successes.
   */
  launches2025: '324',
} as const;

export type SiteStatKey = keyof typeof SITE_STATS;
