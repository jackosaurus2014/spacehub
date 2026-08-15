import { NextRequest, NextResponse } from 'next/server';
import { EXECUTIVE_MOVES, ExecutiveMove } from '@/lib/executive-moves-data';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { isLikelyPersonName, isLikelyTitle, isLikelyOrg } from '@/lib/fetchers/executive-moves-fetcher';

export const dynamic = 'force-dynamic';

/**
 * Server-side display guard (defense in depth): a DB row is only rendered
 * if every populated field passes the same shape validators the fetcher
 * uses to decide what to write. This protects the page even if a bad row
 * ever slips into the table again (manual insert, future extractor bug,
 * migration, etc.) — see the 2026-08 incident where 156/170 rows were
 * garbled sentence fragments, not real personnel moves.
 */
function passesDisplayValidation(row: {
  personName: string;
  fromTitle: string | null;
  fromCompany: string | null;
  toTitle: string | null;
  toCompany: string | null;
}): boolean {
  if (!isLikelyPersonName(row.personName)) return false;
  if (row.fromTitle && !isLikelyTitle(row.fromTitle)) return false;
  if (row.fromCompany && !isLikelyOrg(row.fromCompany)) return false;
  if (row.toTitle && !isLikelyTitle(row.toTitle)) return false;
  if (row.toCompany && !isLikelyOrg(row.toCompany)) return false;
  return true;
}

/**
 * Merge the static seed/backfill list with the live ExecutiveMove table
 * (populated daily by executive-moves-fetcher.ts, cron 14:00 UTC).
 * DB rows are authoritative on conflict since they reflect live news scans;
 * static rows fill in history the fetcher predates. Curated static rows
 * (id prefix "em-") are trusted and always shown; DB rows are re-validated
 * here before merging so a bad row can never render, even if it somehow
 * made it into the table.
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
      if (!passesDisplayValidation(row)) continue;

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

    // Sort by date (newest first); on a date tie, show curated/trusted
    // entries (static seed rows, id prefix "em-") ahead of live-scanned
    // DB rows.
    filtered.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      const aCurated = a.id.startsWith('em-') ? 0 : 1;
      const bCurated = b.id.startsWith('em-') ? 0 : 1;
      return aCurated - bCurated;
    });

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
