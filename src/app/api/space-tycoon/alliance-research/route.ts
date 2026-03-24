import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  RESEARCH_MAP,
  getAnnotatedResearchTree,
  canStartResearch,
  getResearchDurationMs,
} from '@/lib/game/alliance-research';
import { awardAllianceXP } from '@/lib/game/alliance-xp';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/alliance-research
 * Returns the full research tree annotated with status for the player's alliance.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    const alliance = await prisma.alliance.findUniqueOrThrow({
      where: { id: membership.allianceId },
      select: { id: true, level: true, xp: true, treasury: true },
    });

    // Get all research records for this alliance
    const researchRecords = await prisma.allianceResearch.findMany({
      where: { allianceId: alliance.id },
      select: {
        researchId: true,
        status: true,
        progressPct: true,
        startedAt: true,
        completedAt: true,
        startedBy: true,
      },
    });

    const completedIds = researchRecords
      .filter(r => r.status === 'completed')
      .map(r => r.researchId);

    const researchingRecord = researchRecords.find(r => r.status === 'researching');
    const researchingId = researchingRecord?.researchId ?? null;

    const tree = getAnnotatedResearchTree(completedIds, researchingId, alliance.level);

    // Merge progress info from DB
    const recordMap = new Map(researchRecords.map(r => [r.researchId, r]));
    const annotatedTree = tree.map(r => {
      const dbRecord = recordMap.get(r.researchId);
      return {
        ...r,
        progressPct: dbRecord?.progressPct ?? 0,
        startedAt: dbRecord?.startedAt?.getTime() ?? null,
        completedAt: dbRecord?.completedAt?.getTime() ?? null,
      };
    });

    return NextResponse.json({
      allianceLevel: alliance.level,
      allianceXP: alliance.xp,
      treasury: alliance.treasury,
      currentlyResearching: researchingId,
      researchProgress: researchingRecord?.progressPct ?? null,
      tree: annotatedTree,
    });
  } catch (error) {
    logger.error('Alliance research GET error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to load research tree' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/alliance-research
 * Start a new research item.
 * Body: { researchId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, companyName: true },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const membership = await prisma.allianceMember.findUnique({
      where: { profileId: profile.id },
      select: { allianceId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });
    }

    if (!['leader', 'officer'].includes(membership.role)) {
      return NextResponse.json({ error: 'Only leaders and officers can start research' }, { status: 403 });
    }

    const body = await request.json();
    const { researchId } = body;

    if (!researchId || typeof researchId !== 'string') {
      return NextResponse.json({ error: 'Missing researchId' }, { status: 400 });
    }

    const researchDef = RESEARCH_MAP.get(researchId);
    if (!researchDef) {
      return NextResponse.json({ error: 'Unknown research ID' }, { status: 400 });
    }

    const alliance = await prisma.alliance.findUniqueOrThrow({
      where: { id: membership.allianceId },
      select: { id: true, level: true, xp: true, treasury: true },
    });

    // Get completed research
    const completedRecords = await prisma.allianceResearch.findMany({
      where: { allianceId: alliance.id, status: 'completed' },
      select: { researchId: true },
    });
    const completedIds = completedRecords.map(r => r.researchId);

    // Count currently researching
    const researchingCount = await prisma.allianceResearch.count({
      where: { allianceId: alliance.id, status: 'researching' },
    });

    // Validate
    const check = canStartResearch(alliance, researchDef, completedIds, researchingCount);
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    const now = new Date();

    // Start research — deduct treasury cost if any, create record
    await prisma.$transaction([
      // Deduct treasury cost
      ...(researchDef.treasuryCost > 0
        ? [prisma.alliance.update({
            where: { id: alliance.id },
            data: { treasury: { decrement: researchDef.treasuryCost } },
          })]
        : []),
      // Create or update research record
      prisma.allianceResearch.upsert({
        where: {
          allianceId_researchId: { allianceId: alliance.id, researchId },
        },
        create: {
          allianceId: alliance.id,
          researchId,
          name: researchDef.name,
          tier: researchDef.tier,
          category: researchDef.category,
          status: 'researching',
          xpCost: researchDef.xpCost,
          treasuryCost: researchDef.treasuryCost,
          progressPct: 0,
          startedAt: now,
          startedBy: profile.id,
          bonusType: researchDef.bonusType,
          bonusValue: researchDef.bonusValue,
        },
        update: {
          status: 'researching',
          startedAt: now,
          startedBy: profile.id,
          progressPct: 0,
        },
      }),
    ]);

    // Log
    await prisma.allianceLog.create({
      data: {
        allianceId: alliance.id,
        type: 'research_started',
        actorId: profile.id,
        actorName: profile.companyName,
        title: `${profile.companyName} started researching ${researchDef.name}`,
        description: `Tier ${researchDef.tier} — completes in ${researchDef.durationDays} day(s).`,
        metadata: { researchId, tier: researchDef.tier, durationDays: researchDef.durationDays },
      },
    });

    // Award small XP for starting research
    await awardAllianceXP(prisma, alliance.id, 10, 'research', profile.id, profile.companyName);

    return NextResponse.json({
      success: true,
      researchId,
      name: researchDef.name,
      durationMs: getResearchDurationMs(researchDef.durationDays),
      estimatedCompletion: new Date(now.getTime() + getResearchDurationMs(researchDef.durationDays)).toISOString(),
    });
  } catch (error) {
    logger.error('Alliance research POST error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to start research' }, { status: 500 });
  }
}
