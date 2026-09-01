import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculateMentorshipRewards } from '@/lib/game/catchup-mechanics';
import { MAX_MENTEES_PER_MENTOR } from '@/lib/game/constants';

export const dynamic = 'force-dynamic';

/**
 * Live-Service Wave LS2 (docs/LIVE_SERVICE_2026-08.md §LS2 mechanic 3):
 * mentorship — wires catchup-mechanics.ts's previously dead-code
 * calculateMentorshipRewards through a real server pairing (GameMentorship,
 * prisma/schema.prisma). CLAUDE.md commitment: "Veterans who sponsor new
 * players earn real in-game bonuses tied to the mentee's success."
 *
 * NEWNESS INPUT — a deliberate adaptation, documented here: the spec's
 * "mentee = new OR lapsed-returning player" needs one decay curve that
 * covers both cases. calculateMentorshipRewards was authored around raw
 * ACCOUNT age (a brand-new player's account is a few days old), which
 * would always read as "not new" for a lapsed VETERAN mentee (whose
 * account can be months old). Using days-since-this-mentorship-began
 * instead of days-since-account-created covers both: a fresh newcomer and
 * a freshly-returned veteran both start their mentorship on day 0 and both
 * decay over the following 30 days of active mentoring — the incentive is
 * "help someone who just started getting mentored," not "help someone who
 * just made an account."
 *
 * GET  → { isMentor, activeAsMentor: [...], pendingAsMentor: [...],
 *          asMentee: {...}|null, availableMentors: [...] }
 * POST → { action: 'opt_in'|'opt_out'|'request'|'accept'|'decline'|'end', ... }
 *
 * Also the home of the game's other per-profile opt-in (2026-09-01): the
 * Space Tycoon weekly report email (GameProfile.weeklyReportEmail, default
 * OFF). GET exposes `weeklyReportEmail`; POST { action: 'set_weekly_report',
 * enabled } persists it. Sends live in src/lib/game/weekly-report-email.ts.
 */

const weeklyReportPrefSchema = z.object({
  action: z.literal('set_weekly_report'),
  enabled: z.boolean(),
});

async function getOwnProfile(userId: string) {
  return prisma.gameProfile.findUnique({
    where: { userId },
    select: { id: true, companyName: true, netWorth: true, totalEarned: true, createdAt: true, mentorOptIn: true, weeklyReportEmail: true },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await getOwnProfile(session.user.id);
    if (!me) return NextResponse.json({ error: 'No game profile yet' }, { status: 404 });

    const [asMentorRows, asMenteeRows] = await Promise.all([
      prisma.gameMentorship.findMany({
        where: { mentorProfileId: me.id, status: { in: ['active', 'pending'] } },
        include: { menteeProfile: { select: { companyName: true, netWorth: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.gameMentorship.findFirst({
        where: { menteeProfileId: me.id, status: { in: ['active', 'pending'] } },
        include: { mentorProfile: { select: { companyName: true, netWorth: true } } },
      }),
    ]);

    const activeAsMentor = asMentorRows.filter(r => r.status === 'active').map(r => ({
      id: r.id,
      menteeCompanyName: r.menteeProfile.companyName,
      startedAt: r.startedAt.getTime(),
      rewardPreview: calculateMentorshipRewards(
        Math.max(0, (Date.now() - r.startedAt.getTime()) / 86_400_000),
        me.totalEarned,
      ).mentorRevenueBonus,
    }));
    const pendingAsMentor = asMentorRows.filter(r => r.status === 'pending').map(r => ({
      id: r.id,
      menteeCompanyName: r.menteeProfile.companyName,
      requestedAt: r.createdAt.getTime(),
    }));

    let asMentee: Record<string, unknown> | null = null;
    if (asMenteeRows) {
      asMentee = {
        id: asMenteeRows.id,
        status: asMenteeRows.status,
        mentorCompanyName: asMenteeRows.mentorProfile.companyName,
        startedAt: asMenteeRows.startedAt.getTime(),
        rewardPreview: asMenteeRows.status === 'active'
          ? calculateMentorshipRewards(
            Math.max(0, (Date.now() - asMenteeRows.startedAt.getTime()) / 86_400_000),
            0,
          ).menteeBoost
          : 0,
      };
    }

    let availableMentors: { id: string; companyName: string; netWorth: number }[] = [];
    if (!asMenteeRows) {
      const candidates = await prisma.gameProfile.findMany({
        where: { mentorOptIn: true, id: { not: me.id } },
        select: {
          id: true, companyName: true, netWorth: true,
          mentorshipsAsMentor: { where: { status: 'active' }, select: { id: true } },
        },
        orderBy: { netWorth: 'desc' },
        take: 40,
      });
      availableMentors = candidates
        .filter(c => c.mentorshipsAsMentor.length < MAX_MENTEES_PER_MENTOR)
        .slice(0, 20)
        .map(c => ({ id: c.id, companyName: c.companyName, netWorth: c.netWorth }));
    }

    return NextResponse.json({
      success: true,
      isMentor: me.mentorOptIn,
      weeklyReportEmail: me.weeklyReportEmail,
      activeAsMentor,
      pendingAsMentor,
      asMentee,
      availableMentors,
      maxMenteesPerMentor: MAX_MENTEES_PER_MENTOR,
    });
  } catch (error) {
    logger.error('Mentorship GET error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await getOwnProfile(session.user.id);
    if (!me) return NextResponse.json({ error: 'No game profile yet' }, { status: 404 });

    const body = await request.json();
    const action = body?.action as string;

    if (action === 'opt_in') {
      await prisma.gameProfile.update({ where: { id: me.id }, data: { mentorOptIn: true } });
      return NextResponse.json({ success: true });
    }

    if (action === 'set_weekly_report') {
      const parsed = weeklyReportPrefSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
      await prisma.gameProfile.update({ where: { id: me.id }, data: { weeklyReportEmail: parsed.data.enabled } });
      return NextResponse.json({ success: true, weeklyReportEmail: parsed.data.enabled });
    }

    if (action === 'opt_out') {
      await prisma.$transaction([
        prisma.gameProfile.update({ where: { id: me.id }, data: { mentorOptIn: false } }),
        // Ending existing pairings on opt-out — CLAUDE.md diplomacy-feed
        // spirit: a mentor stepping back shouldn't leave stale bonus
        // pairings; mentees simply lose the boost, never blocked from
        // requesting a different opted-in mentor.
        prisma.gameMentorship.updateMany({
          where: { mentorProfileId: me.id, status: { in: ['active', 'pending'] } },
          data: { status: 'ended', endedAt: new Date() },
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    if (action === 'request') {
      const targetProfileId = String(body?.targetProfileId || '');
      if (!targetProfileId || targetProfileId === me.id) {
        return NextResponse.json({ error: 'Invalid mentor' }, { status: 400 });
      }
      const existingAsMentee = await prisma.gameMentorship.findFirst({
        where: { menteeProfileId: me.id, status: { in: ['active', 'pending'] } },
      });
      if (existingAsMentee) return NextResponse.json({ error: 'Already have a mentor pairing' }, { status: 409 });

      const target = await prisma.gameProfile.findUnique({
        where: { id: targetProfileId },
        select: { id: true, mentorOptIn: true, mentorshipsAsMentor: { where: { status: 'active' }, select: { id: true } } },
      });
      if (!target || !target.mentorOptIn) return NextResponse.json({ error: 'Mentor not available' }, { status: 400 });
      if (target.mentorshipsAsMentor.length >= MAX_MENTEES_PER_MENTOR) {
        return NextResponse.json({ error: 'Mentor at capacity' }, { status: 409 });
      }

      const match = await prisma.gameMentorship.create({
        data: { mentorProfileId: targetProfileId, menteeProfileId: me.id, status: 'pending' },
      });
      return NextResponse.json({ success: true, matchId: match.id });
    }

    if (action === 'accept' || action === 'decline') {
      const matchId = String(body?.matchId || '');
      const match = await prisma.gameMentorship.findUnique({ where: { id: matchId } });
      if (!match || match.mentorProfileId !== me.id || match.status !== 'pending') {
        return NextResponse.json({ error: 'No such pending request' }, { status: 404 });
      }
      if (action === 'accept') {
        const activeCount = await prisma.gameMentorship.count({
          where: { mentorProfileId: me.id, status: 'active' },
        });
        if (activeCount >= MAX_MENTEES_PER_MENTOR) {
          return NextResponse.json({ error: 'Mentor at capacity' }, { status: 409 });
        }
        // Re-stamp startedAt at acceptance — the newness decay begins when
        // mentoring actually starts, not when the request was sent.
        await prisma.gameMentorship.update({
          where: { id: matchId },
          data: { status: 'active', startedAt: new Date() },
        });
      } else {
        await prisma.gameMentorship.update({
          where: { id: matchId },
          data: { status: 'declined', endedAt: new Date() },
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'end') {
      const matchId = String(body?.matchId || '');
      const match = await prisma.gameMentorship.findUnique({ where: { id: matchId } });
      if (!match || (match.mentorProfileId !== me.id && match.menteeProfileId !== me.id)) {
        return NextResponse.json({ error: 'No such pairing' }, { status: 404 });
      }
      await prisma.gameMentorship.update({
        where: { id: matchId },
        data: { status: 'ended', endedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error('Mentorship POST error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
