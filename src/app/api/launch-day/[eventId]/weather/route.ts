import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  const { eventId } = params;

  // Use eventId + current hour as seed for consistent data within each hour
  const hourKey = Math.floor(Date.now() / 3600000);
  const rng = seededRandom(`${eventId}-${hourKey}`);

  // Look up the event location (simplified — use a dummy location if we can't fetch)
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

  const profile = getLocationProfile(location);

  // Generate weather with some randomness
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

  const weather: WeatherData = {
    windSpeed,
    windDirection,
    temperature,
    cloudCover,
    lightningRisk,
    precipitation,
    visibility,
    humidity,
  };

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

  const response: WeatherResponse = {
    weather,
    rangeStatus,
    criteria,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, data: response });
}
