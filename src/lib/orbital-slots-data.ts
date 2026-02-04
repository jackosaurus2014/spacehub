import prisma from './db';
import { OrbitalSlot, SatelliteOperator, OrbitalEvent, OrbitType, CongestionLevel, SlotAvailability, SatellitePurpose, OrbitalEventType } from '@/types';

// Seed data for orbital slots
export const ORBITAL_SLOTS_SEED = [
  {
    slug: 'leo',
    orbitType: 'LEO',
    orbitName: 'Low Earth Orbit',
    altitudeMin: 160,
    altitudeMax: 2000,
    inclinationMin: 0,
    inclinationMax: 180,
    activeSatellites: 8850,
    inactiveSatellites: 3200,
    debrisCount: 27500,
    projected1Year: 9500,
    projected5Year: 25000,
    description: 'Most congested orbital region. Home to ISS, Starlink, and thousands of observation satellites.',
    congestionLevel: 'critical',
    slotAvailability: 'limited',
  },
  {
    slug: 'meo',
    orbitType: 'MEO',
    orbitName: 'Medium Earth Orbit',
    altitudeMin: 2000,
    altitudeMax: 35786,
    inclinationMin: 0,
    inclinationMax: 65,
    activeSatellites: 156,
    inactiveSatellites: 45,
    debrisCount: 320,
    projected1Year: 180,
    projected5Year: 280,
    description: 'Home to navigation constellations (GPS, GLONASS, Galileo, BeiDou).',
    congestionLevel: 'moderate',
    slotAvailability: 'available',
  },
  {
    slug: 'geo',
    orbitType: 'GEO',
    orbitName: 'Geostationary Orbit',
    altitudeMin: 35786,
    altitudeMax: 35786,
    inclinationMin: 0,
    inclinationMax: 5,
    activeSatellites: 565,
    inactiveSatellites: 890,
    debrisCount: 450,
    projected1Year: 590,
    projected5Year: 680,
    description: 'Limited slots available. Critical for communications and weather satellites.',
    congestionLevel: 'high',
    slotAvailability: 'scarce',
  },
  {
    slug: 'heo',
    orbitType: 'HEO',
    orbitName: 'Highly Elliptical Orbit',
    altitudeMin: 500,
    altitudeMax: 40000,
    inclinationMin: 50,
    inclinationMax: 65,
    activeSatellites: 23,
    inactiveSatellites: 12,
    debrisCount: 85,
    projected1Year: 28,
    projected5Year: 45,
    description: 'Used for communications coverage of high latitudes.',
    congestionLevel: 'low',
    slotAvailability: 'available',
  },
  {
    slug: 'sso',
    orbitType: 'SSO',
    orbitName: 'Sun-Synchronous Orbit',
    altitudeMin: 600,
    altitudeMax: 800,
    inclinationMin: 97,
    inclinationMax: 99,
    activeSatellites: 1245,
    inactiveSatellites: 380,
    debrisCount: 890,
    projected1Year: 1600,
    projected5Year: 3200,
    description: 'Popular for Earth observation. Constant solar illumination angle.',
    congestionLevel: 'high',
    slotAvailability: 'limited',
  },
  {
    slug: 'molniya',
    orbitType: 'Molniya',
    orbitName: 'Molniya Orbit',
    altitudeMin: 500,
    altitudeMax: 40000,
    inclinationMin: 62,
    inclinationMax: 64,
    activeSatellites: 8,
    inactiveSatellites: 15,
    debrisCount: 25,
    projected1Year: 10,
    projected5Year: 15,
    description: 'Russian-developed orbit for high-latitude communications.',
    congestionLevel: 'low',
    slotAvailability: 'available',
  },
  {
    slug: 'lagrange',
    orbitType: 'Lagrange',
    orbitName: 'Lagrange Points',
    altitudeMin: 1500000,
    altitudeMax: 1500000,
    inclinationMin: null,
    inclinationMax: null,
    activeSatellites: 12,
    inactiveSatellites: 3,
    debrisCount: 0,
    projected1Year: 15,
    projected5Year: 25,
    description: 'Stable points for deep space observatories (JWST at L2).',
    congestionLevel: 'low',
    slotAvailability: 'available',
  },
  {
    slug: 'lunar',
    orbitType: 'Lunar',
    orbitName: 'Lunar Orbit',
    altitudeMin: 384400,
    altitudeMax: 384400,
    inclinationMin: null,
    inclinationMax: null,
    activeSatellites: 6,
    inactiveSatellites: 2,
    debrisCount: 0,
    projected1Year: 12,
    projected5Year: 45,
    description: 'Growing region for Artemis program and lunar communications.',
    congestionLevel: 'low',
    slotAvailability: 'available',
  },
];

// Top satellite operators
export const SATELLITE_OPERATORS_SEED = [
  {
    slug: 'spacex',
    name: 'SpaceX',
    country: 'USA',
    leoCount: 7200,
    meoCount: 0,
    geoCount: 0,
    otherCount: 0,
    totalActive: 7200,
    primaryPurpose: 'internet',
    constellationName: 'Starlink',
    planned1Year: 2000,
    planned5Year: 12000,
  },
  {
    slug: 'oneweb',
    name: 'OneWeb',
    country: 'UK',
    leoCount: 634,
    meoCount: 0,
    geoCount: 0,
    otherCount: 0,
    totalActive: 634,
    primaryPurpose: 'internet',
    constellationName: 'OneWeb',
    planned1Year: 150,
    planned5Year: 600,
  },
  {
    slug: 'planet-labs',
    name: 'Planet Labs',
    country: 'USA',
    leoCount: 200,
    meoCount: 0,
    geoCount: 0,
    otherCount: 0,
    totalActive: 200,
    primaryPurpose: 'earth_observation',
    constellationName: 'Dove/SuperDove',
    planned1Year: 50,
    planned5Year: 150,
  },
  {
    slug: 'ses',
    name: 'SES S.A.',
    country: 'Luxembourg',
    leoCount: 0,
    meoCount: 20,
    geoCount: 55,
    otherCount: 0,
    totalActive: 75,
    primaryPurpose: 'communications',
    constellationName: 'O3b mPOWER',
    planned1Year: 10,
    planned5Year: 25,
  },
  {
    slug: 'intelsat',
    name: 'Intelsat',
    country: 'USA',
    leoCount: 0,
    meoCount: 0,
    geoCount: 52,
    otherCount: 0,
    totalActive: 52,
    primaryPurpose: 'communications',
    constellationName: null,
    planned1Year: 5,
    planned5Year: 15,
  },
  {
    slug: 'amazon-kuiper',
    name: 'Amazon Kuiper',
    country: 'USA',
    leoCount: 2,
    meoCount: 0,
    geoCount: 0,
    otherCount: 0,
    totalActive: 2,
    primaryPurpose: 'internet',
    constellationName: 'Project Kuiper',
    planned1Year: 500,
    planned5Year: 3236,
  },
  {
    slug: 'china-satcom',
    name: 'China Satcom',
    country: 'China',
    leoCount: 45,
    meoCount: 0,
    geoCount: 35,
    otherCount: 5,
    totalActive: 85,
    primaryPurpose: 'communications',
    constellationName: null,
    planned1Year: 20,
    planned5Year: 100,
  },
  {
    slug: 'eutelsat',
    name: 'Eutelsat',
    country: 'France',
    leoCount: 0,
    meoCount: 0,
    geoCount: 36,
    otherCount: 0,
    totalActive: 36,
    primaryPurpose: 'communications',
    constellationName: null,
    planned1Year: 3,
    planned5Year: 10,
  },
];

// Upcoming orbital events
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

export const ORBITAL_EVENTS_SEED = [
  {
    eventType: 'launch',
    orbitType: 'LEO',
    expectedDate: daysFromNow(3),
    dateConfidence: 'confirmed',
    satelliteCount: 23,
    operatorName: 'SpaceX',
    missionName: 'Starlink Group 8-15',
    description: 'Falcon 9 deployment of 23 Starlink v2 Mini satellites.',
  },
  {
    eventType: 'launch',
    orbitType: 'GEO',
    expectedDate: daysFromNow(7),
    dateConfidence: 'confirmed',
    satelliteCount: 1,
    operatorName: 'SES',
    missionName: 'SES-26',
    description: 'Ariane 6 deployment of communications satellite.',
  },
  {
    eventType: 'launch',
    orbitType: 'LEO',
    expectedDate: daysFromNow(14),
    dateConfidence: 'tentative',
    satelliteCount: 36,
    operatorName: 'OneWeb',
    missionName: 'OneWeb-21',
    description: 'Expansion of OneWeb internet constellation.',
  },
  {
    eventType: 'launch',
    orbitType: 'SSO',
    expectedDate: daysFromNow(21),
    dateConfidence: 'confirmed',
    satelliteCount: 8,
    operatorName: 'Planet Labs',
    missionName: 'SuperDove-52',
    description: 'Earth observation satellite deployment.',
  },
  {
    eventType: 'conjunction',
    orbitType: 'LEO',
    expectedDate: daysFromNow(5),
    dateConfidence: 'estimated',
    satelliteCount: 2,
    operatorName: null,
    missionName: 'Close Approach Event',
    description: 'Predicted close approach between Starlink and defunct satellite. Maneuver likely.',
  },
  {
    eventType: 'reentry',
    orbitType: 'LEO',
    expectedDate: daysFromNow(12),
    dateConfidence: 'estimated',
    satelliteCount: 1,
    operatorName: null,
    missionName: 'Cosmos 2251 Debris',
    description: 'Controlled reentry of debris from 2009 collision.',
  },
];

// Initialize orbital data
export async function initializeOrbitalData() {
  const results = {
    slotsCreated: 0,
    operatorsCreated: 0,
    eventsCreated: 0,
  };

  // Create orbital slots
  for (const slotData of ORBITAL_SLOTS_SEED) {
    const existing = await prisma.orbitalSlot.findUnique({
      where: { slug: slotData.slug },
    });

    if (!existing) {
      await prisma.orbitalSlot.create({
        data: slotData,
      });
      results.slotsCreated++;
    }
  }

  // Create operators
  for (const operatorData of SATELLITE_OPERATORS_SEED) {
    const existing = await prisma.satelliteOperator.findUnique({
      where: { slug: operatorData.slug },
    });

    if (!existing) {
      await prisma.satelliteOperator.create({
        data: operatorData,
      });
      results.operatorsCreated++;
    }
  }

  // Create events (clear old ones first)
  await prisma.orbitalEvent.deleteMany({});

  for (const eventData of ORBITAL_EVENTS_SEED) {
    await prisma.orbitalEvent.create({
      data: eventData,
    });
    results.eventsCreated++;
  }

  return results;
}

// Query functions
export async function getOrbitalSlots(): Promise<OrbitalSlot[]> {
  const slots = await prisma.orbitalSlot.findMany({
    orderBy: { activeSatellites: 'desc' },
  });

  return slots.map(s => ({
    ...s,
    orbitType: s.orbitType as OrbitType,
    congestionLevel: s.congestionLevel as CongestionLevel | null,
    slotAvailability: s.slotAvailability as SlotAvailability | null,
  }));
}

export async function getTopOperators(limit = 10): Promise<SatelliteOperator[]> {
  const operators = await prisma.satelliteOperator.findMany({
    orderBy: { totalActive: 'desc' },
    take: limit,
  });

  return operators.map(o => ({
    ...o,
    primaryPurpose: o.primaryPurpose as SatellitePurpose | null,
  }));
}

export async function getUpcomingEvents(days = 30): Promise<OrbitalEvent[]> {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const events = await prisma.orbitalEvent.findMany({
    where: {
      expectedDate: {
        gte: new Date(),
        lte: endDate,
      },
    },
    orderBy: { expectedDate: 'asc' },
  });

  return events.map(e => ({
    ...e,
    eventType: e.eventType as OrbitalEventType,
  }));
}

export async function getOrbitalStats() {
  const slots = await prisma.orbitalSlot.findMany();

  const totalActive = slots.reduce((sum, s) => sum + s.activeSatellites, 0);
  const totalInactive = slots.reduce((sum, s) => sum + s.inactiveSatellites, 0);
  const totalDebris = slots.reduce((sum, s) => sum + s.debrisCount, 0);
  const projected1Year = slots.reduce((sum, s) => sum + s.projected1Year, 0);
  const projected5Year = slots.reduce((sum, s) => sum + s.projected5Year, 0);

  const operators = await prisma.satelliteOperator.findMany({
    orderBy: { totalActive: 'desc' },
    take: 5,
  });

  const upcomingLaunches = await prisma.orbitalEvent.count({
    where: {
      eventType: 'launch',
      expectedDate: { gte: new Date() },
    },
  });

  return {
    totalActive,
    totalInactive,
    totalDebris,
    totalObjects: totalActive + totalInactive + totalDebris,
    projected1Year,
    projected5Year,
    growth1Year: projected1Year - totalActive,
    growth5Year: projected5Year - totalActive,
    topOperators: operators.map(o => ({
      name: o.name,
      count: o.totalActive,
      constellation: o.constellationName,
    })),
    upcomingLaunches,
  };
}
