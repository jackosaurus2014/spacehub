import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180);
}

async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || 'mission-debrief';
  let candidate = safeBase;
  let suffix = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.missionDebrief.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${safeBase}-${suffix++}`;
    if (suffix > 200) {
      return `${safeBase}-${Date.now()}`;
    }
  }
}

/**
 * POST /api/cron/mission-debriefs
 *
 * Daily cron. Scans for SpaceEvents that:
 *   - Had a launchDate at least 24h ago AND within the last 7 days
 *   - Have no MissionDebrief linked via eventId
 *
 * For each one we create an unpublished draft (publishedAt = null) so admins
 * can review and AI-generate the body. We do NOT call Claude here to keep the
 * cron cheap and deterministic — admins can hit "Generate with AI" from the
 * draft form.
 *
 * Auth: Bearer ${CRON_SECRET}.
 */
export async function POST(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Candidate events: launchDate within [-7d, -1d]
    const events = await prisma.spaceEvent.findMany({
      where: {
        launchDate: { gte: sevenDaysAgo, lte: oneDayAgo },
      },
      select: {
        id: true,
        name: true,
        launchDate: true,
        status: true,
        rocket: true,
        agency: true,
      },
      orderBy: { launchDate: 'desc' },
      take: 50,
    });

    if (events.length === 0) {
      return NextResponse.json({ scanned: 0, created: 0, skipped: 0 });
    }

    // Find which ones already have a debrief
    const existingDebriefs = await prisma.missionDebrief.findMany({
      where: { eventId: { in: events.map((e) => e.id) } },
      select: { eventId: true },
    });
    const haveDebrief = new Set(existingDebriefs.map((d) => d.eventId).filter(Boolean) as string[]);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const event of events) {
      if (haveDebrief.has(event.id)) {
        skipped++;
        continue;
      }
      try {
        const status =
          event.status === 'completed'
            ? 'success'
            : event.status === 'scrubbed'
              ? 'scrubbed'
              : event.status === 'failure' || event.status === 'failed'
                ? 'failure'
                : 'partial';

        const baseSlug = slugify(event.name) || `mission-${event.id.slice(0, 8)}`;
        const slug = await uniqueSlug(baseSlug);

        // Create a minimal placeholder draft. Admin will hit "Generate with AI"
        // to produce the real summary, timeline, and full analysis.
        await prisma.missionDebrief.create({
          data: {
            slug,
            eventId: event.id,
            missionName: event.name,
            missionDate: event.launchDate ?? now,
            status,
            executiveSummary:
              'Auto-generated draft awaiting AI synthesis. Admin: open this debrief and click "Generate with AI" to produce the full analysis.',
            timeline: [],
            costsEstimate: null,
            currency: 'USD',
            companyIds: [],
            keyTakeaways: [],
            sources: [],
            fullAnalysis:
              '## Pending\n\nThis debrief was auto-created by the daily cron after the launch window closed. Run AI generation from the admin form to populate the full analysis.',
            generatedBy: 'manual',
            publishedAt: null,
          },
        });
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${event.id}: ${msg}`);
        logger.warn('mission-debriefs cron: draft create failed', {
          eventId: event.id,
          error: msg,
        });
      }
    }

    logger.info('mission-debriefs cron completed', {
      scanned: events.length,
      created,
      skipped,
      errorCount: errors.length,
    });

    return NextResponse.json({
      scanned: events.length,
      created,
      skipped,
      errors,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('mission-debriefs cron failed', { error: msg });
    return NextResponse.json(
      { error: 'Internal server error', detail: msg },
      { status: 500 }
    );
  }
}
