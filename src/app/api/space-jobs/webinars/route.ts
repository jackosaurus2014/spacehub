import { NextRequest, NextResponse } from 'next/server';
import { getWebinars, getWebinarStats } from '@/lib/webinar-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const topic = searchParams.get('topic') || undefined;
    const isLive = searchParams.get('isLive');
    const isPast = searchParams.get('isPast');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'stats') {
      const stats = await getWebinarStats();
      return NextResponse.json({ stats });
    }

    const [{ webinars, total }, stats] = await Promise.all([
      getWebinars({
        topic,
        isLive: isLive === 'true' ? true : isLive === 'false' ? false : undefined,
        isPast: isPast === 'true' ? true : isPast === 'false' ? false : undefined,
        limit,
        offset,
      }),
      getWebinarStats(),
    ]);

    return NextResponse.json({
      webinars,
      total,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch webinar data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch webinar data' },
      { status: 500 }
    );
  }
}
