import { NextResponse } from 'next/server';
import { fetchEONETEvents } from '@/lib/eonet-fetcher';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { events, total, categories } = await fetchEONETEvents();

    return NextResponse.json({ events, total, categories }, {
      headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=300' },
    });
  } catch (error) {
    logger.error('Error fetching EONET events', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch EONET events');
  }
}
