import { NextRequest, NextResponse } from 'next/server';
import { SPACE_EVENTS } from '@/lib/space-events-data';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const month = searchParams.get('month'); // 1-12
  const upcoming = searchParams.get('upcoming'); // 'true'
  const virtual = searchParams.get('virtual'); // 'true' or 'false'
  const highlight = searchParams.get('highlight'); // 'true'
  const tag = searchParams.get('tag');

  let events = [...SPACE_EVENTS];

  // Filter by event type
  if (type) {
    events = events.filter((e) => e.type === type);
  }

  // Filter by month (1-12)
  if (month) {
    const m = parseInt(month, 10);
    if (m >= 1 && m <= 12) {
      events = events.filter((e) => {
        const eventMonth = new Date(e.startDate + 'T00:00:00Z').getUTCMonth() + 1;
        return eventMonth === m;
      });
    }
  }

  // Filter by virtual/in-person
  if (virtual === 'true') {
    events = events.filter((e) => e.virtual);
  } else if (virtual === 'false') {
    events = events.filter((e) => !e.virtual);
  }

  // Filter by highlight
  if (highlight === 'true') {
    events = events.filter((e) => e.highlight);
  }

  // Filter by tag
  if (tag) {
    events = events.filter((e) =>
      e.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
  }

  // Filter upcoming only
  if (upcoming === 'true') {
    const now = new Date().toISOString().split('T')[0];
    events = events.filter((e) => e.startDate >= now || (e.endDate && e.endDate >= now));
  }

  // Sort by start date
  events.sort((a, b) => a.startDate.localeCompare(b.startDate));

  return NextResponse.json({
    success: true,
    data: events,
    total: events.length,
  });
}
