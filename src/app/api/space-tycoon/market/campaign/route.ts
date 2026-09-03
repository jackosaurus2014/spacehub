import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import {
  PRICE_CAMPAIGN_DURATION_MS,
  PRICE_CAMPAIGN_COOLDOWN_MS,
  PRICE_CAMPAIGN_MIN_NET_WORTH,
  MAX_ACTIVE_CAMPAIGNS_PER_PROFILE,
  computeMarketKeyedCampaignFee,
  computeCampaignMinInventory,
} from '@/lib/game/price-campaigns';
import { isServerFrontierProtected } from '@/lib/game/talent-poaching';
import { getCampaignMarketTelemetry } from '@/lib/game/offense-server';
import { findNonAggressionCampaignBlock } from '@/lib/game/corp-pacts-server';
import { recordLedger, isLedgerAvailable } from '@/lib/game/server-ledger';

export const dynamic = 'force-dynamic';

/**
 * Price campaigns — targeted dumping (Wave M5, docs/MEANINGFUL_2026-08.md
 * §3.2 O2). GET: all active campaigns (fully public — reputation is
 * legible, canon); with `?quote=<resourceSlug>` also returns the
 * SERVER-computed declare quote (Balance Pass 9: market-keyed fee =
 * clamp(0.15 × trailing-7d window turnover, $25M, $5B) + scaled
 * min-inventory) — the UI must display THIS quote, never a client-side
 * guess that could diverge from the charge.
 * POST { action: 'declare', resourceSlug }: pay the burned fee, hold real
 * inventory ammunition, and open a 7-day campaign; while it runs,
 * mean-revert skips the resource and the NPC maker halves its bid volume
 * (see price-campaigns.ts header for the full mechanics).
 * POST { action: 'cancel', campaignId }: end your campaign early (no fee
 * refund; the cooldown still applies — retreat isn't free).
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    // Pass 9: server-computed declare quote (fee + min inventory).
    let quote: { resourceSlug: string; fee: number; minInventory: number; windowTurnover: number } | null = null;
    const quoteSlug = request.nextUrl.searchParams.get('quote');
    if (quoteSlug && RESOURCE_MAP.has(quoteSlug as ResourceId)) {
      try {
        const t = await getCampaignMarketTelemetry(quoteSlug);
        quote = {
          resourceSlug: quoteSlug,
          fee: computeMarketKeyedCampaignFee(t.windowTurnover),
          minInventory: computeCampaignMinInventory(t.windowProductionUnits),
          windowTurnover: t.windowTurnover,
        };
      } catch { /* quote best-effort — UI falls back to "computed at declare time" */ }
    }
    const campaigns = await prisma.priceCampaign.findMany({
      where: { status: 'active', endsAt: { gt: now } },
      include: { profile: { select: { companyName: true } } },
      orderBy: { endsAt: 'asc' },
      take: 50,
    });
    return NextResponse.json({
      campaigns: campaigns.map(c => ({
        id: c.id,
        resourceSlug: c.resourceSlug,
        byCompanyName: c.profile.companyName,
        declaredAt: c.declaredAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
        feePaid: c.feePaid,
      })),
      quote,
    });
  } catch (error) {
    logger.error('Price campaign list error', { error: String(error) });
    return NextResponse.json({ campaigns: [], quote: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const profile = await prisma.gameProfile.findUnique({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'No game profile' }, { status: 404 });
    }

    const body = await request.json();

    if (body.action === 'cancel') {
      const campaign = await prisma.priceCampaign.findUnique({ where: { id: String(body.campaignId || '') } });
      if (!campaign || campaign.profileId !== profile.id || campaign.status !== 'active') {
        return NextResponse.json({ error: 'No such active campaign of yours' }, { status: 400 });
      }
      await prisma.priceCampaign.update({
        where: { id: campaign.id },
        data: { status: 'cancelled', endsAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action !== 'declare') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const resourceSlug = String(body.resourceSlug || '');
    const resourceDef = RESOURCE_MAP.get(resourceSlug as ResourceId);
    if (!resourceDef) {
      return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
    }

    // ── Offense gates: post-Frontier + net-worth floor ([FRONTIER]) ──
    if (isServerFrontierProtected(profile.createdAt.getTime(), profile.netWorth)) {
      return NextResponse.json({
        error: 'Economic offense unlocks after the Protected Frontier.',
      }, { status: 400 });
    }
    if (profile.netWorth < PRICE_CAMPAIGN_MIN_NET_WORTH) {
      return NextResponse.json({
        error: `Declaring a price campaign requires $${(PRICE_CAMPAIGN_MIN_NET_WORTH / 1_000_000).toFixed(0)}M net worth.`,
      }, { status: 400 });
    }

    // ── Diplomacy (2026-09-02): non_aggression clause ──
    // A campaign on a market where a non-aggression partner holds ≥ 40% of
    // trailing traded value (market-share.ts) is refused until the actor
    // breaks the pact in public (corp-pacts.ts).
    const pactBlock = await findNonAggressionCampaignBlock(profile.id, resourceSlug);
    if (pactBlock) {
      return NextResponse.json(pactBlock, { status: 400 });
    }

    // ── One campaign at a time ──
    const activeCount = await prisma.priceCampaign.count({
      where: { profileId: profile.id, status: 'active', endsAt: { gt: new Date() } },
    });
    if (activeCount >= MAX_ACTIVE_CAMPAIGNS_PER_PROFILE) {
      return NextResponse.json({ error: 'You already have an active price campaign. One market at a time.' }, { status: 400 });
    }

    // ── Per-resource cooldown (14 days from the last campaign's end) ──
    const recent = await prisma.priceCampaign.findFirst({
      where: {
        profileId: profile.id,
        resourceSlug,
        endsAt: { gt: new Date(Date.now() - PRICE_CAMPAIGN_COOLDOWN_MS) },
      },
      orderBy: { endsAt: 'desc' },
    });
    if (recent) {
      return NextResponse.json({
        error: 'Cooldown: you campaigned on this market recently. Crashes cannot be chained back-to-back.',
      }, { status: 400 });
    }

    // ── Pass 9: market-keyed fee + scaled ammunition, from real telemetry ──
    // (trailing-7d window turnover / production units; fail-soft to the
    // $25M fee floor and 50-unit inventory floor when telemetry is empty —
    // see price-campaigns.ts + offense-server.ts).
    const telemetry = await getCampaignMarketTelemetry(resourceSlug);
    const minInventory = computeCampaignMinInventory(telemetry.windowProductionUnits);
    const fee = computeMarketKeyedCampaignFee(telemetry.windowTurnover);

    // ── Ammunition check: real inventory of the resource ──
    const resources = (profile.resources as Record<string, number>) || {};
    const held = resources[resourceSlug] || 0;
    if (held < minInventory) {
      return NextResponse.json({
        error: `A price war needs ammunition: hold at least ${minInventory} units of ${resourceDef.name} — 10% of this market's weekly production (you have ${held}).`,
      }, { status: 400 });
    }

    // ── Burned declaration fee ──
    if (profile.money < fee) {
      return NextResponse.json({
        error: `Insufficient funds. Campaign fee: $${(fee / 1_000_000).toFixed(0)}M (burned — 15% of this market's weekly turnover).`,
      }, { status: 400 });
    }

    const ledgerOn = await isLedgerAvailable();
    const campaign = await prisma.$transaction(async (tx) => {
      await tx.gameProfile.update({
        where: { id: profile.id },
        data: { money: { decrement: fee }, totalSpent: { increment: fee } },
      });
      const created = await tx.priceCampaign.create({
        data: {
          profileId: profile.id,
          resourceSlug,
          feePaid: fee,
          status: 'active',
          endsAt: new Date(Date.now() + PRICE_CAMPAIGN_DURATION_MS),
        },
      });
      if (ledgerOn) {
        await recordLedger(tx, {
          profileId: profile.id, moneyDelta: -fee,
          reason: 'price_campaign_fee', refId: created.id,
        });
      }
      // Public audit trail (simulation-integrity + diplomacy legibility).
      await tx.marketAuditLog.create({
        data: {
          eventType: 'price_campaign_declared',
          profileId: profile.id,
          resourceSlug,
          details: { campaignId: created.id, feePaid: fee, endsAt: created.endsAt.toISOString() },
          severity: 'info',
        },
      }).catch(() => { /* non-critical */ });
      return created;
    });

    // Public activity-feed entry — "every offensive act lands on the
    // diplomacy feed" (§M5).
    await prisma.playerActivity.create({
      data: {
        profileId: profile.id,
        companyName: profile.companyName,
        type: 'price_campaign_declared',
        title: `Declared a price campaign on ${resourceDef.name}`,
        description: `${profile.companyName} is dumping ${resourceDef.name} for 7 days — fee $${(fee / 1_000_000).toFixed(0)}M burned. Producers, brace or buy the dip.`,
        metadata: { campaignId: campaign.id, resourceSlug },
      },
    }).catch(() => { /* non-critical */ });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      feePaid: fee,
      endsAt: campaign.endsAt.toISOString(),
    });
  } catch (error) {
    logger.error('Price campaign declare error', { error: String(error) });
    return NextResponse.json({ error: 'Campaign action failed' }, { status: 500 });
  }
}
