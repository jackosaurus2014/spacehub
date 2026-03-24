import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getBracketDisplayName,
  formatElapsedTime,
  SPEED_RUN_MILESTONES,
  BRACKETS,
} from '@/lib/game/speed-runs';
import type { SpeedRunBracket } from '@/lib/game/speed-runs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/speed-runs/leaderboard
 * Query params:
 *   - challengeId (required): The SpeedRunChallenge ID
 *   - bracket (optional): Filter by bracket (rookie, veteran, elite, grandmaster)
 *   - limit (optional): Max results (default 20, max 100)
 *
 * Returns: top entries by fastest time, plus the requesting player's rank.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = request.nextUrl;

    const challengeId = searchParams.get('challengeId');
    const bracketFilter = searchParams.get('bracket') as SpeedRunBracket | null;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    // Get the challenge details
    const challenge = await prisma.speedRunChallenge.findUnique({
      where: { id: challengeId },
      select: { id: true, weekId: true, milestoneId: true, milestoneName: true, milestoneTarget: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      challengeId,
      completedAtMs: { not: null },
      isVerified: true,
    };

    if (bracketFilter && BRACKETS.some(b => b.id === bracketFilter)) {
      whereClause.bracket = bracketFilter;
    }

    // Get top entries
    const topAttempts = await prisma.speedRunAttempt.findMany({
      where: whereClause,
      orderBy: [
        { durationSeconds: 'asc' },
        { completedAtMs: 'asc' }, // Tie-break: earlier completion wins
        { prestigeLevel: 'desc' }, // Second tie-break: higher prestige level
      ],
      take: limit,
      include: {
        profile: {
          select: {
            id: true,
            companyName: true,
            allianceMembership: {
              select: {
                alliance: { select: { tag: true } },
              },
            },
          },
        },
      },
    });

    // Get the current player's info
    let currentPlayerProfile: { id: string } | null = null;
    if (session?.user?.id) {
      currentPlayerProfile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
    }

    // Format leaderboard entries
    const entries = topAttempts.map((a, i) => ({
      rank: i + 1,
      companyName: a.profile.companyName,
      allianceTag: a.profile.allianceMembership?.alliance?.tag || null,
      elapsedMs: (a.durationSeconds ?? 0) * 1000,
      elapsedFormatted: formatElapsedTime((a.durationSeconds ?? 0) * 1000),
      prestigeLevel: a.prestigeLevel,
      bracket: a.bracket,
      bracketName: getBracketDisplayName(a.bracket as SpeedRunBracket),
      completedAt: a.completedAtMs,
      isCurrentPlayer: currentPlayerProfile ? a.profile.id === currentPlayerProfile.id : false,
    }));

    // Find current player's rank if they're not in the top results
    let currentPlayer: {
      rank: number;
      elapsedMs: number;
      elapsedFormatted: string;
      bracket: string;
      bracketName: string;
    } | null = null;

    if (currentPlayerProfile) {
      const playerAttempt = await prisma.speedRunAttempt.findFirst({
        where: {
          challengeId,
          profileId: currentPlayerProfile.id,
          completedAtMs: { not: null },
          isVerified: true,
        },
      });

      if (playerAttempt && playerAttempt.durationSeconds !== null) {
        const playerFasterCount = await prisma.speedRunAttempt.count({
          where: {
            challengeId,
            completedAtMs: { not: null },
            isVerified: true,
            durationSeconds: { lt: playerAttempt.durationSeconds },
            ...(bracketFilter ? { bracket: bracketFilter } : {}),
          },
        });

        const elapsedMs = playerAttempt.durationSeconds * 1000;
        currentPlayer = {
          rank: playerFasterCount + 1,
          elapsedMs,
          elapsedFormatted: formatElapsedTime(elapsedMs),
          bracket: playerAttempt.bracket,
          bracketName: getBracketDisplayName(playerAttempt.bracket as SpeedRunBracket),
        };
      }
    }

    // Get stats
    const totalParticipants = await prisma.speedRunAttempt.count({
      where: whereClause,
    });

    // Get bracket breakdown
    const bracketCounts: Record<string, number> = {};
    for (const b of BRACKETS) {
      bracketCounts[b.id] = await prisma.speedRunAttempt.count({
        where: {
          challengeId,
          bracket: b.id,
          completedAtMs: { not: null },
          isVerified: true,
        },
      });
    }

    // Find the milestone definition for extra info
    const milestoneDef = SPEED_RUN_MILESTONES.find(m => m.id === challenge.milestoneId);

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        weekId: challenge.weekId,
        milestoneId: challenge.milestoneId,
        milestoneName: challenge.milestoneName,
        milestoneTarget: challenge.milestoneTarget,
        tier: milestoneDef?.tier ?? 'Medium',
      },
      bracket: bracketFilter
        ? { id: bracketFilter, name: getBracketDisplayName(bracketFilter) }
        : { id: 'all', name: 'All Brackets' },
      entries,
      currentPlayer,
      stats: {
        totalParticipants,
        bracketCounts,
      },
    });
  } catch (error) {
    console.error('Speed run leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
