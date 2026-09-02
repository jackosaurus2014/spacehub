import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getLaunchWeatherOdds, isNwsCovered, resolvePadCoords, siteDisplayName, ODDS_METHOD } from '@/lib/launch-weather';

export const dynamic = 'force-dynamic';

// Launch-day weather for the polling client widget. Same lib as the
// server-rendered odds strip on /launch/[eventId], so the two agree.
//
// There is no simulated fallback: a launch page must never show invented
// weather. When there is no forecast source (non-US range, unknown pad) or
// the NWS fetch fails, the response is `{ unavailable: true, reason }` and the
// widget says so.

async function loadSpaceWeather() {
  try {
    const { getContentItem } = await import('@/lib/dynamic-content');
    const [xray6h, geomagForecast, integralProtons] = await Promise.all([
      getContentItem('space-environment:xray-6hour').catch(() => null),
      getContentItem('space-environment:geomagnetic-forecast').catch(() => null),
      getContentItem('space-environment:integral-protons').catch(() => null),
    ]);

    const xrayData = xray6h?.data as Record<string, unknown> | null;
    const geomagData = geomagForecast?.data as Record<string, unknown> | null;
    const protonData = integralProtons?.data as Record<string, unknown> | null;

    if (!xrayData && !geomagData && !protonData) return null;
    return {
      xrayConstraint: (xrayData?.launchConstraint as string) || 'GO',
      xrayClass: (xrayData?.peakFlareClass6h as string) || 'A',
      geomagConstraint: (geomagData?.launchConstraint as string) || 'GO',
      geomagScale: (geomagData?.maxGeomagneticScale as number) || 0,
      protonConstraint: (protonData?.launchConstraint as string) || 'GO',
      protonFlux: (protonData?.peakFlux24h as number) || 0,
      radiationRisk: (protonData?.radiationRisk as string) || 'Normal',
      sepEvent: (protonData?.sepEvent as boolean) || false,
    };
  } catch {
    // Space weather is supplementary; never fail the response for it.
    return null;
  }
}

export async function GET(_request: Request, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  const { eventId } = params;

  let event: { location: string | null; launchDate: Date | null; padLatitude: number | null; padLongitude: number | null } | null = null;
  try {
    const prisma = (await import('@/lib/db')).default;
    event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: { location: true, launchDate: true, padLatitude: true, padLongitude: true },
    });
  } catch (err) {
    logger.warn('launch-day weather: event lookup failed', { eventId, error: err instanceof Error ? err.message : String(err) });
  }

  const coords = event ? resolvePadCoords(event) : null;
  const siteName = siteDisplayName(coords, event?.location);
  const spaceWeatherPromise = loadSpaceWeather();

  if (!coords || !isNwsCovered(coords)) {
    return NextResponse.json({
      success: true,
      data: {
        unavailable: true,
        reason: coords ? 'no-coverage' : 'no-coordinates',
        message: coords
          ? `No forecast source for ${siteName}: our only launch-weather feed (US National Weather Service) does not cover this range.`
          : `No pad coordinates for this launch, so no forecast.`,
        site: siteName,
        spaceWeather: await spaceWeatherPromise,
        lastUpdated: new Date().toISOString(),
      },
    });
  }

  const [odds, spaceWeather] = await Promise.all([
    getLaunchWeatherOdds(eventId, coords, event?.launchDate ?? null),
    spaceWeatherPromise,
  ]);

  if (!odds) {
    return NextResponse.json({
      success: true,
      data: {
        unavailable: true,
        reason: 'fetch-failed',
        message: `Forecast unavailable right now for ${siteName}.`,
        site: siteName,
        spaceWeather,
        lastUpdated: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      weather: odds.weather,
      rangeStatus: odds.status,
      oddsPct: odds.oddsPct,
      oddsMethod: ODDS_METHOD,
      criteria: odds.criteria,
      forecastFor: odds.forecastFor,
      spaceWeather,
      lastUpdated: odds.fetchedAt,
      _meta: { source: 'NWS', simulated: false, launchSite: siteName, coords: odds.coords },
    },
  });
}
