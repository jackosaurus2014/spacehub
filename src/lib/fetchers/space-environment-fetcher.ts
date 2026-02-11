/**
 * Space Environment daily fetcher
 * Comprehensive daily refresh of NOAA SWPC data + new datasets
 */

import { upsertContent } from '@/lib/dynamic-content';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';

const swpcBreaker = createCircuitBreaker('space-env-daily', {
  failureThreshold: 3,
  resetTimeout: 300000,
});

/**
 * Fetch NOAA 27-day space weather outlook
 * Text-based forecast of solar activity and geomagnetic conditions
 */
export async function fetchAndStore27DayOutlook(): Promise<number> {
  return swpcBreaker.execute(async () => {
    const response = await fetch(
      'https://services.swpc.noaa.gov/text/27-day-outlook.txt',
      {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`NOAA 27-day outlook error: ${response.status}`);
    }

    const text = await response.text();

    // Parse the text table into structured data
    const lines = text.split('\n').filter((l) => l.trim());
    const dataLines: Array<{
      date: string;
      radioFlux: string;
      geomagActivity: string;
      geomagIndex: string;
    }> = [];

    let inDataSection = false;
    for (const line of lines) {
      // Data lines start with a date pattern (e.g., "2026 Feb 10")
      if (/^\d{4}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/.test(line)) {
        inDataSection = true;
        const parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 3) {
          dataLines.push({
            date: parts[0],
            radioFlux: parts[1] || '',
            geomagActivity: parts[2] || '',
            geomagIndex: parts[3] || '',
          });
        }
      } else if (inDataSection && line.trim() === '') {
        break; // End of data section
      }
    }

    await upsertContent(
      'space-environment:27-day-outlook',
      'space-environment',
      '27-day-outlook',
      {
        rawText: text,
        forecast: dataLines,
        fetchedAt: new Date().toISOString(),
        dayCount: dataLines.length,
      },
      { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/text/27-day-outlook.txt' }
    );

    logger.info('27-day outlook fetch complete', { days: dataLines.length });
    return 1;
  }, 0);
}

/**
 * Fetch NOAA solar event probabilities
 * Daily probability forecasts for flares, proton events, and geomagnetic storms
 */
export async function fetchAndStoreSolarProbabilities(): Promise<number> {
  return swpcBreaker.execute(async () => {
    const response = await fetch(
      'https://services.swpc.noaa.gov/json/solar_probabilities.json',
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`NOAA solar probabilities error: ${response.status}`);
    }

    const data = await response.json();

    // Data is an array of probability entries
    const probabilities = Array.isArray(data) ? data : [];

    await upsertContent(
      'space-environment:solar-probabilities',
      'space-environment',
      'solar-probabilities',
      {
        probabilities,
        fetchedAt: new Date().toISOString(),
        count: probabilities.length,
      },
      { sourceType: 'api', sourceUrl: 'https://services.swpc.noaa.gov/json/solar_probabilities.json' }
    );

    logger.info('Solar probabilities fetch complete', { count: probabilities.length });
    return 1;
  }, 0);
}

/**
 * Orchestrator: comprehensive daily space environment refresh
 * Re-runs the full NOAA SWPC + DONKI sweep plus new daily-only datasets
 */
export async function refreshSpaceEnvironmentDaily(): Promise<{
  swpc: number;
  donki: number;
  outlook: number;
  probabilities: number;
  total: number;
}> {
  // Import existing fetchers from module-api-fetchers
  const { fetchAndStoreEnhancedSpaceWeather, fetchAndStoreDonkiEnhanced } =
    await import('@/lib/module-api-fetchers');

  // Run the full NOAA SWPC sweep (14 datasets)
  const swpc = await fetchAndStoreEnhancedSpaceWeather();

  // Run the DONKI sweep (CMEs, flares, etc.)
  const donki = await fetchAndStoreDonkiEnhanced();

  // Fetch new daily-only datasets
  const outlook = await fetchAndStore27DayOutlook();
  const probabilities = await fetchAndStoreSolarProbabilities();

  const total = swpc + donki + outlook + probabilities;

  logger.info('Space environment daily refresh complete', {
    swpc,
    donki,
    outlook,
    probabilities,
    total,
  });

  return { swpc, donki, outlook, probabilities, total };
}
