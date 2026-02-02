import { NextResponse } from 'next/server';
import { fetchSpaceflightNews } from '@/lib/news-fetcher';

export async function POST() {
  try {
    const count = await fetchSpaceflightNews();
    return NextResponse.json({
      success: true,
      message: `Fetched and saved ${count} articles`
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
