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
import { sendFreshnessAlert, resolveFreshnessAlertsByPrefix } from '@/lib/freshness-alerts';
import { hasEcfsApiKey } from '@/lib/fetchers/ecfs-api-key';
import { checkResearchReadiness } from '@/lib/research-readiness';
import { QA_EMAIL_DOMAIN } from '@/lib/qa-accounts';
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
// card — mirrors MARQUEE_EVENT_TYPES in src/app/mission-control/MissionControlClient.tsx.
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
      status: { in: ['upcoming', 'go', 'tbc', 'tbd'] }, // any still-scheduled status with a past date is stale (2026-09-10)
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

/** The weekly digests (Mon/Wed crons) are excluded: they kept this check green
 *  through 12 silent days of the DAILY generator (2026-08-31 → 09-10). */
const WEEKLY_DIGEST_TITLE = /^(Who's Hiring in Space|Regulatory Radar|State of the Space Economy)/;

async function checkAIInsightsFresh(): Promise<AccuracyCheckOutcome> {
  const recent = await prisma.aIInsight.findMany({
    where: { generatedAt: { gte: new Date(Date.now() - 7 * 24 * MS_PER_HOUR) } },
    orderBy: { generatedAt: 'desc' },
    select: { title: true, generatedAt: true },
    take: 60,
  });
  const latestDaily = recent.find((r) => !WEEKLY_DIGEST_TITLE.test(r.title));
  if (!latestDaily) {
    return { ok: false, detail: 'No standalone (non-digest) AI insight in the last 7 days — the daily generator is not producing articles.' };
  }
  const ageHours = (Date.now() - latestDaily.generatedAt.getTime()) / MS_PER_HOUR;
  // The daily runs at 01:00 UTC with a 07:00 retry; this check runs at 12:00 UTC.
  const ok = ageHours < 36;
  return { ok, detail: `Freshest standalone AI insight is ${ageHours.toFixed(1)}h old (policy: < 36h; weekly digests excluded).` };
}

// Check 6b — the failure signature of 2026-08-31 → 09-10: the generator took
// today's lock (dynamicContent ai-insights:generation-lock:<day>) and wrote
// no rows. One failed attempt a day, invisible unless something looks for it.
async function checkAIInsightsDailyRan(): Promise<AccuracyCheckOutcome> {
  const day = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${day}T00:00:00Z`);
  const [lock, rowsToday] = await Promise.all([
    prisma.dynamicContent.findUnique({ where: { contentKey: `ai-insights:generation-lock:${day}` }, select: { createdAt: true } }),
    prisma.aIInsight.count({ where: { generatedAt: { gte: todayStart } } }),
  ]);
  if (!lock) {
    return { ok: false, detail: `No generation lock for ${day} — the 01:00/07:00 UTC ai-insights cron did not run at all.` };
  }
  if (rowsToday === 0) {
    return { ok: false, detail: `Generation lock for ${day} exists but 0 AI insight rows were written — the run failed after taking the lock. Read railway logs for the deployment that ran it and re-run: scripts/insights-unlock.ts then POST /api/ai-insights/generate.` };
  }
  return { ok: true, detail: `${rowsToday} AI insight row(s) written today.` };
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
    id: 'funding-feeds-alive',
    label: 'Funding data feeds ran and wrote (no silently-dead fetcher)',
    run: checkFundingFeedsAlive,
  },
  {
    id: 'funding-rows-cite-a-source',
    label: 'New funding rounds carry a source URL and flag undisclosed amounts',
    run: checkFundingRowsCiteASource,
  },
  {
    id: 'stuck-transitional-rows',
    label: 'No digests stuck sending / insights stuck in review',
    run: checkStuckTransitionalRows,
  },
  {
    id: 'table-pipeline-liveness',
    label: 'Table-backed data pipelines are writing',
    run: checkTablePipelineLiveness,
  },
  {
    id: 'launch-outcomes-flowing',
    label: 'Flown launches are recording real outcomes (not all "scrubbed")',
    run: checkLaunchOutcomesFlowing,
  },
  {
    id: 'sitemap-segments-populated',
    label: 'DB-backed sitemap segments list URLs (companies, content, launches)',
    run: checkSitemapSegments,
  },
  {
    id: 'stock-quotes-fresh',
    label: 'Stock-sync is writing quotes (freshest public-company lastVerified < 4 days)',
    run: checkStockQuotesFresh,
  },
  {
    id: 'ticker-implies-public',
    label: 'Every ticker-bearing company is marked public (foreign-IPO sentinel)',
    run: checkTickerImpliesPublic,
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
    label: 'Daily AI article generator is alive (freshest standalone insight < 36h)',
    run: checkAIInsightsFresh,
  },
  {
    id: 'ai-insights-daily-ran',
    label: "Today's AI insight run wrote rows (lock taken means rows written)",
    run: checkAIInsightsDailyRan,
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
  // Space Tycoon money: the sync ceiling rejecting a real player's income is
  // invisible to us unless something watches for it. It ran for weeks in
  // September 2026 (timed-event and delivery payouts the server could not
  // verify, ~$3.3B rejected across two players) and only surfaced because
  // the founder noticed his balance snapping back. Now it pages us.
  // SpaceNexus Research is sold on an annual invoice, so a subscriber is owed
  // accuracy in month seven as much as on the day they bought. The same
  // function that answers "can we launch?" answers "is what we sold still
  // true?", and it runs here so the answer cannot quietly go stale.
  {
    id: 'research-still-sellable',
    label: 'SpaceNexus Research is still fit to sell (editions current, feeds alive, every row cited)',
    run: async () => {
      const r = await checkResearchReadiness();
      if (r.ready) {
        const warn = r.warnings.length > 0 ? ' (' + r.warnings.length + ' disclosed limit(s))' : '';
        return { ok: true, detail: r.criteria.length + ' criteria pass' + warn };
      }
      return { ok: false, detail: r.blockers.map(b => b.id + ': ' + b.detail).join(' | ') };
    },
  },
  {
    id: 'money-clamp-quiet',
    label: 'No real player had income rejected by the sync ceiling in the last 24h',
    run: () => checkMoneyClampQuiet(),
  },
  // Nightly QA probes (scripts/qa/, .github/workflows/nightly-qa.yml) post to
  // /api/qa/report, which writes a DataRefreshLog row per run. A run that
  // FAILS emails on its own; these checks catch the probe not running at all
  // (workflow disabled, secret rotated, runner broken).
  {
    id: 'qa-smoke-ran',
    label: 'Nightly smoke probe reported within 36h',
    run: () => checkQaProbeRan('qa-smoke'),
  },
  {
    id: 'qa-tycoon-ran',
    label: 'Nightly Space Tycoon probe reported within 36h',
    run: () => checkQaProbeRan('qa-tycoon'),
  },
  {
    id: 'federal-awards-usable',
    label: 'Federal award table is filling, and every row cites its award record',
    run: checkFederalAwardsUsable,
  },
  {
    id: 'insider-feeds-alive',
    label: 'SEC insider sweep ran and wrote, and every row cites its filing',
    run: checkInsiderFeedsAlive,
  },
  {
    id: 'uk-registry-alive',
    label: 'UK Companies House sweep ran, is configured, and every row cites the register',
    run: checkUkRegistryAlive,
  },
];

/** A rejection this large means a player watched money vanish. */
export const MONEY_CLAMP_ALERT_THRESHOLD = 10_000_000;

/**
 * Space Tycoon: did the sync plausibility ceiling reject income for a real
 * (non-QA) player in the last 24 hours? Every rejection is audited as
 * `client_money_implausible_rejected` in MarketAuditLog with the amount in
 * `details.rejectedExcess`. Small rejections are ordinary (a forged or
 * unverifiable client claim); anything past the threshold is a player losing
 * visible money and needs a look, and usually a ledger restore
 * (scripts/tycoon-ledger-credit.ts).
 */
export const MONEY_CLAMP_ACK_KEY = 'system:money-clamp-ack';

/**
 * Rejections at or before this instant have been dealt with (money restored,
 * cause fixed) and must not keep paging. Set it with
 * `scripts/tycoon-clamp-ack.ts` when an incident is closed.
 */
async function readMoneyClampAck(): Promise<Date | null> {
  try {
    const row = await prisma.dynamicContent.findUnique({ where: { contentKey: MONEY_CLAMP_ACK_KEY } });
    if (!row) return null;
    const parsed = JSON.parse(row.data) as { acknowledgedThrough?: string };
    const t = parsed?.acknowledgedThrough ? Date.parse(parsed.acknowledgedThrough) : NaN;
    return Number.isFinite(t) ? new Date(t) : null;
  } catch {
    return null;
  }
}

async function checkMoneyClampQuiet(): Promise<AccuracyCheckOutcome> {
  const ack = await readMoneyClampAck();
  const window = new Date(Date.now() - 24 * 3600_000);
  const since = ack && ack > window ? ack : window;
  const rows = await prisma.marketAuditLog.findMany({
    where: { eventType: 'client_money_implausible_rejected', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { profileId: true, details: true, createdAt: true },
  });
  const scope = ack && ack > window ? `since the acknowledgement at ${ack.toISOString()}` : 'in the last 24h';
  if (rows.length === 0) return { ok: true, detail: `No income was rejected ${scope}` };

  const byProfile = new Map<string, number>();
  for (const r of rows) {
    if (!r.profileId) continue;
    const d = (r.details || {}) as Record<string, unknown>;
    const excess = Number(d.rejectedExcess || 0);
    if (!Number.isFinite(excess) || excess <= 0) continue;
    byProfile.set(r.profileId, (byProfile.get(r.profileId) || 0) + excess);
  }
  if (byProfile.size === 0) return { ok: true, detail: `${rows.length} audit row(s) ${scope}, none with a rejected amount` };

  // QA probe corporations clamp all the time and are not players.
  const real = await prisma.gameProfile.findMany({
    where: { id: { in: [...byProfile.keys()] }, user: { email: { not: { endsWith: QA_EMAIL_DOMAIN } } } },
    select: { id: true, companyName: true },
  });
  const offenders = real
    .map((p) => ({ company: p.companyName, id: p.id, total: byProfile.get(p.id) || 0 }))
    .filter((p) => p.total >= MONEY_CLAMP_ALERT_THRESHOLD)
    .sort((a, b) => b.total - a.total);

  if (offenders.length === 0) {
    return { ok: true, detail: `${byProfile.size} profile(s) clamped, none above $${(MONEY_CLAMP_ALERT_THRESHOLD / 1e6).toFixed(0)}M or all QA` };
  }
  // TWO DIFFERENT EVENTS WEAR THIS ALERT, and only one of them is our bug.
  //
  // (a) Income with a CREDITED SOURCE was rejected. A contract paid out, a
  //     delivery completed, a timed event finished — the server itself
  //     credited it — and the ceiling refused it anyway. That is our defect:
  //     a real player watched money vanish, and it needs a diagnosis and a
  //     ledger restore. It happened twice this week.
  //
  // (b) A client asserted a money jump with NOTHING behind it. No contract,
  //     no delivery, no event. On 2026-09-14 a 17-minute-old corporation
  //     claimed $400M in a single 60-second tick against a modelled earning
  //     power of $11.8M for that window. Nothing legitimate produces that,
  //     and the ceiling caught it, which is the ceiling WORKING.
  //
  // Reporting (b) as a content-accuracy failure would have us investigate our
  // own data every time somebody pokes at their client, and an alert that
  // cries wolf is one people stop reading — the lesson from the security test
  // that failed one run in three. So (a) fails and pages; (b) passes and is
  // NAMED for review, because it is a possible-abuse signal and must not
  // become invisible either.
  const withSource: typeof offenders = [];
  const unexplained: typeof offenders = [];
  for (const o of offenders) {
    const credited = rows.some((r) => {
      if (r.profileId !== o.id) return false;
      const d = (r.details || {}) as Record<string, unknown>;
      const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
      const delivery = d.deliveryCredit;
      const deliveryAmount = typeof delivery === 'number'
        ? delivery
        : n((delivery as { headroomCredit?: number } | null)?.headroomCredit);
      return n(d.contractCredit) + n(d.timedEventCredit) + deliveryAmount > 0;
    });
    (credited ? withSource : unexplained).push(o);
  }

  const describe = (list: typeof offenders) =>
    list.slice(0, 5).map((o) => `${o.company} (${o.id}) $${(o.total / 1e6).toFixed(1)}M`).join('; ');

  if (withSource.length > 0) {
    const tail = unexplained.length > 0
      ? ` Separately, ${unexplained.length} unexplained client jump(s) were rejected correctly: ${describe(unexplained)}.`
      : '';
    return {
      ok: false,
      detail: `Sync ceiling rejected CREDITED income for ${withSource.length} player(s) ${scope}: ${describe(withSource)}. Diagnose with scripts/tycoon-money-diag.ts and restore with scripts/tycoon-ledger-credit.ts.${tail}`,
    };
  }

  return {
    ok: true,
    detail: `No credited income was rejected ${scope}. ${unexplained.length} unexplained client money jump(s) were refused as designed — review for abuse: ${describe(unexplained)}. Inspect one with DIAG_PROFILE_ID=<id> scripts/tycoon-money-diag.ts.`,
  };
}

async function checkQaProbeRan(module: 'qa-smoke' | 'qa-tycoon'): Promise<AccuracyCheckOutcome> {
  const last = await prisma.dataRefreshLog.findFirst({
    where: { module, refreshType: 'nightly-probe' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, status: true, itemsChecked: true, itemsUpdated: true },
  });
  if (!last) return { ok: false, detail: `No ${module} run recorded yet (workflow never reported)` };
  const ageH = (Date.now() - last.createdAt.getTime()) / 3600_000;
  return {
    ok: ageH <= 36,
    detail: `Last ${module} run ${ageH.toFixed(1)}h ago: ${last.status} (${last.itemsUpdated}/${last.itemsChecked} checks ok)`,
  };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Rows stuck in transitional states. A digest row enters 'sending' before the
 * send and is only updated after it — until 2026-08-24 a thrown send left it
 * stuck forever, and four rows (back to April) accumulated with nobody
 * noticing. The send routes now mark failures, but a crashed process still
 * can't, so the sentinel sweeps for survivors. Same idea for AI insights
 * parked in pending_review: the approval email went out once and there is no
 * second nudge, so a forgotten one sits invisible forever.
 */
async function checkStuckTransitionalRows(): Promise<AccuracyCheckOutcome> {
  const DAY = 86_400_000;
  const problems: string[] = [];

  const stuckDigests = await prisma.dailyDigest.count({
    where: { status: 'sending', sendStartedAt: { lt: new Date(Date.now() - DAY) } },
  });
  if (stuckDigests > 0) {
    problems.push(`${stuckDigests} digest(s) stuck in 'sending' for >24h — the send died mid-flight; mark failed and investigate the errorLog`);
  }

  const staleReviews = await prisma.aIInsight.count({
    where: { status: 'pending_review', createdAt: { lt: new Date(Date.now() - 3 * DAY) } },
  });
  if (staleReviews > 0) {
    problems.push(`${staleReviews} AI insight(s) awaiting review for >72h — approve or reject from the review email, or they never publish`);
  }

  if (problems.length > 0) return { ok: false, detail: problems.join(' | ') };
  return { ok: true, detail: 'No rows stuck in transitional states.' };
}

/**
 * Pipeline liveness for Prisma-table feeds. FRESHNESS_POLICIES only covers
 * DynamicContent modules, so table-backed pipelines had NO watchdog — which
 * is how executive-moves ran daily for ~146 days finding zero items, and the
 * debris table (which the dashboard displays) went ~151 days without a write,
 * with no alert either time. updatedAt is used because several fetchers
 * upsert in place.
 */
async function checkTablePipelineLiveness(): Promise<AccuracyCheckOutcome> {
  const DAY = 86_400_000;
  const problems: string[] = [];
  const checks: Array<{ label: string; maxAgeDays: number; newest: () => Promise<Date | null> }> = [
    {
      label: 'ExecutiveMove (daily cron)',
      maxAgeDays: 14,
      newest: async () => (await prisma.executiveMove.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }))?.updatedAt ?? null,
    },
    {
      label: 'DebrisObject (dashboard reads it)',
      maxAgeDays: 45,
      newest: async () => (await prisma.debrisObject.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }))?.updatedAt ?? null,
    },
  ];
  // Spectrum filings need an ECFS api_key, which CONGRESS_GOV_API_KEY also
  // satisfies (see fetchers/ecfs-api-key.ts — one api.data.gov key serves both
  // federal feeds). Watch only once a key exists, so the sentinel never nags
  // about a feed that cannot run.
  //
  // Watch the DynamicContent rows the fetcher actually writes, NOT the
  // SpectrumFiling table. That table is the hand-curated "Active Filings"
  // reference tab and nothing has written to it in 206 days; the live ECFS
  // feed stores flexible records under module 'spectrum', section
  // 'recent-filings', because raw docket filings carry none of the structured
  // technical fields SpectrumFiling requires and fabricating them to fit would
  // misrepresent the filing (see spectrum-filings-fetcher.ts). Pointing the
  // alarm at the curated table made it fire the moment the key was added — an
  // alarm about the wrong table, which is worse than no alarm because it
  // trains us to ignore it.
  if (hasEcfsApiKey()) {
    checks.push({
      label: 'Spectrum ECFS filings (DynamicContent module=spectrum)',
      maxAgeDays: 21,
      newest: async () => (await prisma.dynamicContent.findFirst({
        where: { module: 'spectrum', section: 'recent-filings' },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }))?.updatedAt ?? null,
    });
  }

  for (const c of checks) {
    try {
      const newest = await c.newest();
      const ageDays = newest ? (Date.now() - newest.getTime()) / DAY : Infinity;
      if (ageDays > c.maxAgeDays) {
        problems.push(`${c.label}: newest write ${newest ? Math.round(ageDays) + 'd ago' : 'never'} (threshold ${c.maxAgeDays}d)`);
      }
    } catch (err) {
      problems.push(`${c.label}: query failed (${err instanceof Error ? err.message.split('\n')[0] : String(err)})`);
    }
  }

  if (problems.length > 0) return { ok: false, detail: problems.join(' | ') };
  return { ok: true, detail: `${checks.length} table pipeline(s) alive.` };
}

/**
 * Every launch that flies must end up 'completed' or 'failed', never
 * 'scrubbed' by default. On 2026-08-26 the LL2 status mapper was found to
 * have matched nothing for its entire life: 39/39 launches in 60 days sat at
 * 'scrubbed', the monthly report counted zero launches, and the prediction
 * exchange resolved every launch question 'no'. The world's launch cadence
 * is >5/week, so a fortnight with ≥3 flown launches and zero real outcomes
 * means the outcome sync is broken again.
 */
async function checkLaunchOutcomesFlowing(): Promise<AccuracyCheckOutcome> {
  const now = Date.now();
  const window = { gte: new Date(now - 14 * 86_400_000), lte: new Date(now - 86_400_000) };
  const [flown, real] = await Promise.all([
    prisma.spaceEvent.count({ where: { type: 'launch', launchDate: window } }),
    prisma.spaceEvent.count({ where: { type: 'launch', launchDate: window, status: { in: ['completed', 'failed'] } } }),
  ]);
  if (flown >= 3 && real === 0) {
    return { ok: false, detail: `${flown} launches in the last 14d, none recorded as completed/failed — LL2 outcome sync is not writing (all "scrubbed"?).` };
  }
  return { ok: true, detail: `${real}/${flown} launches in the last 14d carry a real outcome.` };
}

/**
 * The sitemap's DB-backed segments were found EMPTY in production on
 * 2026-08-29: the build container has no database, so they prerendered with
 * zero URLs and were cached. Now rendered per request; this check fetches the
 * live segments and fails if the company or content segment lists nothing.
 */
async function checkSitemapSegments(): Promise<AccuracyCheckOutcome> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://spacenexus.us';
  const counts: Record<string, number> = {};
  for (const seg of [1, 3]) {
    try {
      const res = await fetch(`${base}/sitemap/${seg}.xml`, { cache: 'no-store' });
      const xml = res.ok ? await res.text() : '';
      counts[`segment ${seg}`] = (xml.match(/<loc>/g) || []).length;
    } catch {
      counts[`segment ${seg}`] = -1;
    }
  }
  const empty = Object.entries(counts).filter(([, n]) => n <= 0);
  if (empty.length > 0) return { ok: false, detail: `Empty sitemap segment(s): ${empty.map(([k, n]) => `${k} (${n < 0 ? 'unreachable' : '0 URLs'})`).join(', ')} — DB-backed routes are invisible to crawlers.` };
  return { ok: true, detail: Object.entries(counts).map(([k, n]) => `${k}: ${n} URLs`).join(', ') };
}

/**
 * Stock-sync (weekdays 21:30 UTC) writes stockPrice/marketCap/lastVerified on
 * every public CompanyProfile. Found frozen since 2026-08-20 on 8/27: the
 * cron ran and "succeeded" while skipping 66/66 tickers, because Railway's
 * europe-west4 egress gets Yahoo's EU consent wall (redirect to
 * ?guccounter=1) and yahoo-finance2's crumb handshake fails behind it.
 * /space-stocks and every /compare page's market cap go stale silently.
 * Four days covers a weekend plus one missed run.
 */
/** Foreign-IPO sentinel (#20, 2026-09-01). Every isPublic miss found in the
 *  coverage sweep (Astroscale/Synspective/Innospace — all non-US listings —
 *  plus seven ticker-bearing primes) had a ticker while isPublic stayed
 *  false, which put public companies on the PRE-IPO watchlist. A ticker on
 *  the row means somebody verified a listing; the flag must agree. */
async function checkTickerImpliesPublic(): Promise<AccuracyCheckOutcome> {
  const rows = await prisma.companyProfile.findMany({
    where: { ticker: { not: null }, isPublic: false, NOT: { status: 'defunct' } },
    select: { slug: true, ticker: true },
    take: 10,
  });
  if (rows.length === 0) return { ok: true, detail: 'All ticker-bearing companies are marked public.' };
  return {
    ok: false,
    detail: `${rows.length} ticker-bearing rows still isPublic=false (they may be polluting the pre-IPO watchlist): ${rows.map(r => `${r.slug} (${r.ticker})`).join(', ')}`,
  };
}

async function checkStockQuotesFresh(): Promise<AccuracyCheckOutcome> {
  const newest = await prisma.companyProfile.findFirst({
    // NOT null: Postgres sorts NULLs first on DESC, which read as "never".
    where: { isPublic: true, ticker: { not: null }, NOT: { lastVerified: null } },
    orderBy: { lastVerified: 'desc' },
    select: { lastVerified: true, ticker: true },
  });
  if (!newest?.lastVerified) return { ok: false, detail: 'No public company has ever had a verified quote.' };
  const ageDays = (Date.now() - newest.lastVerified.getTime()) / 86_400_000;
  if (ageDays > 4) {
    return { ok: false, detail: `Freshest stock quote is ${Math.round(ageDays)}d old (${newest.ticker}) — stock-sync is skipping every ticker (Yahoo consent wall from an EU region?).` };
  }
  return { ok: true, detail: `Freshest quote ${ageDays.toFixed(1)}d old.` };
}

/**
 * The funding feeds must be demonstrably alive, not merely quiet.
 *
 * Two FCC fetchers sat dead for weeks in September 2026 behind a swallowed
 * 403: a circuit breaker returned its fallback, nothing was written, and
 * "no new rows" was indistinguishable from "no new filings". The Research
 * tier is sold on funding depth, so a dead funding feed is a refund event.
 *
 * DataSourceRun (see src/lib/funding/provenance.ts) makes the three cases
 * separable, and all three fail here:
 *   - never ran           -> no row for the source at all;
 *   - ran and failed      -> ok=false, with the verbatim error;
 *   - ran, wrote nothing, collected HTTP errors -> finishRun marks ok=false.
 * A run that genuinely found nothing new stays green, which is the point.
 */
const FUNDING_FEEDS: Array<{ source: string; label: string; maxAgeDays: number }> = [
  { source: 'sec-form-d', label: 'SEC EDGAR Form D', maxAgeDays: 9 },
  { source: 'edgar-company-facts', label: 'SEC EDGAR filer record', maxAgeDays: 16 },
  // USAspending prime federal awards (src/lib/fetchers/usaspending-awards-fetcher.ts).
  // The nightly cron walks a slice of the roster, so a healthy feed runs every
  // night; 4 days allows for a missed run without crying wolf.
  { source: 'usaspending-awards', label: 'USAspending federal awards', maxAgeDays: 4 },
];

/**
 * The most recent run that actually COMPLETED successfully for a source,
 * plus whether the very latest attempt was killed part-way.
 *
 * Reading only the newest row — which every one of these checks used to do —
 * is wrong for a resumable sweep. USAspending walks the roster a slice at a
 * time and is driven by an HTTP request that a platform edge will cut after a
 * few minutes. The cut leaves a row with a startedAt and no finishedAt, so
 * the newest row is very often a killed one even while the sweep is healthy
 * and writing thousands of verified rows. That made the alarm permanently
 * red, and a permanently red alarm is one nobody reads — the same cry-wolf
 * failure as the security test that failed one run in three, and as the money
 * clamp that reported caught abuse as our own bug.
 *
 * So: a feed is alive when it has a SUCCESSFUL completion inside its window.
 * A killed attempt alongside recent successes is ordinary operational noise
 * and is reported as context, not as a failure. A killed attempt with NO
 * successful completion in the window is still a failure, which is the case
 * the alarm exists for.
 */
async function lastHealthyRun(source: string): Promise<{
  success: { startedAt: Date; itemsWritten: number | null } | null;
  latestKilled: boolean;
  latestFailedWhy: string | null;
  everRan: boolean;
}> {
  const rows = await prisma.dataSourceRun.findMany({
    where: { source },
    orderBy: { startedAt: 'desc' },
    take: 25,
    select: { startedAt: true, finishedAt: true, ok: true, error: true, itemsWritten: true },
  });
  if (rows.length === 0) return { success: null, latestKilled: false, latestFailedWhy: null, everRan: false };
  const newest = rows[0];
  const success = rows.find((r) => r.finishedAt && r.ok) ?? null;
  return {
    success: success ? { startedAt: success.startedAt, itemsWritten: success.itemsWritten } : null,
    latestKilled: !newest.finishedAt,
    latestFailedWhy: newest.finishedAt && !newest.ok
      ? (newest.error ?? 'no error recorded').split(/\r?\n/)[0].slice(0, 200)
      : null,
    everRan: true,
  };
}

async function checkFundingFeedsAlive(): Promise<AccuracyCheckOutcome> {
  const problems: string[] = [];
  const healthy: string[] = [];

  for (const feed of FUNDING_FEEDS) {
    const run = await lastHealthyRun(feed.source);
    if (!run.everRan) {
      problems.push(`${feed.label}: has never run (no DataSourceRun row for "${feed.source}").`);
      continue;
    }
    if (!run.success) {
      // No completed, successful run at all — this is the real dead feed.
      if (run.latestKilled) {
        problems.push(`${feed.label}: no run has ever completed; the latest was killed mid-sweep.`);
      } else {
        problems.push(`${feed.label}: no successful run on record (latest failed: ${run.latestFailedWhy ?? 'unknown'}).`);
      }
      continue;
    }
    const ageDays = (Date.now() - run.success.startedAt.getTime()) / MS_PER_DAY;
    if (ageDays > feed.maxAgeDays) {
      problems.push(`${feed.label}: last SUCCESSFUL run ${ageDays.toFixed(1)}d ago (policy: < ${feed.maxAgeDays}d).`);
      continue;
    }
    // Healthy. A killed attempt after a recent success is normal for a
    // resumable sweep cut short by an edge timeout; say so without failing.
    const note = run.latestKilled ? ' (latest attempt cut short — resumes by cursor)' : '';
    healthy.push(`${feed.label} ${ageDays.toFixed(1)}d ago (+${run.success.itemsWritten ?? 0})${note}`);
  }

  // Belt and braces: the feeds can be green while the table they exist to
  // fill is not growing. A research dataset that has not gained a single
  // round in two months is stale whatever the run ledger says.
  const newest = await prisma.fundingRound.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!newest) {
    problems.push('FundingRound is EMPTY.');
  } else {
    const ageDays = (Date.now() - newest.createdAt.getTime()) / MS_PER_DAY;
    if (ageDays > 60) {
      problems.push(`Newest FundingRound row was written ${Math.round(ageDays)}d ago — nothing is filling the table.`);
    }
  }

  if (problems.length > 0) return { ok: false, detail: problems.join(' | ') };
  return { ok: true, detail: `${healthy.length} funding feed(s) alive: ${healthy.join('; ')}.` };
}

/**
 * Every funding row we sell must be checkable. A row with no sourceUrl cannot
 * be defended to an investor, and a row whose amount is missing must say
 * "undisclosed" rather than silently reading as zero. Both are policy, so
 * both are watched: the check fails when unsourced rows are being ADDED, not
 * on the historical backlog (which would just page forever).
 */
const FUNDING_SOURCE_URL_GRACE_DAYS = 30;

async function checkFundingRowsCiteASource(): Promise<AccuracyCheckOutcome> {
  const since = new Date(Date.now() - FUNDING_SOURCE_URL_GRACE_DAYS * MS_PER_DAY);
  const [recent, unsourced, silentlyZero] = await Promise.all([
    prisma.fundingRound.count({ where: { createdAt: { gte: since } } }),
    prisma.fundingRound.count({ where: { createdAt: { gte: since }, OR: [{ sourceUrl: null }, { sourceUrl: '' }] } }),
    prisma.fundingRound.count({ where: { amount: null, amountUndisclosed: false } }),
  ]);

  const problems: string[] = [];
  if (unsourced > 0) {
    problems.push(`${unsourced} of ${recent} FundingRound rows added in the last ${FUNDING_SOURCE_URL_GRACE_DAYS}d carry no sourceUrl.`);
  }
  if (silentlyZero > 0) {
    problems.push(`${silentlyZero} FundingRound rows have a NULL amount without amountUndisclosed set — they read as unknown instead of "undisclosed".`);
  }
  if (problems.length > 0) return { ok: false, detail: problems.join(' | ') };
  return { ok: true, detail: `All ${recent} rounds added in the last ${FUNDING_SOURCE_URL_GRACE_DAYS}d cite a source URL.` };
}

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

  // Each run reflects the CURRENT state: close the previous composite alert
  // (its name lists the check ids that failed last time) before raising a
  // fresh one, so a passing run leaves nothing open in the admin view.
  await resolveFreshnessAlertsByPrefix('content-accuracy:');

  if (failed.length > 0) {
    try {
      // Reuse sendFreshnessAlert's persistence + admin-email plumbing for a
      // single summary alert rather than building a parallel notification
      // path. jobName carries the failing check ids so the email/DB record
      // identifies exactly what needs attention; lastRunAt is passed as
      // null (severity: critical) since this represents a content-accuracy
      // fault detected right now, not a missed cron run.
      const jobName = `content-accuracy: ${failed.map((f) => f.id).join(', ')}`;
      // Housekeeping failures (an article waiting for review, a slow table)
      // are warnings; anything else is a live accuracy fault (2026-09-11).
      const HOUSEKEEPING = new Set(['stuck-transitional-rows', 'table-pipeline-liveness', 'qa-smoke-ran', 'qa-tycoon-ran']);
      const severity = failed.every((x) => HOUSEKEEPING.has(x.id)) ? 'warning' : 'critical';
      const detail = failed.map((x) => `${x.id}: ${x.detail}`).join(' | ');
      await sendFreshnessAlert(jobName, null, 1440, { severity, detail });
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

// ---------------------------------------------------------------------------
// Federal awards
// ---------------------------------------------------------------------------

/**
 * The federal-award pipeline must be visibly working, not merely quiet.
 *
 * funding-feeds-alive already watches the RUN ledger for this source, which
 * catches "never ran", "ran and failed" and "ran, wrote nothing, collected
 * HTTP errors". This check watches the TABLE, which is a different failure:
 * a sweep can run green forever while attributing nothing, or while writing
 * rows a buyer cannot open.
 *
 * Three conditions, each one a refund event if it goes unnoticed on a dataset
 * sold to investors:
 *   - the roster is being swept at all (FederalAwardCoverage is not empty and
 *     is not months stale);
 *   - awards exist and at least one company has one;
 *   - every stored award carries the usaspending.gov URL it was read from.
 */
async function checkFederalAwardsUsable(): Promise<AccuracyCheckOutcome> {
  const problems: string[] = [];

  const [coverageRows, searchedRows, newestSweep, awards, attributed, unsourced] =
    await Promise.all([
      prisma.federalAwardCoverage.count(),
      prisma.federalAwardCoverage.count({ where: { status: 'searched' } }),
      prisma.federalAwardCoverage.findFirst({
        orderBy: { searchedAt: 'desc' },
        select: { searchedAt: true },
      }),
      prisma.federalAward.count(),
      prisma.federalAward.count({ where: { companyId: { not: null } } }),
      prisma.federalAward.count({ where: { OR: [{ sourceUrl: '' }] } }),
    ]);

  if (coverageRows === 0) {
    return {
      ok: false,
      detail:
        'FederalAwardCoverage is EMPTY — the USAspending sweep has never attributed a single company. Run /api/cron/gov-awards-sync.',
    };
  }
  if (newestSweep) {
    const ageDays = (Date.now() - newestSweep.searchedAt.getTime()) / MS_PER_DAY;
    if (ageDays > 45) {
      problems.push(
        `No company has been swept against USAspending in ${Math.round(ageDays)}d (coverage rows go stale after 30d by policy).`,
      );
    }
  }
  if (awards === 0) {
    problems.push(
      `FederalAward is EMPTY while ${searchedRows} companies are recorded as searched — the matcher is attributing nothing.`,
    );
  }
  if (awards > 0 && attributed === 0) {
    problems.push(`${awards} FederalAward rows exist but none carry a companyId.`);
  }
  if (unsourced > 0) {
    problems.push(
      `${unsourced} FederalAward rows carry no source URL — a row an investor cannot open is a row we cannot defend.`,
    );
  }

  if (problems.length > 0) return { ok: false, detail: problems.join(' | ') };
  return {
    ok: true,
    detail: `${attributed} attributed federal awards across ${searchedRows} swept companies; every row cites its usaspending.gov record.`,
  };
}


// ---------------------------------------------------------------------------
// SEC-derived investor signals
// ---------------------------------------------------------------------------

/**
 * How stale the insider sweep may be before it is a failure. The cron runs
 * nightly; three days allows for one missed night and a redeploy.
 */
const INSIDER_MAX_RUN_AGE_DAYS = 3;

/**
 * The SEC insider pipeline must be visibly working, not merely quiet.
 *
 * This is the failure the whole design is built against: two FCC fetchers sat
 * dead for weeks behind a swallowed 403, and the only symptom anybody saw was
 * an empty tab. A dataset sold to investors cannot fail that way, so three
 * different kinds of dead are separated here:
 *
 *   RUN LEDGER (DataSourceRun, src/lib/funding/provenance.ts)
 *     - never ran           -> no row for "sec-insider" at all;
 *     - ran and failed      -> ok=false with the verbatim error;
 *     - killed mid-sweep    -> startedAt with no finishedAt;
 *     - ran, wrote nothing, collected HTTP errors -> finishRun marks ok=false.
 *   THE TABLES
 *     A sweep can run green forever while writing nothing usable, so the
 *     tables are checked too: transactions exist, they are still arriving,
 *     and the filing index is being refreshed.
 *   CITABILITY
 *     Every row we sell must be openable. A transaction or position with no
 *     filing URL cannot be defended to a buyer, so any such row fails the
 *     check outright rather than waiting for somebody to notice.
 *
 * A run that genuinely found no new filings stays green, which is the point.
 */
async function checkInsiderFeedsAlive(): Promise<AccuracyCheckOutcome> {
  const problems: string[] = [];

  const last = await prisma.dataSourceRun.findFirst({
    where: { source: 'sec-insider' },
    orderBy: { startedAt: 'desc' },
    select: {
      startedAt: true,
      finishedAt: true,
      ok: true,
      error: true,
      itemsWritten: true,
      httpErrors: true,
    },
  });

  if (!last) {
    return {
      ok: false,
      detail:
        'SEC insider sweep has NEVER run (no DataSourceRun row for "sec-insider"). Run /api/cron/insider-sync, or scripts/backfill-sec-insider.ts for a first full pass.',
    };
  }

  const runAgeDays = (Date.now() - last.startedAt.getTime()) / MS_PER_DAY;
  if (!last.finishedAt) {
    problems.push(
      `last run started ${runAgeDays.toFixed(1)}d ago and never finished (killed mid-sweep).`
    );
  } else if (!last.ok) {
    const why = (last.error ?? 'no error recorded').split(/\r?\n/)[0].slice(0, 200);
    problems.push(`last run FAILED (${why}); httpErrors=${last.httpErrors}.`);
  } else if (runAgeDays > INSIDER_MAX_RUN_AGE_DAYS) {
    problems.push(
      `last successful run ${Math.round(runAgeDays)}d ago (policy: < ${INSIDER_MAX_RUN_AGE_DAYS}d).`
    );
  }

  const [transactions, positions, filings, newestTransaction, newestFiling, unsourcedTx, unsourcedPos] =
    await Promise.all([
      prisma.insiderTransaction.count(),
      prisma.institutionalPosition.count(),
      prisma.issuerFiling.count(),
      prisma.insiderTransaction.findFirst({
        orderBy: { filingDate: 'desc' },
        select: { filingDate: true },
      }),
      prisma.issuerFiling.findFirst({
        orderBy: { filingDate: 'desc' },
        select: { filingDate: true },
      }),
      prisma.insiderTransaction.count({ where: { sourceUrl: '' } }),
      prisma.institutionalPosition.count({ where: { sourceUrl: '' } }),
    ]);

  if (transactions === 0) {
    problems.push(
      'InsiderTransaction is EMPTY — the Space Insider Activity release has nothing to compute from.'
    );
  }
  if (filings === 0) {
    problems.push('IssuerFiling is EMPTY — filing cadence cannot be computed.');
  }

  // A listed roster this size files something every few days. Three weeks of
  // silence across every tracked issuer is a pipeline fault, not a quiet market.
  if (newestFiling) {
    const ageDays = (Date.now() - newestFiling.filingDate.getTime()) / MS_PER_DAY;
    if (ageDays > 21) {
      problems.push(
        `newest indexed filing is ${Math.round(ageDays)}d old — the submissions sweep is not refreshing.`
      );
    }
  }
  // Form 4s arrive within two business days of a trade, so a 45-day gap across
  // the whole roster means we stopped parsing documents even if the index moved.
  if (newestTransaction) {
    const ageDays = (Date.now() - newestTransaction.filingDate.getTime()) / MS_PER_DAY;
    if (ageDays > 45) {
      problems.push(
        `newest Form 4 we hold was filed ${Math.round(ageDays)}d ago — ownership documents are not being parsed.`
      );
    }
  }

  if (unsourcedTx > 0 || unsourcedPos > 0) {
    problems.push(
      `${unsourcedTx + unsourcedPos} SEC row(s) carry no filing URL and cannot be checked by a reader.`
    );
  }

  if (problems.length > 0) {
    return { ok: false, detail: `SEC insider pipeline: ${problems.join(' | ')}` };
  }
  return {
    ok: true,
    detail: `${transactions} insider transactions, ${positions} 5%-holder rows and ${filings} indexed filings; last sweep ${runAgeDays.toFixed(1)}d ago (+${last.itemsWritten}); every row cites its filing.`,
  };
}

/**
 * The UK Companies House sweep must be alive, configured, and citable.
 *
 * This feed has a failure mode the SEC feeds do not: its credential lives only
 * in Railway, so an environment deployed before COMPANIES_HOUSE_API_KEY was
 * added runs the cron happily and resolves nothing. That is indistinguishable
 * from "no UK company changed" unless something checks, which is what the run
 * ledger and this function are for. syncUkRegistry deliberately throws on a
 * missing key so the run is recorded as FAILED rather than empty.
 *
 * Four ways to fail, all of them real:
 *   - never ran           -> no DataSourceRun row for "companies-house";
 *   - ran and failed      -> ok=false, with the verbatim error (a missing key
 *                            lands here, naming itself);
 *   - ran but the table is empty -> resolution is broken, not merely quiet;
 *   - rows exist that cite no register URL -> unverifiable, so unsellable.
 * A run that found no CHANGES stays green, which is the point.
 */
const UK_REGISTRY_MAX_AGE_DAYS = 9;

async function checkUkRegistryAlive(): Promise<AccuracyCheckOutcome> {
  const problems: string[] = [];

  const last = await prisma.dataSourceRun.findFirst({
    where: { source: 'companies-house' },
    orderBy: { startedAt: 'desc' },
    select: {
      startedAt: true,
      finishedAt: true,
      ok: true,
      error: true,
      itemsWritten: true,
      httpErrors: true,
    },
  });

  if (!last) {
    return {
      ok: false,
      detail:
        'UK Companies House: has never run (no DataSourceRun row for "companies-house"). ' +
        'Run /api/cron/uk-registry-sync, or scripts/backfill-companies-house.ts for a first pass.',
    };
  }

  const runAgeDays = (Date.now() - last.startedAt.getTime()) / MS_PER_DAY;
  if (!last.finishedAt) {
    problems.push(
      `last run started ${runAgeDays.toFixed(1)}d ago and never finished (killed mid-sweep).`
    );
  } else if (!last.ok) {
    const why = (last.error ?? 'no error recorded').split(/\r?\n/)[0].slice(0, 200);
    problems.push(`last run FAILED (${why}); httpErrors=${last.httpErrors}.`);
  } else if (runAgeDays > UK_REGISTRY_MAX_AGE_DAYS) {
    problems.push(
      `last successful run ${Math.round(runAgeDays)}d ago (policy: < ${UK_REGISTRY_MAX_AGE_DAYS}d).`
    );
  }

  const [registrations, unsourced, officers, statusEvents] = await Promise.all([
    prisma.ukCompanyRegistration.count(),
    prisma.ukCompanyRegistration.count({ where: { sourceUrl: '' } }),
    prisma.ukCompanyOfficer.count(),
    prisma.ukCompanyStatusEvent.count(),
  ]);

  if (registrations === 0) {
    problems.push(
      'UkCompanyRegistration is EMPTY — no UK company has resolved to a company number at all.'
    );
  }
  if (unsourced > 0) {
    problems.push(
      `${unsourced} registration row(s) carry no register URL and cannot be checked by a reader.`
    );
  }

  if (problems.length > 0) {
    return { ok: false, detail: `UK Companies House: ${problems.join(' | ')}` };
  }
  return {
    ok: true,
    detail:
      `${registrations} UK registrations, ${officers} officers and ${statusEvents} dated ` +
      `register events; last sweep ${runAgeDays.toFixed(1)}d ago (+${last.itemsWritten}); ` +
      'every row cites the register.',
  };
}
