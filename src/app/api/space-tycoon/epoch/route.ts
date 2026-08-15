import { NextResponse } from 'next/server';
import {
  assembleEpochAddress,
  getCurrentRealignmentEpoch,
  getEpochWindow,
  POSTURE_BAND_MIN,
  POSTURE_BAND_MAX,
} from '@/lib/game/realignment';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/epoch
 *
 * Public, unauthenticated Realignment surface — Live-Service Wave LS9
 * (docs/LIVE_SERVICE_2026-08.md §LS9). Every player sees the identical
 * answer: the current Epoch Address, a preview of the next epoch's
 * published band, and a short recent-epoch archive. No DB read — every
 * value here is a pure function of the wall clock (realignment.ts's own
 * header explains why that's safe: the epoch's content is never persisted,
 * only recomputed identically by every caller).
 *
 * `history` param (optional, default 4, max 12): how many PAST epochs
 * (including the current one) to include in the archive list.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const historyParam = parseInt(url.searchParams.get('history') || '4', 10);
    const historyCount = Math.max(1, Math.min(12, Number.isFinite(historyParam) ? historyParam : 4));

    const currentEpoch = getCurrentRealignmentEpoch();
    const current = assembleEpochAddress(currentEpoch);
    const nextWindow = getEpochWindow(currentEpoch + 1);

    const archive = [];
    for (let i = 0; i < historyCount; i++) {
      const epochIndex = currentEpoch - i;
      if (epochIndex < 0) break;
      archive.push(assembleEpochAddress(epochIndex));
    }

    return NextResponse.json(
      {
        current,
        nextRealignmentAtMs: nextWindow.startMs,
        bandPreview: { min: POSTURE_BAND_MIN, max: POSTURE_BAND_MAX },
        archive,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120' } },
    );
  } catch {
    return NextResponse.json({ error: 'Unable to load epoch data' }, { status: 500 });
  }
}
