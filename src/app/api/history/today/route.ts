import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

function getTodayMonthDay(override?: string | null): string {
  if (override && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(override)) {
    return override;
  }
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${m}-${d}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthDay = getTodayMonthDay(searchParams.get('date'));

    const events = await prisma.spaceHistoryEvent.findMany({
      where: { monthDay },
      orderBy: [{ featured: 'desc' }, { year: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: {
        monthDay,
        count: events.length,
        events,
      },
    });
  } catch (error) {
    logger.error('Failed to load today history events', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load today history events');
  }
}
