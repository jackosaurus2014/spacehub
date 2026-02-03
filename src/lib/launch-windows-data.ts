import prisma from './db';
import { LaunchWindow, CelestialDestination, TransferType } from '@/types';

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
