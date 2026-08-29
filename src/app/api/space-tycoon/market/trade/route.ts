import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculatePriceAfterTrade, getSupplyPriceMultiplier, MINIMUM_MARKET_SUPPLY, MARKET_BROKER_FEE_RATE, getEffectiveBrokerFeeRate } from '@/lib/game/market-engine';
import { getGlobalMarketEventMultiplier } from '@/lib/game/market-events';
import { MINED_ONLY_RESOURCE_IDS, MANUFACTURED_RESOURCE_IDS } from '@/lib/game/economic-sinks';
import { RESOURCE_MAP } from '@/lib/game/resources';
// Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 7 "Realignment postures
// bite"): getGoverningFactionForResource resolves which faction's economy a
// resource belongs to (delivery-contracts.ts's FACTION_FLAVOR reverse-
// lookup — the trade route has no locationId, so lane-crossing can't be
// determined directly; a resource's governing faction stands in for "whose
// space this trade crosses"). getFactionStandingBrokerModifier finally gets
// a real caller. computeFactionPostures/getCurrentRealignmentEpoch are pure/
// DB-free (realignment.ts header) — safe to call server-side with zero new
// plumbing, exactly like delivery-contracts.ts already does client-side.
import { getGoverningFactionForResource, computeTariffFeeRate } from '@/lib/game/delivery-contracts';
import { getFactionStandingBrokerModifier, getFactionLicenseBonuses, applyFractureRepModifier } from '@/lib/game/factions';
// AAA Round 1 wave E1: fracture status is server-owned (AccordFracture), and
// the same pure modifier runs on both sides of the wire.
import { isProfileFractured } from '@/lib/game/server-chair';

/**
 * Audit Wave B (Change #2): per-player sell-side broker-fee reductions.
 * - §1c: Magnate commander `marketPriceMultiplier` — roster synced into
 *   GameProfile.workforceData._commanders, bonus recomputed from definitions.
 * - A8: espionage `trade_route_intel` reward — 10% fee discount on the
 *   spied-on resources, read straight from EspionageMission rows (server
 *   authoritative — the client cannot forge these).
 * - A2: alliance diplomacy trade agreements (tradeBonus = fee reduction).
 * All reductions are clamped inside getEffectiveBrokerFeeRate (total ≤85%).
 */
async function computeSellerFeeRate(profileId: string, resourceSlug: string): Promise<number> {
  let commanderMarketMultiplier = 1;
  let espionageDiscount = 0;
  let diplomacyTradeBonus = 0;
  let factionStandingModifier = 0;
  let licenseDiscount = 0;

  try {
    const profileRow = await prisma.gameProfile.findUnique({
      where: { id: profileId },
      select: { workforceData: true, allianceMembership: { select: { allianceId: true } } },
    });

    // E7 (§5 item 7, the "one-line fix" that was never wired): STANDING_
    // BROKER_MODIFIER via the resource's governing faction and the player's
    // synced reputation with it (workforceData._factionRep — see
    // sync/route.ts). No entry for that faction (never interacted) reads as
    // neutral (modifier 0), same as getFactionRep's default.
    const governingFaction = getGoverningFactionForResource(resourceSlug);
    if (governingFaction) {
      const factionRep = (profileRow?.workforceData as { _factionRep?: Record<string, number> } | null)?._factionRep;
      const rep = factionRep?.[governingFaction] ?? 0;
      // AAA Round 1 E1 (Fracture): a corporation outside Accord jurisdiction
      // is treated differently by all six factions. The client applies the
      // identical modifier through factions.ts::getFactionRep, so client and
      // server can never disagree about what a fractured corp pays. Fracture
      // status is SERVER-owned (AccordFracture) — never read from the
      // client's payload.
      const fractured = await isProfileFractured(profileId);
      factionStandingModifier = getFactionStandingBrokerModifier(
        applyFractureRepModifier(rep, governingFaction, fractured),
      );
    }

    // AAA Round 1 E3.6: the Syndicate Gray-Market Access licence was a
    // $250M money sink whose `grants` flag nothing read. Same synced-blob
    // pattern as _factionRep directly above; the discount is re-derived from
    // definitions server-side and clamped inside getEffectiveBrokerFeeRate.
    const ownedLicenses = (profileRow?.workforceData as { _factionLicenses?: string[] } | null)?._factionLicenses;
    if (Array.isArray(ownedLicenses) && ownedLicenses.length > 0) {
      licenseDiscount = getFactionLicenseBonuses(ownedLicenses).brokerFeeDiscount;
    }

    // Magnate commanders (audit §1c)
    const commanderIds = (profileRow?.workforceData as { _commanders?: string[] } | null)?._commanders;
    if (Array.isArray(commanderIds) && commanderIds.length > 0) {
      const { computeCommanderBonuses } = await import('@/lib/game/commanders');
      const bonuses = computeCommanderBonuses(
        commanderIds.filter(id => typeof id === 'string').slice(0, 30).map(definitionId => ({ definitionId, hiredAtMs: 0 })),
      );
      commanderMarketMultiplier = bonuses.marketPriceMultiplier;
    }

    // Espionage trade_route_intel reward (audit A8)
    const missions = await prisma.espionageMission.findMany({
      where: {
        attackerId: profileId,
        succeeded: true,
        actionType: 'trade_route_intel',
        createdAt: { gte: new Date(Date.now() - 24 * 3600_000) },
      },
      select: { reward: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const m of missions) {
      const r = m.reward as { type?: string; discount?: number; durationHours?: number; resources?: string[] } | null;
      if (r?.type !== 'market_discount') continue;
      const expiresAtMs = m.createdAt.getTime() + (r.durationHours || 24) * 3600_000;
      if (expiresAtMs <= Date.now()) continue;
      const covered = Array.isArray(r.resources) ? r.resources : [];
      if (covered.length === 0 || covered.includes(resourceSlug)) {
        espionageDiscount = Math.max(espionageDiscount, r.discount ?? 0.1);
      }
    }

    // Alliance diplomacy trade agreements (audit A2)
    const allianceId = profileRow?.allianceMembership?.allianceId;
    if (allianceId) {
      const { getDiplomacyBonuses } = await import('@/lib/game/alliance-diplomacy');
      const treaties = await prisma.allianceDiplomacy.findMany({
        where: { status: 'active', OR: [{ senderId: allianceId }, { receiverId: allianceId }] },
        select: { type: true, tradeBonus: true },
        take: 25,
      });
      diplomacyTradeBonus = getDiplomacyBonuses(treaties).tradeBonus;
    }
  } catch {
    // Fee bonuses are best-effort — fall back to the base rate.
  }

  return getEffectiveBrokerFeeRate({ commanderMarketMultiplier, espionageDiscount, diplomacyTradeBonus, factionStandingModifier, licenseDiscount });
}

/**
 * POST /api/space-tycoon/market/trade
 * Execute a buy or sell trade on the global market.
 * Updates the shared price for all players.
 *
 * Supply-demand pricing:
 * - Buying removes from market supply → price goes up
 * - Selling adds to market supply → price goes down
 * - Always at least MINIMUM_MARKET_SUPPLY available, but at scarcity premium
 * - Supply below baseline → prices spike (scarcity)
 * - Supply above baseline → prices drop (abundance)
 *
 * Body: { type: "buy"|"sell", resourceSlug: string, quantity: number, profileId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY (audit hotlist #1): this route moves the SHARED global price
    // for every player. It was unauthenticated — anyone could curl prices
    // up/down. Session required, matching sibling routes (orders, bounties).
    // Anonymous solo players are unaffected: MarketPanel falls back to
    // client-side local pricing when this returns 401.
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, resourceSlug, quantity } = body;

    // Never trust a client-supplied profileId — attribute trades to the
    // session's own profile.
    const sessionProfile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const profileId = sessionProfile?.id;

    if (!type || !resourceSlug || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid trade parameters' }, { status: 400 });
    }
    if (type !== 'buy' && type !== 'sell') {
      return NextResponse.json({ error: 'Type must be "buy" or "sell"' }, { status: 400 });
    }
    // Sanity cap: one call cannot dump an absurd volume onto the shared
    // price. (Price impact is already clamped to min/max band; this is
    // defense-in-depth against manipulation via a single authed request.)
    if (quantity > 100_000) {
      return NextResponse.json({ error: 'Quantity exceeds per-trade limit (100,000)' }, { status: 400 });
    }

    // Get current resource state
    const resource = await prisma.marketResource.findUnique({
      where: { slug: resourceSlug },
    });

    if (!resource) {
      return NextResponse.json({ error: `Resource "${resourceSlug}" not found` }, { status: 404 });
    }

    const resDef = RESOURCE_MAP.get(resourceSlug);
    const baselineSupply = resDef?.startingSupply || 1000;
    const isBuy = type === 'buy';

    // Audit Wave E (C5 "resource-gated T6+ construction —
    // canBuyOnMarket:false enforcement"): mined-only resources cannot be
    // bought from the NPC market. They must be produced (interstellar
    // colonies / expeditions) or traded player-to-player via the order
    // book — "MUST mine these yourself or trade with other players"
    // (economic-sinks.ts §5). Selling remains allowed.
    if (MANUFACTURED_RESOURCE_IDS.includes(resourceSlug)) {
      // Manufactured goods never touch the NPC curve in either direction:
      // buy a listing on the order book or fabricate it; sell by listing it.
      return NextResponse.json({
        success: false,
        manufactured: true,
        error: isBuy
          ? `${resourceSlug} is manufactured, not stocked. Buy a player or NPC listing on the order book, or fabricate it at a fabrication facility.`
          : `${resourceSlug} is manufactured. List it for sale on the order book; the NPC curve does not buy hardware.`,
      }, { status: 400 });
    }
    if (isBuy && MINED_ONLY_RESOURCE_IDS.includes(resourceSlug)) {
      return NextResponse.json({
        error: `${resourceSlug} cannot be bought on the open market — it must be mined, produced by your colonies, or acquired from other players via the order book`,
        minedOnly: true,
      }, { status: 400 });
    }

    // For buys: calculate supply-adjusted price (scarcity premium)
    // Audit Wave E (A5-iii): the world-shared market event multiplier now
    // prices into EXECUTION on both sides — a "Helium-3 ×2.0" event raises
    // what buyers pay AND what sellers receive for its stated duration,
    // which is what makes positioning around events real gameplay.
    const eventMult = getGlobalMarketEventMultiplier(resourceSlug);
    const supplyMult = getSupplyPriceMultiplier(resource.totalSupply, baselineSupply);
    const effectivePrice = Math.round(resource.currentPrice * supplyMult * eventMult);
    const pricePerUnit = isBuy ? effectivePrice : Math.round(resource.currentPrice * eventMult);
    const grossTotal = Math.round(pricePerUnit * quantity);

    // Sell-side broker commission (Wave 4 balance: sink that prevents
    // frictionless mine-and-sell loops). Buy-side is unaffected — scarcity
    // premium is already baked into the supply multiplier.
    // Audit Wave B: the effective rate now honors Magnate commanders (§1c),
    // espionage trade_route_intel discounts (A8), and alliance diplomacy
    // trade agreements (A2) — see computeSellerFeeRate above.
    const effectiveFeeRate = isBuy || !profileId
      ? MARKET_BROKER_FEE_RATE
      : await computeSellerFeeRate(profileId, resourceSlug);
    const brokerFee = isBuy ? 0 : Math.round(grossTotal * effectiveFeeRate);

    // E7 (§5 item 7): faction tariff — a WORLD-SHARED premium/discount on
    // trade of resources belonging to a faction's governed economy, current
    // this realignment epoch. Distinct from the broker fee (a service cut);
    // this is a toll on the transaction itself, symmetric across buy/sell —
    // "applies as a fee/premium on trades... crossing that faction's space."
    // Transparent per BALANCE.md's P&L-panel requirement: returned in full
    // in the response below, never silently folded into pricePerUnit.
    const tariff = computeTariffFeeRate(resourceSlug);
    const tariffFee = Math.round(grossTotal * tariff.rate);

    const totalCost = isBuy
      ? grossTotal + tariffFee
      : grossTotal - brokerFee - tariffFee;

    // For buys: check available supply (always at least MINIMUM_MARKET_SUPPLY)
    if (isBuy) {
      const available = Math.max(MINIMUM_MARKET_SUPPLY, resource.totalSupply);
      if (quantity > available) {
        return NextResponse.json({
          error: `Only ${available} ${resourceSlug} available on the market`,
          available,
        }, { status: 400 });
      }
    }

    // Calculate new price after trade (trade impact on base price)
    const newBasePrice = calculatePriceAfterTrade(
      resource.currentPrice,
      resource.basePrice,
      quantity,
      isBuy,
      resource.volatility,
      resource.minPrice,
      resource.maxPrice,
    );

    // Update supply: buys decrease, sells increase
    const newSupply = isBuy
      ? Math.max(0, resource.totalSupply - quantity)
      : resource.totalSupply + quantity;
    const newDemand = isBuy
      ? resource.totalDemand + quantity
      : Math.max(0, resource.totalDemand - quantity);

    // The new effective price factors in updated supply
    const newSupplyMult = getSupplyPriceMultiplier(newSupply, baselineSupply);
    const newEffectivePrice = Math.round(newBasePrice * newSupplyMult);

    // Build price history (keep last 50 entries)
    const history = Array.isArray(resource.priceHistory) ? resource.priceHistory as number[] : [];
    const updatedHistory = [...history, newEffectivePrice].slice(-50);

    // Update resource state atomically
    await prisma.marketResource.update({
      where: { id: resource.id },
      data: {
        currentPrice: newBasePrice, // Store base price (supply mult applied at read time)
        totalSupply: newSupply,
        totalDemand: newDemand,
        priceHistory: updatedHistory,
      },
    });

    // Record the order (if profileId provided)
    if (profileId) {
      try {
        await prisma.marketOrder.create({
          data: {
            profileId,
            resourceId: resource.id,
            type,
            quantity,
            pricePerUnit,
            totalCost,
            status: 'completed',
          },
        });
      } catch {
        // Order logging is non-critical
      }
    }

    const change = Math.round(((newEffectivePrice / resource.basePrice) - 1) * 100);

    logger.info('Market trade executed', {
      type, resource: resourceSlug, quantity,
      pricePerUnit, newBasePrice, newEffectivePrice,
      supply: `${resource.totalSupply} → ${newSupply}`,
      supplyMultiplier: newSupplyMult.toFixed(2),
      change: `${change}%`,
    });

    return NextResponse.json({
      success: true,
      trade: {
        type,
        resource: resourceSlug,
        quantity,
        pricePerUnit,
        grossTotal,
        brokerFee,
        brokerFeeRate: isBuy ? 0 : effectiveFeeRate,
        // E7 (§5 item 7): transparent tariff line (BALANCE.md P&L-panel
        // requirement — "pools/wages/tariffs all shown ... with their
        // inputs"). tariffFactionId is null when the resource has no
        // governing faction (no tariff applies).
        tariffFee,
        tariffRate: tariff.rate,
        tariffFactionId: tariff.factionId,
        totalCost,
        newPrice: newEffectivePrice,
        supply: newSupply,
        supplyMultiplier: Math.round(newSupplyMult * 100) / 100,
        change,
      },
    });
  } catch (error) {
    logger.error('Market trade error', { error: String(error) });
    return NextResponse.json({ error: 'Trade failed' }, { status: 500 });
  }
}
