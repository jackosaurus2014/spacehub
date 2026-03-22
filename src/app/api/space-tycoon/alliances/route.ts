import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/space-tycoon/alliances
 * Returns the player's alliance (if any) as myAlliance,
 * and a list of other alliances as listings.
 */
export async function GET() {
  try {
    // Identify the current user so we can find their alliance
    const session = await getServerSession(authOptions);
    let myProfileId: string | null = null;
    if (session?.user?.id) {
      const profile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      myProfileId = profile?.id ?? null;
    }

    // Check if user is in an alliance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let myAlliance: Record<string, any> | null = null;
    if (myProfileId) {
      const membership = await prisma.allianceMember.findUnique({
        where: { profileId: myProfileId },
        select: { allianceId: true, role: true },
      });

      if (membership) {
        const alliance = await prisma.alliance.findUnique({
          where: { id: membership.allianceId },
          include: {
            members: {
              select: {
                role: true,
                profileId: true,
                joinedAt: true,
                profile: { select: { companyName: true, netWorth: true } },
              },
            },
          },
        });

        if (alliance) {
          const bonusRevenue = Math.min(0.25, 0.05 * alliance.memberCount);
          myAlliance = {
            id: alliance.id,
            name: alliance.name,
            tag: alliance.tag,
            memberCount: alliance.memberCount,
            totalNetWorth: alliance.totalNetWorth,
            createdAt: alliance.createdAt.getTime(),
            members: alliance.members.map(m => ({
              companyName: m.profile.companyName,
              role: m.role,
              netWorth: m.profile.netWorth,
              joinedAt: m.joinedAt.getTime(),
              isYou: m.profileId === myProfileId,
            })),
            bonuses: [
              { label: 'Revenue', icon: '💰', value: Math.round(bonusRevenue * 100), type: 'revenue' },
              { label: 'Mining', icon: '⛏️', value: Math.round(bonusRevenue * 50), type: 'mining' },
              { label: 'Research', icon: '🔬', value: Math.round(bonusRevenue * 30), type: 'research' },
            ],
            sharedFacilities: [],
          };
        }
      }
    }

    // Get all alliances for the listings (excluding user's own)
    const allAlliances = await prisma.alliance.findMany({
      orderBy: { totalNetWorth: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        tag: true,
        memberCount: true,
        totalNetWorth: true,
      },
    });

    const listings = allAlliances
      .filter(a => !myAlliance || a.id !== myAlliance.id)
      .map(a => ({
        id: a.id,
        name: a.name,
        tag: a.tag,
        memberCount: a.memberCount,
        totalNetWorth: a.totalNetWorth,
        isOpen: a.memberCount < 20,
      }));

    return NextResponse.json({ myAlliance, listings });
  } catch (error) {
    logger.error('Alliance fetch error', { error: String(error) });
    return NextResponse.json({ myAlliance: null, listings: [] });
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
