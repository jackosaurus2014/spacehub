import { NextRequest, NextResponse } from 'next/server';
import { fetchEONETEvents } from '@/lib/eonet-fetcher';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function fetchAndRespond() {
  const { events, total, categories } = await fetchEONETEvents();

  return NextResponse.json({ events, total, categories }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=300' },
  });
}

export async function GET() {
  try {
    return await fetchAndRespond();
  } catch (error) {
    logger.error('Error fetching EONET events', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch EONET events');
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return await fetchAndRespond();
  } catch (error) {
    logger.error('[EONET API] Cron-triggered fetch failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch EONET events');
  }
}
