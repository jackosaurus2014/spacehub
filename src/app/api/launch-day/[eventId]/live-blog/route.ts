/**
 * /api/launch-day/[eventId]/live-blog — the per-launch live blog.
 *
 *   GET   public, newest-first, cache-busting headers (the page polls it).
 *   POST  admin session OR the cron bearer. Append only.
 *
 * There is deliberately no PATCH, PUT or DELETE: a live blog that can be
 * rewritten after the fact is not a record. The append-only guarantee is
 * enforced structurally (no handler exists) and asserted by
 * src/app/launch/__tests__/live-blog-route.test.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { forbiddenError, internalError, unauthorizedError, validationError } from '@/lib/errors';
import { parseLiveEntry, serializeEntries } from '@/lib/launch-live-blog';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 200;
const NO_STORE = { 'Cache-Control': 'no-cache, no-store, must-revalidate' };

export async function GET(request: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await props.params;
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '60', 10) || 60, 1), MAX_LIMIT);
    const since = searchParams.get('since');
    const sinceDate = since ? new Date(since) : null;

    const rows = await prisma.launchLiveEntry.findMany({
      where: {
        eventId,
        ...(sinceDate && !Number.isNaN(sinceDate.getTime()) ? { createdAt: { gt: sinceDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, body: true, linkUrl: true, linkLabel: true, imageUrl: true, kind: true, createdAt: true },
    });

    const entries = serializeEntries(rows);
    return NextResponse.json(
      { success: true, data: { entries, latestAt: entries[0]?.at ?? null } },
      { headers: NO_STORE },
    );
  } catch (error) {
    // A missing table (pre-`db push`) must render an empty blog, not a 500.
    logger.warn('Launch live blog GET failed', { eventId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ success: true, data: { entries: [], latestAt: null } }, { headers: NO_STORE });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await props.params;

  // Admin session, or the internal scheduler's bearer token.
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`;
  let authorId: string | null = null;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();
    if (session.user.isAdmin !== true) return forbiddenError('Admin access required');
    authorId = session.user.id;
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = parseLiveEntry(body);
    if (!parsed.ok) return validationError(parsed.error);

    const event = await prisma.spaceEvent.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) return validationError('Unknown launch');

    const row = await prisma.launchLiveEntry.create({
      data: { eventId, ...parsed.value, authorId },
      select: { id: true, body: true, linkUrl: true, linkLabel: true, imageUrl: true, kind: true, createdAt: true },
    });

    logger.info('Launch live blog entry posted', { eventId, id: row.id, kind: row.kind, source: isCron ? 'cron' : 'admin' });
    return NextResponse.json({ success: true, data: { entry: serializeEntries([row])[0] } }, { status: 201, headers: NO_STORE });
  } catch (error) {
    logger.error('Launch live blog POST failed', { eventId, error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to post live blog entry');
  }
}
