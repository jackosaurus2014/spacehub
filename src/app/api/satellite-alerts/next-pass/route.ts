import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { validationError, internalError } from '@/lib/errors';
import { fetchTLE, predictPasses } from '@/lib/satellite-pass-predictor';

export const dynamic = 'force-dynamic';

/**
 * GET /api/satellite-alerts/next-pass
 *   ?satellite=ISS|<noradId>
 *   &lat=<number>
 *   &lon=<number>
 *   &hours=24                (default 24, max 72)
 *   &minElevation=10         (default 10°)
 *
 * Returns the next N visible passes within the forward window.
 * Uses CelesTrak TLE + simplified propagator (see
 * `src/lib/satellite-pass-predictor.ts`). v1 covers ISS reliably;
 * other NORAD IDs are best-effort.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const satellite = (searchParams.get('satellite') || 'ISS').trim();
    const lat = parseFloat(searchParams.get('lat') || '');
    const lon = parseFloat(searchParams.get('lon') || '');
    const hoursRaw = parseFloat(searchParams.get('hours') || '24');
    const minElevRaw = parseFloat(searchParams.get('minElevation') || '10');

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return validationError('lat must be a number between -90 and 90');
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      return validationError('lon must be a number between -180 and 180');
    }

    const hours = Math.min(Math.max(1, Number.isFinite(hoursRaw) ? hoursRaw : 24), 72);
    const minElevation = Math.min(
      Math.max(0, Number.isFinite(minElevRaw) ? minElevRaw : 10),
      90
    );

    const tle = await fetchTLE(satellite);
    if (!tle) {
      return NextResponse.json({
        success: true,
        data: {
          satellite,
          passes: [],
          note: `No TLE available for "${satellite}". ISS predictions are supported by default.`,
          _meta: {
            source: 'fallback',
            generatedAt: new Date().toISOString(),
          },
        },
      });
    }

    const passes = predictPasses(
      tle,
      lat,
      lon,
      new Date(),
      hours,
      30,
      minElevation
    );

    return NextResponse.json({
      success: true,
      data: {
        satellite: tle.name || satellite,
        noradId: tle.noradId,
        observer: { latitude: lat, longitude: lon },
        windowHours: hours,
        minElevation,
        passes,
        _meta: {
          source: 'celestrak+propagator',
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to compute next pass', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to compute next pass');
  }
}
