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
  // News fetch — every 15 minutes
  cron.schedule('*/15 * * * *', () => {
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

  logger.info('Cron scheduler started', {
    jobs: [
      'news-fetch: every 15 minutes',
      'daily-refresh: midnight UTC',
      'ai-insights: 1:00 AM UTC',
    ],
  });
}
