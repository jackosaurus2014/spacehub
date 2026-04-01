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

// Seed entries for Artemis II — only past events with accurate timestamps
entries.push(
  {
    id: 'lb-seed-5',
    timestamp: new Date().toISOString(),
    title: 'Artemis II Launch Day Is Here',
    body: 'NASA is targeting 6:24 PM EDT (22:24 UTC) for the launch of Artemis II from Pad 39B. Weather is 80% favorable. The crew — Wiseman, Glover, Koch, and Hansen — are preparing for suit-up. Follow along for real-time updates throughout the day.',
    type: 'milestone',
    source: 'admin',
    pinned: true,
  },
  {
    id: 'lb-seed-3',
    timestamp: new Date('2026-03-31T18:00:00Z').toISOString(),
    title: 'Launch Readiness Review Complete — Go for Launch',
    body: 'NASA\'s Launch Readiness Review is complete. All teams have given a GO for the Artemis II launch on April 1. The SLS rocket and Orion spacecraft are in excellent condition on Pad 39B.',
    type: 'milestone',
    source: 'nasa',
  },
  {
    id: 'lb-seed-4',
    timestamp: new Date('2026-03-30T18:00:00Z').toISOString(),
    title: 'Weather Forecast: 80% Favorable',
    body: 'The U.S. Space Force 45th Weather Squadron forecasts an 80% chance of favorable weather for the April 1 launch. Primary concerns are cumulus clouds and potential upper-level winds. Backup date is April 7 if the attempt is scrubbed.',
    type: 'update',
    source: 'nasa',
  },
  {
    id: 'lb-seed-2',
    timestamp: new Date('2026-03-30T14:00:00Z').toISOString(),
    title: 'SLS Rocket on the Pad at LC-39B',
    body: 'The Space Launch System rocket completed its 10-hour rollout from the Vehicle Assembly Building to Launch Complex 39B. Ground teams are now connecting power and communications systems.',
    type: 'milestone',
    source: 'nasa',
  },
  {
    id: 'lb-seed-1',
    timestamp: new Date('2026-03-27T16:00:00Z').toISOString(),
    title: 'Crew Arrives at Kennedy Space Center',
    body: 'The four Artemis II astronauts arrived at Kennedy Space Center on Friday, March 27. They will spend the final days of quarantine reviewing mission procedures before suiting up on launch day.',
    type: 'update',
    source: 'nasa',
  },
);

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
    title: title.replace(/<[^>]*>/g, '').slice(0, 200),
    body: entryBody.replace(/<[^>]*>/g, '').slice(0, 2000),
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
