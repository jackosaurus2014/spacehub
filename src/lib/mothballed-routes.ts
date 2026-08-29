// ─── Mothballed routes ────────────────────────────────────────────────────────
// Phase 2 of the 2026-08 content consolidation. Two feature suites were built
// ahead of their audience and had ZERO production usage ever (full DB census,
// 2026-08-26): the social suite (forums with 0 posts, DMs with 0
// conversations, mentors, study groups, AMAs, speaking, professional
// directory/profiles, corporate team channels) and the transactional
// marketplace (RFQs with 0 proposals, deal rooms, cap tables, ticket resale,
// gig work). Community for ~450 MAU is premature; for 10k it isn't.
//
// So the code stays — nothing is deleted — but the pages are taken off the
// air. Every mothballed path 307s (TEMPORARY, never cached by browsers or
// crawlers) to the hub that will relist it. Relisting a feature is deleting
// its row here and restoring its nav entry.
//
// The middleware consults this registry BEFORE the per-page existence probes
// so mothballed detail routes cost zero DB reads. APIs under /api/* are not
// touched: admin surfaces and the reachout sentinel still read those tables.
//
// The curated ServiceListing directory (/marketplace, /marketplace/search,
// /marketplace/listings/[slug], /provider-dashboard) is the live half of the
// marketplace and is deliberately NOT here. Neither is /community/guidelines,
// /inbox (that's the notification inbox, not DMs), nor /hire (the jobs
// machine is the best-run pipeline on the site).

export type MothballGroup = 'social' | 'marketplace' | 'consolidation';

export interface MothballedRoute {
  /** Path prefix. Matches the path itself and anything beneath it. */
  prefix: string;
  /** Hub the visitor lands on instead. */
  redirectTo: string;
  group: MothballGroup;
}

export const MOTHBALLED_ROUTES: readonly MothballedRoute[] = [
  // ── Social suite → /community ──────────────────────────────────────────
  { prefix: '/community/forums', redirectTo: '/community', group: 'social' },
  { prefix: '/community/directory', redirectTo: '/community', group: 'social' },
  { prefix: '/community/profile', redirectTo: '/community', group: 'social' },
  { prefix: '/messages', redirectTo: '/community', group: 'social' },
  { prefix: '/mentors', redirectTo: '/community', group: 'social' },
  { prefix: '/amas', redirectTo: '/community', group: 'social' },
  { prefix: '/study-groups', redirectTo: '/community', group: 'social' },
  { prefix: '/speaking', redirectTo: '/community', group: 'social' },
  { prefix: '/teams', redirectTo: '/community', group: 'social' },

  // ── Transactional marketplace → /marketplace (the directory stays) ─────
  { prefix: '/marketplace/rfq', redirectTo: '/marketplace', group: 'marketplace' },
  { prefix: '/deal-room', redirectTo: '/marketplace', group: 'marketplace' },
  { prefix: '/deal-rooms', redirectTo: '/marketplace', group: 'marketplace' },
  { prefix: '/cap-tables', redirectTo: '/marketplace', group: 'marketplace' },
  { prefix: '/ticket-resale', redirectTo: '/marketplace', group: 'marketplace' },
  { prefix: '/gig-work', redirectTo: '/marketplace', group: 'marketplace' },

  // ── Duplicate surfaces folded into their hub (roadmap 2026-09) ─────────
  // /briefs was a second rolling digest next to the Intelligence Brief hub;
  // /investor-hub (deal memos, theses) had zero rows in prod on 2026-08-29;
  // /this-day-in-space now lives as the 'Today' strip at the top of /history.
  { prefix: '/briefs', redirectTo: '/intelligence-brief', group: 'consolidation' },
  { prefix: '/investor-hub', redirectTo: '/investors', group: 'consolidation' },
  { prefix: '/this-day-in-space', redirectTo: '/history#today', group: 'consolidation' },
  { prefix: '/space-score', redirectTo: '/report-cards?view=score', group: 'consolidation' },
];

/**
 * The mothball entry covering a pathname, or null when the page is live.
 * Prefix matching is segment-aware: '/deal-room' covers '/deal-room/x' but
 * never '/deal-rooms'.
 */
export function resolveMothball(pathname: string): MothballedRoute | null {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  for (const route of MOTHBALLED_ROUTES) {
    if (path === route.prefix || path.startsWith(route.prefix + '/')) return route;
  }
  return null;
}
