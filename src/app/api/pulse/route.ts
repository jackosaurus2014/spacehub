import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSpaceWeatherSummary, SpaceWeatherSummary } from '@/lib/noaa-fetcher';
import { apiCache, CacheTTL } from '@/lib/api-cache';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'pulse:summary';

interface PulseData {
  latestNews: {
    title: string;
    source: string;
    url: string;
    publishedAt: string;
  } | null;
  nextLaunch: {
    name: string;
    date: string;
    agency: string | null;
    location: string | null;
    status: string | null;
  } | null;
  marketStatus: {
    status: 'up' | 'down' | 'mixed' | 'unavailable';
    summary: string;
  };
  spaceWeather: {
    alertCount: number;
    severity: 'quiet' | 'minor' | 'moderate' | 'severe';
    summary: string;
  };
  activeSatellites: number;
  generatedAt: string;
}

/**
 * Derive a space weather severity from NOAA summary data.
 */
function deriveWeatherSeverity(summary: SpaceWeatherSummary): {
  alertCount: number;
  severity: 'quiet' | 'minor' | 'moderate' | 'severe';
  summaryText: string;
} {
  const recentFlares = summary.recentFlares || [];
  const recentStorms = summary.recentStorms || [];

  // Count significant events (last 48 hours)
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const recentSignificantFlares = recentFlares.filter((f) => {
    const time = new Date(f.peakTime).getTime();
    return time > cutoff && (f.classType.startsWith('M') || f.classType.startsWith('X'));
  });

  const recentSignificantStorms = recentStorms.filter((s) => {
    const time = new Date(s.startTime).getTime();
    const maxKp = Math.max(...(s.allKpIndex?.map((k) => k.kpIndex) || [0]));
    return time > cutoff && maxKp >= 5;
  });

  const alertCount = recentSignificantFlares.length + recentSignificantStorms.length;

  let severity: 'quiet' | 'minor' | 'moderate' | 'severe' = 'quiet';
  let summaryText = 'Space weather is quiet';

  if (recentSignificantFlares.some((f) => f.classType.startsWith('X'))) {
    severity = 'severe';
    summaryText = `X-class solar flare detected`;
  } else if (recentSignificantStorms.some((s) =>
    Math.max(...(s.allKpIndex?.map((k) => k.kpIndex) || [0])) >= 7
  )) {
    severity = 'severe';
    summaryText = `Strong geomagnetic storm (Kp 7+)`;
  } else if (alertCount > 0) {
    severity = recentSignificantFlares.length > 2 || recentSignificantStorms.length > 0
      ? 'moderate'
      : 'minor';
    const parts: string[] = [];
    if (recentSignificantFlares.length > 0) {
      parts.push(`${recentSignificantFlares.length} M/X-class flare${recentSignificantFlares.length > 1 ? 's' : ''}`);
    }
    if (recentSignificantStorms.length > 0) {
      parts.push(`${recentSignificantStorms.length} geomagnetic storm${recentSignificantStorms.length > 1 ? 's' : ''}`);
    }
    summaryText = parts.join(', ') + ' in last 48h';
  }

  return { alertCount, severity, summaryText };
}

/**
 * Fetch the pulse summary from multiple data sources.
 */
async function fetchPulseData(): Promise<PulseData> {
  const now = new Date();

  // Run all queries in parallel for performance
  const [latestNewsResult, nextLaunchResult, satelliteCount, weatherResult] =
    await Promise.allSettled([
      // 1. Latest news headline
      prisma.newsArticle.findFirst({
        select: {
          title: true,
          source: true,
          url: true,
          publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),

      // 2. Next upcoming launch/event
      prisma.spaceEvent.findFirst({
        where: {
          launchDate: { gte: now },
          status: { in: ['upcoming', 'go', 'tbc', 'tbd'] },
        },
        select: {
          name: true,
          launchDate: true,
          agency: true,
          location: true,
          status: true,
        },
        orderBy: { launchDate: 'asc' },
      }),

      // 3. Count active tracked satellites
      prisma.satelliteAsset.count({
        where: { status: 'active' },
      }),

      // 4. Space weather summary
      getSpaceWeatherSummary(),
    ]);

  // Process latest news
  let latestNews: PulseData['latestNews'] = null;
  if (latestNewsResult.status === 'fulfilled' && latestNewsResult.value) {
    const article = latestNewsResult.value;
    latestNews = {
      title: article.title,
      source: article.source || 'Unknown',
      url: article.url,
      publishedAt: article.publishedAt.toISOString(),
    };
  }

  // Process next launch
  let nextLaunch: PulseData['nextLaunch'] = null;
  if (nextLaunchResult.status === 'fulfilled' && nextLaunchResult.value) {
    const event = nextLaunchResult.value;
    nextLaunch = {
      name: event.name,
      date: event.launchDate ? event.launchDate.toISOString() : now.toISOString(),
      agency: event.agency,
      location: event.location,
      status: event.status,
    };
  }

  // Process satellite count (fallback to 0 if query fails)
  const activeSatellites =
    satelliteCount.status === 'fulfilled' ? satelliteCount.value : 0;

  // Process space weather
  let spaceWeather: PulseData['spaceWeather'] = {
    alertCount: 0,
    severity: 'quiet',
    summary: 'Space weather data unavailable',
  };
  if (weatherResult.status === 'fulfilled') {
    const { alertCount, severity, summaryText } = deriveWeatherSeverity(
      weatherResult.value
    );
    spaceWeather = { alertCount, severity, summary: summaryText };
  } else {
    logger.warn('[Pulse] Space weather fetch failed, using fallback', {
      error:
        weatherResult.status === 'rejected'
          ? String(weatherResult.reason)
          : 'unknown',
    });
  }

  // Market status -- placeholder since we don't want to call Yahoo Finance on
  // every pulse request. The market-intel page handles live stock data.
  const marketStatus: PulseData['marketStatus'] = {
    status: 'unavailable',
    summary: 'View Market Intel for live data',
  };

  return {
    latestNews,
    nextLaunch,
    marketStatus,
    spaceWeather,
    activeSatellites,
    generatedAt: now.toISOString(),
  };
}

export async function GET() {
  try {
    // Check in-memory cache first (5-minute TTL)
    const cached = apiCache.get<PulseData>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(
        { success: true, data: cached, cached: true },
        {
          headers: {
            'Cache-Control':
              'public, s-maxage=300, stale-while-revalidate=60',
          },
        }
      );
    }

    const data = await fetchPulseData();

    // Cache for 5 minutes
    apiCache.set(CACHE_KEY, data, CacheTTL.DEFAULT);

    return NextResponse.json(
      { success: true, data, cached: false },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    logger.error('[Pulse] Failed to generate pulse summary', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Try stale cache as fallback
    const stale = apiCache.getStale<PulseData>(CACHE_KEY);
    if (stale) {
      return NextResponse.json({
        success: true,
        data: stale.value,
        cached: true,
        stale: true,
      });
    }

    return internalError('Failed to generate space industry pulse');
  }
}
