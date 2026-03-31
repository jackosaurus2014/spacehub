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

// Seed entries for Artemis II
entries.push(
  {
    id: 'lb-seed-4',
    timestamp: new Date('2026-03-31T12:00:00Z').toISOString(),
    title: 'Artemis II Launch Day Tomorrow',
    body: 'NASA is targeting 6:24 PM EDT on April 1, 2026 for the launch of Artemis II. Weather is 80% favorable. The crew \u2014 Wiseman, Glover, Koch, and Hansen \u2014 are in quarantine at Kennedy Space Center.',
    type: 'milestone',
    source: 'admin',
    pinned: true,
  },
  {
    id: 'lb-seed-3',
    timestamp: new Date('2026-03-30T18:00:00Z').toISOString(),
    title: 'Weather Update: 80% Favorable',
    body: 'The U.S. Space Force 45th Weather Squadron forecasts 80% chance of favorable weather for tomorrow\'s launch. Primary concerns are cloud coverage and potential high winds at ground level.',
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
