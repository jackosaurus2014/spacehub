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
  // News + events fetch — every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    triggerEndpoint('/api/refresh?type=news', 'news-fetch');
  });

  // Daily full data refresh + newsletter digest — midnight UTC
  cron.schedule('0 0 * * *', () => {
    triggerEndpoint('/api/refresh?type=daily', 'daily-refresh');
  });

  // AI Insights generation — 1:00 AM UTC (after fresh news is available)
  cron.schedule('0 1 * * *', () => {
    triggerEndpoint('/api/ai-insights/generate', 'ai-insights');
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

  // Staleness cleanup — 3:00 AM UTC (expire old content, prune logs)
  cron.schedule('0 3 * * *', () => {
    triggerEndpoint('/api/refresh/cleanup', 'staleness-cleanup');
  });

  // Live stream matching — every 30 minutes
  // Matches upcoming SpaceEvents to YouTube provider channels
  cron.schedule('*/30 * * * *', () => {
    triggerEndpoint('/api/refresh?type=live-streams', 'live-stream-check');
  });

  logger.info('Cron scheduler started', {
    jobs: [
      'news-fetch: every 5 minutes',
      'daily-refresh: midnight UTC',
      'ai-insights: 1:00 AM UTC',
      'external-api-refresh: every 4 hours',
      'space-weather-refresh: every 30 minutes',
      'ai-data-research: 2:00 AM UTC',
      'staleness-cleanup: 3:00 AM UTC',
      'live-stream-check: every 30 minutes',
    ],
  });
}
