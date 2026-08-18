// ─── Space Tycoon: Offense Toolkit — server-side helpers (Wave M5) ──────────
// docs/MEANINGFUL_2026-08.md §M5 / §3.2. DB-backed counterpart to the pure
// offense.ts module (mirrors the market-share.ts pure/IO split):
//
//   • resolveExpiredPoachOffers — lazy resolution of pending offers whose
//     48h counteroffer window lapsed: the crew walk ('poached'), the
//     escrowed bonuses burn (paid "to the crew" — BALANCE.md sink), and the
//     global wage index for that crew type heats up. Called from the poach
//     route and the sync route (no cron dependency — same lazy-on-touch
//     posture as extraction-pressure decay).
//   • buildOffenseSnapshot — the per-player OffenseSnapshot the sync route
//     delivers: public campaigns, this player's poach inbox + outcomes,
//     public zone freight tolls, and cornering alerts. Server-computed,
//     clamped again client-side (offense.ts clampOffenseSnapshot).

import prisma from '@/lib/db';
import type {
  OffenseSnapshot, OffenseCampaignEntry, PoachIncomingEntry, PoachOutcomeEntry,
  LaneTollEntry, PoachOutcomeStatus,
} from './offense';
import { clampTollPct } from './offense';
import type { WorkerType } from './workforce';
import { WORKER_MAP } from './workforce';
import {
  applyPoachWageBump, GUILD_ARBITRATION_TECH_ID, POACH_FREE_RETENTION_WINDOW_MS,
} from './talent-poaching';
import { detectCorneringAlerts, CORNERING_WINDOW_DAYS, type OpenBuyOrderLite } from './cornering-intel';
import { readAccumulated, getExtractionSensitivity, EXTRACTION_DECAY_PER_DAY } from './extraction-pressure';
import { computeSpotPrice } from './spot-price';
import { RESOURCE_MAP, type ResourceId } from './resources';

// ─── Balance Pass 9: campaign market telemetry (docs/BALANCE.md "Pass 9") ───
// The market-keyed campaign fee (price-campaigns.ts
// computeMarketKeyedCampaignFee) and the scaled min-inventory gate both key
// off the target market's trailing-7-real-day window. Two real telemetry
// sources, best of both taken (fail-soft to 0 individually):
//
//   PRODUCTION — LocationExtraction accumulators (E5). `accumulated` is
//   rarity-weighted mined units decaying 10%/day, so at steady state the
//   decayed sum equals 1/(1−0.9) = 10 days' worth of (units × sensitivity).
//   7-day-equivalent units = Σ decayed ÷ sensitivity × 7 × (1 − decay).
//   This matches Pass 8's sim definition of window turnover (world mined
//   units × spot × the 28-game-month window).
//
//   TRADE — TradeStatDaily (E6) sellValue summed over the last 7 UTC days
//   (sell side only — each fill lands once per side, so summing one side
//   counts each fill exactly once). Covers crafted/colony resources that
//   never touch a mining accumulator.
//
// windowTurnover = max(productionUnits × spot, tradedValue): a market is as
// big as its larger real flow. Empty telemetry ⇒ zeros ⇒ the fee falls back
// to the $25M floor and the inventory gate to 50 units (documented
// fail-soft in price-campaigns.ts — correct at relaunch day one).

export interface CampaignMarketTelemetry {
  /** Trailing-7-real-day-equivalent server-wide production units. */
  windowProductionUnits: number;
  /** Trailing-7-day traded value from TradeStatDaily (sell side). */
  windowTradedValue: number;
  /** max(production value at spot, traded value) — the fee driver. */
  windowTurnover: number;
  /** Band-clamped live spot used for the production valuation. */
  spot: number;
}

export async function getCampaignMarketTelemetry(resourceSlug: string): Promise<CampaignMarketTelemetry> {
  const nowMs = Date.now();
  const def = RESOURCE_MAP.get(resourceSlug as ResourceId);
  let spot = def?.baseMarketPrice || 0;
  try {
    const row = await prisma.marketResource.findUnique({
      where: { slug: resourceSlug },
      select: { currentPrice: true, basePrice: true, minPrice: true, maxPrice: true },
    });
    if (row) {
      spot = computeSpotPrice({
        currentPrice: row.currentPrice,
        basePrice: row.basePrice,
        minPrice: row.minPrice,
        maxPrice: row.maxPrice,
      });
    }
  } catch { /* spot falls back to base price */ }

  let windowProductionUnits = 0;
  try {
    const rows = await prisma.locationExtraction.findMany({
      where: { resourceId: resourceSlug },
      select: { accumulated: true, updatedAt: true },
    });
    const sensitivity = getExtractionSensitivity(resourceSlug);
    if (sensitivity > 0) {
      let decayedSum = 0;
      for (const r of rows) {
        decayedSum += readAccumulated(r.accumulated, r.updatedAt.getTime(), nowMs);
      }
      // steady-state decayed sum ≈ 10 days of (units × sensitivity) →
      // 7-day-equivalent units = sum ÷ sensitivity × 7 × (1 − decay/day).
      windowProductionUnits = (decayedSum / sensitivity) * 7 * (1 - EXTRACTION_DECAY_PER_DAY);
    }
  } catch { /* production telemetry fail-soft */ }

  let windowTradedValue = 0;
  try {
    const since = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    const agg = await prisma.tradeStatDaily.aggregate({
      where: { resourceSlug, day: { gte: since } },
      _sum: { sellValue: true },
    });
    windowTradedValue = agg._sum.sellValue || 0;
  } catch { /* trade telemetry fail-soft */ }

  return {
    windowProductionUnits: Math.round(windowProductionUnits),
    windowTradedValue: Math.round(windowTradedValue),
    windowTurnover: Math.round(Math.max(windowProductionUnits * spot, windowTradedValue)),
    spot,
  };
}

/**
 * Resolve pending poach offers whose counteroffer window lapsed. Bounded.
 * Safe to call from any request path (best-effort; callers wrap in
 * try/catch). Returns the number resolved.
 */
export async function resolveExpiredPoachOffers(now: Date = new Date(), limit: number = 25): Promise<number> {
  const expired = await prisma.poachOffer.findMany({
    where: { status: 'pending', respondBy: { lt: now } },
    include: {
      attacker: { select: { id: true, companyName: true } },
      target: { select: { id: true, companyName: true } },
    },
    take: limit,
  });
  let resolved = 0;
  for (const offer of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // Guard against a concurrent resolution (poach route respond).
        const fresh = await tx.poachOffer.findUnique({ where: { id: offer.id }, select: { status: true } });
        if (!fresh || fresh.status !== 'pending') return;
        await tx.poachOffer.update({
          where: { id: offer.id },
          data: { status: 'poached', resolvedAt: now },
        });
        // Escrowed bonuses burn (paid to the crew — a sink, not a transfer).
        // The crew headcount transfer itself is applied on each side's save
        // via the sync offense snapshot (offense.ts, idempotent).

        // Poaching wars heat the whole market: bump the crew type's global
        // wage index (clamped; the weekly labor cron re-settles it).
        const idx = await tx.laborIndex.findFirst({ where: { crewType: offer.crewType } });
        if (idx) {
          await tx.laborIndex.update({
            where: { id: idx.id },
            data: { wageIndex: applyPoachWageBump(idx.wageIndex, offer.count) },
          });
        }
      });
      resolved++;
      // Public feed entry — "every offensive act lands on the diplomacy
      // feed". Attacker named only if the detection roll identified them.
      await prisma.playerActivity.create({
        data: {
          profileId: offer.attackerId,
          companyName: offer.detected ? offer.attacker.companyName : 'An unidentified corporation',
          type: 'talent_poached',
          title: `Poached ${offer.count} ${offer.crewType}${offer.count === 1 ? '' : 's'} from ${offer.target.companyName}`,
          description: `Signing bonuses of $${(offer.signingBonusTotal / 1_000_000).toFixed(1)}M went uncontested — the crew switched sides. The ${offer.crewType} wage index ticked up server-wide.`,
          metadata: { offerId: offer.id, crewType: offer.crewType, count: offer.count, detected: offer.detected },
        },
      }).catch(() => { /* non-critical */ });
    } catch { /* per-offer best-effort */ }
  }
  return resolved;
}

/** Has this profile already used its free guild-arbitration retention in
 *  the current 28-day window? */
export async function freeRetentionUsed(targetProfileId: string, now: Date = new Date()): Promise<boolean> {
  const used = await prisma.poachOffer.findFirst({
    where: {
      targetId: targetProfileId,
      status: 'retained_free',
      resolvedAt: { gte: new Date(now.getTime() - POACH_FREE_RETENTION_WINDOW_MS) },
    },
    select: { id: true },
  });
  return !!used;
}

/**
 * Build the per-player offense snapshot for the sync response. Every block
 * is individually best-effort — a missing table (schema lag) degrades to an
 * empty list, never a failed sync.
 */
export async function buildOffenseSnapshot(
  profileId: string,
  completedResearchList: string[],
): Promise<OffenseSnapshot> {
  const now = new Date();
  const nowMs = now.getTime();

  // Lazy-resolve any globally expired offers first (bounded).
  try { await resolveExpiredPoachOffers(now, 10); } catch { /* best-effort */ }

  // ── O2: active price campaigns (fully public) ──
  const campaigns: OffenseCampaignEntry[] = [];
  try {
    const rows = await prisma.priceCampaign.findMany({
      where: { status: 'active', endsAt: { gt: now } },
      include: { profile: { select: { companyName: true } } },
      take: 25,
    });
    for (const c of rows) {
      campaigns.push({
        resourceSlug: c.resourceSlug,
        byCompanyName: c.profile.companyName,
        declaredAtMs: c.declaredAt.getTime(),
        endsAtMs: c.endsAt.getTime(),
        own: c.profileId === profileId || undefined,
      });
    }
  } catch { /* table may lag deploy */ }

  // ── O4: poach inbox + outcomes ──
  const poachIncoming: PoachIncomingEntry[] = [];
  const poachOutcomes: PoachOutcomeEntry[] = [];
  try {
    const hasArbitration = completedResearchList.includes(GUILD_ARBITRATION_TECH_ID);
    const freeAvailable = hasArbitration ? !(await freeRetentionUsed(profileId, now)) : false;

    const pending = await prisma.poachOffer.findMany({
      where: { targetId: profileId, status: 'pending', respondBy: { gt: now } },
      include: { attacker: { select: { companyName: true } } },
      take: 25,
    });
    for (const p of pending) {
      poachIncoming.push({
        id: p.id,
        crewType: p.crewType as WorkerType,
        count: p.count,
        retentionCost: p.retentionCost,
        respondByMs: p.respondBy.getTime(),
        attackerName: p.detected ? p.attacker.companyName : null,
        freeRetentionAvailable: freeAvailable,
      });
    }

    const resolvedSince = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
    const resolvedRows = await prisma.poachOffer.findMany({
      where: {
        status: { in: ['poached', 'retained', 'retained_free', 'withdrawn'] },
        resolvedAt: { gte: resolvedSince },
        OR: [{ attackerId: profileId }, { targetId: profileId }],
      },
      include: {
        attacker: { select: { companyName: true } },
        target: { select: { companyName: true } },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 25,
    });
    for (const o of resolvedRows) {
      if (!WORKER_MAP.has(o.crewType as WorkerType)) continue;
      const role = o.attackerId === profileId ? 'attacker' as const : 'target' as const;
      poachOutcomes.push({
        id: o.id,
        role,
        status: o.status as PoachOutcomeStatus,
        crewType: o.crewType as WorkerType,
        count: o.count,
        resolvedAtMs: o.resolvedAt ? o.resolvedAt.getTime() : nowMs,
        // Attacker always knows whom they raided; the target learns the
        // attacker's identity only if the detection roll succeeded.
        counterpartyName: role === 'attacker'
          ? o.target.companyName
          : (o.detected ? o.attacker.companyName : null),
      });
    }
  } catch { /* table may lag deploy */ }

  // ── O6: public zone freight tolls ──
  const laneTolls: LaneTollEntry[] = [];
  try {
    const zones = await prisma.zone.findMany({
      where: { freightTollPct: { gt: 0 } },
      select: { slug: true, freightTollPct: true, governorName: true },
      take: 25,
    });
    for (const z of zones) {
      const pct = clampTollPct(z.freightTollPct);
      if (pct > 0) laneTolls.push({ zoneSlug: z.slug, tollPct: pct, governorName: z.governorName ?? null });
    }
  } catch { /* column may lag deploy */ }

  // ── O3 defense: cornering alerts (anonymous, world-shared) ──
  let corneringAlerts: OffenseSnapshot['corneringAlerts'] = [];
  try {
    const openBuys = await prisma.marketLimitOrder.findMany({
      where: { side: 'buy', status: { in: ['open', 'partial'] } },
      select: { profileId: true, resourceSlug: true, quantity: true, filledQty: true, pricePerUnit: true, source: true },
      take: 2000,
    });
    const since = new Date(nowMs - CORNERING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const fills = await prisma.marketFill.groupBy({
      by: ['resourceSlug'],
      where: { createdAt: { gte: since } },
      _sum: { quantity: true },
    });
    const volumeBySlug: Record<string, number> = {};
    for (const f of fills) volumeBySlug[f.resourceSlug] = f._sum.quantity || 0;
    corneringAlerts = detectCorneringAlerts(openBuys as OpenBuyOrderLite[], volumeBySlug);
  } catch { /* telemetry best-effort */ }

  return { campaigns, poachIncoming, poachOutcomes, laneTolls, corneringAlerts, asOf: nowMs };
}
