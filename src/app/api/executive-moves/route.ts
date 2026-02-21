import { NextRequest, NextResponse } from 'next/server';
import { EXECUTIVE_MOVES, ExecutiveMove } from '@/lib/executive-moves-data';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const moveType = searchParams.get('moveType') || '';
    const company = searchParams.get('company') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '20')), 100);

    let filtered: ExecutiveMove[] = [...EXECUTIVE_MOVES];

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
