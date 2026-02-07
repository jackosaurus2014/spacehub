import { NextRequest, NextResponse } from 'next/server';
import { getBlogPosts, getBlogSources } from '@/lib/blogs-fetcher';
import { constrainPagination, constrainOffset, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic') || undefined;
    const authorType = searchParams.get('authorType') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '20'));
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));
    const type = searchParams.get('type'); // 'posts' or 'sources'

    if (type === 'sources') {
      const sources = await getBlogSources({ authorType });
      return NextResponse.json({ sources });
    }

    const { posts, total } = await getBlogPosts({
      topic,
      authorType,
      sourceId,
      limit,
      offset,
    });

    return NextResponse.json({ posts, total });
  } catch (error) {
    logger.error('Error fetching blogs', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch blogs');
  }
}
