import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getFilteredDeadlines,
  getCalendarStats,
  type CalendarAgency,
  type DeadlineType,
  type DeadlinePriority,
} from '@/lib/regulatory-calendar-data';

export const dynamic = 'force-dynamic';

const VALID_AGENCIES: CalendarAgency[] = [
  'FCC', 'FAA', 'NASA', 'NOAA', 'DoD', 'BIS', 'ITU', 'Congress', 'International',
];
const VALID_TYPES: DeadlineType[] = [
  'filing', 'hearing', 'compliance', 'review', 'procurement', 'treaty',
];
const VALID_PRIORITIES: DeadlinePriority[] = ['high', 'medium', 'low'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const agencyParam = searchParams.get('agency');
    const typeParam = searchParams.get('type');
    const priorityParam = searchParams.get('priority');
    const includeStats = searchParams.get('stats') === 'true';

    // Validate parameters
    const year = yearParam ? parseInt(yearParam, 10) : undefined;
    if (yearParam && (isNaN(year!) || year! < 2024 || year! > 2030)) {
      return NextResponse.json(
        { error: 'Invalid year parameter. Must be between 2024 and 2030.' },
        { status: 400 }
      );
    }

    const month = monthParam ? parseInt(monthParam, 10) : undefined;
    if (monthParam && (isNaN(month!) || month! < 1 || month! > 12)) {
      return NextResponse.json(
        { error: 'Invalid month parameter. Must be between 1 and 12.' },
        { status: 400 }
      );
    }

    const agency = agencyParam as CalendarAgency | undefined;
    if (agencyParam && !VALID_AGENCIES.includes(agency!)) {
      return NextResponse.json(
        { error: `Invalid agency parameter. Must be one of: ${VALID_AGENCIES.join(', ')}` },
        { status: 400 }
      );
    }

    const type = typeParam as DeadlineType | undefined;
    if (typeParam && !VALID_TYPES.includes(type!)) {
      return NextResponse.json(
        { error: `Invalid type parameter. Must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const priority = priorityParam as DeadlinePriority | undefined;
    if (priorityParam && !VALID_PRIORITIES.includes(priority!)) {
      return NextResponse.json(
        { error: `Invalid priority parameter. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const deadlines = getFilteredDeadlines({
      year,
      month,
      agency,
      type,
      priority,
    });

    const response: Record<string, unknown> = {
      deadlines,
      count: deadlines.length,
      filters: {
        year: year || null,
        month: month || null,
        agency: agency || null,
        type: type || null,
        priority: priority || null,
      },
    };

    if (includeStats) {
      response.stats = getCalendarStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching regulatory calendar data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to fetch regulatory calendar data' },
      { status: 500 }
    );
  }
}
