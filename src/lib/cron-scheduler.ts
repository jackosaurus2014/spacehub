import cron from 'node-cron';
import { logger } from './logger';

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function triggerEndpoint(path: string, label: string) {
  const cronSecret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (cronSecret) {
    headers['Authorization'] = `Bearer ${cronSecret}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error(`Cron [${label}] failed`, { status: response.status, body: body.slice(0, 200) });
    } else {
      const data = await response.json().catch(() => ({}));
      logger.info(`Cron [${label}] completed`, { status: response.status, results: data });
    }
  } catch (error) {
    logger.error(`Cron [${label}] error`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function startCronJobs() {
  // News articles fetch — every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    triggerEndpoint('/api/refresh?type=news', 'news-fetch');
  });

  // Launch/event data fetch — every 15 minutes
  // Separated from news to stay within Launch Library free tier rate limit (15 req/hr)
  cron.schedule('*/15 * * * *', () => {
    triggerEndpoint('/api/refresh?type=events', 'events-fetch');
  });

  // Blog/article fetch — every 4 hours
  // Fetches from 39 RSS blog sources (NASA, ESA, SpaceX, etc.)
  cron.schedule('0 */4 * * *', () => {
    triggerEndpoint('/api/refresh?type=blogs', 'blogs-fetch');
  });

  // Daily full data refresh + newsletter digest — midnight UTC
  cron.schedule('0 0 * * *', () => {
    triggerEndpoint('/api/refresh?type=daily', 'daily-refresh');
  });

  // AI Insights generation — 1:00 AM UTC (after fresh news is available)
  cron.schedule('0 1 * * *', () => {
    triggerEndpoint('/api/ai-insights/generate', 'ai-insights');
  });

  // AI Insights retry — 7:00 AM UTC (fallback if 1 AM run failed or had no content)
  cron.schedule('0 7 * * *', () => {
    triggerEndpoint('/api/ai-insights/generate', 'ai-insights-retry');
  });

  // External API data refresh — every 4 hours
  // Fetches from Open Notify, NASA NeoWs, CelesTrak, USAspending, USPTO,
  // NASA APOD, TechPort, JPL SBDB, NOAA SWPC, Finnhub, SAM.gov, FCC ECFS, Federal Register
  cron.schedule('0 */4 * * *', () => {
    triggerEndpoint('/api/refresh?type=external-apis', 'external-api-refresh');
  });

  // Space weather rapid refresh — every 30 minutes
  // Fetches critical Kp index, solar flux, alerts from NOAA SWPC JSON
  cron.schedule('*/30 * * * *', () => {
    triggerEndpoint('/api/refresh?type=space-weather', 'space-weather-refresh');
  });

  // AI data research — 2:00 AM UTC (verifies/updates module data via Claude)
  cron.schedule('0 2 * * *', () => {
    triggerEndpoint('/api/refresh?type=ai-research', 'ai-data-research');
  });

  // Space Defense refresh — 6:00 AM UTC daily
  // Fetches SAM.gov defense procurement + compiles defense news
  cron.schedule('0 6 * * *', () => {
    triggerEndpoint('/api/refresh?type=space-defense', 'space-defense-refresh');
  });

  // Staleness cleanup — 3:00 AM UTC (expire old content, prune logs)
  cron.schedule('0 3 * * *', () => {
    triggerEndpoint('/api/refresh/cleanup', 'staleness-cleanup');
  });

  // Regulatory feeds — noon UTC daily (FAA licenses + FCC space filings)
  cron.schedule('0 12 * * *', () => {
    triggerEndpoint('/api/refresh?type=regulatory-feeds', 'regulatory-feeds');
  });

  // SEC EDGAR filings — 2:00 PM UTC daily (10-K, 10-Q, 8-K for public space companies)
  cron.schedule('0 14 * * *', () => {
    triggerEndpoint('/api/refresh?type=sec-filings', 'sec-filings');
  });

  // Watchlist alerts — 8:00 AM UTC daily (digest for user-watched companies/searches)
  cron.schedule('0 8 * * *', () => {
    triggerEndpoint('/api/refresh?type=watchlist-alerts', 'watchlist-alerts');
  });

  // Live stream matching — every 30 minutes
  // Matches upcoming SpaceEvents to YouTube provider channels
  cron.schedule('*/30 * * * *', () => {
    triggerEndpoint('/api/refresh?type=live-streams', 'live-stream-check');
  });

  // Real-time data refresh — every 15 minutes
  // Fetches ISS position, DSN status, and other fast-changing data
  cron.schedule('*/15 * * * *', () => {
    triggerEndpoint('/api/refresh?type=realtime', 'realtime-refresh');
  });

  // Compliance refresh — 4:00 AM UTC daily
  // Legal RSS feeds, ITU filings, export control updates from Federal Register
  cron.schedule('0 4 * * *', () => {
    triggerEndpoint('/api/refresh?type=compliance-refresh', 'compliance-refresh');
  });

  // Space environment daily refresh — 4:30 AM UTC daily
  // Full NOAA SWPC sweep + DONKI + 27-day outlook + solar probabilities
  cron.schedule('30 4 * * *', () => {
    triggerEndpoint('/api/refresh?type=space-environment-daily', 'space-environment-daily');
  });

  // Business opportunities refresh — 5:00 AM UTC daily
  // Broad SAM.gov space procurement + SBIR/STTR solicitations
  cron.schedule('0 5 * * *', () => {
    triggerEndpoint('/api/refresh?type=business-opportunities', 'business-opportunities');
  });

  // Regulation explainers — 5:30 AM UTC daily
  // AI generates plain-English guides for proposed space regulations
  cron.schedule('30 5 * * *', () => {
    triggerEndpoint('/api/refresh?type=regulation-explainers', 'regulation-explainers');
  });

  // Company digests — 9:00 AM UTC weekly (Mondays)
  // AI summarizes weekly news per company profile
  cron.schedule('0 9 * * 1', () => {
    triggerEndpoint('/api/refresh?type=company-digests', 'company-digests');
  });

  // AI opportunities analysis — 10:00 AM UTC weekly (Wednesdays)
  // AI discovers new space business opportunities from recent trends
  cron.schedule('0 10 * * 3', () => {
    triggerEndpoint('/api/refresh?type=opportunities-analysis', 'opportunities-analysis');
  });

  logger.info('Cron scheduler started', {
    jobs: [
      'news-fetch: every 5 minutes',
      'events-fetch: every 15 minutes',
      'blogs-fetch: every 4 hours',
      'daily-refresh: midnight UTC',
      'ai-insights: 1:00 AM UTC',
      'ai-insights-retry: 7:00 AM UTC',
      'external-api-refresh: every 4 hours',
      'space-weather-refresh: every 30 minutes',
      'ai-data-research: 2:00 AM UTC',
      'staleness-cleanup: 3:00 AM UTC',
      'compliance-refresh: 4:00 AM UTC daily',
      'space-environment-daily: 4:30 AM UTC daily',
      'business-opportunities: 5:00 AM UTC daily',
      'regulation-explainers: 5:30 AM UTC daily',
      'space-defense-refresh: 6:00 AM UTC daily',
      'live-stream-check: every 30 minutes',
      'realtime-refresh: every 15 minutes',
      'watchlist-alerts: 8:00 AM UTC daily',
      'company-digests: 9:00 AM UTC weekly (Mon)',
      'opportunities-analysis: 10:00 AM UTC weekly (Wed)',
      'regulatory-feeds: noon UTC daily',
      'sec-filings: 2:00 PM UTC daily',
    ],
  });
}
