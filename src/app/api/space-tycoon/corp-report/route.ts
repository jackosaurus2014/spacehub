import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, publishCorpReportSchema } from '@/lib/validations';
import { validationError, unauthorizedError, internalError } from '@/lib/errors';
import { shapeCorpReportForStorage, quarterKey } from '@/lib/game/corp-report-registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/corp-report
 *
 * Returns the calling player's own publish history (quarter keys only), so
 * the in-game Quarterly Reports panel (ReportsPanel.tsx) can render
 * "Published" state without re-publishing on every visit. This is a read of
 * the caller's OWN corp — not the public registry listing, which is served
 * by src/app/space-tycoon/registry/page.tsx via direct Prisma access (same
 * SEO-crawlable pattern as public-leaderboard.ts).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ success: true, publishedQuarters: [] });
    }

    const rows = await prisma.publishedCorpReport.findMany({
      where: { corpId: profile.id },
      select: { quarter: true },
    });

    return NextResponse.json({ success: true, publishedQuarters: rows.map((r) => r.quarter) });
  } catch (error) {
    logger.error('Failed to load corp report publish state', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load publish state');
  }
}

/**
 * POST /api/space-tycoon/corp-report
 *
 * Opt-in publish of a single quarterly report to the public Corporate
 * Registry (/space-tycoon/registry). The player triggers this explicitly
 * from ReportsPanel.tsx — reports are never published automatically.
 *
 * corpId/corpName are derived from the caller's own GameProfile (same
 * auth/session pattern as /api/space-tycoon/sync) — a player can only ever
 * publish under their own corporation, never spoof another corpId.
 *
 * Player-influenced strings (notable-event titles) are sanitized with
 * sanitize-html before storage — see shapeCorpReportForStorage
 * (src/lib/game/corp-report-registry.ts). Upserts on (corpId, quarter): a
 * re-publish of the same quarter (e.g. republishing after a stat correction)
 * overwrites rather than erroring.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });
    if (!profile) {
      return NextResponse.json(
        { error: 'No game profile found. Play a session and sync before publishing.' },
        { status: 404 },
      );
    }

    const body = await request.json();
    const validation = validateBody(publishCorpReportSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const shaped = shapeCorpReportForStorage(validation.data);
    const quarter = quarterKey(shaped.quarterIndex);
    // companyName is already tag-stripped/length-capped at write time by
    // /api/space-tycoon/sync — trusted as far as that route trusts it.
    const corpName = profile.companyName;

    const saved = await prisma.publishedCorpReport.upsert({
      where: { corpId_quarter: { corpId: profile.id, quarter } },
      create: {
        corpId: profile.id,
        corpName,
        quarter,
        reportJson: JSON.stringify(shaped),
      },
      update: {
        corpName,
        reportJson: JSON.stringify(shaped),
        publishedAt: new Date(),
      },
    });

    logger.info('Quarterly report published to Corporate Registry', {
      corpId: profile.id,
      quarter,
    });

    return NextResponse.json({
      success: true,
      quarter,
      publishedAt: saved.publishedAt,
      url: `/space-tycoon/corp/${profile.id}`,
    });
  } catch (error) {
    logger.error('Failed to publish corp report', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to publish report');
  }
}
