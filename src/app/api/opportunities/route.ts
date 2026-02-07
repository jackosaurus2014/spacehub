import { NextResponse } from 'next/server';
import { getOpportunities } from '@/lib/opportunities-data';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const sector = searchParams.get('sector') || undefined;
    const targetAudience = searchParams.get('targetAudience') || undefined;
    const featured = searchParams.get('featured');
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const result = await getOpportunities({
      type,
      category,
      sector,
      targetAudience,
      featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch opportunities', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch opportunities');
  }
}
