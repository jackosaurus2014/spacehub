export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { RADAR_CATEGORIES, type RadarCategory } from '@/lib/regulatory-categorizer';
import { serializeDeadlineWeeks } from '@/lib/regulatory-deadlines';
import {
  collectRegulatoryDeadlines,
  getClosingCommentWindows,
  getRadarTimeline,
  type RadarSource,
} from '@/lib/regulatory-radar';

const VALID_SOURCES = new Set(['congress', 'federal-register', 'faa', 'fcc', 'itu', 'sec']);

/**
 * GET /api/regulatory-radar
 *
 * Unified reverse-chron regulatory action timeline (RegulatoryAction table)
 * for the /compliance Radar tab, the public /regulatory-radar page, and the
 * homepage compliance module teaser.
 *
 * Query params:
 *   category — optional radar category filter
 *   source   — optional source filter ('congress' | 'federal-register' | ...)
 *   limit    — max entries, default 50, capped at 200
 *
 * Fails soft: returns empty lists (200) when the table doesn't exist yet.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get('category');
    const sourceParam = searchParams.get('source');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);

    if (categoryParam && !(RADAR_CATEGORIES as readonly string[]).includes(categoryParam)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${RADAR_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }
    if (sourceParam && !VALID_SOURCES.has(sourceParam)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${Array.from(VALID_SOURCES).join(', ')}` },
        { status: 400 }
      );
    }

    const [entries, closingSoon, deadlines] = await Promise.all([
      getRadarTimeline({
        limit,
        category: (categoryParam as RadarCategory) || undefined,
        source: (sourceParam as RadarSource) || undefined,
      }),
      getClosingCommentWindows(30),
      collectRegulatoryDeadlines(),
    ]);

    return NextResponse.json({
      entries,
      closingSoon,
      // Week-grouped next-90-days compliance calendar (fail-soft [])
      deadlineWeeks: serializeDeadlineWeeks(deadlines),
      total: entries.length,
    });
  } catch (error) {
    logger.error('Error fetching regulatory radar', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch regulatory radar');
  }
}
