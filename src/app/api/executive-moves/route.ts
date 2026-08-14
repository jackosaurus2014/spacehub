import { NextRequest, NextResponse } from 'next/server';
import { EXECUTIVE_MOVES, ExecutiveMove } from '@/lib/executive-moves-data';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Merge the static seed/backfill list with the live ExecutiveMove table
 * (populated daily by executive-moves-fetcher.ts, cron 14:00 UTC).
 * DB rows are authoritative on conflict since they reflect live news scans;
 * static rows fill in history the fetcher predates.
 */
async function getMergedMoves(): Promise<ExecutiveMove[]> {
  const byKey = new Map<string, ExecutiveMove>();

  const keyFor = (m: { personName: string; toCompany: string | null; fromCompany: string | null }) =>
    `${m.personName.trim().toLowerCase()}|${(m.toCompany || m.fromCompany || '').trim().toLowerCase()}`;

  for (const move of EXECUTIVE_MOVES) {
    byKey.set(keyFor(move), move);
  }

  try {
    const dbMoves = await prisma.executiveMove.findMany({
      orderBy: { date: 'desc' },
      take: 500,
    });

    for (const row of dbMoves) {
      const move: ExecutiveMove = {
        id: row.id,
        personName: row.personName,
        fromCompany: row.fromCompany,
        fromTitle: row.fromTitle,
        toCompany: row.toCompany,
        toTitle: row.toTitle,
        // DB fetcher can also emit 'board_joined', not present in the seed union type
        moveType: row.moveType as ExecutiveMove['moveType'],
        date: row.date.toISOString().slice(0, 10),
        source: row.source || undefined,
        summary: row.summary || undefined,
        companySlug: row.companySlug || undefined,
      };
      byKey.set(keyFor(move), move);
    }
  } catch (err) {
    // DB unavailable — degrade gracefully to static seed data only
    logger.error('executive-moves: DB fetch failed, serving seed data only', { error: String(err) });
  }

  return Array.from(byKey.values());
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const moveType = searchParams.get('moveType') || '';
    const company = searchParams.get('company') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100);

    let filtered: ExecutiveMove[] = await getMergedMoves();

    // Search filter — match person name, from/to company, from/to title
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.personName.toLowerCase().includes(q) ||
        (m.fromCompany && m.fromCompany.toLowerCase().includes(q)) ||
        (m.toCompany && m.toCompany.toLowerCase().includes(q)) ||
        (m.fromTitle && m.fromTitle.toLowerCase().includes(q)) ||
        (m.toTitle && m.toTitle.toLowerCase().includes(q)) ||
        (m.summary && m.summary.toLowerCase().includes(q))
      );
    }

    // Move type filter
    if (moveType) {
      filtered = filtered.filter(m => m.moveType === moveType);
    }

    // Company filter — match by slug or company name
    if (company) {
      const c = company.toLowerCase();
      filtered = filtered.filter(m =>
        (m.companySlug && m.companySlug.toLowerCase() === c) ||
        (m.fromCompany && m.fromCompany.toLowerCase().includes(c)) ||
        (m.toCompany && m.toCompany.toLowerCase().includes(c))
      );
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => b.date.localeCompare(a.date));

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const moves = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      moves,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    logger.error('Failed to fetch executive moves', { error });
    return NextResponse.json(
      { error: 'Failed to fetch executive moves' },
      { status: 500 }
    );
  }
}
