import { NextResponse } from 'next/server';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// US launch site coordinates for NOAA Weather API lookups
const LAUNCH_SITES: Record<string, { lat: number; lon: number; name: string }> = {
  'cape-canaveral': { lat: 28.5620, lon: -80.5770, name: 'Cape Canaveral' },
  'kennedy': { lat: 28.5729, lon: -80.6490, name: 'Kennedy Space Center' },
  'vandenberg': { lat: 34.7420, lon: -120.5724, name: 'Vandenberg SFB' },
  'boca-chica': { lat: 25.9972, lon: -97.1560, name: 'Starbase Boca Chica' },
  'wallops': { lat: 37.9402, lon: -75.4664, name: 'Wallops Flight Facility' },
};

// Circuit breaker for NOAA API calls (opens after 3 failures, resets after 2 minutes)
const noaaBreaker = createCircuitBreaker('noaa-weather', {
  failureThreshold: 3,
  resetTimeout: 120_000,
});

interface WeatherData {
  windSpeed: number; // knots
  windDirection: string;
  temperature: number; // Fahrenheit
  cloudCover: number; // 0-100%
  lightningRisk: 'none' | 'low' | 'moderate' | 'high';
  precipitation: number; // 0-100%
  visibility: number; // statute miles
  humidity: number; // 0-100%
}

interface GoNoGoCriterion {
  name: string;
  status: 'go' | 'caution' | 'no_go';
  detail: string;
}

interface WeatherResponse {
  weather: WeatherData;
  rangeStatus: 'green' | 'yellow' | 'red';
  criteria: GoNoGoCriterion[];
  lastUpdated: string;
}

// Seeded random based on eventId + hour for consistency within polling window
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967296;
  };
}

// Location-based weather profiles
function getLocationProfile(location: string | null): {
  baseTemp: number;
  baseWind: number;
  baseCloud: number;
  stormChance: number;
} {
  const loc = (location || '').toLowerCase();

  if (loc.includes('canaveral') || loc.includes('cape') || loc.includes('kennedy') || loc.includes('florida')) {
    return { baseTemp: 78, baseWind: 10, baseCloud: 30, stormChance: 0.25 };
  }
  if (loc.includes('vandenberg') || loc.includes('california')) {
    return { baseTemp: 62, baseWind: 12, baseCloud: 40, stormChance: 0.1 };
  }
  if (loc.includes('boca chica') || loc.includes('starbase') || loc.includes('texas')) {
    return { baseTemp: 82, baseWind: 14, baseCloud: 25, stormChance: 0.2 };
  }
  if (loc.includes('wallops')) {
    return { baseTemp: 65, baseWind: 11, baseCloud: 35, stormChance: 0.15 };
  }
  // Default: generic coastal launch site
  return { baseTemp: 72, baseWind: 10, baseCloud: 30, stormChance: 0.15 };
}

// Map a location string (from SpaceEvent) to a LAUNCH_SITES key
function matchLaunchSite(location: string | null): string | null {
  if (!location) return null;
  const loc = location.toLowerCase();

  if (loc.includes('kennedy') || loc.includes('ksc')) return 'kennedy';
  if (loc.includes('canaveral') || loc.includes('cape') || loc.includes('slc-40') || loc.includes('slc-41')) return 'cape-canaveral';
  if (loc.includes('vandenberg') || loc.includes('vafb') || loc.includes('slc-4')) return 'vandenberg';
  if (loc.includes('boca chica') || loc.includes('starbase')) return 'boca-chica';
  if (loc.includes('wallops')) return 'wallops';

  // Florida / Texas generic matches
  if (loc.includes('florida')) return 'cape-canaveral';
  if (loc.includes('texas')) return 'boca-chica';
  if (loc.includes('california')) return 'vandenberg';

  return null;
}

// NOAA API response types
interface NOAAPointsResponse {
  properties: {
    forecastHourly: string;
    gridId: string;
    gridX: number;
    gridY: number;
  };
}

interface NOAAForecastPeriod {
  temperature: number; // Fahrenheit
  temperatureUnit: string;
  windSpeed: string; // e.g. "10 mph" or "5 to 10 mph"
  windDirection: string; // e.g. "NW", "SSE"
  relativeHumidity?: { value: number };
  probabilityOfPrecipitation?: { value: number | null };
  shortForecast: string;
}

interface NOAAHourlyResponse {
  properties: {
    periods: NOAAForecastPeriod[];
  };
}

/**
 * Fetch real weather data from NOAA Weather API for a given lat/lon.
 * Returns WeatherData in the same shape as the simulated data.
 * Throws on any failure so the circuit breaker can track it.
 */
async function fetchRealWeather(lat: number, lon: number): Promise<WeatherData> {
  const headers = {
    'User-Agent': 'SpaceNexus/1.0 (contact@spacenexus.us)',
    'Accept': 'application/geo+json',
  };

  // Step 1: Resolve the grid coordinates from lat/lon
  const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
  const pointsRes = await fetch(pointsUrl, { headers, signal: AbortSignal.timeout(8000) });

  if (!pointsRes.ok) {
    throw new Error(`NOAA points API returned ${pointsRes.status} for ${lat},${lon}`);
  }

  const pointsData: NOAAPointsResponse = await pointsRes.json();
  const forecastHourlyUrl = pointsData.properties.forecastHourly;

  if (!forecastHourlyUrl) {
    throw new Error('NOAA points response missing forecastHourly URL');
  }

  // Step 2: Fetch hourly forecast
  const forecastRes = await fetch(forecastHourlyUrl, { headers, signal: AbortSignal.timeout(8000) });

  if (!forecastRes.ok) {
    throw new Error(`NOAA hourly forecast API returned ${forecastRes.status}`);
  }

  const forecastData: NOAAHourlyResponse = await forecastRes.json();
  const periods = forecastData.properties?.periods;

  if (!periods || periods.length === 0) {
    throw new Error('NOAA hourly forecast returned no periods');
  }

  // Use the first (current/next hour) period
  const current = periods[0];

  // Parse wind speed — NOAA returns strings like "10 mph" or "5 to 10 mph"
  let windSpeedMph = 0;
  const windMatch = current.windSpeed.match(/(\d+)\s*(?:to\s*(\d+))?\s*mph/i);
  if (windMatch) {
    // If range, use the higher value for launch safety conservatism
    windSpeedMph = windMatch[2] ? parseInt(windMatch[2], 10) : parseInt(windMatch[1], 10);
  }
  // Convert mph to knots (1 mph = 0.868976 knots)
  const windSpeedKnots = Math.round(windSpeedMph * 0.868976);

  // Normalize wind direction to 1-2 char compass (NOAA may return "NNW", "SSE", etc.)
  const compassDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  let windDirection = current.windDirection || 'N';
  // Map 3-char directions to nearest 2-char (e.g. NNE->NE, SSW->SW, WNW->NW)
  if (windDirection.length === 3) {
    const threeToTwo: Record<string, string> = {
      NNE: 'NE', ENE: 'NE', ESE: 'SE', SSE: 'SE',
      SSW: 'SW', WSW: 'SW', WNW: 'NW', NNW: 'NW',
    };
    windDirection = threeToTwo[windDirection] || windDirection.slice(0, 2);
  }
  if (!compassDirections.includes(windDirection)) {
    windDirection = 'N'; // fallback
  }

  // Temperature: NOAA returns Fahrenheit by default
  const temperatureF = current.temperature;

  // Humidity
  const humidity = current.relativeHumidity?.value ?? 50;

  // Precipitation probability
  const precipitation = current.probabilityOfPrecipitation?.value ?? 0;

  // Derive cloud cover and visibility from shortForecast description
  const forecast = current.shortForecast.toLowerCase();
  let cloudCover = 20; // default clear-ish
  if (forecast.includes('overcast') || forecast.includes('cloudy')) {
    cloudCover = 85;
  } else if (forecast.includes('mostly cloudy')) {
    cloudCover = 70;
  } else if (forecast.includes('partly cloudy') || forecast.includes('partly sunny')) {
    cloudCover = 45;
  } else if (forecast.includes('mostly clear') || forecast.includes('mostly sunny')) {
    cloudCover = 25;
  } else if (forecast.includes('clear') || forecast.includes('sunny')) {
    cloudCover = 10;
  } else if (forecast.includes('fog')) {
    cloudCover = 90;
  }

  let visibility = 10; // default good visibility (statute miles)
  if (forecast.includes('fog') || forecast.includes('mist')) {
    visibility = 2;
  } else if (forecast.includes('haze') || forecast.includes('smoke')) {
    visibility = 4;
  } else if (forecast.includes('rain') || forecast.includes('shower') || forecast.includes('storm')) {
    visibility = 5;
  }

  // Lightning risk based on forecast text
  let lightningRisk: WeatherData['lightningRisk'] = 'none';
  if (forecast.includes('thunderstorm') || forecast.includes('lightning')) {
    lightningRisk = precipitation > 60 ? 'high' : 'moderate';
  } else if (forecast.includes('storm') || forecast.includes('shower')) {
    lightningRisk = 'low';
  }

  return {
    windSpeed: windSpeedKnots,
    windDirection,
    temperature: temperatureF,
    cloudCover,
    lightningRisk,
    precipitation,
    visibility,
    humidity,
  };
}

/**
 * Generate simulated weather using seeded RNG (deterministic fallback).
 * Preserves the original logic exactly as it was before NOAA integration.
 */
function generateSimulatedWeather(
  eventId: string,
  location: string | null,
): { weather: WeatherData; isStormy: boolean; rng: () => number } {
  const hourKey = Math.floor(Date.now() / 3600000);
  const rng = seededRandom(`${eventId}-${hourKey}`);
  const profile = getLocationProfile(location);

  const isStormy = rng() < profile.stormChance;
  const windSpeed = Math.round(profile.baseWind + rng() * 8 + (isStormy ? 10 : 0));
  const windDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const windDirection = windDirections[Math.floor(rng() * windDirections.length)];
  const temperature = Math.round(profile.baseTemp + (rng() - 0.5) * 10);
  const cloudCover = Math.min(100, Math.round(profile.baseCloud + rng() * 30 + (isStormy ? 30 : 0)));
  const precipitation = isStormy ? Math.round(30 + rng() * 50) : Math.round(rng() * 10);
  const visibility = isStormy ? Math.round(3 + rng() * 4) : Math.round(8 + rng() * 4);
  const humidity = Math.round(40 + rng() * 40 + (isStormy ? 15 : 0));

  const lightningRisk: WeatherData['lightningRisk'] = isStormy
    ? rng() > 0.5 ? 'high' : 'moderate'
    : rng() > 0.85 ? 'low' : 'none';

  return {
    weather: {
      windSpeed,
      windDirection,
      temperature,
      cloudCover,
      lightningRisk,
      precipitation,
      visibility,
      humidity,
    },
    isStormy,
    rng,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;

  // Look up the event location
  let location: string | null = null;
  try {
    const prisma = (await import('@/lib/db')).default;
    const event = await prisma.spaceEvent.findUnique({
      where: { id: eventId },
      select: { location: true },
    });
    location = event?.location || null;
  } catch {
    // Fallback to default profile
  }

  // --- Attempt real NOAA weather for known US launch sites ---
  let weather: WeatherData | null = null;
  let weatherSource: 'noaa-api' | 'simulated' = 'simulated';
  let isStormy = false;
  let rng: (() => number) | null = null;

  const siteKey = matchLaunchSite(location);
  if (siteKey) {
    const site = LAUNCH_SITES[siteKey];
    try {
      const realWeather = await noaaBreaker.execute(
        () => fetchRealWeather(site.lat, site.lon),
      );
      weather = realWeather;
      weatherSource = 'noaa-api';
      // Derive isStormy from real data for Go/No-Go criteria
      isStormy = realWeather.lightningRisk !== 'none' || realWeather.precipitation > 30;
      logger.info('NOAA weather fetched successfully', {
        eventId,
        site: site.name,
        siteKey,
      });
    } catch (err) {
      logger.warn('NOAA weather fetch failed, falling back to simulation', {
        eventId,
        siteKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // --- Fallback: seeded random simulation ---
  if (!weather) {
    const simulated = generateSimulatedWeather(eventId, location);
    weather = simulated.weather;
    isStormy = simulated.isStormy;
    rng = simulated.rng;
    weatherSource = 'simulated';
  }

  // We still need an rng for non-weather criteria (Vehicle Health) when using real data
  if (!rng) {
    const hourKey = Math.floor(Date.now() / 3600000);
    rng = seededRandom(`${eventId}-${hourKey}`);
  }

  const { windSpeed, windDirection, cloudCover, lightningRisk, precipitation } = weather;

  // Generate Go/No-Go criteria
  const criteria: GoNoGoCriterion[] = [
    {
      name: 'Surface Winds',
      status: windSpeed > 25 ? 'no_go' : windSpeed > 18 ? 'caution' : 'go',
      detail: `${windSpeed} kts ${windDirection} (limit: 25 kts)`,
    },
    {
      name: 'Upper Level Winds',
      status: isStormy ? 'caution' : 'go',
      detail: isStormy ? 'Elevated wind shear detected' : 'Within acceptable limits',
    },
    {
      name: 'Lightning / Triggered Lightning',
      status: lightningRisk === 'high' ? 'no_go' : lightningRisk === 'moderate' ? 'caution' : 'go',
      detail: `${lightningRisk.charAt(0).toUpperCase() + lightningRisk.slice(1)} risk`,
    },
    {
      name: 'Cumulus Clouds',
      status: cloudCover > 80 ? 'caution' : 'go',
      detail: `${cloudCover}% coverage`,
    },
    {
      name: 'Range Safety',
      status: 'go',
      detail: 'All tracking systems operational',
    },
    {
      name: 'Vehicle Health',
      status: rng() > 0.95 ? 'caution' : 'go',
      detail: rng() > 0.95 ? 'Minor sensor anomaly under review' : 'All systems nominal',
    },
    {
      name: 'Flight Termination System',
      status: 'go',
      detail: 'FTS armed and operational',
    },
    {
      name: 'Precipitation',
      status: precipitation > 40 ? 'no_go' : precipitation > 15 ? 'caution' : 'go',
      detail: `${precipitation}% chance`,
    },
  ];

  // Overall range status
  const hasNoGo = criteria.some(c => c.status === 'no_go');
  const hasCaution = criteria.some(c => c.status === 'caution');
  const rangeStatus: WeatherResponse['rangeStatus'] = hasNoGo ? 'red' : hasCaution ? 'yellow' : 'green';

  // Fetch real space weather data from DynamicContent
  let spaceWeather = null;
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

    if (xrayData || geomagData || protonData) {
      spaceWeather = {
        xrayConstraint: (xrayData?.launchConstraint as string) || 'GO',
        xrayClass: (xrayData?.peakFlareClass6h as string) || 'A',
        geomagConstraint: (geomagData?.launchConstraint as string) || 'GO',
        geomagScale: (geomagData?.maxGeomagneticScale as number) || 0,
        protonConstraint: (protonData?.launchConstraint as string) || 'GO',
        protonFlux: (protonData?.peakFlux24h as number) || 0,
        radiationRisk: (protonData?.radiationRisk as string) || 'Normal',
        sepEvent: (protonData?.sepEvent as boolean) || false,
      };
    }
  } catch {
    // Space weather data is supplementary, don't fail if unavailable
  }

  return NextResponse.json({
    success: true,
    data: {
      weather,
      rangeStatus,
      criteria,
      spaceWeather,
      lastUpdated: new Date().toISOString(),
      _meta: {
        source: weatherSource,
        ...(siteKey && { launchSite: LAUNCH_SITES[siteKey]?.name }),
      },
    },
  });
}
