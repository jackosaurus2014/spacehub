import prisma from './db';
import { SolarFlare, SolarForecast, SolarActivity, FlareClassification, RiskLevel, ImpactLevel, GeomagneticLevel, SolarStatus } from '@/types';

// Helper to generate dates relative to now
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const daysAgo = (days: number) => daysFromNow(-days);

// Recent solar flares (historical data)
export const SOLAR_FLARES_SEED = [
  {
    flareId: 'SOL2026-01-28-X2.5',
    classification: 'X',
    intensity: 2.5,
    startTime: daysAgo(5),
    peakTime: daysAgo(5),
    endTime: daysAgo(5),
    activeRegion: 'AR3901',
    sourceLocation: 'S15W23',
    radioBlackout: 'strong',
    solarRadiation: 'moderate',
    geomagneticStorm: 'strong',
    description: 'Major X2.5 flare produced significant radio blackouts across the Pacific region.',
    linkedCME: true,
  },
  {
    flareId: 'SOL2026-01-25-M7.8',
    classification: 'M',
    intensity: 7.8,
    startTime: daysAgo(8),
    peakTime: daysAgo(8),
    endTime: daysAgo(8),
    activeRegion: 'AR3901',
    sourceLocation: 'S12W10',
    radioBlackout: 'moderate',
    solarRadiation: 'minor',
    geomagneticStorm: 'minor',
    description: 'Strong M-class flare from the same active region.',
    linkedCME: false,
  },
  {
    flareId: 'SOL2026-01-20-X1.1',
    classification: 'X',
    intensity: 1.1,
    startTime: daysAgo(13),
    peakTime: daysAgo(13),
    endTime: daysAgo(13),
    activeRegion: 'AR3898',
    sourceLocation: 'N08E45',
    radioBlackout: 'moderate',
    solarRadiation: 'minor',
    geomagneticStorm: 'moderate',
    description: 'X1.1 flare caused minor disruptions to HF radio communications.',
    linkedCME: true,
  },
  {
    flareId: 'SOL2026-01-15-M5.2',
    classification: 'M',
    intensity: 5.2,
    startTime: daysAgo(18),
    peakTime: daysAgo(18),
    endTime: daysAgo(18),
    activeRegion: 'AR3895',
    sourceLocation: 'S22W67',
    radioBlackout: 'minor',
    solarRadiation: 'none',
    geomagneticStorm: 'none',
    description: 'M5.2 flare with limited Earth impact due to limb location.',
    linkedCME: false,
  },
  {
    flareId: 'SOL2026-01-10-C9.4',
    classification: 'C',
    intensity: 9.4,
    startTime: daysAgo(23),
    peakTime: daysAgo(23),
    endTime: daysAgo(23),
    activeRegion: 'AR3892',
    sourceLocation: 'N15W30',
    radioBlackout: 'none',
    solarRadiation: 'none',
    geomagneticStorm: 'none',
    description: 'Strong C-class flare with no significant Earth effects.',
    linkedCME: false,
  },
  {
    flareId: 'SOL2026-01-05-X5.0',
    classification: 'X',
    intensity: 5.0,
    startTime: daysAgo(28),
    peakTime: daysAgo(28),
    endTime: daysAgo(28),
    activeRegion: 'AR3888',
    sourceLocation: 'S10E05',
    radioBlackout: 'severe',
    solarRadiation: 'strong',
    geomagneticStorm: 'severe',
    description: 'Major X5.0 flare - one of the largest of Solar Cycle 25. Caused widespread radio blackouts and satellite anomalies.',
    linkedCME: true,
  },
];

// 90-day forecast data
export const SOLAR_FORECASTS_SEED = (() => {
  const forecasts = [];

  for (let day = 0; day <= 90; day++) {
    // Simulate varying solar activity with some patterns
    const baseActivity = Math.sin(day / 27 * Math.PI * 2) * 20 + 50; // 27-day solar rotation
    const randomVariation = Math.random() * 15 - 7.5;

    const probC = Math.min(99, Math.max(10, Math.round(baseActivity + randomVariation)));
    const probM = Math.min(80, Math.max(5, Math.round((baseActivity - 20) * 0.5 + randomVariation)));
    const probX = Math.min(40, Math.max(1, Math.round((baseActivity - 40) * 0.2 + randomVariation * 0.5)));

    // Determine risk level based on X-class probability
    let riskLevel: RiskLevel = 'low';
    let alertActive = false;

    if (probX >= 30) {
      riskLevel = 'extreme';
      alertActive = true;
    } else if (probX >= 20) {
      riskLevel = 'severe';
      alertActive = true;
    } else if (probX >= 10) {
      riskLevel = 'high';
      alertActive = true;
    } else if (probM >= 50) {
      riskLevel = 'moderate';
    }

    // Add some specific danger periods
    const isDangerPeriod = (day >= 15 && day <= 20) || (day >= 45 && day <= 50) || (day >= 70 && day <= 75);

    if (isDangerPeriod) {
      forecasts.push({
        forecastDate: daysFromNow(day),
        issueDate: new Date(),
        probC: Math.min(99, probC + 20),
        probM: Math.min(85, probM + 25),
        probX: Math.min(50, probX + 15),
        probProton: probX >= 15 ? Math.round(probX * 0.6) : null,
        kpIndex: Math.min(9, 4 + (probX / 10)),
        geomagneticLevel: probX >= 20 ? 'storm' : 'active',
        riskLevel: probX >= 25 ? 'extreme' : 'severe',
        alertActive: true,
        activeRegions: ['AR3905', 'AR3908'],
        notes: `Enhanced solar activity expected. Active regions showing increased complexity.`,
      });
    } else {
      forecasts.push({
        forecastDate: daysFromNow(day),
        issueDate: new Date(),
        probC,
        probM,
        probX,
        probProton: probX >= 10 ? Math.round(probX * 0.4) : null,
        kpIndex: 2 + (probM / 30),
        geomagneticLevel: probM >= 40 ? 'active' : probM >= 20 ? 'unsettled' : 'quiet',
        riskLevel,
        alertActive,
        activeRegions: day % 10 === 0 ? ['AR3905'] : null,
        notes: null,
      });
    }
  }

  return forecasts;
})();

// Current solar activity
export const CURRENT_ACTIVITY_SEED = {
  timestamp: new Date(),
  solarWindSpeed: 425 + Math.random() * 100,
  solarWindDensity: 3.5 + Math.random() * 4,
  bz: -2 + Math.random() * 6, // -2 to +4 nT
  bt: 5 + Math.random() * 5,
  kpIndex: 2 + Math.random() * 3,
  dstIndex: -15 + Math.random() * 30,
  sunspotNumber: Math.round(80 + Math.random() * 60),
  f107: 140 + Math.random() * 40,
  overallStatus: 'active',
};

// Initialize solar flare data
export async function initializeSolarFlareData() {
  const results = {
    flaresCreated: 0,
    forecastsCreated: 0,
    activityCreated: false,
  };

  // Create solar flares
  for (const flareData of SOLAR_FLARES_SEED) {
    const existing = await prisma.solarFlare.findUnique({
      where: { flareId: flareData.flareId },
    });

    if (!existing) {
      await prisma.solarFlare.create({
        data: flareData,
      });
      results.flaresCreated++;
    }
  }

  // Create forecasts (clear old ones first)
  await prisma.solarForecast.deleteMany({});

  for (const forecastData of SOLAR_FORECASTS_SEED) {
    await prisma.solarForecast.create({
      data: {
        ...forecastData,
        activeRegions: forecastData.activeRegions ? JSON.stringify(forecastData.activeRegions) : null,
      },
    });
    results.forecastsCreated++;
  }

  // Create current activity
  const existingActivity = await prisma.solarActivity.findFirst({
    orderBy: { timestamp: 'desc' },
  });

  if (!existingActivity || (Date.now() - existingActivity.timestamp.getTime()) > 3600000) {
    await prisma.solarActivity.create({
      data: CURRENT_ACTIVITY_SEED,
    });
    results.activityCreated = true;
  }

  return results;
}

// Query functions
export async function getRecentSolarFlares(limit = 10): Promise<SolarFlare[]> {
  const flares = await prisma.solarFlare.findMany({
    orderBy: { startTime: 'desc' },
    take: limit,
  });

  return flares.map(f => ({
    ...f,
    classification: f.classification as FlareClassification,
    radioBlackout: f.radioBlackout as ImpactLevel | null,
    solarRadiation: f.solarRadiation as ImpactLevel | null,
    geomagneticStorm: f.geomagneticStorm as ImpactLevel | null,
  }));
}

export async function getSolarForecasts(days = 90): Promise<SolarForecast[]> {
  const now = new Date();
  const endDate = daysFromNow(days);

  const forecasts = await prisma.solarForecast.findMany({
    where: {
      forecastDate: {
        gte: now,
        lte: endDate,
      },
    },
    orderBy: { forecastDate: 'asc' },
  });

  return forecasts.map(f => ({
    ...f,
    riskLevel: f.riskLevel as RiskLevel,
    geomagneticLevel: f.geomagneticLevel as GeomagneticLevel | null,
    activeRegions: f.activeRegions ? JSON.parse(f.activeRegions) : null,
  }));
}

export async function getDangerForecasts(): Promise<SolarForecast[]> {
  const now = new Date();
  const endDate = daysFromNow(90);

  const forecasts = await prisma.solarForecast.findMany({
    where: {
      forecastDate: {
        gte: now,
        lte: endDate,
      },
      riskLevel: {
        in: ['high', 'severe', 'extreme'],
      },
    },
    orderBy: { forecastDate: 'asc' },
  });

  return forecasts.map(f => ({
    ...f,
    riskLevel: f.riskLevel as RiskLevel,
    geomagneticLevel: f.geomagneticLevel as GeomagneticLevel | null,
    activeRegions: f.activeRegions ? JSON.parse(f.activeRegions) : null,
  }));
}

export async function getCurrentSolarActivity(): Promise<SolarActivity | null> {
  const activity = await prisma.solarActivity.findFirst({
    orderBy: { timestamp: 'desc' },
  });

  if (!activity) return null;

  return {
    ...activity,
    overallStatus: activity.overallStatus as SolarStatus,
  };
}

export async function getSolarFlareStats() {
  const thirtyDaysAgo = daysAgo(30);

  const [
    totalFlares,
    xClassCount,
    mClassCount,
    recentFlares,
    upcomingDangerDays,
  ] = await Promise.all([
    prisma.solarFlare.count(),
    prisma.solarFlare.count({
      where: {
        classification: 'X',
        startTime: { gte: thirtyDaysAgo },
      },
    }),
    prisma.solarFlare.count({
      where: {
        classification: 'M',
        startTime: { gte: thirtyDaysAgo },
      },
    }),
    prisma.solarFlare.findMany({
      where: { startTime: { gte: thirtyDaysAgo } },
      orderBy: { intensity: 'desc' },
      take: 1,
    }),
    prisma.solarForecast.count({
      where: {
        forecastDate: { gte: new Date(), lte: daysFromNow(90) },
        riskLevel: { in: ['high', 'severe', 'extreme'] },
      },
    }),
  ]);

  const largestRecent = recentFlares[0] || null;

  return {
    totalFlares,
    last30Days: {
      xClass: xClassCount,
      mClass: mClassCount,
    },
    largestRecent: largestRecent ? {
      classification: largestRecent.classification,
      intensity: largestRecent.intensity,
      date: largestRecent.startTime,
    } : null,
    upcomingDangerDays,
  };
}
