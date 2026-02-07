import prisma from './db';
import { LaunchWindow, CelestialDestination, TransferType } from '@/types';
import { fetchLaunchLibrary, fetchSpaceX } from './external-apis';
import { logger } from './logger';

// Helper to create dates relative to today
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Seed data for celestial destinations
export const CELESTIAL_DESTINATIONS_SEED = [
  {
    slug: 'moon',
    name: 'Moon',
    type: 'moon',
    distanceFromSun: 1.0, // ~same as Earth
    distanceFromEarth: 0.00257,
    orbitalPeriod: 0.0748,
    synodicPeriod: 29.5,
    deltaVToOrbit: 4.1,
    deltaVToLand: 1.8,
    totalMissions: 109,
    successfulMissions: 73,
    description: 'Earth\'s only natural satellite. The most accessible deep-space destination with a ~29.5-day synodic period enabling frequent launch windows.',
  },
  {
    slug: 'mars',
    name: 'Mars',
    type: 'planet',
    distanceFromSun: 1.524,
    distanceFromEarth: 0.52, // average opposition
    orbitalPeriod: 1.88,
    synodicPeriod: 780,
    deltaVToOrbit: 5.7,
    deltaVToLand: 1.0,
    totalMissions: 50,
    successfulMissions: 26,
    description: 'The Red Planet. Launch windows open every ~26 months during Earth-Mars opposition. Primary target for human exploration.',
  },
  {
    slug: 'venus',
    name: 'Venus',
    type: 'planet',
    distanceFromSun: 0.723,
    distanceFromEarth: 0.28, // closest approach
    orbitalPeriod: 0.615,
    synodicPeriod: 584,
    deltaVToOrbit: 3.5,
    deltaVToLand: null,
    totalMissions: 47,
    successfulMissions: 23,
    description: 'Earth\'s sister planet with extreme surface conditions. Lower delta-V than Mars but punishing atmosphere. Windows every ~19 months.',
  },
  {
    slug: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    distanceFromSun: 5.203,
    distanceFromEarth: 4.2, // average
    orbitalPeriod: 11.86,
    synodicPeriod: 399,
    deltaVToOrbit: 8.0,
    deltaVToLand: null,
    totalMissions: 9,
    successfulMissions: 9,
    description: 'The largest planet. Gravity assist opportunities make it a key waypoint for outer solar system missions. Windows every ~13 months.',
  },
  {
    slug: 'saturn',
    name: 'Saturn',
    type: 'planet',
    distanceFromSun: 9.537,
    distanceFromEarth: 8.5, // average
    orbitalPeriod: 29.46,
    synodicPeriod: 378,
    deltaVToOrbit: null,
    deltaVToLand: null,
    totalMissions: 4,
    successfulMissions: 4,
    description: 'The ringed planet. Typically reached via Jupiter gravity assist. Home to Titan, the only moon with a dense atmosphere.',
  },
  {
    slug: 'mercury',
    name: 'Mercury',
    type: 'planet',
    distanceFromSun: 0.387,
    distanceFromEarth: 0.61, // average
    orbitalPeriod: 0.241,
    synodicPeriod: 116,
    deltaVToOrbit: null,
    deltaVToLand: null,
    totalMissions: 2,
    successfulMissions: 2,
    description: 'Closest planet to the Sun. Paradoxically one of the hardest destinations due to high delta-V requirements for orbit insertion.',
  },
  {
    slug: 'asteroid-belt-ceres',
    name: 'Asteroid Belt (Ceres)',
    type: 'asteroid',
    distanceFromSun: 2.77,
    distanceFromEarth: 1.77, // average
    orbitalPeriod: 4.6,
    synodicPeriod: 467,
    deltaVToOrbit: 4.9,
    deltaVToLand: 0.3,
    totalMissions: 1,
    successfulMissions: 1,
    description: 'Ceres is the largest object in the asteroid belt. Low gravity makes it an ideal candidate for future resource extraction missions.',
  },
  {
    slug: 'sun-earth-l2',
    name: 'Sun-Earth L2',
    type: 'lagrange',
    distanceFromSun: 1.01, // slightly beyond Earth
    distanceFromEarth: 0.01,
    orbitalPeriod: 1.0, // co-orbital with Earth
    synodicPeriod: null,
    deltaVToOrbit: 3.4,
    deltaVToLand: null,
    totalMissions: 5,
    successfulMissions: 5,
    description: 'Lagrange point 2, ~1.5 million km from Earth. Home to JWST and ideal for deep-space observatories shielded from the Sun.',
  },
];

// Seed data for launch windows
export const LAUNCH_WINDOWS_SEED = [
  // Moon windows - frequent due to short synodic period
  {
    slug: 'moon-2026-mar',
    destination: 'Moon',
    missionType: 'landing',
    windowOpen: daysFromNow(30),
    windowClose: daysFromNow(37),
    optimalDate: daysFromNow(33),
    deltaV: 4.1,
    travelTime: 3,
    transferType: 'direct',
    c3Energy: -1.8,
    arrivalVelocity: 0.8,
    frequency: 'Every ~29.5 days',
    nextAfter: daysFromNow(60),
    description: 'Trans-lunar injection window. Direct transfer to lunar orbit with minimal delta-V.',
  },
  {
    slug: 'moon-2026-apr',
    destination: 'Moon',
    missionType: 'landing',
    windowOpen: daysFromNow(60),
    windowClose: daysFromNow(67),
    optimalDate: daysFromNow(63),
    deltaV: 4.1,
    travelTime: 3,
    transferType: 'direct',
    c3Energy: -1.8,
    arrivalVelocity: 0.8,
    frequency: 'Every ~29.5 days',
    nextAfter: daysFromNow(90),
    description: 'Standard lunar transfer window. Favorable geometry for south pole landing sites.',
  },
  {
    slug: 'moon-2026-may',
    destination: 'Moon',
    missionType: 'orbit',
    windowOpen: daysFromNow(90),
    windowClose: daysFromNow(97),
    optimalDate: daysFromNow(93),
    deltaV: 3.9,
    travelTime: 5,
    transferType: 'low_energy',
    c3Energy: -2.0,
    arrivalVelocity: 0.7,
    frequency: 'Every ~29.5 days',
    nextAfter: daysFromNow(120),
    description: 'Low-energy lunar transfer via weak stability boundary. Lower delta-V at the cost of longer travel time.',
  },
  // Mars window - next in ~Sep 2026 (26-month cycle)
  {
    slug: 'mars-2026-sep',
    destination: 'Mars',
    missionType: 'orbit',
    windowOpen: daysFromNow(210),
    windowClose: daysFromNow(250),
    optimalDate: daysFromNow(230),
    deltaV: 3.6,
    travelTime: 210,
    transferType: 'hohmann',
    c3Energy: 8.5,
    arrivalVelocity: 2.65,
    frequency: 'Every ~26 months',
    nextAfter: daysFromNow(1000),
    description: 'Type I Hohmann transfer to Mars. Optimal window for minimum-energy trajectory during 2026 opposition.',
  },
  // Venus window - next ~Jun 2026
  {
    slug: 'venus-2026-jun',
    destination: 'Venus',
    missionType: 'flyby',
    windowOpen: daysFromNow(120),
    windowClose: daysFromNow(155),
    optimalDate: daysFromNow(137),
    deltaV: 3.5,
    travelTime: 150,
    transferType: 'hohmann',
    c3Energy: 7.0,
    arrivalVelocity: 3.1,
    frequency: 'Every ~19 months',
    nextAfter: daysFromNow(700),
    description: 'Venus transfer window for flyby or orbit insertion. Can serve as gravity assist for outer planet missions.',
  },
  // Jupiter window - 2027
  {
    slug: 'jupiter-2027',
    destination: 'Jupiter',
    missionType: 'orbit',
    windowOpen: daysFromNow(400),
    windowClose: daysFromNow(450),
    optimalDate: daysFromNow(425),
    deltaV: 6.3,
    travelTime: 900,
    transferType: 'gravity_assist',
    c3Energy: 30.0,
    arrivalVelocity: 5.6,
    frequency: 'Every ~13 months',
    nextAfter: daysFromNow(800),
    description: 'Jupiter transfer via Venus or Earth gravity assist. Significantly reduces delta-V compared to direct Hohmann transfer.',
  },
  // Saturn window - 2028
  {
    slug: 'saturn-2028',
    destination: 'Saturn',
    missionType: 'flyby',
    windowOpen: daysFromNow(700),
    windowClose: daysFromNow(760),
    optimalDate: daysFromNow(730),
    deltaV: 7.3,
    travelTime: 2200,
    transferType: 'gravity_assist',
    c3Energy: 50.0,
    arrivalVelocity: 5.4,
    frequency: 'Every ~12.5 months',
    nextAfter: daysFromNow(1080),
    description: 'Saturn transfer requiring Jupiter gravity assist. VVEJGA trajectory minimizes propellant requirements.',
  },
  // Additional Moon window closer to now
  {
    slug: 'moon-2026-feb',
    destination: 'Moon',
    missionType: 'orbit',
    windowOpen: daysFromNow(5),
    windowClose: daysFromNow(12),
    optimalDate: daysFromNow(8),
    deltaV: 4.0,
    travelTime: 4,
    transferType: 'direct',
    c3Energy: -1.9,
    arrivalVelocity: 0.8,
    frequency: 'Every ~29.5 days',
    nextAfter: daysFromNow(35),
    description: 'Near-term lunar window. Suitable for cargo and crew rotation missions to Gateway.',
  },
  // Asteroid belt (Ceres)
  {
    slug: 'ceres-2027',
    destination: 'Asteroid Belt (Ceres)',
    missionType: 'orbit',
    windowOpen: daysFromNow(500),
    windowClose: daysFromNow(560),
    optimalDate: daysFromNow(530),
    deltaV: 4.9,
    travelTime: 1200,
    transferType: 'low_energy',
    c3Energy: 12.0,
    arrivalVelocity: 0.5,
    frequency: 'Every ~15 months',
    nextAfter: daysFromNow(960),
    description: 'Low-energy transfer to Ceres via Mars gravity assist. Ion propulsion recommended for efficient trajectory.',
  },
  // Sun-Earth L2
  {
    slug: 'l2-2026-apr',
    destination: 'Sun-Earth L2',
    missionType: 'orbit',
    windowOpen: daysFromNow(50),
    windowClose: daysFromNow(70),
    optimalDate: daysFromNow(60),
    deltaV: 3.4,
    travelTime: 30,
    transferType: 'low_energy',
    c3Energy: -0.5,
    arrivalVelocity: 0.1,
    frequency: 'Year-round (flexible)',
    nextAfter: daysFromNow(130),
    description: 'Transfer to Sun-Earth L2 Lagrange point. Near-continuous availability with low delta-V requirements.',
  },
];

// Initialize launch windows and celestial destinations
export async function initializeLaunchWindowsData() {
  const results = {
    destinationsCreated: 0,
    windowsCreated: 0,
  };

  // Upsert celestial destinations
  for (const destData of CELESTIAL_DESTINATIONS_SEED) {
    await prisma.celestialDestination.upsert({
      where: { slug: destData.slug },
      update: {
        name: destData.name,
        type: destData.type,
        distanceFromSun: destData.distanceFromSun,
        distanceFromEarth: destData.distanceFromEarth,
        orbitalPeriod: destData.orbitalPeriod,
        synodicPeriod: destData.synodicPeriod,
        deltaVToOrbit: destData.deltaVToOrbit,
        deltaVToLand: destData.deltaVToLand,
        totalMissions: destData.totalMissions,
        successfulMissions: destData.successfulMissions,
        description: destData.description,
      },
      create: destData,
    });
    results.destinationsCreated++;
  }

  // Upsert launch windows
  for (const windowData of LAUNCH_WINDOWS_SEED) {
    await prisma.launchWindow.upsert({
      where: { slug: windowData.slug },
      update: {
        destination: windowData.destination,
        missionType: windowData.missionType,
        windowOpen: windowData.windowOpen,
        windowClose: windowData.windowClose,
        optimalDate: windowData.optimalDate,
        deltaV: windowData.deltaV,
        travelTime: windowData.travelTime,
        transferType: windowData.transferType,
        c3Energy: windowData.c3Energy,
        arrivalVelocity: windowData.arrivalVelocity,
        frequency: windowData.frequency,
        nextAfter: windowData.nextAfter,
        description: windowData.description,
      },
      create: windowData,
    });
    results.windowsCreated++;
  }

  return results;
}

// Query functions

export async function getCelestialDestinations(): Promise<CelestialDestination[]> {
  const destinations = await prisma.celestialDestination.findMany({
    orderBy: { distanceFromSun: 'asc' },
  });

  return destinations as CelestialDestination[];
}

export async function getUpcomingWindows(options?: {
  destination?: string;
  limit?: number;
}): Promise<LaunchWindow[]> {
  const { destination, limit } = options || {};

  const windows = await prisma.launchWindow.findMany({
    where: {
      windowOpen: { gte: new Date() },
      ...(destination ? { destination } : {}),
    },
    orderBy: { windowOpen: 'asc' },
    take: limit,
  });

  return windows.map(w => ({
    ...w,
    transferType: w.transferType as TransferType,
  }));
}

export async function getLaunchWindowStats() {
  const [totalDestinations, upcomingWindowsList] = await Promise.all([
    prisma.celestialDestination.count(),
    prisma.launchWindow.findMany({
      where: {
        windowOpen: { gte: new Date() },
      },
      orderBy: { windowOpen: 'asc' },
    }),
  ]);

  const upcomingWindows = upcomingWindowsList.length;
  const nextWindow = upcomingWindowsList.length > 0
    ? {
        ...upcomingWindowsList[0],
        transferType: upcomingWindowsList[0].transferType as TransferType,
      }
    : null;

  // Most accessible destination = lowest deltaVToOrbit among those with a value
  const mostAccessible = await prisma.celestialDestination.findFirst({
    where: {
      deltaVToOrbit: { not: null },
    },
    orderBy: { deltaVToOrbit: 'asc' },
  });

  return {
    totalDestinations,
    upcomingWindows,
    nextWindow: nextWindow as LaunchWindow | null,
    mostAccessible: mostAccessible as CelestialDestination | null,
  };
}

// ============================================================
// External API Integration - Launch Library 2 & SpaceX
// ============================================================

// Types for Launch Library 2 API response
interface LaunchLibraryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: LaunchLibraryLaunch[];
}

interface LaunchLibraryLaunch {
  id: string;
  name: string;
  net: string | null;
  window_start: string | null;
  window_end: string | null;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description: string;
  } | null;
  rocket: {
    id: number;
    configuration: {
      id: number;
      name: string;
      full_name: string;
    };
  } | null;
  mission: {
    id: number;
    name: string;
    description: string | null;
    type: string | null;
  } | null;
  pad: {
    id: number;
    name: string;
    location: {
      id: number;
      name: string;
      country_code: string;
    } | null;
  } | null;
  launch_service_provider: {
    id: number;
    name: string;
    abbrev: string;
    type: string | null;
  } | null;
  image: string | null;
  infographic: string | null;
  webcast_live: boolean;
  vidURLs?: Array<{ url: string }>;
}

// Types for SpaceX API response
interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string | null;
  date_precision: string;
  static_fire_date_utc: string | null;
  window: number | null;
  rocket: string;
  success: boolean | null;
  details: string | null;
  launchpad: string;
  flight_number: number;
  upcoming: boolean;
  links: {
    webcast: string | null;
    article: string | null;
    wikipedia: string | null;
  } | null;
}

// Normalized launch data for merging
export interface NormalizedLaunch {
  externalId: string;
  source: 'launch_library' | 'spacex';
  name: string;
  missionName: string | null;
  provider: string | null;
  vehicle: string | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  launchDate: Date | null;
  launchDatePrecision: string | null;
  status: string;
  location: string | null;
  country: string | null;
  missionType: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
}

/**
 * Fetch upcoming launches from Launch Library 2 API
 */
export async function fetchLaunchLibraryUpcoming(limit = 50): Promise<NormalizedLaunch[]> {
  const data = await fetchLaunchLibrary('launch/upcoming', { limit: String(limit) }) as LaunchLibraryResponse;

  if (!data.results || !Array.isArray(data.results)) {
    logger.warn('Launch Library 2: No results array in response');
    return [];
  }

  return data.results.map((launch): NormalizedLaunch => ({
    externalId: `ll2-${launch.id}`,
    source: 'launch_library',
    name: launch.name,
    missionName: launch.mission?.name || null,
    provider: launch.launch_service_provider?.name || null,
    vehicle: launch.rocket?.configuration?.name || null,
    windowStart: launch.window_start ? new Date(launch.window_start) : null,
    windowEnd: launch.window_end ? new Date(launch.window_end) : null,
    launchDate: launch.net ? new Date(launch.net) : null,
    launchDatePrecision: mapLaunchLibraryPrecision(launch.status?.abbrev),
    status: mapLaunchLibraryStatus(launch.status?.abbrev || 'TBD'),
    location: launch.pad?.name || null,
    country: launch.pad?.location?.name || null,
    missionType: launch.mission?.type || null,
    description: launch.mission?.description || null,
    imageUrl: launch.image || launch.infographic || null,
    videoUrl: launch.vidURLs?.[0]?.url || null,
  }));
}

/**
 * Fetch upcoming launches from SpaceX API
 */
export async function fetchSpaceXUpcoming(): Promise<NormalizedLaunch[]> {
  const data = await fetchSpaceX('launches/upcoming') as SpaceXLaunch[];

  if (!Array.isArray(data)) {
    logger.warn('SpaceX API: Response is not an array');
    return [];
  }

  return data.map((launch): NormalizedLaunch => {
    const launchDate = launch.date_utc ? new Date(launch.date_utc) : null;

    // Calculate window end based on launch window (in seconds)
    let windowEnd: Date | null = null;
    if (launchDate && launch.window) {
      windowEnd = new Date(launchDate.getTime() + launch.window * 1000);
    }

    return {
      externalId: `spacex-${launch.id}`,
      source: 'spacex',
      name: launch.name,
      missionName: launch.name,
      provider: 'SpaceX',
      vehicle: 'Falcon 9', // SpaceX API v5 doesn't include rocket name in upcoming
      windowStart: launchDate,
      windowEnd: windowEnd,
      launchDate: launchDate,
      launchDatePrecision: mapSpaceXPrecision(launch.date_precision),
      status: launch.upcoming ? 'upcoming' : 'tbd',
      location: null, // Would need additional API call to get launchpad details
      country: 'USA',
      missionType: null,
      description: launch.details,
      imageUrl: null,
      videoUrl: launch.links?.webcast || null,
    };
  });
}

/**
 * Merge and deduplicate launches from multiple sources
 * Launch Library 2 is preferred when duplicates are found
 */
export function mergeLaunchData(
  launchLibraryData: NormalizedLaunch[],
  spaceXData: NormalizedLaunch[]
): NormalizedLaunch[] {
  const merged = new Map<string, NormalizedLaunch>();

  // Add Launch Library 2 data first (preferred source)
  for (const launch of launchLibraryData) {
    const key = generateDedupeKey(launch);
    merged.set(key, launch);
  }

  // Add SpaceX data, but only if not already present
  for (const launch of spaceXData) {
    const key = generateDedupeKey(launch);
    if (!merged.has(key)) {
      merged.set(key, launch);
    } else {
      // If duplicate exists, merge additional data from SpaceX
      const existing = merged.get(key)!;
      if (!existing.videoUrl && launch.videoUrl) {
        existing.videoUrl = launch.videoUrl;
      }
      if (!existing.description && launch.description) {
        existing.description = launch.description;
      }
    }
  }

  return Array.from(merged.values());
}

/**
 * Generate a deduplication key for a launch
 * Based on provider + approximate launch date + mission name similarity
 */
function generateDedupeKey(launch: NormalizedLaunch): string {
  const provider = launch.provider?.toLowerCase().replace(/\s+/g, '') || 'unknown';
  const date = launch.launchDate
    ? launch.launchDate.toISOString().split('T')[0]
    : 'nodate';
  const mission = (launch.missionName || launch.name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);

  return `${provider}-${date}-${mission}`;
}

/**
 * Upsert normalized launches to the SpaceEvent table
 */
export async function upsertLaunchEvents(
  launches: NormalizedLaunch[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const launch of launches) {
    try {
      const existingEvent = await prisma.spaceEvent.findUnique({
        where: { externalId: launch.externalId },
      });

      const eventData = {
        name: launch.name,
        description: launch.description,
        type: 'launch' as const,
        status: launch.status,
        launchDate: launch.launchDate,
        launchDatePrecision: launch.launchDatePrecision,
        windowStart: launch.windowStart,
        windowEnd: launch.windowEnd,
        location: launch.location,
        country: launch.country,
        agency: launch.provider,
        rocket: launch.vehicle,
        mission: launch.missionName,
        imageUrl: launch.imageUrl,
        videoUrl: launch.videoUrl,
        fetchedAt: new Date(),
      };

      if (existingEvent) {
        await prisma.spaceEvent.update({
          where: { externalId: launch.externalId },
          data: eventData,
        });
        updated++;
      } else {
        await prisma.spaceEvent.create({
          data: {
            externalId: launch.externalId,
            ...eventData,
          },
        });
        created++;
      }
    } catch (error) {
      logger.error(`Failed to upsert launch ${launch.externalId}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { created, updated };
}

/**
 * Map Launch Library 2 status abbreviation to our status format
 */
function mapLaunchLibraryStatus(abbrev: string): string {
  const statusMap: Record<string, string> = {
    'Go': 'go',
    'TBD': 'tbd',
    'TBC': 'tbc',
    'Hold': 'upcoming',
    'InFlight': 'in_progress',
    'Success': 'completed',
    'Failure': 'completed',
    'Partial Failure': 'completed',
  };
  return statusMap[abbrev] || 'tbd';
}

/**
 * Map Launch Library 2 status to precision
 */
function mapLaunchLibraryPrecision(abbrev: string | undefined): string | null {
  if (!abbrev) return null;
  if (['Go', 'TBC'].includes(abbrev)) return 'hour';
  if (abbrev === 'TBD') return 'day';
  return 'exact';
}

/**
 * Map SpaceX date_precision to our format
 */
function mapSpaceXPrecision(precision: string): string | null {
  const precisionMap: Record<string, string> = {
    'year': 'year',
    'half': 'quarter',
    'quarter': 'quarter',
    'month': 'month',
    'day': 'day',
    'hour': 'hour',
  };
  return precisionMap[precision] || null;
}
