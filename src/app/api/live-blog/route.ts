import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface LiveBlogEntry {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  type: 'update' | 'milestone' | 'alert' | 'media' | 'countdown';
  source: 'admin' | 'auto' | 'nasa';
  pinned?: boolean;
}

// In-memory store (resets on deploy — fine for live events)
const entries: LiveBlogEntry[] = [];
const MAX_ENTRIES = 200;

// No seed entries — all content is posted via admin or API
// This prevents duplicate entries on server restart / Railway dyno recycle

// GET — return all entries (newest first)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since'); // ISO timestamp — only return entries after this

  let filtered = entries;
  if (since) {
    filtered = entries.filter(e => e.timestamp > since);
  }

  return NextResponse.json({
    entries: filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    total: entries.length,
    lastUpdated: entries[0]?.timestamp || null,
  }, {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}

// POST — add a new entry (admin only, or cron for auto-updates)
export async function POST(req: NextRequest) {
  // Check admin auth or cron secret
  const session = await getServerSession(authOptions);
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isAdmin = (session?.user as any)?.isAdmin;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, body: entryBody, type, pinned } = body;

  if (!title || !entryBody) {
    return NextResponse.json({ error: 'Title and body required' }, { status: 400 });
  }

  const entry: LiveBlogEntry = {
    id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    title: title.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim().slice(0, 200),
    body: entryBody.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;/g, "'").replace(/&#\d+;/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000),
    type: type || 'update',
    source: isCron ? 'auto' : 'admin',
    pinned: pinned || false,
  };

  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

  logger.info('Live blog entry added', { id: entry.id, title: entry.title, source: entry.source });

  return NextResponse.json({ success: true, entry }, { status: 201 });
}

/**
 * DELETE /api/live-blog — Remove an entry by ID (admin only)
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
  }

  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  const removed = entries.splice(idx, 1)[0];
  logger.info('Live blog entry deleted', { id: removed.id, title: removed.title });

  return NextResponse.json({ success: true, deleted: removed.id });
}
