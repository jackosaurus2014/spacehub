import prisma from './db';
import { DebrisObject, ConjunctionEvent, DebrisStats, DebrisObjectType, ConjunctionRisk, DebrisSize } from '@/types';

// Helper to generate dates relative to now
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Stable snapshot date for upsert (midnight today UTC)
const snapshotDate = (() => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
})();

// ============================================================
// Seed Data: DebrisStats
// ============================================================
export const DEBRIS_STATS_SEED = {
  snapshotDate,
  totalTracked: 34500,
  totalPayloads: 10200,
  totalRocketBodies: 2300,
  totalDebris: 20800,
  totalUnknown: 1200,
  leoCount: 26000,
  meoCount: 1500,
  geoCount: 7000,
  kesslerRiskIndex: 4.7,
  conjunctionsPerDay: 45.3,
  avgCollisionProb: 0.00023,
  compliant25Year: 6500,
  nonCompliant: 3700,
};

// ============================================================
// Seed Data: ConjunctionEvent
// ============================================================
export const CONJUNCTION_EVENTS_SEED = [
  {
    eventTime: daysFromNow(1),
    probability: 0.045,
    missDistance: 58,
    primaryObject: 'Starlink-2814',
    secondaryObject: 'COSMOS 1408 Debris (DEB-47)',
    primaryType: 'payload',
    secondaryType: 'debris',
    altitude: 550,
    orbitType: 'LEO',
    riskLevel: 'critical',
    maneuverRequired: true,
    maneuverExecuted: false,
    description: 'Critical conjunction between active Starlink satellite and debris from the Nov 2021 Russian ASAT test on COSMOS 1408. Avoidance maneuver planned.',
  },
  {
    eventTime: daysFromNow(3),
    probability: 0.032,
    missDistance: 112,
    primaryObject: 'ISS (ZARYA)',
    secondaryObject: 'Fengyun-1C Debris (DEB-192)',
    primaryType: 'payload',
    secondaryType: 'debris',
    altitude: 420,
    orbitType: 'LEO',
    riskLevel: 'critical',
    maneuverRequired: true,
    maneuverExecuted: false,
    description: 'ISS close approach with debris fragment from the 2007 Chinese ASAT test. Pre-determined avoidance maneuver (PDAM) under evaluation.',
  },
  {
    eventTime: daysFromNow(-1),
    probability: 0.012,
    missDistance: 245,
    primaryObject: 'Sentinel-6A',
    secondaryObject: 'CZ-4C Rocket Body (R/B)',
    primaryType: 'payload',
    secondaryType: 'rocket_body',
    altitude: 1336,
    orbitType: 'LEO',
    riskLevel: 'high',
    maneuverRequired: true,
    maneuverExecuted: true,
    description: 'Sentinel-6A successfully maneuvered to avoid spent Chinese Long March 4C upper stage.',
  },
  {
    eventTime: daysFromNow(5),
    probability: 0.0085,
    missDistance: 380,
    primaryObject: 'OneWeb-0347',
    secondaryObject: 'SL-16 Rocket Body',
    primaryType: 'payload',
    secondaryType: 'rocket_body',
    altitude: 1200,
    orbitType: 'LEO',
    riskLevel: 'high',
    maneuverRequired: true,
    maneuverExecuted: false,
    description: 'OneWeb satellite at risk of collision with derelict Soviet-era Zenit-2 upper stage. Maneuver being coordinated.',
  },
  {
    eventTime: daysFromNow(-2),
    probability: 0.0023,
    missDistance: 890,
    primaryObject: 'NOAA-19',
    secondaryObject: 'COSMOS 2251 Debris (DEB-15)',
    primaryType: 'payload',
    secondaryType: 'debris',
    altitude: 870,
    orbitType: 'LEO',
    riskLevel: 'moderate',
    maneuverRequired: false,
    maneuverExecuted: false,
    description: 'Close approach between NOAA weather satellite and debris from the 2009 Iridium-COSMOS collision. Monitoring continues.',
  },
  {
    eventTime: daysFromNow(7),
    probability: 0.0014,
    missDistance: 1250,
    primaryObject: 'Starlink-5192',
    secondaryObject: 'Ariane 5 Debris (DEB-03)',
    primaryType: 'payload',
    secondaryType: 'debris',
    altitude: 540,
    orbitType: 'LEO',
    riskLevel: 'moderate',
    maneuverRequired: false,
    maneuverExecuted: false,
    description: 'Predicted conjunction with Ariane 5 upper stage fragment. Probability below maneuver threshold but under observation.',
  },
  {
    eventTime: daysFromNow(10),
    probability: 0.00045,
    missDistance: 2800,
    primaryObject: 'TerraSAR-X',
    secondaryObject: 'Breeze-M Debris (DEB-08)',
    primaryType: 'payload',
    secondaryType: 'debris',
    altitude: 514,
    orbitType: 'LEO',
    riskLevel: 'low',
    maneuverRequired: false,
    maneuverExecuted: false,
    description: 'Low-risk conjunction between German radar satellite and Breeze-M upper stage debris. No action required.',
  },
  {
    eventTime: daysFromNow(14),
    probability: 0.00012,
    missDistance: 4800,
    primaryObject: 'CryoSat-2',
    secondaryObject: 'COSMOS 2421 Debris (DEB-22)',
    primaryType: 'payload',
    secondaryType: 'debris',
    altitude: 717,
    orbitType: 'LEO',
    riskLevel: 'low',
    maneuverRequired: false,
    maneuverExecuted: false,
    description: 'Routine conjunction screening flagged this event. Distance well beyond maneuver threshold.',
  },
];

// ============================================================
// Seed Data: DebrisObject
// ============================================================
export const DEBRIS_OBJECTS_SEED = [
  // Payloads (inactive)
  {
    noradId: '32382',
    name: 'Envisat',
    objectType: 'payload',
    orbitType: 'LEO',
    altitude: 766,
    inclination: 98.4,
    eccentricity: 0.0001,
    size: 'large',
    mass: 8000,
    originMission: 'Envisat (Earth Observation)',
    originCountry: 'Europe',
    originYear: 2002,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: '13552',
    name: 'COSMOS 1408',
    objectType: 'payload',
    orbitType: 'LEO',
    altitude: 485,
    inclination: 82.6,
    eccentricity: 0.0015,
    size: 'large',
    mass: 2200,
    originMission: 'COSMOS 1408 (ELINT)',
    originCountry: 'Russia',
    originYear: 1982,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: '07337',
    name: 'NOAA 6 (Decommissioned)',
    objectType: 'payload',
    orbitType: 'LEO',
    altitude: 820,
    inclination: 98.7,
    eccentricity: 0.0012,
    size: 'large',
    mass: 1420,
    originMission: 'NOAA 6 (Weather)',
    originCountry: 'USA',
    originYear: 1979,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  // Rocket bodies
  {
    noradId: '48275',
    name: 'CZ-5B Rocket Body',
    objectType: 'rocket_body',
    orbitType: 'LEO',
    altitude: 350,
    inclination: 41.5,
    eccentricity: 0.0008,
    size: 'large',
    mass: 21000,
    originMission: 'Tianhe Core Module Launch',
    originCountry: 'China',
    originYear: 2021,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: '16182',
    name: 'SL-16 Rocket Body (Zenit-2)',
    objectType: 'rocket_body',
    orbitType: 'LEO',
    altitude: 850,
    inclination: 71.0,
    eccentricity: 0.002,
    size: 'large',
    mass: 8900,
    originMission: 'COSMOS 1833 Launch',
    originCountry: 'Russia',
    originYear: 1987,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: '28945',
    name: 'Ariane 5 Upper Stage (EPC)',
    objectType: 'rocket_body',
    orbitType: 'GEO',
    altitude: 35786,
    inclination: 1.8,
    eccentricity: 0.0003,
    size: 'large',
    mass: 3300,
    originMission: 'Intelsat 10-02 Launch',
    originCountry: 'Europe',
    originYear: 2004,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  // Debris fragments
  {
    noradId: '36411',
    name: 'Fengyun-1C Debris (DEB-0192)',
    objectType: 'debris',
    orbitType: 'LEO',
    altitude: 865,
    inclination: 99.1,
    eccentricity: 0.006,
    size: 'medium',
    mass: 1.5,
    originMission: 'Fengyun-1C ASAT Test',
    originCountry: 'China',
    originYear: 2007,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: '34454',
    name: 'Iridium 33 / COSMOS 2251 Debris (DEB-015)',
    objectType: 'debris',
    orbitType: 'LEO',
    altitude: 780,
    inclination: 86.4,
    eccentricity: 0.004,
    size: 'small',
    mass: 0.3,
    originMission: 'Iridium 33 / COSMOS 2251 Collision',
    originCountry: 'Russia',
    originYear: 2009,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: '49793',
    name: 'COSMOS 1408 Debris (DEB-047)',
    objectType: 'debris',
    orbitType: 'LEO',
    altitude: 490,
    inclination: 82.5,
    eccentricity: 0.003,
    size: 'medium',
    mass: 0.8,
    originMission: 'COSMOS 1408 ASAT Test',
    originCountry: 'Russia',
    originYear: 2021,
    isActive: false,
    trackable: true,
    deorbitDate: null,
  },
  {
    noradId: null,
    name: 'PSLV Debris Fragment',
    objectType: 'debris',
    orbitType: 'LEO',
    altitude: 680,
    inclination: 97.8,
    eccentricity: 0.011,
    size: 'small',
    mass: 0.1,
    originMission: 'PSLV-C3 Mission',
    originCountry: 'India',
    originYear: 2001,
    isActive: false,
    trackable: true,
    deorbitDate: daysFromNow(365),
  },
];

// ============================================================
// Initialize debris data
// ============================================================
export async function initializeDebrisData() {
  const results = {
    statsCreated: false,
    conjunctionsCreated: 0,
    debrisObjectsCreated: 0,
  };

  // Upsert debris stats using snapshotDate as unique constraint
  await prisma.debrisStats.upsert({
    where: { snapshotDate: DEBRIS_STATS_SEED.snapshotDate },
    update: {
      totalTracked: DEBRIS_STATS_SEED.totalTracked,
      totalPayloads: DEBRIS_STATS_SEED.totalPayloads,
      totalRocketBodies: DEBRIS_STATS_SEED.totalRocketBodies,
      totalDebris: DEBRIS_STATS_SEED.totalDebris,
      totalUnknown: DEBRIS_STATS_SEED.totalUnknown,
      leoCount: DEBRIS_STATS_SEED.leoCount,
      meoCount: DEBRIS_STATS_SEED.meoCount,
      geoCount: DEBRIS_STATS_SEED.geoCount,
      kesslerRiskIndex: DEBRIS_STATS_SEED.kesslerRiskIndex,
      conjunctionsPerDay: DEBRIS_STATS_SEED.conjunctionsPerDay,
      avgCollisionProb: DEBRIS_STATS_SEED.avgCollisionProb,
      compliant25Year: DEBRIS_STATS_SEED.compliant25Year,
      nonCompliant: DEBRIS_STATS_SEED.nonCompliant,
    },
    create: DEBRIS_STATS_SEED,
  });
  results.statsCreated = true;

  // Clear and recreate conjunction events (time-sensitive data)
  await prisma.conjunctionEvent.deleteMany({});

  for (const eventData of CONJUNCTION_EVENTS_SEED) {
    await prisma.conjunctionEvent.create({
      data: eventData,
    });
    results.conjunctionsCreated++;
  }

  // Upsert debris objects by noradId or name
  for (const debrisData of DEBRIS_OBJECTS_SEED) {
    if (debrisData.noradId) {
      const existing = await prisma.debrisObject.findUnique({
        where: { noradId: debrisData.noradId },
      });

      if (!existing) {
        await prisma.debrisObject.create({ data: debrisData });
        results.debrisObjectsCreated++;
      }
    } else {
      const existing = await prisma.debrisObject.findFirst({
        where: { name: debrisData.name },
      });

      if (!existing) {
        await prisma.debrisObject.create({ data: debrisData });
        results.debrisObjectsCreated++;
      }
    }
  }

  return results;
}

// ============================================================
// Query Functions
// ============================================================

/**
 * Get the latest debris statistics snapshot.
 */
export async function getDebrisStats(): Promise<DebrisStats | null> {
  const stats = await prisma.debrisStats.findFirst({
    orderBy: { snapshotDate: 'desc' },
  });

  return stats;
}

/**
 * Get conjunction events, optionally filtered by risk level with a limit.
 */
export async function getConjunctionEvents(options?: {
  riskLevel?: ConjunctionRisk;
  limit?: number;
}): Promise<ConjunctionEvent[]> {
  const where: Record<string, unknown> = {};

  if (options?.riskLevel) {
    where.riskLevel = options.riskLevel;
  }

  const events = await prisma.conjunctionEvent.findMany({
    where,
    orderBy: { eventTime: 'asc' },
    ...(options?.limit ? { take: options.limit } : {}),
  });

  return events.map(e => ({
    ...e,
    riskLevel: e.riskLevel as ConjunctionRisk,
  }));
}

/**
 * Get the most notable (largest/most massive) tracked debris objects.
 */
export async function getNotableDebris(limit = 10): Promise<DebrisObject[]> {
  const objects = await prisma.debrisObject.findMany({
    orderBy: [
      { mass: 'desc' },
    ],
    take: limit,
  });

  return objects.map(o => ({
    ...o,
    objectType: o.objectType as DebrisObjectType,
    size: o.size as DebrisSize | null,
  }));
}

/**
 * Get a comprehensive debris overview for dashboard display.
 */
export async function getDebrisOverview(): Promise<{
  stats: DebrisStats | null;
  recentConjunctions: ConjunctionEvent[];
  criticalCount: number;
  debrisByOrbit: { leo: number; meo: number; geo: number };
  debrisByType: { payloads: number; rocketBodies: number; debris: number; unknown: number };
  complianceRate: number | null;
}> {
  const [stats, recentConjunctions, criticalCount] = await Promise.all([
    getDebrisStats(),
    getConjunctionEvents({ limit: 5 }),
    prisma.conjunctionEvent.count({
      where: { riskLevel: 'critical' },
    }),
  ]);

  const debrisByOrbit = stats
    ? { leo: stats.leoCount, meo: stats.meoCount, geo: stats.geoCount }
    : { leo: 0, meo: 0, geo: 0 };

  const debrisByType = stats
    ? {
        payloads: stats.totalPayloads,
        rocketBodies: stats.totalRocketBodies,
        debris: stats.totalDebris,
        unknown: stats.totalUnknown,
      }
    : { payloads: 0, rocketBodies: 0, debris: 0, unknown: 0 };

  const complianceRate =
    stats && stats.compliant25Year !== null && stats.nonCompliant !== null
      ? stats.compliant25Year / (stats.compliant25Year + stats.nonCompliant)
      : null;

  return {
    stats,
    recentConjunctions,
    criticalCount,
    debrisByOrbit,
    debrisByType,
    complianceRate,
  };
}
