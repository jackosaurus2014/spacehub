import { NextRequest, NextResponse } from 'next/server';
import { getNewsArticles } from '@/lib/news-fetcher';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const { articles, total } = await getNewsArticles({
      category,
      limit,
      offset,
    });

    return NextResponse.json({ articles, total });
  } catch (error) {
    logger.error('Error fetching news', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch news');
  }
}
