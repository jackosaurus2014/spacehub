import { NextRequest, NextResponse } from 'next/server';
import { Webinar } from '@/types';
import { WEBINARS_SEED } from '@/lib/webinar-data';
import { getModuleContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const topic = searchParams.get('topic') || undefined;
    const isLive = searchParams.get('isLive');
    const isPast = searchParams.get('isPast');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Load webinars: try DynamicContent first, fall back to seed data
    const now = new Date();
    let allWebinars: Webinar[] = WEBINARS_SEED.map((w, index) => ({
      ...w,
      id: `webinar-${index + 1}`,
      isPast: new Date(w.date) < now,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as Webinar[];

    try {
      const dynamicData = await getModuleContent<Webinar>('webinars');
      if (dynamicData.length > 0) {
        allWebinars = dynamicData.map((item) => ({
          ...item.data,
          isPast: new Date(item.data.date) < now,
        }));
      }
    } catch {
      // DynamicContent unavailable, use fallback seed data
    }

    if (type === 'stats') {
      const stats = computeStats(allWebinars);
      return NextResponse.json({ stats });
    }

    // Apply filters
    let filteredWebinars = [...allWebinars];

    if (topic) {
      filteredWebinars = filteredWebinars.filter(w => w.topic === topic);
    }

    if (isLive === 'true') {
      filteredWebinars = filteredWebinars.filter(w => w.isLive === true);
    } else if (isLive === 'false') {
      filteredWebinars = filteredWebinars.filter(w => w.isLive === false);
    }

    if (isPast === 'true') {
      filteredWebinars = filteredWebinars.filter(w => w.isPast === true);
    } else if (isPast === 'false') {
      filteredWebinars = filteredWebinars.filter(w => w.isPast === false);
    }

    // Sort: Live first, then upcoming by date, then past by date (newest first)
    filteredWebinars.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (!a.isPast && !b.isPast) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (a.isPast && b.isPast) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (!a.isPast && b.isPast) return -1;
      return 1;
    });

    const total = filteredWebinars.length;
    filteredWebinars = filteredWebinars.slice(offset, offset + limit);

    const stats = computeStats(allWebinars);

    return NextResponse.json({
      webinars: filteredWebinars,
      total,
      stats,
    });
  } catch (error) {
    logger.error('Failed to fetch webinar data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch webinar data' },
      { status: 500 }
    );
  }
}

function computeStats(webinars: Webinar[]) {
  const byTopic: Record<string, number> = {};
  webinars.forEach(w => {
    byTopic[w.topic] = (byTopic[w.topic] || 0) + 1;
  });

  return {
    totalWebinars: webinars.length,
    liveCount: webinars.filter(w => w.isLive).length,
    upcomingCount: webinars.filter(w => !w.isPast && !w.isLive).length,
    pastCount: webinars.filter(w => w.isPast).length,
    recordingsAvailable: webinars.filter(w => w.recordingUrl).length,
    byTopic,
    avgDuration: webinars.length > 0
      ? Math.round(webinars.reduce((sum, w) => sum + w.duration, 0) / webinars.length)
      : 0,
  };
}
