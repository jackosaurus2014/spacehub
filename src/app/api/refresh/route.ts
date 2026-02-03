import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchSpaceflightNews } from '@/lib/news-fetcher';
import { fetchLaunchLibraryEvents } from '@/lib/events-fetcher';

export const dynamic = 'force-dynamic';

// This endpoint refreshes time-sensitive data (news and events)
// Can be called by a cron job or manually

export async function POST(request: Request) {
  // Optional: Add a secret key for cron job security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, string> = {};

  try {
    // Refresh news (always fetch latest)
    const newsCount = await fetchSpaceflightNews();
    results.news = `Refreshed ${newsCount} articles`;

    // Refresh events (always fetch latest)
    const eventsCount = await fetchLaunchLibraryEvents();
    results.events = `Refreshed ${eventsCount} events`;

    // Log the refresh
    console.log(`[${new Date().toISOString()}] Data refresh completed:`, results);

    return NextResponse.json({
      success: true,
      message: 'Data refresh complete',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { success: false, error: String(error), results },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return last update times
  try {
    const [latestNews, latestEvent] = await Promise.all([
      prisma.newsArticle.findFirst({ orderBy: { fetchedAt: 'desc' }, select: { fetchedAt: true } }),
      prisma.spaceEvent.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ]);

    const now = new Date();
    const newsAge = latestNews ? Math.floor((now.getTime() - latestNews.fetchedAt.getTime()) / 1000 / 60) : null;
    const eventsAge = latestEvent ? Math.floor((now.getTime() - latestEvent.updatedAt.getTime()) / 1000 / 60) : null;

    return NextResponse.json({
      lastNewsUpdate: latestNews?.fetchedAt || null,
      lastEventsUpdate: latestEvent?.updatedAt || null,
      newsAgeMinutes: newsAge,
      eventsAgeMinutes: eventsAge,
      stale: (newsAge && newsAge > 60) || (eventsAge && eventsAge > 60),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
