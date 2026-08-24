/**
 * Content-accuracy sentinel.
 *
 * A small, data-driven checklist runner that catches the class of bug where
 * the site keeps presenting stale or past-dated content as current/upcoming
 * (e.g. Mission Control featuring a mission that already flew, a curated
 * "as of" stamp nobody has refreshed in months, or a data-feeding cron job
 * silently going quiet). Runs daily via /api/cron/content-accuracy.
 *
 * Add new checks by pushing another entry onto CONTENT_ACCURACY_CHECKS —
 * each check is an independent { id, label, run() } definition so the list
 * stays easy to extend without touching the runner itself.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendFreshnessAlert } from '@/lib/freshness-alerts';
import { STARTUP_HUB_ASOF } from '@/lib/startup-hub-data';
import { REPORT_CARDS_QUARTER_ASSESSED } from '@/lib/report-cards-data';
import { getArtemisNewsArticles } from '@/lib/artemis-news';
import { getStarshipNewsArticles } from '@/lib/starship-news';
import { FRESHNESS_POLICIES, type FreshnessPolicy } from '@/lib/freshness-policies';
import { checkAdvertisedDiscountsMatchStripe } from '@/lib/pricing-integrity';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccuracyCheckOutcome {
  ok: boolean;
  detail: string;
}

export interface AccuracyCheckDef {
  id: string;
  label: string;
  run: () => Promise<AccuracyCheckOutcome> | AccuracyCheckOutcome;
}

export interface AccuracyCheckResult extends AccuracyCheckOutcome {
  id: string;
  label: string;
}

export interface ContentAccuracySentinelResult {
  checks: AccuracyCheckResult[];
  failedCount: number;
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

// Event types eligible to be the Mission Control "Featured Mission" marquee
// card — mirrors MARQUEE_EVENT_TYPES in src/app/mission-control/page.tsx.
const MARQUEE_EVENT_TYPES = ['crewed_mission', 'moon_mission', 'mars_mission'];

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

// ---------------------------------------------------------------------------
// Check 1 — Mission Control featured mission date is in the future
// ---------------------------------------------------------------------------

async function checkMissionControlFeaturedFuture(): Promise<AccuracyCheckOutcome> {
  const now = new Date();
  const stale = await prisma.spaceEvent.findMany({
    where: {
      type: { in: MARQUEE_EVENT_TYPES },
      status: 'upcoming',
      launchDate: { lt: now },
    },
    select: { id: true, name: true, launchDate: true },
    take: 5,
  });

  if (stale.length === 0) {
    return {
      ok: true,
      detail: 'No marquee mission (crewed/moon/mars) is marked "upcoming" with a launch date in the past.',
    };
  }

  return {
    ok: false,
    detail: `${stale.length} marquee mission(s) marked "upcoming" have a launch date in the past: ${stale
      .map((e) => `${e.name} (${e.launchDate?.toISOString().slice(0, 10)})`)
      .join(', ')}`,
  };
}

// ---------------------------------------------------------------------------
// Check 2 — no hero/countdown target date on key pages is in the past
// ---------------------------------------------------------------------------

async function checkCountdownWidgetsFuture(): Promise<AccuracyCheckOutcome> {
  const now = new Date();
  const widgets = await prisma.countdownWidget.findMany({
    where: { targetTime: { lt: now }, eventId: { not: null } },
    select: { id: true, slug: true, missionName: true, targetTime: true, eventId: true },
  });

  if (widgets.length === 0) {
    return { ok: true, detail: 'No mission-linked countdown widgets found with a past target time.' };
  }

  const eventIds = widgets.map((w) => w.eventId).filter((id): id is string => !!id);
  const events = eventIds.length > 0
    ? await prisma.spaceEvent.findMany({ where: { id: { in: eventIds } }, select: { id: true, status: true } })
    : [];
  const statusById = new Map(events.map((e) => [e.id, e.status]));

  // A countdown widget's target time passing is expected once its mission
  // completes (it correctly flips to "LAUNCHED"). Only flag widgets whose
  // linked mission is NOT completed/scrubbed — that's a countdown still
  // presented as live/upcoming while quietly showing a negative T-minus.
  const stillOpen = widgets.filter((w) => {
    const status = w.eventId ? statusById.get(w.eventId) : undefined;
    return status !== 'completed' && status !== 'scrubbed';
  });

  if (stillOpen.length === 0) {
    return {
      ok: true,
      detail: `${widgets.length} mission-linked countdown widget(s) with a past target time all point to completed/scrubbed missions (expected).`,
    };
  }

  return {
    ok: false,
    detail: `${stillOpen.length} countdown widget(s) target a past date for a mission not marked completed/scrubbed: ${stillOpen
      .map((w) => w.slug)
      .join(', ')}`,
  };
}

// ---------------------------------------------------------------------------
// Check 3a — startup-hub-data.ts STARTUP_HUB_ASOF < 100 days old
// ---------------------------------------------------------------------------

function checkStartupHubAsOf(): AccuracyCheckOutcome {
  const asOfMs = new Date(STARTUP_HUB_ASOF).getTime();
  if (Number.isNaN(asOfMs)) {
    return { ok: false, detail: `STARTUP_HUB_ASOF ("${STARTUP_HUB_ASOF}") is not a parseable date.` };
  }
  const ageDays = (Date.now() - asOfMs) / MS_PER_DAY;
  const ok = ageDays < 100;
  return {
    ok,
    detail: `STARTUP_HUB_ASOF = ${STARTUP_HUB_ASOF} (${ageDays.toFixed(0)} days old; policy: < 100 days).`,
  };
}

// ---------------------------------------------------------------------------
// Check 3b — report-cards quarterAssessed within 2 quarters
// ---------------------------------------------------------------------------

// Parses a "Q<n> <year>" label into a monotonic quarter index and returns
// how many quarters old it is relative to today. Returns null if the label
// doesn't parse.
export function quartersElapsedSince(label: string, now: Date = new Date()): number | null {
  const match = /^Q([1-4])\s+(\d{4})$/.exec(label.trim());
  if (!match) return null;
  const quarter = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  const assessedIndex = year * 4 + (quarter - 1);

  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const currentIndex = now.getFullYear() * 4 + (currentQuarter - 1);

  return currentIndex - assessedIndex;
}

function checkReportCardsQuarter(): AccuracyCheckOutcome {
  const elapsed = quartersElapsedSince(REPORT_CARDS_QUARTER_ASSESSED);
  if (elapsed === null) {
    return {
      ok: false,
      detail: `Could not parse REPORT_CARDS_QUARTER_ASSESSED value "${REPORT_CARDS_QUARTER_ASSESSED}" (expected "Q<1-4> <year>").`,
    };
  }
  const ok = elapsed <= 2;
  return {
    ok,
    detail: `Report Cards quarterAssessed = ${REPORT_CARDS_QUARTER_ASSESSED} (${elapsed} quarter(s) old; policy: <= 2 quarters).`,
  };
}

// ---------------------------------------------------------------------------
// Check 4 — SpaceJobPosting freshest postedDate < 3 days (ATS sync alive)
// ---------------------------------------------------------------------------

async function checkJobPostingsFresh(): Promise<AccuracyCheckOutcome> {
  const latest = await prisma.spaceJobPosting.findFirst({
    orderBy: { postedDate: 'desc' },
    select: { postedDate: true },
  });

  if (!latest) {
    return { ok: false, detail: 'No SpaceJobPosting rows found — the ATS sync may never have run.' };
  }

  const ageHours = (Date.now() - latest.postedDate.getTime()) / MS_PER_HOUR;
  const ok = ageHours < 72;
  return { ok, detail: `Freshest SpaceJobPosting.postedDate is ${ageHours.toFixed(1)}h old (policy: < 72h / 3 days).` };
}

// ---------------------------------------------------------------------------
// Check 5 — NewsArticle freshest publishedAt < 12h (news crons alive)
// ---------------------------------------------------------------------------

async function checkNewsArticlesFresh(): Promise<AccuracyCheckOutcome> {
  const latest = await prisma.newsArticle.findFirst({
    orderBy: { publishedAt: 'desc' },
    select: { publishedAt: true },
  });

  if (!latest) {
    return { ok: false, detail: 'No NewsArticle rows found — the news crons may never have run.' };
  }

  const ageHours = (Date.now() - latest.publishedAt.getTime()) / MS_PER_HOUR;
  const ok = ageHours < 12;
  return { ok, detail: `Freshest NewsArticle.publishedAt is ${ageHours.toFixed(1)}h old (policy: < 12h).` };
}

// ---------------------------------------------------------------------------
// Check 6 — AIInsight latest generatedAt < 48h (article pipeline alive)
// ---------------------------------------------------------------------------

async function checkAIInsightsFresh(): Promise<AccuracyCheckOutcome> {
  const latest = await prisma.aIInsight.findFirst({
    orderBy: { generatedAt: 'desc' },
    select: { generatedAt: true },
  });

  if (!latest) {
    return { ok: false, detail: 'No AIInsight rows found — the AI article pipeline may never have run.' };
  }

  const ageHours = (Date.now() - latest.generatedAt.getTime()) / MS_PER_HOUR;
  const ok = ageHours < 48;
  return { ok, detail: `Freshest AIInsight.generatedAt is ${ageHours.toFixed(1)}h old (policy: < 48h).` };
}

// ---------------------------------------------------------------------------
// Check 7 — /artemis live news rail feed is alive (freshest match < 7 days)
// ---------------------------------------------------------------------------

// Reuses the exact same matching logic as the /artemis page's live news
// rail (src/lib/artemis-news.ts) so this check and the page can never
// drift apart — a failing check always means the rail itself is stale.
async function checkArtemisTrackerFreshness(): Promise<AccuracyCheckOutcome> {
  const [latest] = await getArtemisNewsArticles(1);

  if (!latest) {
    return {
      ok: false,
      detail: 'No Artemis-matching NewsArticle rows found — the /artemis live news rail has nothing to show.',
    };
  }

  const ageDays = (Date.now() - latest.publishedAt.getTime()) / MS_PER_DAY;
  const ok = ageDays < 7;
  return {
    ok,
    detail: `Freshest Artemis-matching NewsArticle ("${latest.title}") is ${ageDays.toFixed(1)} day(s) old (policy: < 7 days).`,
  };
}

// ---------------------------------------------------------------------------
// Check 7b — /starship live news rail is alive (freshest match < 7 days)
// ---------------------------------------------------------------------------

// Reuses the exact same matching logic as the /starship page's live news
// rail (src/lib/starship-news.ts) so this check and the page can never
// drift apart — a failing check always means the rail itself is stale.
async function checkStarshipTrackerFreshness(): Promise<AccuracyCheckOutcome> {
  const [latest] = await getStarshipNewsArticles(1);

  if (!latest) {
    return {
      ok: false,
      detail: 'No Starship-matching NewsArticle rows found — the /starship live news rail has nothing to show.',
    };
  }

  const ageDays = (Date.now() - latest.publishedAt.getTime()) / MS_PER_DAY;
  const ok = ageDays < 7;
  return {
    ok,
    detail: `Freshest Starship-matching NewsArticle ("${latest.title}") is ${ageDays.toFixed(1)} day(s) old (policy: < 7 days).`,
  };
}

// ---------------------------------------------------------------------------
// Check 8 — PublishedBrief newest publishedAt < 10 days (brief hub is fresh)
// ---------------------------------------------------------------------------

// Guarded against the PublishedBrief table not existing yet (it may deploy
// ahead of `prisma db push`) — treated as a pass so the sentinel doesn't
// alert before the migration has even run; scripts/backfill-published-briefs.ts
// and the weekly economy/hiring crons (src/lib/published-briefs.ts) are what
// keep this table populated once it exists.
async function checkPublishedBriefsFresh(): Promise<AccuracyCheckOutcome> {
  let latest: { publishedAt: Date } | null;
  try {
    latest = await prisma.publishedBrief.findFirst({
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true },
    });
  } catch {
    return { ok: true, detail: 'PublishedBrief table not migrated yet — check skipped.' };
  }

  if (!latest) {
    return { ok: false, detail: 'No PublishedBrief rows found — run scripts/backfill-published-briefs.ts and confirm the weekly economy/hiring crons are running.' };
  }

  const ageDays = (Date.now() - latest.publishedAt.getTime()) / MS_PER_DAY;
  const ok = ageDays < 10;
  return {
    ok,
    detail: `Freshest PublishedBrief.publishedAt is ${ageDays.toFixed(1)} day(s) old (policy: < 10 days).`,
  };
}

// ---------------------------------------------------------------------------
// Check 9 — no module's oldest active DynamicContent key is > 4x its TTL
// ---------------------------------------------------------------------------

// Catches the class of bug where a live-API-refreshed key masks stale
// AI-researched keys sitting in the same module (e.g. space-defense's 5 AI
// sections sat at 186 days old / sourceType 'seed' behind a daily
// live-procurement key — see refreshAllAIResearchedModules in
// src/lib/ai-data-refresher.ts, which this check backstops). Modules with
// zero active DynamicContent rows are excluded — nothing to be stale about.
//
// Takes an explicit `policies` param (defaulting to the real
// FRESHNESS_POLICIES) so tests can exercise a small, deterministic subset
// instead of every registered module.
export async function checkStaleModuleContent(
  policies: Record<string, FreshnessPolicy> = FRESHNESS_POLICIES
): Promise<AccuracyCheckOutcome> {
  const offenders: Array<{ module: string; contentKey: string; ageDays: number; ttlDays: number }> = [];

  for (const [moduleName, policy] of Object.entries(policies)) {
    const oldest = await prisma.dynamicContent.findFirst({
      where: { module: moduleName, isActive: true },
      orderBy: { refreshedAt: 'asc' },
      select: { contentKey: true, refreshedAt: true },
    });

    if (!oldest) continue; // no rows for this module — nothing to flag

    const ageHours = (Date.now() - oldest.refreshedAt.getTime()) / MS_PER_HOUR;
    const thresholdHours = policy.ttlHours * 4;

    if (ageHours > thresholdHours) {
      offenders.push({
        module: moduleName,
        contentKey: oldest.contentKey,
        ageDays: ageHours / 24,
        ttlDays: policy.ttlHours / 24,
      });
    }
  }

  if (offenders.length === 0) {
    return {
      ok: true,
      detail: 'No module has an active DynamicContent key older than 4x its freshness-policy TTL.',
    };
  }

  return {
    ok: false,
    detail: `${offenders.length} module(s) have an active content key older than 4x TTL: ${offenders
      .map((o) => `${o.module} (worst key "${o.contentKey}", ${o.ageDays.toFixed(0)}d old, TTL ${o.ttlDays.toFixed(1)}d)`)
      .join('; ')}`,
  };
}

// ---------------------------------------------------------------------------
// Checklist registry — data-driven, extend by pushing a new entry
// ---------------------------------------------------------------------------

export const CONTENT_ACCURACY_CHECKS: AccuracyCheckDef[] = [
  {
    id: 'advertised-discounts-match-stripe',
    label: 'Advertised discounts match Stripe billing',
    run: checkAdvertisedDiscounts,
  },
  {
    id: 'mission-control-featured-future',
    label: 'Mission Control featured mission is upcoming, not past',
    run: checkMissionControlFeaturedFuture,
  },
  {
    id: 'countdown-widgets-future',
    label: 'No live-mission countdown widget has a past target date',
    run: checkCountdownWidgetsFuture,
  },
  {
    id: 'startup-hub-asof-fresh',
    label: 'Startup Hub as-of stamp is within policy (< 100 days)',
    run: checkStartupHubAsOf,
  },
  {
    id: 'report-cards-quarter-fresh',
    label: 'Report Cards quarterAssessed is within policy (<= 2 quarters)',
    run: checkReportCardsQuarter,
  },
  {
    id: 'job-postings-fresh',
    label: 'ATS job sync is alive (freshest posting < 3 days)',
    run: checkJobPostingsFresh,
  },
  {
    id: 'news-articles-fresh',
    label: 'News crons are alive (freshest article < 12h)',
    run: checkNewsArticlesFresh,
  },
  {
    id: 'ai-insights-fresh',
    label: 'AI insight pipeline is alive (freshest insight < 48h)',
    run: checkAIInsightsFresh,
  },
  {
    id: 'artemis-tracker-freshness',
    label: '/artemis live news rail is alive (freshest Artemis match < 7 days)',
    run: checkArtemisTrackerFreshness,
  },
  {
    id: 'starship-tracker-freshness',
    label: '/starship live news rail is alive (freshest Starship match < 7 days)',
    run: checkStarshipTrackerFreshness,
  },
  {
    id: 'published-briefs-fresh',
    label: 'Intelligence Brief Hub is fresh (freshest PublishedBrief < 10 days)',
    run: checkPublishedBriefsFresh,
  },
  {
    id: 'space-stocks-roster-present',
    label: 'Space Stocks hub has a healthy public-company roster (>= 10 tickers)',
    run: async (): Promise<AccuracyCheckOutcome> => {
      const count = await prisma.companyProfile.count({
        where: { ticker: { not: null }, NOT: { status: 'defunct' } },
      });
      return {
        ok: count >= 10,
        detail: `${count} non-defunct CompanyProfile rows carry a ticker (policy: >= 10 for /space-stocks).`,
      };
    },
  },
  {
    id: 'company-data-monthly-cadence',
    label: 'Company/funding/investor data refreshed within the monthly cadence',
    // Founder decision (2026-08-14): the discovery/refresh scripts run on a
    // monthly cadence. The newest FundingRound row is the best single proxy
    // for whether that happened — a discovery pass always lands new rounds.
    run: async (): Promise<AccuracyCheckOutcome> => {
      const newest = await prisma.fundingRound.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (!newest) return { ok: false, detail: 'No FundingRound rows exist at all.' };
      const ageDays = Math.floor((Date.now() - newest.createdAt.getTime()) / 86_400_000);
      return {
        ok: ageDays <= 35,
        detail:
          ageDays <= 35
            ? `Newest funding round added ${ageDays}d ago (within monthly cadence).`
            : `Newest funding round is ${ageDays}d old — run the monthly startup/funding discovery refresh (see scripts/load-discovery-*.ts pattern).`,
      };
    },
  },
  {
    id: 'feedback-review-cadence',
    label: 'User feedback is reviewed within 7 days (no stale "new" submissions)',
    // Guarded against the FeedbackSubmission table not existing yet (code may
    // deploy ahead of `prisma db push`) — treated as a pass so the sentinel
    // doesn't alert before the migration has run. Triage happens in
    // /admin?tab=feedback (statuses: new -> reviewed -> actioned).
    run: async (): Promise<AccuracyCheckOutcome> => {
      let oldest: { createdAt: Date } | null;
      try {
        oldest = await prisma.feedbackSubmission.findFirst({
          where: { status: 'new' },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
      } catch {
        return { ok: true, detail: 'FeedbackSubmission table not migrated yet — check skipped.' };
      }

      if (!oldest) {
        return { ok: true, detail: 'No unreviewed ("new") feedback submissions.' };
      }

      const ageDays = (Date.now() - oldest.createdAt.getTime()) / MS_PER_DAY;
      const ok = ageDays <= 7;
      return {
        ok,
        detail: `Oldest "new" FeedbackSubmission is ${ageDays.toFixed(1)} day(s) old (policy: <= 7 days) — triage at /admin?tab=feedback.`,
      };
    },
  },
  {
    id: 'stale-module-content',
    label: 'No module has an active content key older than 4x its freshness-policy TTL',
    run: () => checkStaleModuleContent(),
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Advertised discounts must match how Stripe will actually bill. Broken in
 * production once already (see pricing-integrity.ts), so it is checked daily
 * rather than trusted.
 */
async function checkAdvertisedDiscounts(): Promise<AccuracyCheckOutcome> {
  return checkAdvertisedDiscountsMatchStripe();
}

export async function runContentAccuracyChecks(
  checks: AccuracyCheckDef[] = CONTENT_ACCURACY_CHECKS
): Promise<AccuracyCheckResult[]> {
  const results: AccuracyCheckResult[] = [];

  for (const check of checks) {
    try {
      const outcome = await check.run();
      results.push({ id: check.id, label: check.label, ...outcome });
    } catch (error) {
      results.push({
        id: check.id,
        label: check.label,
        ok: false,
        detail: `Check threw an error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  return results;
}

/**
 * Runs the full checklist, logs every result, and — if anything failed —
 * sends ONE summary alert by reusing the existing freshness-alerts admin
 * email/persistence mechanism (src/lib/freshness-alerts.ts). Never throws.
 */
export async function runContentAccuracySentinel(
  checks: AccuracyCheckDef[] = CONTENT_ACCURACY_CHECKS
): Promise<ContentAccuracySentinelResult> {
  const results = await runContentAccuracyChecks(checks);
  const failed = results.filter((r) => !r.ok);

  for (const result of results) {
    if (result.ok) {
      logger.info(`Content accuracy check passed: ${result.id}`, { detail: result.detail });
    } else {
      logger.warn(`Content accuracy check FAILED: ${result.id}`, { detail: result.detail });
    }
  }

  if (failed.length > 0) {
    try {
      // Reuse sendFreshnessAlert's persistence + admin-email plumbing for a
      // single summary alert rather than building a parallel notification
      // path. jobName carries the failing check ids so the email/DB record
      // identifies exactly what needs attention; lastRunAt is passed as
      // null (severity: critical) since this represents a content-accuracy
      // fault detected right now, not a missed cron run.
      const jobName = `content-accuracy: ${failed.map((f) => f.id).join(', ')}`;
      await sendFreshnessAlert(jobName, null, 1440);
    } catch (error) {
      logger.error('Content accuracy sentinel: failed to send summary alert', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.warn('Content accuracy sentinel: one or more checks failed', {
      failedCount: failed.length,
      failed: failed.map((f) => ({ id: f.id, detail: f.detail })),
    });
  } else {
    logger.info('Content accuracy sentinel: all checks passed');
  }

  return { checks: results, failedCount: failed.length };
}
