import cron from 'node-cron';
import { logger } from './logger';
import { sendFreshnessAlert, resolveFreshnessAlert } from './freshness-alerts';

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
  { schedule: '0 */4 * * *',   path: '/api/podcasts',                       label: 'podcast-feed-refresh',       maxStaleMinutes: 360 },

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
  { schedule: '0 5 * * *',     path: '/api/refresh?type=business-opportunities',  label: 'business-opportunities',  maxStaleMinutes: 1560 },
  { schedule: '30 5 * * *',    path: '/api/refresh?type=regulation-explainers',   label: 'regulation-explainers',   maxStaleMinutes: 1560 },
  { schedule: '0 6 * * *',     path: '/api/refresh?type=space-defense',     label: 'space-defense-refresh',      maxStaleMinutes: 1560 },
  { schedule: '0 7 * * *',     path: '/api/ai-insights/generate',           label: 'ai-insights-retry',          maxStaleMinutes: 1560 },
  { schedule: '30 7 * * *',    path: '/api/refresh?type=module-news',       label: 'module-news-compilation',    maxStaleMinutes: 1560 },
  { schedule: '0 8 * * *',     path: '/api/refresh?type=watchlist-alerts',  label: 'watchlist-alerts',           maxStaleMinutes: 1560 },
  { schedule: '30 8 * * *',    path: '/api/refresh?type=commodity-prices',  label: 'commodity-price-update',     maxStaleMinutes: 1560 },
  { schedule: '0 9 * * *',     path: '/api/funding-opportunities',          label: 'funding-opportunities-refresh', maxStaleMinutes: 1560 },
  { schedule: '0 11 * * *',    path: '/api/refresh?type=patents',           label: 'patents-refresh',            maxStaleMinutes: 1560 },
  { schedule: '0 12 * * *',    path: '/api/refresh?type=regulatory-feeds',  label: 'regulatory-feeds',           maxStaleMinutes: 1560 },
  { schedule: '0 14 * * *',    path: '/api/refresh?type=sec-filings',       label: 'sec-filings',                maxStaleMinutes: 1560 },

  // Weekly / twice-weekly
  { schedule: '0 10 * * 5',    path: '/api/newsletter/intelligence-brief?action=generate', label: 'weekly-intelligence-brief', maxStaleMinutes: 11520 },
  { schedule: '30 11 * * 6',   path: '/api/refresh?type=patents-market-intel',    label: 'patents-market-intel',       maxStaleMinutes: 11520 },
  { schedule: '0 9 * * 1',     path: '/api/refresh?type=company-digests',         label: 'company-digests',            maxStaleMinutes: 11520 },
  { schedule: '0 10 * * 0,3',  path: '/api/refresh?type=opportunities-analysis',  label: 'opportunities-analysis',     maxStaleMinutes: 7200 },
  { schedule: '0 6 * * 2',     path: '/api/refresh?type=market-commentary',       label: 'market-commentary-generation', maxStaleMinutes: 11520 },

  // Win-back emails for inactive users (daily at 10am UTC)
  { schedule: '0 10 * * *',   path: '/api/winback',                              label: 'winback-emails',             maxStaleMinutes: 1560 },

  // ─── New Real-Time Data Feed Integrations ────────────────────────────
  { schedule: '0 */6 * * *',  path: '/api/refresh?type=conjunction-alerts',       label: 'conjunction-alerts',          maxStaleMinutes: 480 },
  { schedule: '0 14 * * *',   path: '/api/refresh?type=executive-moves',          label: 'executive-moves-refresh',     maxStaleMinutes: 1560 },
  { schedule: '0 13 * * *',   path: '/api/refresh?type=funding-signals',          label: 'funding-signal-detection',    maxStaleMinutes: 1560 },
  { schedule: '0 */4 * * *',  path: '/api/refresh?type=sam-gov-active',           label: 'sam-gov-active-refresh',      maxStaleMinutes: 360 },
  { schedule: '0 11 * * *',   path: '/api/refresh?type=grants-gov',               label: 'grants-gov-refresh',          maxStaleMinutes: 1560 },
  { schedule: '0 16 * * 1',   path: '/api/refresh?type=sam-awards',               label: 'sam-awards-refresh',          maxStaleMinutes: 10080 },
  { schedule: '0 17 1 * *',   path: '/api/refresh?type=sam-entities',             label: 'sam-entities-refresh',        maxStaleMinutes: 43200 },

  // ─── Space Tycoon: Competitive Multiplayer Cron Jobs ─────────────────
  // Rival snapshots — every 4 hours (captures stats, updates rivalry scores)
  { schedule: '0 */4 * * *',  path: '/api/space-tycoon/rivals/snapshot',           label: 'tycoon-rival-snapshots',      maxStaleMinutes: 360 },
  // Contract bidding resolution — every 6 hours (resolves expired bids, generates new contracts)
  { schedule: '0 */6 * * *',  path: '/api/space-tycoon/bidding/resolve',           label: 'tycoon-bidding-resolve',      maxStaleMinutes: 480 },
  // Zone influence recalculation — daily at 1am UTC (decay, recalculate shares, resolve challenges)
  { schedule: '0 1 * * *',    path: '/api/space-tycoon/zones/update',              label: 'tycoon-zone-influence',       maxStaleMinutes: 1560 },
  // League week processing — Monday at 00:05 UTC (finalize brackets, promote/demote, create new week)
  { schedule: '5 0 * * 1',    path: '/api/space-tycoon/leagues/process-week',      label: 'tycoon-league-processing',    maxStaleMinutes: 11520 },
  // Alliance deep system processing — every 2 hours (activity, streaks, power score, research/project completion, perk expiry)
  { schedule: '0 */2 * * *',  path: '/api/space-tycoon/alliance-cron',             label: 'tycoon-alliance-processing',  maxStaleMinutes: 180 },
  // Market NPC restocking — every hour (gradually replenishes supply toward baseline)
  { schedule: '0 * * * *',    path: '/api/space-tycoon/market/restock',             label: 'tycoon-market-restock',       maxStaleMinutes: 120 },
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

      // Grace period after startup — don't flag jobs as stale before they've
      // had a chance to run naturally (wait at least maxStaleMinutes)
      const startTime = schedulerStartTime || now;
      if ((now - startTime) < staleThresholdMs) continue;

      if (!isStale) continue;

      staleCount++;
      logger.warn(`Cron watchdog: [${label}] is stale`, {
        lastSuccessAt: status.lastSuccessAt ? new Date(status.lastSuccessAt).toISOString() : 'never',
        maxStaleMinutes: status.maxStaleMinutes,
        consecutiveFailures: status.consecutiveFailures,
      });

      // Fire a freshness alert (persists to DB, optionally emails admin)
      await sendFreshnessAlert(label, status.lastSuccessAt, status.maxStaleMinutes);

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

  // Start the staleness watchdog
  startWatchdog();

  logger.info('Cron scheduler started', {
    jobCount: CRON_JOBS.length,
    jobs: CRON_JOBS.map(j => `${j.label}: ${j.schedule}`),
  });
}
