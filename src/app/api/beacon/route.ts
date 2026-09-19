import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  cleanPath,
  looksAutomated,
  referrerHost,
  utcDay,
  visitorHash,
} from '@/lib/traffic-truth';

export const dynamic = 'force-dynamic';

/**
 * The cookieless page-view beacon.
 *
 * One POST per page view from `TrafficBeacon`. It exists because GA4, gated
 * on the cookie banner, reported 748 monthly users in a month when Search
 * Console counted 2,916 clicks from Google alone — see `traffic-truth.ts` for
 * the full reasoning and the privacy construction.
 *
 * A second ping (`engaged: true`) arrives at most once per page load, on the
 * first real input event, and counts no view. It exists because the raw
 * count turned out to be mostly a JS-executing crawler; see ENGAGEMENT_EVENTS.
 *
 * The response is deliberately empty and always 204, even on failure. A
 * counting endpoint must never surface an error to a reader, and must never
 * give a caller a way to probe whether a particular hash already exists.
 */
export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get('user-agent') || '';
    if (!userAgent || looksAutomated(userAgent)) {
      return new NextResponse(null, { status: 204 });
    }

    // Railway sits behind a proxy, so the client address is the first entry
    // of x-forwarded-for. An absent address still counts — it just hashes to
    // a shared bucket, which understates uniques rather than inventing them.
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    const body = await req.json().catch(() => ({}));
    const path = cleanPath(typeof body?.path === 'string' ? body.path : null);
    const referrer = referrerHost(typeof body?.referrer === 'string' ? body.referrer : null);

    const day = utcDay();
    // Neither `ip` nor `userAgent` is used again after this line.
    const hash = visitorHash(ip, userAgent);

    // The second kind of ping: the page saw real input. It carries no view, so
    // it moves `engagedUniques` and nothing else. If the view ping was lost or
    // has not landed yet, the visitor row is created here so the visit is not
    // counted as engaged-but-never-arrived.
    if (body?.engaged === true) {
      const created = await prisma.siteTrafficVisitor.createMany({
        data: [{ day, hash, path, referrer: null, engaged: true }],
        skipDuplicates: true,
      });
      // The `engaged: false` filter makes the flip happen once however many
      // tabs or pages report it, so the counter cannot run ahead of the rows.
      const flipped = created.count > 0
        ? 0
        : (await prisma.siteTrafficVisitor.updateMany({
            where: { day, hash, engaged: false },
            data: { engaged: true },
          })).count;
      if (created.count > 0 || flipped > 0) {
        await prisma.siteTrafficDay.upsert({
          where: { day },
          create: { day, uniques: created.count, engagedUniques: 1 },
          update: {
            engagedUniques: { increment: 1 },
            ...(created.count > 0 ? { uniques: { increment: 1 } } : {}),
          },
        });
      }
      return new NextResponse(null, { status: 204 });
    }

    // A new visitor row means a new unique; a duplicate means a repeat view.
    // `createMany` with skipDuplicates reports which it was in one round trip,
    // so the counters stay consistent without a transaction.
    const inserted = await prisma.siteTrafficVisitor.createMany({
      data: [{ day, hash, path, referrer }],
      skipDuplicates: true,
    });
    const isNewVisitor = inserted.count > 0;
    const isReferred = isNewVisitor && referrer !== null;

    const dayRow = await prisma.siteTrafficDay.upsert({
      where: { day },
      create: {
        day,
        pageViews: 1,
        uniques: isNewVisitor ? 1 : 0,
        referredUniques: isReferred ? 1 : 0,
      },
      update: {
        pageViews: { increment: 1 },
        ...(isNewVisitor ? { uniques: { increment: 1 } } : {}),
        ...(isReferred ? { referredUniques: { increment: 1 } } : {}),
      },
    });

    // The first page view of a new UTC day purges the old visitor hashes.
    // Doing it here rather than on a cron means the retention promise in
    // traffic-truth.ts cannot drift out of sync with a schedule defined
    // somewhere else — the thing that does the counting does the forgetting.
    if (dayRow.pageViews === 1) {
      const cutoff = new Date(day.getTime() - 2 * 86_400_000);
      await prisma.siteTrafficVisitor
        .deleteMany({ where: { day: { lt: cutoff } } })
        .catch((err) => {
          logger.error('beacon purge failed', { error: String(err) });
        });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // Counting is never worth a visible failure, but a silent one that lasts
    // for weeks is how we got here in the first place. Log it.
    logger.error('beacon failed', { error: err instanceof Error ? err.message : String(err) });
    return new NextResponse(null, { status: 204 });
  }
}
