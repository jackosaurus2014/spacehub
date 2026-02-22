/**
 * Static fallback data for space weather API routes.
 *
 * When external APIs (NOAA SWPC, NASA DONKI) are unavailable and there is
 * no stale cache entry to serve, these conservative "quiet conditions"
 * baselines ensure the frontend always receives a well-structured response
 * rather than a 500 error.
 *
 * Values represent nominal / quiet-level space weather -- the safest
 * assumption when real-time data is unavailable.
 */

import type { SpaceWeatherSummary } from './noaa-fetcher';

// ============================================================
// Space Weather Summary (used by /api/space-weather)
// ============================================================

/**
 * Quiet-level space weather summary.
 * Kp index 1, no recent flares/storms/CMEs, geomagnetically quiet.
 */
export const FALLBACK_SPACE_WEATHER_SUMMARY: SpaceWeatherSummary & {
  conditions: string;
  kpIndex: number;
  geomagneticLevel: string;
} = {
  recentFlares: [],
  recentStorms: [],
  recentCMEs: [],
  lastUpdated: new Date().toISOString(),
  conditions: 'Quiet',
  kpIndex: 1,
  geomagneticLevel: 'quiet',
};

// ============================================================
// Solar Activity Fallback (used by /api/solar-flares)
// ============================================================

/**
 * Low-activity baseline solar conditions.
 * Reflects a typical quiet day during the current solar cycle.
 */
export const FALLBACK_SOLAR_ACTIVITY = {
  flares: [],
  forecasts: [],
  activity: {
    timestamp: new Date().toISOString(),
    solarWindSpeed: 380,        // km/s -- quiet-level solar wind
    solarWindDensity: 3.0,      // protons/cm^3
    bz: 1.5,                    // nT -- slightly northward (benign)
    bt: 4.0,                    // nT -- low total field
    kpIndex: 1,                 // quiet geomagnetic conditions
    dstIndex: -5,               // nT -- near zero (no storm)
    sunspotNumber: 60,          // moderate for Solar Cycle 25
    f107: 130,                  // 10.7 cm radio flux (moderate)
    overallStatus: 'quiet',
  },
  stats: {
    totalFlares: 0,
    last30Days: {
      xClass: 0,
      mClass: 0,
    },
    largestRecent: null,
    upcomingDangerDays: 0,
  },
};

// ============================================================
// Debris / Conjunction Fallback (used by /api/debris-monitor)
// ============================================================

/**
 * Empty conjunction list with metadata indicating fallback status.
 * The debris overview stats come from DEBRIS_STATS_SEED in debris-data.ts;
 * this fallback covers the scenario where even the database is unreachable.
 */
export const FALLBACK_DEBRIS_OVERVIEW = {
  overview: {
    stats: {
      totalTracked: 36500,
      totalPayloads: 11500,
      totalRocketBodies: 2500,
      totalDebris: 21200,
      totalUnknown: 1300,
      leoCount: 27500,
      meoCount: 1800,
      geoCount: 7200,
      kesslerRiskIndex: 5.1,
      conjunctionsPerDay: 52.7,
      avgCollisionProb: 0.00028,
      compliant25Year: 7200,
      nonCompliant: 4300,
    },
    recentConjunctions: [],
    criticalCount: 0,
    debrisByOrbit: { leo: 27500, meo: 1800, geo: 7200 },
    debrisByType: { payloads: 11500, rocketBodies: 2500, debris: 21200, unknown: 1300 },
    complianceRate: 7200 / (7200 + 4300),
  },
  conjunctions: [],
  notableDebris: [],
};
