export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validationError, internalError } from '@/lib/errors';
import { parseTLE, tleToLatLng } from '@/lib/satellite-propagator';
import type { TLEData } from '@/lib/satellite-propagator';
import { fetchTLE, predictPasses } from '@/lib/satellite-pass-predictor';
import type { TLESatellite } from '@/app/api/satellites/tle/route';

/**
 * GET /api/whats-overhead?lat=<number>&lon=<number>
 *
 * Real satellite-overhead computation for a ground observer:
 *   1. "Currently overhead" — reuses the CelesTrak-backed TLE dataset from
 *      `/api/satellites/tle` (stations + active groups, 6h upstream cache),
 *      then re-propagates each object's position for *this* request's exact
 *      timestamp and computes elevation/slant-range for the observer with
 *      the same simplified SGP4-lite geometry used across the site
 *      (`satellite-propagator.ts`). No random or fabricated values.
 *   2. "Upcoming visible passes" — real pass prediction (see
 *      `satellite-pass-predictor.ts`) for a fixed, honest shortlist:
 *      ISS, CSS (Tiangong), and Hubble. We do not attempt full-sky pass
 *      prediction for every tracked object — that would be too heavy for a
 *      live request — so this section explicitly covers only those three.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const EARTH_RADIUS_KM = 6371;

interface Geometry {
  elevation: number;
  distance: number;
  altitude: number;
}

/** Elevation (deg) + slant range (km) for a satellite over a ground observer. */
function observerGeometry(
  tle: TLEData,
  observerLat: number,
  observerLng: number,
  date: Date
): Geometry {
  const pos = tleToLatLng(tle, date);

  const dLat = (pos.lat - observerLat) * DEG2RAD;
  const dLng = (pos.lng - observerLng) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(observerLat * DEG2RAD) *
      Math.cos(pos.lat * DEG2RAD) *
      Math.sin(dLng / 2) ** 2;
  const earthAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const R = EARTH_RADIUS_KM;
  const h = pos.altitude;

  let elevation: number;
  if (earthAngle < 1e-10) {
    elevation = 90;
  } else {
    const rRatio = R / (R + h);
    elevation =
      Math.atan2(Math.cos(earthAngle) - rRatio, Math.sin(earthAngle)) * RAD2DEG;
  }

  const distance = Math.sqrt(
    R * R + (R + h) * (R + h) - 2 * R * (R + h) * Math.cos(earthAngle)
  );

  return { elevation, distance, altitude: h };
}

const NAME_TYPE_RULES: [RegExp, string][] = [
  [/STARLINK/i, 'Starlink'],
  [/ONEWEB/i, 'OneWeb'],
  [/GPS|NAVSTAR/i, 'GPS'],
  [/IRIDIUM/i, 'Iridium'],
  [/ISS|ZARYA/i, 'ISS'],
  [/CSS|TIANHE|TIANGONG/i, 'Tiangong'],
  [/HST|HUBBLE/i, 'Hubble'],
  [/GOES|METEOSAT|NOAA/i, 'Weather'],
  [/DEB\b|DEBRIS/i, 'Debris'],
];

function classify(name: string): string {
  for (const [re, label] of NAME_TYPE_RULES) {
    if (re.test(name)) return label;
  }
  return 'Satellite';
}

/** Brightness bucket derived from real elevation (higher = brighter/closer to zenith). */
function brightnessFor(elevation: number): string {
  if (elevation > 60) return 'Bright';
  if (elevation > 30) return 'Dim';
  return 'Faint';
}

// Fixed, honest shortlist for real pass prediction. Resolved via the alias
// map in `satellite-pass-predictor.ts` (ISS, CSS, HST all present there).
const PASS_SHORTLIST: { id: string; label: string }[] = [
  { id: 'ISS', label: 'ISS (ZARYA)' },
  { id: 'CSS', label: 'CSS (Tiangong)' },
  { id: 'HST', label: 'Hubble Space Telescope' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return validationError('lat must be a number between -90 and 90');
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return validationError('lon must be a number between -180 and 180');
    }

    // Reuse the existing CelesTrak-backed dataset + cache instead of
    // duplicating fetch/cache logic.
    const origin = req.nextUrl.origin;
    let dataset: TLESatellite[] = [];
    let datasetSource = 'unavailable';
    try {
      const tleRes = await fetch(`${origin}/api/satellites/tle?limit=500`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (tleRes.ok) {
        const json = await tleRes.json();
        dataset = Array.isArray(json.data) ? json.data : [];
        datasetSource = json._meta?.source || 'celestrak';
      }
    } catch (err) {
      logger.warn('whats-overhead: failed to load TLE dataset', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const now = new Date();
    const overhead = dataset
      .map((sat) => {
        try {
          const tle = parseTLE(sat.tle.line1, sat.tle.line2, sat.name);
          const geo = observerGeometry(tle, lat, lon, now);
          return {
            name: sat.name,
            noradId: sat.noradId,
            elevation: Math.round(geo.elevation),
            distance: Math.round(geo.distance),
            altitude: Math.round(geo.altitude),
            brightness: brightnessFor(geo.elevation),
            type: classify(sat.name),
            orbitClass: sat.orbitClass,
          };
        } catch {
          return null;
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null && s.elevation >= 0)
      .sort((a, b) => b.elevation - a.elevation);

    // Real upcoming-pass prediction for the honest shortlist only.
    const upcomingPasses: {
      name: string;
      startTime: string;
      maxElevation: number;
      durationMinutes: number;
    }[] = [];

    for (const { id, label } of PASS_SHORTLIST) {
      try {
        const tle = await fetchTLE(id);
        if (!tle) continue;
        const passes = predictPasses(tle, lat, lon, now, 72, 30, 10);
        for (const p of passes) {
          upcomingPasses.push({
            name: tle.name || label,
            startTime: p.startTime,
            maxElevation: p.maxElevation,
            durationMinutes: Math.round(p.durationSeconds / 60),
          });
        }
      } catch (err) {
        logger.warn('whats-overhead: pass prediction failed', {
          id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    upcomingPasses.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    return NextResponse.json({
      success: true,
      data: {
        observer: { lat, lon },
        overhead,
        overheadCount: overhead.length,
        upcomingPasses: upcomingPasses.slice(0, 8),
        coverage: {
          overheadDataset:
            'CelesTrak "stations" + "active" groups (tracked catalog subset, capped at 500 objects), elevation computed live for your exact location and time using a simplified SGP4-lite propagator.',
          passesShortlist: PASS_SHORTLIST.map((s) => s.label),
        },
      },
      _meta: {
        source: datasetSource,
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Failed to compute whats-overhead data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to compute overhead satellite data');
  }
}
