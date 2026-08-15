import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, chapterContributeSchema } from '@/lib/validations';
import { validationError, unauthorizedError, internalError } from '@/lib/errors';
import { getCurrentChapterInstance, getFinaleWindow, getChapterForCycle } from '@/lib/game/chapters';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/space-tycoon/chapters
 *
 * Live-Service Wave LS8 (docs/LIVE_SERVICE_2026-08.md §LS8): the real server
 * counter behind "aggregate-participation thresholds read from server
 * counters" (spec). This route does NOT move money — the personal cost of
 * answering a chapter's finale call is applied entirely client-side through
 * chapters.ts's resolveChapterChoice (the same applyChainConsequence path
 * every other narrative-events.ts chain choice uses). It only tracks WHO
 * contributed, once per (cycleIndex, profileId), so every client can read a
 * real, server-backed participation count and compute the identical
 * participation-weighted finale outcome (chapters.ts's computeFinaleOutcome
 * — pure given cycleIndex + this count).
 *
 * GET  (public, unauthenticated) → current (or ?cycleIndex=N) chapter's
 *      finale window + participation count + (if signed in) whether this
 *      profile already contributed.
 * POST (authenticated) → record this profile's contribution. Rejected
 *      outside the finale's fixed-UTC window so a late write can't skew the
 *      count after resolveChapterEpilogue has already been read by other
 *      clients (the window is the same real-time gate every client already
 *      sees on the calendar).
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cycleParam = url.searchParams.get('cycleIndex');
    const nowMs = Date.now();
    const inst = getCurrentChapterInstance(nowMs);
    const cycleIndex = cycleParam !== null && Number.isFinite(Number(cycleParam))
      ? Math.max(0, Math.trunc(Number(cycleParam)))
      : inst.cycleIndex;
    const chapterId = cycleIndex === inst.cycleIndex ? inst.def.id : getChapterForCycle(cycleIndex).id;
    const finaleWindow = getFinaleWindow(cycleIndex);

    const participationCount = await prisma.chapterContribution.count({ where: { cycleIndex } });

    let hasParticipated = false;
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (profile) {
        const row = await prisma.chapterContribution.findUnique({
          where: { cycleIndex_profileId: { cycleIndex, profileId: profile.id } },
        });
        hasParticipated = !!row;
      }
    }

    return NextResponse.json({
      success: true,
      cycleIndex,
      chapterId,
      participationCount,
      finaleWindow,
      finaleOpen: nowMs >= finaleWindow.startMs && nowMs < finaleWindow.endMs,
      finaleClosed: nowMs >= finaleWindow.endMs,
      hasParticipated,
    });
  } catch (error) {
    logger.error('Failed to load chapter participation', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Flavor-adjacent but gameplay-relevant — fail open with a zero count
    // rather than 500ing the client's finale resolution.
    return NextResponse.json({
      success: false, cycleIndex: 0, chapterId: '', participationCount: 0,
      finaleWindow: { startMs: 0, endMs: 0 }, finaleOpen: false, finaleClosed: false, hasParticipated: false,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile found. Play a session and sync before contributing.' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(chapterContributeSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }
    const { cycleIndex, chapterId } = validation.data;

    const nowMs = Date.now();
    const finaleWindow = getFinaleWindow(cycleIndex);
    if (nowMs < finaleWindow.startMs || nowMs >= finaleWindow.endMs) {
      return NextResponse.json(
        { error: 'This chapter\'s finale window is not currently open — the contribution was not recorded.' },
        { status: 409 },
      );
    }

    await prisma.chapterContribution.upsert({
      where: { cycleIndex_profileId: { cycleIndex, profileId: profile.id } },
      create: { cycleIndex, chapterId, profileId: profile.id },
      update: {},
    });

    const participationCount = await prisma.chapterContribution.count({ where: { cycleIndex } });

    return NextResponse.json({ success: true, cycleIndex, participationCount });
  } catch (error) {
    logger.error('Failed to record chapter contribution', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to record contribution');
  }
}
