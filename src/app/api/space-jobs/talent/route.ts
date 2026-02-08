import { NextRequest, NextResponse } from 'next/server';
import { TalentExpertiseArea, TalentAvailability } from '@/types';
import { getTalentBoard, getTalentStats } from '@/lib/talent-board-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const expertise = searchParams.get('expertise') as TalentExpertiseArea | null;
    const availability = searchParams.get('availability') as TalentAvailability | null;
    const featured = searchParams.get('featured');
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'stats') {
      const stats = await getTalentStats();
      return NextResponse.json({ stats });
    }

    const [{ talent, total }, stats] = await Promise.all([
      getTalentBoard({
        expertise: expertise || undefined,
        availability: availability || undefined,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        search,
        limit,
        offset,
      }),
      getTalentStats(),
    ]);

    return NextResponse.json({
      talent,
      total,
      stats,
      directoryComingSoon: true,
    });
  } catch (error) {
    logger.error('Failed to fetch talent data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch talent data' },
      { status: 500 }
    );
  }
}
