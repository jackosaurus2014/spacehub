import cron from 'node-cron';
import { logger } from './logger';
import { sendFreshnessAlert, resolveFreshnessAlert } from './freshness-alerts';
import { pingSearchEnginesOnDeploy } from './deploy-ping';

import { BASE_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CronJobDef {
  schedule: string;
  path: string;
  label: string;
  maxStaleMinutes: number;
}

interface CronJobStatus {
  label: string;
  path: string;
  schedule: string;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  totalRuns: number;
  totalFailures: number;
  maxStaleMinutes: number;
}

// ---------------------------------------------------------------------------
// Job definitions (data-driven)
// ---------------------------------------------------------------------------

const CRON_JOBS: CronJobDef[] = [
  // High-frequency
  { schedule: '*/5 * * * *',   path: '/api/refresh?type=news',              label: 'news-fetch',                 maxStaleMinutes: 20 },
  { schedule: '*/15 * * * *',  path: '/api/refresh?type=events',            label: 'events-fetch',               maxStaleMinutes: 45 },
  { schedule: '*/15 * * * *',  path: '/api/refresh?type=realtime',          label: 'realtime-refresh',           maxStaleMinutes: 45 },
  { schedule: '*/30 * * * *',  path: '/api/refresh?type=space-weather',     label: 'space-weather-refresh',      maxStaleMinutes: 90 },
  { schedule: '*/30 * * * *',  path: '/api/refresh?type=live-streams',      label: 'live-stream-check',          maxStaleMinutes: 90 },

  // Livestream detection
  { schedule: '*/5 * * * *',   path: '/api/livestreams',                    label: 'livestream-check',           maxStaleMinutes: 20 },

  // SpaceX / EONET / Podcasts
  { schedule: '*/30 * * * *',  path: '/api/spacex',                         label: 'spacex-data-refresh',        maxStaleMinutes: 90 },
  { schedule: '0 */2 * * *',   path: '/api/eonet',                          label: 'eonet-events-refresh',       maxStaleMinutes: 300 },
  // Was pointed at GET /api/podcasts (a read-only directory listing — no-op,
  // synced nothing). Now hits the real sync route, which upserts episodes
  // for the N stalest podcasts each run. See src/lib/podcast-sync.ts.
  { schedule: '0 */4 * * *',   path: '/api/cron/podcasts-sync',             label: 'podcasts-sync',              maxStaleMinutes: 360 },

  // Medium-frequency (every 4 hours)
  { schedule: '0 */4 * * *',   path: '/api/refresh?type=blogs',             label: 'blogs-fetch',                maxStaleMinutes: 360 },
  { schedule: '0 */4 * * *',   path: '/api/refresh?type=external-apis',     label: 'external-api-refresh',       maxStaleMinutes: 360 },

  // Daily (data refresh only — newsletter sends every 3 days)
  { schedule: '0 0 * * *',     path: '/api/refresh?type=daily',             label: 'daily-refresh',              maxStaleMinutes: 1560 },
  // Newsletter digest — every 3 days (Mon/Thu at 8am UTC)
  { schedule: '0 8 * * 1,4',   path: '/api/newsletter/send-digest',         label: 'newsletter-digest',          maxStaleMinutes: 5760 },
  { schedule: '0 1 * * *',     path: '/api/ai-insights/generate',           label: 'ai-insights',                maxStaleMinutes: 1560 },
  { schedule: '0 2 * * *',     path: '/api/refresh?type=ai-research',       label: 'ai-data-research',           maxStaleMinutes: 1560 },
  { schedule: '0 3 * * *',     path: '/api/refresh/cleanup',                label: 'staleness-cleanup',          maxStaleMinutes: 1560 },
  { schedule: '0 4 * * *',     path: '/api/refresh?type=compliance-refresh', label: 'compliance-refresh',        maxStaleMinutes: 1560 },
  { schedule: '30 4 * * *',    path: '/api/refresh?type=space-environment-daily', label: 'space-environment-daily', maxStaleMinutes: 1560 },
  // 'business-opportunities' cron removed (2026-08-14 orphaned-pipeline
  // cleanup): it wrote to DynamicContent module 'business-opportunities'
  // (contentKeys sam-gov-all + sbir-sttr), which has zero readers — the
  // /business-opportunities page reads the BusinessOpportunity Prisma
  // model via /api/opportunities instead. See report for why the
  // underlying fetcher file (src/lib/fetchers/business-opportunities-fetcher.ts)
  // and its route.ts call sites were left in place rather than deleted.
  { schedule: '30 5 * * *',    path: '/api/refresh?type=regulation-explainers',   label: 'regulation-explainers',   maxStaleMinutes: 1560 },
  { schedule: '0 6 * * *',     path: '/api/refresh?type=space-defense',     label: 'space-defense-refresh',      maxStaleMinutes: 1560 },
  { schedule: '0 7 * * *',     path: '/api/ai-insights/generate',           label: 'ai-insights-retry',          maxStaleMinutes: 1560 },
  { schedule: '15 7 * * *',    path: '/api/cron/job-alerts',                label: 'job-alerts',                 maxStaleMinutes: 1560 },
  { schedule: '45 7 * * *',    path: '/api/cron/hiring-snapshot',           label: 'hiring-snapshot',            maxStaleMinutes: 1560 },
  { schedule: '0 13 * * 3',    path: '/api/cron/whos-hiring-post',          label: 'whos-hiring-post',           maxStaleMinutes: 11520 },
  { schedule: '30 7 * * *',    path: '/api/refresh?type=module-news',       label: 'module-news-compilation',    maxStaleMinutes: 1560 },
  { schedule: '0 8 * * *',     path: '/api/refresh?type=watchlist-alerts',  label: 'watchlist-alerts',           maxStaleMinutes: 1560 },
  // Regulatory Wave C — per-user regulatory alert emails for Pro users on the
  // 'immediate' frequency ("within the hour"). Daily-frequency users ride the
  // watchlist-alerts branch above (08:00 UTC). Offset to :20 so it interleaves
  // with the :00/:15/:30 hourly game jobs. /api/cron/ prefix is already in the
  // middleware CSRF cron allowlist.
  { schedule: '20 * * * *',    path: '/api/cron/regulatory-alerts',         label: 'regulatory-alerts-immediate', maxStaleMinutes: 180 },
  { schedule: '30 8 * * *',    path: '/api/refresh?type=commodity-prices',  label: 'commodity-price-update',     maxStaleMinutes: 1560 },
  { schedule: '0 9 * * *',     path: '/api/funding-opportunities',          label: 'funding-opportunities-refresh', maxStaleMinutes: 1560 },
  { schedule: '0 11 * * *',    path: '/api/refresh?type=patents',           label: 'patents-refresh',            maxStaleMinutes: 1560 },
  { schedule: '0 12 * * *',    path: '/api/refresh?type=regulatory-feeds',  label: 'regulatory-feeds',           maxStaleMinutes: 1560 },
  // Radar rule explainers — plain-English AI explainers for significant
  // RegulatoryAction rows (max 2/day, fact-check-gated). Runs 45 min after
  // the regulatory-feeds refresh so the day's new documents are in the pool.
  { schedule: '45 12 * * *',   path: '/api/cron/radar-explainers',          label: 'radar-explainers',           maxStaleMinutes: 1560 },
  { schedule: '0 14 * * *',    path: '/api/refresh?type=sec-filings',       label: 'sec-filings',                maxStaleMinutes: 1560 },
  // Daily stock-price/market-cap sync for public CompanyProfile rows (fixes
  // the stock-price split-brain vs. /api/stocks). Weekdays, after US market
  // close. Generous maxStaleMinutes tolerates the Fri-close -> Mon-close gap.
  { schedule: '30 21 * * 1-5', path: '/api/cron/stock-sync',                label: 'stock-sync',                 maxStaleMinutes: 4320 },
  // Content-accuracy sentinel — daily checklist guarding against stale/past-dated
  // "current" content (featured mission dates, countdown widgets, curated as-of
  // stamps, ATS/news/AI pipeline liveness). See src/lib/content-accuracy.ts.
  { schedule: '0 12 * * *',    path: '/api/cron/content-accuracy',          label: 'content-accuracy',           maxStaleMinutes: 1560 },

  // Weekly / twice-weekly
  { schedule: '0 9 * * 5',     path: '/api/newsletter/send-weekly-digest',                 label: 'weekly-digest-email',        maxStaleMinutes: 11520 },
  { schedule: '0 10 * * 5',    path: '/api/newsletter/intelligence-brief?action=generate', label: 'weekly-intelligence-brief', maxStaleMinutes: 11520 },
  { schedule: '30 11 * * 6',   path: '/api/refresh?type=patents-market-intel',    label: 'patents-market-intel',       maxStaleMinutes: 11520 },
  { schedule: '0 9 * * 1',     path: '/api/refresh?type=company-digests',         label: 'company-digests',            maxStaleMinutes: 11520 },
  // 'opportunities-analysis' cron removed (2026-08-14 data-integrity fix):
  // it called runAIAnalysis() to fabricate speculative BusinessOpportunity
  // rows (sourceType 'ai_generated', e.g. "Orbital Bio-Enhancement Clinics")
  // that sat mixed in with real sam_gov/news_analysis intelligence on
  // /business-opportunities with fabricated-precision valuations and no
  // disclosure. Founder decision: retire AI-generated opportunities
  // entirely rather than badge them. The 91 existing ai_generated rows
  // were archived in prod; getOpportunities()/getOpportunityStats() in
  // src/lib/opportunities-data.ts now hard-exclude sourceType
  // 'ai_generated' regardless of status. The manual trigger
  // (POST /api/opportunities/analyze) is also disabled — see that route.
  { schedule: '0 6 * * 2',     path: '/api/refresh?type=market-commentary',       label: 'market-commentary-generation', maxStaleMinutes: 11520 },

  // Win-back emails for inactive users (daily at 10am UTC)
  { schedule: '0 10 * * *',   path: '/api/winback',                              label: 'winback-emails',             maxStaleMinutes: 1560 },

  // Saved-search digest — daily at 11:15 UTC (re-runs every saved global
  // search, fires in-app notifications + a per-user digest email)
  { schedule: '15 11 * * *',  path: '/api/cron/saved-searches-digest',           label: 'saved-searches-digest',      maxStaleMinutes: 1560 },

  // Welcome drip sequence — daily at 10:30am UTC (sends next email to users within 14-day window)
  { schedule: '30 10 * * *',  path: '/api/drip/process',                         label: 'welcome-drip-sequence',      maxStaleMinutes: 1560 },
  // Mission debrief drafts — daily at 9:30am UTC (creates placeholder drafts for completed launches)
  { schedule: '30 9 * * *',   path: '/api/cron/mission-debriefs',                label: 'mission-debriefs-drafts',    maxStaleMinutes: 1560 },
  // Trial drip — daily at 10:45am UTC (mid-trial + final-day emails for users on a 3-day Pro trial)
  { schedule: '45 10 * * *',  path: '/api/cron/trials-expiring',                 label: 'trial-drip-emails',          maxStaleMinutes: 1560 },
  // Satellite pass alerts — every 10 minutes (fires push when ISS/etc. is about to be visible)
  { schedule: '*/10 * * * *', path: '/api/cron/satellite-pass-alerts',           label: 'satellite-pass-alerts',      maxStaleMinutes: 60 },
  // Nurture email sequence — daily at 11am UTC (7-step sequence for free-tier users)
  { schedule: '0 11 * * *',   path: '/api/nurture/process',                      label: 'nurture-email-sequence',     maxStaleMinutes: 1560 },
  // Forum digest — weekly on Sundays at 9am UTC
  { schedule: '0 9 * * 0',    path: '/api/newsletter/forum-digest',              label: 'forum-digest-email',         maxStaleMinutes: 11520 },
  // State of the Space Economy — weekly data brief, Mondays 1pm UTC (no AI, pure DB aggregation)
  { schedule: '0 13 * * 1',   path: '/api/cron/weekly-economy-post',             label: 'weekly-economy-post',        maxStaleMinutes: 11520 },
  // Regulatory Radar — weekly regulatory brief, Mondays 14:30 UTC (no AI, pure DB aggregation over RegulatoryAction)
  { schedule: '30 14 * * 1',  path: '/api/cron/weekly-regulatory-post',          label: 'weekly-regulatory-post',     maxStaleMinutes: 11520 },
  // This Week in Launches — weekly retention email, Mondays 12:30 UTC (SpaceEvent-sourced, idempotent per calendar week)
  { schedule: '30 12 * * 1',  path: '/api/cron/launch-week-email',               label: 'launch-week-email',          maxStaleMinutes: 11520 },
  // Weekly CEO brief — founder ops email, Mondays 13:37 UTC (growth vs 10k-MAU
  // goal + sentinel + cron-fleet health + business signals; idempotent per week)
  { schedule: '37 13 * * 1',  path: '/api/cron/ceo-brief',                       label: 'ceo-brief',                  maxStaleMinutes: 11520 },

  // ─── New Real-Time Data Feed Integrations ────────────────────────────
  { schedule: '0 */6 * * *',  path: '/api/refresh?type=conjunction-alerts',       label: 'conjunction-alerts',          maxStaleMinutes: 480 },
  { schedule: '0 14 * * *',   path: '/api/refresh?type=executive-moves',          label: 'executive-moves-refresh',     maxStaleMinutes: 1560 },
  { schedule: '0 13 * * *',   path: '/api/refresh?type=funding-signals',          label: 'funding-signal-detection',    maxStaleMinutes: 1560 },
  // 'sam-gov-active-refresh' cron removed (2026-08-14 orphaned-pipeline
  // cleanup): it only wrote to the same orphaned DynamicContent key as the
  // 'business-opportunities' cron above (business-opportunities:sam-gov-all).
  { schedule: '0 11 * * *',   path: '/api/refresh?type=grants-gov',               label: 'grants-gov-refresh',          maxStaleMinutes: 1560 },
  { schedule: '0 16 * * 1',   path: '/api/refresh?type=sam-awards',               label: 'sam-awards-refresh',          maxStaleMinutes: 10080 },
  { schedule: '0 17 1 * *',   path: '/api/refresh?type=sam-entities',             label: 'sam-entities-refresh',        maxStaleMinutes: 43200 },
  { schedule: '30 6 * * *',   path: '/api/refresh?type=ats-jobs',                 label: 'ats-jobs-refresh',            maxStaleMinutes: 1560 },

  // ─── Previously-orphaned fetch endpoints (existed but were never scheduled) ──
  { schedule: '0 5 * * *',    path: '/api/launch-windows/fetch',                  label: 'launch-windows-fetch',        maxStaleMinutes: 1560 },
  { schedule: '0 */6 * * *',  path: '/api/debris-monitor/fetch',                  label: 'debris-monitor-fetch',        maxStaleMinutes: 480 },
  { schedule: '0 */6 * * *',  path: '/api/solar-flares/fetch',                    label: 'solar-flares-fetch',          maxStaleMinutes: 480 },
  // SAM.gov procurement opportunities — fetcher existed for months but was
  // never scheduled (freshness-audit finding).
  { schedule: '30 13 * * *',  path: '/api/procurement/opportunities',             label: 'procurement-sam-refresh',     maxStaleMinutes: 1560 },

  // ─── Space Tycoon: Competitive Multiplayer Cron Jobs ─────────────────
  // Note: These are non-critical game jobs. Generous staleness thresholds to avoid alert spam.
  // They may fail gracefully when no active players/data exist.
  // Rival snapshots — every 4 hours (captures stats, updates rivalry scores)
  { schedule: '0 */4 * * *',  path: '/api/space-tycoon/rivals/snapshot',           label: 'tycoon-rival-snapshots',      maxStaleMinutes: 1440 },
  // Contract bidding resolution — every 6 hours (resolves expired bids, generates new contracts)
  { schedule: '0 */6 * * *',  path: '/api/space-tycoon/bidding/resolve',           label: 'tycoon-bidding-resolve',      maxStaleMinutes: 1440 },
  // Zone influence recalculation — daily at 1am UTC (decay, recalculate shares, resolve challenges)
  { schedule: '0 1 * * *',    path: '/api/space-tycoon/zones/update',              label: 'tycoon-zone-influence',       maxStaleMinutes: 2880 },
  // League week processing — Monday at 00:05 UTC (finalize brackets, promote/demote, create new week)
  { schedule: '5 0 * * 1',    path: '/api/space-tycoon/leagues/process-week',      label: 'tycoon-league-processing',    maxStaleMinutes: 11520 },
  // Alliance deep system processing — every 2 hours (activity, streaks, power score, research/project completion, perk expiry)
  { schedule: '0 */2 * * *',  path: '/api/space-tycoon/alliance-cron',             label: 'tycoon-alliance-processing',  maxStaleMinutes: 1440 },
  // Market NPC restocking — every hour (gradually replenishes supply toward baseline)
  { schedule: '0 * * * *',    path: '/api/space-tycoon/market/restock',             label: 'tycoon-market-restock',       maxStaleMinutes: 1440 },
  // Market mean reversion — hourly at :30 (audit Wave E / A5-ii: prices drift back
  // toward baseline via calculateIdleDecay; ~6.6h half-life ≈ one game-month)
  { schedule: '30 * * * *',   path: '/api/space-tycoon/market/mean-revert',         label: 'tycoon-market-mean-revert',   maxStaleMinutes: 1440 },
  // Finite demand pools — hourly at :15 (Economic PvP Wave E4, docs/
  // ECONOMY_PVP_2026-08.md §2.1/§E4: aggregates every synced profile's
  // buildings/services/ships into per-(location, category) demand pools,
  // EMA-smoothed on a 7-day horizon; offset so it interleaves with the :00
  // restock and :30 mean-revert)
  { schedule: '15 * * * *',   path: '/api/space-tycoon/demand-pools/update',        label: 'tycoon-demand-pools',         maxStaleMinutes: 1440 },
  // Labor market wage index — WEEKLY, Sundays 5am UTC (Economic PvP Wave E5,
  // docs/ECONOMY_PVP_2026-08.md §2.6/§E5: SESSION_DESIGN.md explicitly places
  // the wage index on the weekly loop, not the oversubscribed daily one).
  // Aggregates every synced profile's crew headcount + crew-housing built
  // server-wide into a wage index per crew type.
  { schedule: '0 5 * * 0',    path: '/api/space-tycoon/labor/update',              label: 'tycoon-labor-market',          maxStaleMinutes: 11520 },
  // Seasonal-event generation — daily at 6am UTC (4X Wave W3, closes audit C4:
  // no cron ever instantiated SeasonalEvent rows, so /seasons was a permanently
  // empty shell). Deterministic ~31-day season calendar — daily polling is far
  // more than sufficient to keep the current/next/previous rows in sync.
  { schedule: '0 6 * * *',    path: '/api/space-tycoon/seasons/cron',              label: 'tycoon-seasons-cron',          maxStaleMinutes: 2880 },
  // Prediction Exchange — weekly question generation (Mondays 6:30am UTC,
  // after the seasons cron) + a daily resolve pass that settles any question
  // past its resolvesAt gate. See src/lib/game/prediction-exchange.ts.
  { schedule: '30 6 * * 1',   path: '/api/cron/prediction-exchange?action=generate', label: 'tycoon-predictions-generate', maxStaleMinutes: 11520 },
  { schedule: '0 10 * * *',   path: '/api/cron/prediction-exchange?action=resolve',  label: 'tycoon-predictions-resolve',  maxStaleMinutes: 1560 },
  // Orbital-slot lease auctions — every 2 hours (Economic PvP Wave E7, docs/
  // ECONOMY_PVP_2026-08.md §E7/§5 item 5: recomputes server-aggregated
  // occupancy per ORBITAL_SLOT_POOLS, auto-opens auctions the moment a pool
  // crosses 85%, resolves closed auctions — burn + governor revenue share —
  // and expires spent leases. SESSION_DESIGN.md places slot auctions on the
  // weekly loop; this cadence just keeps the underlying occupancy/closing
  // checks fresh within that loop, same relationship bidding/resolve has to
  // the weekly contract cadence.
  { schedule: '0 */2 * * *',  path: '/api/space-tycoon/orbital-slots/resolve',      label: 'tycoon-orbital-slots',         maxStaleMinutes: 1440 },

  // Wave M6 (docs/MEANINGFUL_2026-08.md §M6): equity/takeover resolution —
  // deterministic tender-contest settlement, sell-side listing expiry,
  // monthly distress checks (game month = 6h real), and per-published-report
  // dividends. Tender offers live on the WEEKLY loop (7-day windows); this
  // cadence keeps closings settled within ~2h of their deadline. Registered
  // in middleware.ts cronPaths (the CSRF-for-new-cron gotcha).
  { schedule: '30 */2 * * *', path: '/api/space-tycoon/equity/resolve',             label: 'tycoon-equity-resolve',        maxStaleMinutes: 1440 },

  // AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md "E1 implementation"):
  // the Accord Chair certifier. The election lives on the MONTHLY loop (a
  // term is one real UTC calendar month, ballot closing at 00:00 UTC on the
  // 1st), so a 2-hourly idempotent settler certifies within ~2h of the
  // close and also keeps the contested-term row open for candidacies.
  // Deliberately offset from the equity settler above so the two never
  // contend. Registered in middleware.ts cronPaths (the CSRF-for-new-cron
  // gotcha).
  { schedule: '50 */2 * * *', path: '/api/space-tycoon/chair/resolve',              label: 'tycoon-chair-resolve',         maxStaleMinutes: 1440 },
  // AAA Program Round 2 (docs/AAA_PROGRAM_2026-08.md "Round 2"): the
  // systemic-crisis sealer. Seals cycles whose active window has closed and
  // MEASURES/PUBLISHES the world index for the current one, so the forecast
  // is on the register from the first hour of the forecast phase rather than
  // from the first player sync. Offset to :20 so it contends with neither
  // the equity settler (:30) nor the Chair certifier (:50). Registered in
  // middleware.ts cronPaths (the CSRF-for-new-cron gotcha).
  { schedule: '20 */2 * * *', path: '/api/space-tycoon/crisis/resolve',             label: 'tycoon-crisis-resolve',        maxStaleMinutes: 1440 },
];

// Critical jobs that get auto-recovered by the watchdog
const CRITICAL_JOBS = new Set([
  'news-fetch',
  'events-fetch',
  'blogs-fetch',
  'external-api-refresh',
  'space-weather-refresh',
  'daily-refresh',
  'ai-insights',
]);

// ---------------------------------------------------------------------------
// In-memory job tracker
// ---------------------------------------------------------------------------

const jobTracker = new Map<string, CronJobStatus>();
let schedulerStartTime: number | null = null;

// ---------------------------------------------------------------------------
// triggerEndpoint — with retry + backoff
// ---------------------------------------------------------------------------

async function triggerEndpoint(path: string, label: string, retries: number = 3): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cronSecret) {
    headers['Authorization'] = `Bearer ${cronSecret}`;
  }

  const tracker = jobTracker.get(label);
  if (tracker) {
    tracker.lastAttemptAt = Date.now();
    tracker.totalRuns++;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers,
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        logger.info(`Cron [${label}] completed`, { status: response.status, attempt: attempt + 1, results: data });
        if (tracker) {
          tracker.lastSuccessAt = Date.now();
          tracker.consecutiveFailures = 0;
          tracker.lastError = null;
        }
        // Resolve any outstanding freshness alert for this job
        resolveFreshnessAlert(label).catch(() => {
          // Best-effort — don't block the cron job result
        });
        return true;
      }

      // Non-OK response
      const body = await response.text().catch(() => '');
      const errorMsg = `HTTP ${response.status}: ${body.slice(0, 200)}`;
      logger.warn(`Cron [${label}] attempt ${attempt + 1}/${retries} failed`, { status: response.status, body: body.slice(0, 200) });

      if (tracker) {
        tracker.lastError = errorMsg;
      }

      // Don't retry 4xx (client errors) except 429 (rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        break;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Cron [${label}] attempt ${attempt + 1}/${retries} error`, { error: errorMsg });
      if (tracker) {
        tracker.lastError = errorMsg;
      }
    }

    // Exponential backoff: 2s, 4s, 8s
    if (attempt < retries - 1) {
      const backoffMs = Math.pow(2, attempt + 1) * 1000;
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  // All retries exhausted
  logger.error(`Cron [${label}] failed after ${retries} attempts`, { lastError: tracker?.lastError });
  if (tracker) {
    tracker.consecutiveFailures++;
    tracker.totalFailures++;
    tracker.lastFailureAt = Date.now();
  }
  return false;
}

// ---------------------------------------------------------------------------
// Staleness watchdog — runs every 10 minutes
// ---------------------------------------------------------------------------

// Track which jobs have already been alerted as stale (prevent repeat alerts)
const alertedStaleJobs = new Set<string>();

function startWatchdog() {
  cron.schedule('*/10 * * * *', async () => {
    const now = Date.now();
    let staleCount = 0;
    let recoveredCount = 0;

    const entries = Array.from(jobTracker.entries());
    for (const [label, status] of entries) {
      const lastSuccess = status.lastSuccessAt || 0;
      const staleThresholdMs = status.maxStaleMinutes * 60 * 1000;
      const isStale = (now - lastSuccess) > staleThresholdMs;

      // Grace period after startup — but ONLY when we have no real history
      // for the job. When lastSuccessAt was seeded from DataRefreshLog, the
      // staleness verdict is trustworthy immediately; gating it on scheduler
      // uptime meant frequent deploys reset the grace window forever and
      // once-daily jobs could silently starve for months.
      if (!status.lastSuccessAt) {
        const startTime = schedulerStartTime || now;
        if ((now - startTime) < staleThresholdMs * 2) continue;
      }

      if (!isStale) {
        // Job recovered — clear the alert dedup flag
        alertedStaleJobs.delete(label);
        continue;
      }

      staleCount++;

      // Only alert ONCE per stale episode (not every 10 minutes)
      if (!alertedStaleJobs.has(label)) {
        alertedStaleJobs.add(label);
        logger.warn(`Cron watchdog: [${label}] is stale`, {
          lastSuccessAt: status.lastSuccessAt ? new Date(status.lastSuccessAt).toISOString() : 'never',
          maxStaleMinutes: status.maxStaleMinutes,
          consecutiveFailures: status.consecutiveFailures,
        });

        // Fire a freshness alert (persists to DB, optionally emails admin)
        await sendFreshnessAlert(label, status.lastSuccessAt, status.maxStaleMinutes);
      }

      // Auto-recover critical jobs only (cap at 10 consecutive failures)
      if (CRITICAL_JOBS.has(label) && status.consecutiveFailures < 10) {
        logger.info(`Cron watchdog: auto-recovering [${label}]`);
        const success = await triggerEndpoint(status.path, label, 2);
        if (success) {
          recoveredCount++;
          // Mark the freshness alert as resolved now that the job succeeded
          await resolveFreshnessAlert(label);
        }
      }
    }

    if (staleCount > 0) {
      logger.warn(`Cron watchdog summary: ${staleCount} stale jobs, ${recoveredCount} recovered`);
    }
  });
}

// ---------------------------------------------------------------------------
// getCronJobStatus — exported for health endpoint
// ---------------------------------------------------------------------------

export function getCronJobStatus() {
  const now = Date.now();
  const jobs: Array<{
    label: string;
    schedule: string;
    lastSuccessAt: string | null;
    lastFailureAt: string | null;
    lastError: string | null;
    consecutiveFailures: number;
    totalRuns: number;
    totalFailures: number;
    isStale: boolean;
    staleAfterMinutes: number;
  }> = [];

  let healthy = 0;
  let stale = 0;
  let failing = 0;

  const entries = Array.from(jobTracker.values());
  for (const status of entries) {
    const lastSuccess = status.lastSuccessAt || 0;
    const staleThresholdMs = status.maxStaleMinutes * 60 * 1000;
    const startTime = schedulerStartTime || now;
    const pastGracePeriod = (now - startTime) > staleThresholdMs;
    const isStale = pastGracePeriod && (now - lastSuccess) > staleThresholdMs;

    if (isStale) stale++;
    else if (status.consecutiveFailures > 0) failing++;
    else healthy++;

    jobs.push({
      label: status.label,
      schedule: status.schedule,
      lastSuccessAt: status.lastSuccessAt ? new Date(status.lastSuccessAt).toISOString() : null,
      lastFailureAt: status.lastFailureAt ? new Date(status.lastFailureAt).toISOString() : null,
      lastError: status.lastError,
      consecutiveFailures: status.consecutiveFailures,
      totalRuns: status.totalRuns,
      totalFailures: status.totalFailures,
      isStale,
      staleAfterMinutes: status.maxStaleMinutes,
    });
  }

  return {
    schedulerUpSince: schedulerStartTime ? new Date(schedulerStartTime).toISOString() : null,
    uptimeMinutes: schedulerStartTime ? Math.floor((now - schedulerStartTime) / 60000) : null,
    jobs,
    summary: { total: jobs.length, healthy, stale, failing },
  };
}

// ---------------------------------------------------------------------------
// startCronJobs — entry point
// ---------------------------------------------------------------------------

/**
 * Best-effort: recover each job's real last-success time from DataRefreshLog
 * (matched by module === job label — jobs whose handlers log under a
 * different module name simply keep in-memory-only tracking).
 */
async function seedTrackerFromRefreshLog(): Promise<void> {
  const { default: prisma } = await import('@/lib/db');
  const labels = CRON_JOBS.map((j) => j.label);
  const rows = await prisma.dataRefreshLog.groupBy({
    by: ['module'],
    where: { module: { in: labels }, status: { in: ['success', 'partial'] } },
    _max: { createdAt: true },
  });
  let seeded = 0;
  for (const row of rows) {
    const tracker = jobTracker.get(row.module);
    const ts = row._max.createdAt?.getTime();
    if (tracker && ts && !tracker.lastSuccessAt) {
      tracker.lastSuccessAt = ts;
      seeded++;
    }
  }
  if (seeded > 0) logger.info(`Cron scheduler: seeded ${seeded} job trackers from DataRefreshLog`);
}

export function startCronJobs() {
  schedulerStartTime = Date.now();

  for (const job of CRON_JOBS) {
    // Register in tracker
    jobTracker.set(job.label, {
      label: job.label,
      path: job.path,
      schedule: job.schedule,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastError: null,
      consecutiveFailures: 0,
      totalRuns: 0,
      totalFailures: 0,
      maxStaleMinutes: job.maxStaleMinutes,
    });

    // Schedule with node-cron
    cron.schedule(job.schedule, () => {
      triggerEndpoint(job.path, job.label);
    });
  }

  // Seed lastSuccessAt from DataRefreshLog so watchdog history survives
  // deploy restarts. Without this, every deploy resets the in-memory tracker
  // and the watchdog's startup grace period (2x maxStaleMinutes) restarts —
  // with several deploys a day, a once-daily job could go stale for months
  // without ever being flagged or auto-recovered (this happened: daily-refresh
  // starved GovernmentContract/PolicyChange for 140-190 days).
  seedTrackerFromRefreshLog().catch((e) => {
    logger.warn('Cron scheduler: failed to seed tracker from DataRefreshLog', {
      error: e instanceof Error ? e.message : String(e),
    });
  });

  // Start the staleness watchdog
  startWatchdog();

  // Ping search engines on deploy (runs once per startup)
  pingSearchEnginesOnDeploy().catch(() => {
    // Best-effort — don't block scheduler startup
  });

  logger.info('Cron scheduler started', {
    jobCount: CRON_JOBS.length,
    jobs: CRON_JOBS.map(j => `${j.label}: ${j.schedule}`),
  });
}
