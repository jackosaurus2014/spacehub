import { NextRequest, NextResponse } from 'next/server';
import { getNewsArticles } from '@/lib/news-fetcher';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { articles, total } = await getNewsArticles({
      category,
      limit,
      offset,
    });

    return NextResponse.json({ articles, total });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
