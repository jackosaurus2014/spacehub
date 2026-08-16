import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { FREIGHT_TOLL_MIN, FREIGHT_TOLL_MAX } from '@/lib/game/offense';

export const dynamic = 'force-dynamic';

/**
 * Zone freight tolls (Wave M5, docs/MEANINGFUL_2026-08.md §3.2 O6 —
 * "chokepoint squeeze, lane concessions"). The zone's GOVERNOR may levy a
 * 0.5-2% cargo-value toll on rival dispatches crossing the zone's lanes,
 * or clear it (0). Tolls are fully public: delivered to every synced
 * client in the offense snapshot, announced on the activity feed, and
 * collected through the One-Wallet ledger when payers sync. Counterplay:
 * alternate routes (real Δv), trade treaties, or voting the governor out.
 *
 * POST { zoneSlug, tollPct } — tollPct 0 to clear, else clamped 0.005-0.02.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) return NextResponse.json({ error: 'No game profile' }, { status: 404 });

    const body = await request.json();
    const zoneSlug = String(body.zoneSlug || '');
    const rawPct = Number(body.tollPct);
    if (!zoneSlug || !Number.isFinite(rawPct) || rawPct < 0) {
      return NextResponse.json({ error: 'Invalid toll parameters' }, { status: 400 });
    }

    const zone = await prisma.zone.findUnique({ where: { slug: zoneSlug } });
    if (!zone) return NextResponse.json({ error: 'Unknown zone' }, { status: 404 });
    if (zone.governorId !== profile.id) {
      return NextResponse.json({ error: 'Only the zone governor may set freight tolls.' }, { status: 403 });
    }

    const tollPct = rawPct === 0 ? 0 : Math.max(FREIGHT_TOLL_MIN, Math.min(FREIGHT_TOLL_MAX, rawPct));
    await prisma.zone.update({ where: { id: zone.id }, data: { freightTollPct: tollPct } });

    // Public announcement — tolls are never a stealth tax (canon:
    // reputation is legible; the diplomacy feed carries the act).
    await prisma.playerActivity.create({
      data: {
        profileId: profile.id,
        companyName: profile.companyName,
        type: 'freight_toll_set',
        title: tollPct > 0
          ? `Levied a ${(tollPct * 100).toFixed(1)}% freight toll on ${zone.name}`
          : `Cleared the freight toll on ${zone.name}`,
        description: tollPct > 0
          ? `Governor ${profile.companyName} now charges ${(tollPct * 100).toFixed(1)}% of cargo value (capped) on rival dispatches crossing ${zone.name}. Frontier corporations are exempt; trade treaties reduce it.`
          : `${zone.name}'s lanes are toll-free again.`,
        metadata: { zoneSlug, tollPct },
      },
    }).catch(() => { /* non-critical */ });

    return NextResponse.json({ success: true, zoneSlug, tollPct });
  } catch (error) {
    logger.error('Zone toll error', { error: String(error) });
    return NextResponse.json({ error: 'Toll action failed' }, { status: 500 });
  }
}
