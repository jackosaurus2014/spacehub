import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, publishCorpEraSchema } from '@/lib/validations';
import { validationError, unauthorizedError, internalError } from '@/lib/errors';
import { shapeCorpEraForStorage, eraKey } from '@/lib/game/corp-era-registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/corp-era
 *
 * Live-Service Wave LS4 (docs/LIVE_SERVICE_2026-08.md §LS4). Returns the
 * calling player's own publish history (era keys only), so the in-game Era
 * Charters panel can render "Published" state without re-publishing on every
 * visit. Mirrors GET /api/space-tycoon/corp-report exactly.
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
      return NextResponse.json({ success: true, publishedEras: [] });
    }

    const rows = await prisma.corpEraRecord.findMany({
      where: { corpId: profile.id },
      select: { eraKey: true },
    });

    return NextResponse.json({ success: true, publishedEras: rows.map((r) => r.eraKey) });
  } catch (error) {
    logger.error('Failed to load corp era publish state', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load publish state');
  }
}

/**
 * POST /api/space-tycoon/corp-era
 *
 * Opt-in publish of a single completed era to the public Corporate Chronicle
 * (/space-tycoon/chronicle + the Chronicle section on
 * /space-tycoon/corp/[id]). The player triggers this explicitly from the Era
 * Charters panel — eras are never published automatically. corpId/corpName
 * are derived from the caller's own GameProfile (same auth/session pattern
 * as /api/space-tycoon/corp-report) — a player can only ever publish under
 * their own corporation. Upserts on (corpId, eraKey): a re-publish of the
 * same era overwrites rather than erroring.
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
    const validation = validateBody(publishCorpEraSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const shaped = shapeCorpEraForStorage(validation.data);
    const key = eraKey(shaped.eraIndex);
    const corpName = profile.companyName;

    const saved = await prisma.corpEraRecord.upsert({
      where: { corpId_eraKey: { corpId: profile.id, eraKey: key } },
      create: {
        corpId: profile.id,
        corpName,
        eraKey: key,
        recordJson: JSON.stringify(shaped),
      },
      update: {
        corpName,
        recordJson: JSON.stringify(shaped),
        publishedAt: new Date(),
      },
    });

    logger.info('Corporate era published to the Chronicle', {
      corpId: profile.id,
      eraKey: key,
    });

    return NextResponse.json({
      success: true,
      eraKey: key,
      publishedAt: saved.publishedAt,
      url: `/space-tycoon/corp/${profile.id}`,
    });
  } catch (error) {
    logger.error('Failed to publish corp era', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to publish era');
  }
}
