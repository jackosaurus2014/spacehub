import { NextRequest, NextResponse } from 'next/server';
import { getBlogPosts, getBlogSources } from '@/lib/blogs-fetcher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic') || undefined;
    const authorType = searchParams.get('authorType') || undefined;
    const sourceId = searchParams.get('sourceId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
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
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
