import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/alliances
 * Returns all alliances with member counts and net worth.
 */
export async function GET() {
  try {
    const alliances = await prisma.alliance.findMany({
      orderBy: { totalNetWorth: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        tag: true,
        description: true,
        memberCount: true,
        totalNetWorth: true,
        bonusRevenue: true,
        leaderId: true,
        members: {
          select: {
            role: true,
            profile: { select: { companyName: true, netWorth: true } },
          },
          take: 10,
        },
      },
    });

    return NextResponse.json({ alliances });
  } catch (error) {
    return NextResponse.json({ alliances: [] });
  }
}

/**
 * POST /api/space-tycoon/alliances
 * Create, join, or leave an alliance.
 *
 * Create: { action: "create", name: string, tag: string, description?: string }
 * Join:   { action: "join", allianceId: string }
 * Leave:  { action: "leave" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 });
    }

    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const body = await request.json();

    if (body.action === 'create') {
      const { name, tag, description } = body;
      if (!name || !tag || tag.length < 2 || tag.length > 5) {
        return NextResponse.json({ error: 'Name required, tag must be 2-5 characters' }, { status: 400 });
      }

      // Check not already in an alliance
      const existing = await prisma.allianceMember.findUnique({ where: { profileId: profile.id } });
      if (existing) {
        return NextResponse.json({ error: 'Already in an alliance. Leave first.' }, { status: 400 });
      }

      const alliance = await prisma.alliance.create({
        data: {
          name: String(name).slice(0, 30),
          tag: String(tag).toUpperCase().slice(0, 5),
          description: description ? String(description).slice(0, 200) : null,
          leaderId: profile.id,
          memberCount: 1,
          totalNetWorth: profile.netWorth,
          members: {
            create: { profileId: profile.id, role: 'leader' },
          },
        },
      });

      await prisma.playerActivity.create({
        data: {
          profileId: profile.id,
          companyName: profile.companyName,
          type: 'alliance_created',
          title: `${profile.companyName} founded alliance [${alliance.tag}] ${alliance.name}`,
          metadata: { allianceId: alliance.id, allianceName: alliance.name, tag: alliance.tag },
        },
      });

      return NextResponse.json({ success: true, alliance });
    }

    if (body.action === 'join') {
      const { allianceId } = body;
      if (!allianceId) return NextResponse.json({ error: 'Missing allianceId' }, { status: 400 });

      const existing = await prisma.allianceMember.findUnique({ where: { profileId: profile.id } });
      if (existing) {
        return NextResponse.json({ error: 'Already in an alliance' }, { status: 400 });
      }

      const alliance = await prisma.alliance.findUnique({ where: { id: allianceId } });
      if (!alliance) return NextResponse.json({ error: 'Alliance not found' }, { status: 404 });
      if (alliance.memberCount >= 20) {
        return NextResponse.json({ error: 'Alliance is full (max 20 members)' }, { status: 400 });
      }

      await prisma.allianceMember.create({
        data: { allianceId, profileId: profile.id, role: 'member' },
      });

      // Update alliance stats
      const bonusRevenue = Math.min(0.25, 0.05 * (alliance.memberCount + 1)); // +5% per member, cap 25%
      await prisma.alliance.update({
        where: { id: allianceId },
        data: {
          memberCount: { increment: 1 },
          totalNetWorth: { increment: profile.netWorth },
          bonusRevenue,
        },
      });

      return NextResponse.json({ success: true, allianceName: alliance.name, bonusRevenue });
    }

    if (body.action === 'leave') {
      const membership = await prisma.allianceMember.findUnique({ where: { profileId: profile.id } });
      if (!membership) return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 });

      await prisma.allianceMember.delete({ where: { id: membership.id } });

      const alliance = await prisma.alliance.findUnique({ where: { id: membership.allianceId } });
      if (alliance) {
        const newCount = Math.max(0, alliance.memberCount - 1);
        if (newCount === 0) {
          // Dissolve alliance if last member leaves
          await prisma.alliance.delete({ where: { id: alliance.id } });
        } else {
          const bonusRevenue = Math.min(0.25, 0.05 * newCount);
          await prisma.alliance.update({
            where: { id: alliance.id },
            data: {
              memberCount: newCount,
              totalNetWorth: { decrement: profile.netWorth },
              bonusRevenue,
            },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    logger.error('Alliance error', { error: String(error) });
    return NextResponse.json({ error: 'Alliance operation failed' }, { status: 500 });
  }
}
