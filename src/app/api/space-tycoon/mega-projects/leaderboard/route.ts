import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/mega-projects/leaderboard
 * Returns alliance leaderboard (top 20 by total MPP + per-capita)
 * and individual leaderboard (top 50).
 * Includes the player's rank in both.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the active project
    const project = await prisma.megaProject.findFirst({
      where: { status: { in: ['active', 'extended', 'completed'] } },
      orderBy: { startsAt: 'desc' },
    });

    if (!project) {
      return NextResponse.json({
        alliances: [],
        individuals: [],
        playerAllianceRank: null,
        playerIndividualRank: null,
      });
    }

    // Get player profile
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        allianceMembership: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Game profile not found' }, { status: 404 });
    }

    // ─── Alliance Leaderboard (Top 20 by total MPP) ─────────────────────────

    const alliancesByTotal = await prisma.megaProjectAllianceScore.findMany({
      where: { projectId: project.id },
      orderBy: { totalMPP: 'desc' },
      take: 20,
      include: {
        alliance: { select: { name: true, tag: true, memberCount: true } },
      },
    });

    // Also get per-capita ranking
    const alliancesByPerCapita = await prisma.megaProjectAllianceScore.findMany({
      where: { projectId: project.id, perCapitaMPP: { gt: 0 } },
      orderBy: { perCapitaMPP: 'desc' },
      take: 20,
      include: {
        alliance: { select: { name: true, tag: true, memberCount: true } },
      },
    });

    // Find player's alliance rank
    let playerAllianceRank: {
      totalRank: number | null;
      perCapitaRank: number | null;
      totalMpp: number;
      perCapitaMpp: number;
    } | null = null;

    if (profile.allianceMembership?.allianceId) {
      const playerAllianceScore = await prisma.megaProjectAllianceScore.findUnique({
        where: {
          projectId_allianceId: {
            projectId: project.id,
            allianceId: profile.allianceMembership.allianceId,
          },
        },
      });

      if (playerAllianceScore) {
        const higherByTotal = await prisma.megaProjectAllianceScore.count({
          where: {
            projectId: project.id,
            totalMPP: { gt: playerAllianceScore.totalMPP },
          },
        });
        const higherByPerCapita = await prisma.megaProjectAllianceScore.count({
          where: {
            projectId: project.id,
            perCapitaMPP: { gt: playerAllianceScore.perCapitaMPP },
          },
        });

        playerAllianceRank = {
          totalRank: higherByTotal + 1,
          perCapitaRank: higherByPerCapita + 1,
          totalMpp: playerAllianceScore.totalMPP,
          perCapitaMpp: playerAllianceScore.perCapitaMPP,
        };
      }
    }

    // ─── Individual Leaderboard (Top 50) ────────────────────────────────────

    const topIndividuals = await prisma.megaProjectContribution.findMany({
      where: { projectId: project.id, totalMPP: { gt: 0 } },
      orderBy: { totalMPP: 'desc' },
      take: 50,
      include: {
        profile: {
          select: {
            id: true,
            companyName: true,
            allianceMembership: {
              include: { alliance: { select: { tag: true } } },
            },
          },
        },
      },
    });

    // Get player's individual contribution
    const playerContribution = await prisma.megaProjectContribution.findUnique({
      where: {
        projectId_profileId: {
          projectId: project.id,
          profileId: profile.id,
        },
      },
    });

    let playerIndividualRank: number | null = null;
    if (playerContribution && playerContribution.totalMPP > 0) {
      const higherCount = await prisma.megaProjectContribution.count({
        where: {
          projectId: project.id,
          totalMPP: { gt: playerContribution.totalMPP },
        },
      });
      playerIndividualRank = higherCount + 1;
    }

    // Total counts
    const totalAlliances = await prisma.megaProjectAllianceScore.count({
      where: { projectId: project.id },
    });
    const totalIndividuals = await prisma.megaProjectContribution.count({
      where: { projectId: project.id, totalMPP: { gt: 0 } },
    });

    return NextResponse.json({
      projectId: project.id,
      projectTitle: project.title,

      alliances: {
        byTotal: alliancesByTotal.map((a, i) => ({
          rank: i + 1,
          allianceId: a.allianceId,
          allianceName: a.alliance.name,
          allianceTag: a.alliance.tag,
          totalMpp: a.totalMPP,
          memberCount: a.alliance.memberCount,
          perCapitaMpp: a.perCapitaMPP,
        })),
        byPerCapita: alliancesByPerCapita.map((a, i) => ({
          rank: i + 1,
          allianceId: a.allianceId,
          allianceName: a.alliance.name,
          allianceTag: a.alliance.tag,
          totalMpp: a.totalMPP,
          memberCount: a.alliance.memberCount,
          perCapitaMpp: a.perCapitaMPP,
        })),
        playerAlliance: playerAllianceRank,
        total: totalAlliances,
      },

      individuals: {
        entries: topIndividuals.map((c, i) => ({
          rank: i + 1,
          profileId: c.profileId,
          companyName: c.profile.companyName,
          allianceTag: c.profile.allianceMembership?.alliance?.tag || null,
          totalMpp: c.totalMPP,
          isYou: c.profileId === profile.id,
        })),
        playerRank: playerIndividualRank,
        playerMpp: playerContribution?.totalMPP || 0,
        total: totalIndividuals,
      },
    });
  } catch (error) {
    logger.error('Mega-project leaderboard error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
