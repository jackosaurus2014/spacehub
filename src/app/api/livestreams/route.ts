import { NextRequest, NextResponse } from 'next/server';
import { detectLiveStreams } from '@/lib/livestream-detector';
import { requireCronSecret, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function fetchAndRespond() {
  const streams = await detectLiveStreams();

  return NextResponse.json(
    {
      streams,
      count: streams.length,
      hasLive: streams.length > 0,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=30',
      },
    },
  );
}

export async function GET() {
  try {
    return await fetchAndRespond();
  } catch (error) {
    logger.error('[Livestreams API] GET failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to detect livestreams');
  }
}

export async function POST(req: NextRequest) {
  const authError = requireCronSecret(req);
  if (authError) return authError;

  try {
    return await fetchAndRespond();
  } catch (error) {
    logger.error('[Livestreams API] Cron-triggered fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to detect livestreams');
  }
}
