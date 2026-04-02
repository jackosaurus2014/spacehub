import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Sanitize text: strip HTML tags, decode entities, normalize whitespace */
function sanitize(text: string, maxLen: number): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8212;/g, ' — ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * GET /api/live-blog — Return entries (newest first)
 * Query params:
 *   ?event=artemis-ii  — filter by event tag (default: all)
 *   ?since=ISO_DATE    — only entries after this timestamp
 *   ?limit=50          — max entries to return
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const event = searchParams.get('event');
    const since = searchParams.get('since');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    if (event) where.eventTag = event;
    if (since) where.createdAt = { gt: new Date(since) };

    const [entries, total] = await Promise.all([
      prisma.liveBlogEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.liveBlogEntry.count({ where }),
    ]);

    // Map to the shape the frontend expects
    const mapped = entries.map(e => ({
      id: e.id,
      timestamp: e.createdAt.toISOString(),
      title: e.title,
      body: e.body,
      type: e.type,
      source: e.source,
      pinned: e.pinned,
      eventTag: e.eventTag,
    }));

    return NextResponse.json({
      entries: mapped,
      total,
      lastUpdated: mapped[0]?.timestamp || null,
    }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    logger.error('Live blog GET error', { error: String(error) });
    return NextResponse.json({ entries: [], total: 0, lastUpdated: null }, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  }
}

/**
 * POST /api/live-blog — Add a new entry (admin or cron)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isAdmin = (session?.user as any)?.isAdmin;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, body: entryBody, type, pinned, eventTag } = body;

    if (!title || !entryBody) {
      return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
    }

    const entry = await prisma.liveBlogEntry.create({
      data: {
        title: sanitize(title, 200),
        body: sanitize(entryBody, 2000),
        type: type || 'update',
        source: isCron ? 'auto' : 'admin',
        pinned: pinned || false,
        eventTag: eventTag || 'artemis-ii', // Default to current event
      },
    });

    logger.info('Live blog entry added', { id: entry.id, title: entry.title, source: entry.source });

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        timestamp: entry.createdAt.toISOString(),
        title: entry.title,
        body: entry.body,
        type: entry.type,
        source: entry.source,
        pinned: entry.pinned,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Live blog POST error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

/**
 * DELETE /api/live-blog?id=ENTRY_ID — Remove an entry (admin only)
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
  }

  try {
    const entry = await prisma.liveBlogEntry.delete({ where: { id } });
    logger.info('Live blog entry deleted', { id: entry.id, title: entry.title });
    return NextResponse.json({ success: true, deleted: entry.id });
  } catch {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }
}
