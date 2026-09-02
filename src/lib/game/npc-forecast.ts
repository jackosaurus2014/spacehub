/**
 * Published NPC demand forecast.
 *
 * CLAUDE.md, "NPC economic backdrop as MMO insurance": "NPC demand is visible
 * and forecastable. Major NPC contracts, faction procurement drives, and
 * scheduled infrastructure projects publish ahead of time — players can plan
 * around them." docs/NPC_BACKDROP.md listed this as recommended-but-unbuilt;
 * this module is the build.
 *
 * Three sources, one shape:
 *   industry — every NPC industrial corporation's expected raw-input purchases,
 *              manufactured-input bids and output listings over the horizon,
 *              derived from its recipe × tier × the hourly tick cadence. The
 *              quantities come from the SAME exported helpers the tick calls
 *              (npc-industry.ts "Per-tick quantity helpers"), so the forecast
 *              equals what the tick will do — guarded by npc-forecast.test.ts.
 *   drive    — open NPC procurement drives (BiddingContract rows with
 *              issuerNpcId) with their quantity and per-unit price cap.
 *   pool     — next-24h NPC floor demand per (location, service category)
 *              from demand-pools.ts × the season modifier, in dollars.
 *
 * Nothing here changes any number in the economy. It publishes existing
 * behaviour. Free intel tier (same gate as /api/space-tycoon/demand-pools).
 */

import prisma from '@/lib/db';
import { withCache } from '@/lib/api-cache';
import { buildNpcGovernorSnapshot, NPC_GOVERNOR } from './npc-companies';
import {
  NPC_INDUSTRY_SEEDS,
  populationScale,
  recipeTierOf,
  readMeta,
  demandSignal,
  openAskQty,
  referencePrice,
  npcConsumptionWantPerTick,
  npcProductionTarget,
  npcBatchesPerTick,
  npcListCap,
  npcShortfallWant,
  npcBuyPrice,
  npcListPrice,
  NPC_TICK_HOURS,
  type NpcIndustrySeed,
  type CorpMeta,
} from './npc-industry';
import { PRODUCTION_CHAINS, facilityTierFor } from './production-chains';
import { MANUFACTURED_RESOURCE_IDS } from './economic-sinks';
import { RESOURCE_MAP } from './resources';
import {
  NPC_DEMAND_FLOOR,
  CATEGORY_LABELS,
  getNpcFloorDemand,
  getDemandPoolSeasonModifier,
  type ServiceCategory,
} from './demand-pools';
import { NPC_SEEDS } from './npc-companies';
import { LOCATION_MAP } from './solar-system';
import { getCurrentSeasonNumber } from './seasonal-events';

// ─── Shape ──────────────────────────────────────────────────────────────────

export type NpcForecastSide = 'buy' | 'sell';
export type NpcForecastConfidence = 'scheduled' | 'projected';
export type NpcForecastSource = 'industry' | 'drive' | 'pool';

export interface NpcForecastItem {
  npcId: string;
  npcName: string;
  factionId?: string;
  /** Resource slug for industry/drive items; the service category for pool items. */
  resourceSlug: string;
  side: NpcForecastSide;
  /** Units for industry/drive items; dollars of demand for pool items. */
  quantity: number;
  /** Per-unit price cap (buy) or ask (sell). Absent for pool items. */
  priceCap?: number;
  windowStartIso: string;
  windowEndIso: string;
  /** 'scheduled' = fixed by a published rule or contract; 'projected' = depends on stock/demand/treasury. */
  confidence: NpcForecastConfidence;
  source: NpcForecastSource;
  unit: 'units' | 'usd';
  locationId?: string;
  category?: ServiceCategory;
  note?: string;
}

export interface NpcForecast {
  generatedAt: string;
  horizonHours: number;
  /** NPC industry population scale (npc-industry.populationScale). */
  scale: number;
  /** 30-day active profiles feeding the demand-pool scaler. */
  active30d: number;
  /** GAME_DESIGN_REVIEW_2026-09 row 11 — the NPC density governor: how many
   *  of the 10 market-backdrop corps and 5 industrial corps are active for
   *  this population, plus the floors, so players can see and forecast the
   *  backdrop receding. Industry items below are emitted only for active
   *  corps (dormant corps rest no orders). */
  npcGovernor: {
    activePlayers30d: number;
    activeNpcCorps: number;
    activeIndustryCorps: number;
    floorNpcCorps: number;
    floorIndustryCorps: number;
    maxNpcCorps: number;
    maxIndustryCorps: number;
    dormantIndustryCorpIds: string[];
  };
  items: NpcForecastItem[];
  /** Unit totals per resource slug (industry + drive items only). */
  byResource: Record<string, { buy: number; sell: number }>;
}

export const NPC_FORECAST_DEFAULT_HORIZON_HOURS = 72;
export const NPC_FORECAST_MIN_HORIZON_HOURS = 24;
export const NPC_FORECAST_MAX_HORIZON_HOURS = 168;
export const NPC_FORECAST_CACHE_TTL_SECONDS = 600;
/** Average hours per month for the $/month → $/day pool conversion. */
const HOURS_PER_MONTH = 730;

// ─── Pure core: one corporation over N ticks ────────────────────────────────

export interface CorpSimInput {
  /** Inventory (no __meta key). */
  inv: Record<string, number>;
  /** Standing wants carried from the persisted row. */
  wanted: Record<string, number>;
  /** Player demand signal per focus output (npc-industry.demandSignal). */
  demandBySlug: Record<string, number>;
  /** Units the corp already has resting as asks per focus output. */
  openAskBySlug: Record<string, number>;
  scale: number;
  ticks: number;
}

export interface CorpSimResult {
  /** Raw resources bought off the curve over the window, per slug. */
  rawBuys: Record<string, number>;
  /** Standing want per manufactured good at the end of the window. */
  wanted: Record<string, number>;
  /** Units built over the window, per output. */
  built: Record<string, number>;
  /** Inventory at the end of the window. */
  inv: Record<string, number>;
}

/**
 * Mirror of runNpcIndustryTick's produce → procure quantity path for one
 * corporation over `ticks` ticks, with treasury and curve availability
 * assumed unconstrained and no sales assumed. Pure. Every quantity is taken
 * from the tick's own exported helpers; the loop structure mirrors
 * npc-industry.ts produce()/procure() line for line.
 */
export function simulateNpcCorp(seed: NpcIndustrySeed, input: CorpSimInput): CorpSimResult {
  const inv: Record<string, number> = { ...input.inv };
  const wanted: Record<string, number> = { ...input.wanted };
  const rawBuys: Record<string, number> = {};
  const builtTotal: Record<string, number> = {};
  const recipes = PRODUCTION_CHAINS
    .filter((r) => seed.focus.includes(r.outputId) && facilityTierFor(r) <= seed.capacityTier)
    .sort((a, b) => a.tier - b.tier);

  // produce() counts the corp's resting asks as stock on hand; relist() rests
  // min(stock, list cap) each tick without deducting inventory, so from the
  // second tick on the resting ask is last tick's listing.
  let openAsk: Record<string, number> = { ...input.openAskBySlug };

  for (let t = 0; t < input.ticks; t++) {
    // produce()
    const built: Record<string, number> = {};
    for (const r of recipes) {
      const out = r.outputId;
      const have = (inv[out] || 0) + (openAsk[out] || 0);
      const target = npcProductionTarget(r.tier, input.demandBySlug[out] || 0, input.scale);
      let batches = 0;
      while (have + (built[out] || 0) < target && batches < npcBatchesPerTick(r.tier)) {
        // runRecipe(): manufactured inputs must be in stock; first shortfall aborts the batch.
        let shortOf: string | null = null;
        for (const [id, qty] of Object.entries(r.inputs)) {
          if (MANUFACTURED_RESOURCE_IDS.includes(id) && (inv[id] || 0) < qty) { shortOf = id; break; }
        }
        if (shortOf) {
          wanted[shortOf] = npcShortfallWant(wanted[shortOf] || 0, r.inputs[shortOf] || 1);
          break;
        }
        for (const [id, qty] of Object.entries(r.inputs)) {
          if (MANUFACTURED_RESOURCE_IDS.includes(id)) inv[id] = (inv[id] || 0) - qty;
          else rawBuys[id] = (rawBuys[id] || 0) + qty;
        }
        inv[out] = (inv[out] || 0) + r.outputQuantity;
        built[out] = (built[out] || 0) + r.outputQuantity;
        builtTotal[out] = (builtTotal[out] || 0) + r.outputQuantity;
        batches++;
      }
    }
    // relist(): what rests on the book until the next tick's produce().
    const relisted: Record<string, number> = {};
    for (const slug of seed.focus) relisted[slug] = forecastListingQty(slug, inv[slug] || 0);
    openAsk = relisted;
    // procure()
    for (const [slug, perWeek] of Object.entries(seed.consumes)) {
      wanted[slug] = (wanted[slug] || 0) + npcConsumptionWantPerTick(perWeek, input.scale);
    }
    for (const slug of Object.keys(wanted)) {
      if (!MANUFACTURED_RESOURCE_IDS.includes(slug)) { delete wanted[slug]; continue; }
      const want = Math.floor(wanted[slug]);
      if (want < 1) continue;
      const isConsumable = slug in seed.consumes;
      const use = Math.min(want, Math.floor(inv[slug] || 0));
      if (use > 0) {
        wanted[slug] -= use;
        if (isConsumable) inv[slug] -= use;
      }
    }
  }
  return { rawBuys, wanted, built: builtTotal, inv };
}

/** Listing quantity the corp will rest for a focus good given end-of-window stock. */
export function forecastListingQty(slug: string, stock: number): number {
  const qty = Math.floor(stock);
  if (qty <= 0) return 0;
  return Math.min(qty, npcListCap(recipeTierOf(slug) ?? 2));
}

// ─── Pure aggregation helpers ───────────────────────────────────────────────

export function summarizeByResource(items: NpcForecastItem[]): Record<string, { buy: number; sell: number }> {
  const out: Record<string, { buy: number; sell: number }> = {};
  for (const it of items) {
    if (it.unit !== 'units') continue;
    const row = out[it.resourceSlug] || (out[it.resourceSlug] = { buy: 0, sell: 0 });
    row[it.side] += it.quantity;
  }
  return out;
}

export function filterNpcForecast(forecast: NpcForecast, resourceSlug: string | null | undefined): NpcForecast {
  if (!resourceSlug) return forecast;
  const items = forecast.items.filter((it) => it.resourceSlug === resourceSlug);
  const row = forecast.byResource[resourceSlug];
  return { ...forecast, items, byResource: row ? { [resourceSlug]: row } : {} };
}

export interface DriveRowLike {
  id: string;
  issuerNpcId: string | null;
  requirements: unknown;
  maxBid: number;
  createdAt: Date;
  biddingEndsAt: Date;
}

/** Drive rows → forecast items. Pure; carries the per-unit price cap. */
export function driveItemsFromRows(rows: DriveRowLike[]): NpcForecastItem[] {
  const items: NpcForecastItem[] = [];
  for (const row of rows) {
    if (!row.issuerNpcId) continue;
    const req = (row.requirements || {}) as { target?: number; resourceId?: string };
    const quantity = Math.max(0, Math.floor(Number(req.target) || 0));
    const resourceSlug = typeof req.resourceId === 'string' ? req.resourceId : null;
    if (!resourceSlug || quantity <= 0) continue;
    const seed = NPC_SEEDS.find((s) => s.id === row.issuerNpcId);
    items.push({
      npcId: row.issuerNpcId,
      npcName: seed?.name || row.issuerNpcId,
      factionId: seed?.factionId,
      resourceSlug,
      side: 'buy',
      quantity,
      priceCap: Math.round(row.maxBid / quantity),
      windowStartIso: row.createdAt.toISOString(),
      windowEndIso: row.biddingEndsAt.toISOString(),
      confidence: 'scheduled',
      source: 'drive',
      unit: 'units',
      note: 'Reverse auction — lowest qualified bid wins; the cap is the most the issuer will pay per unit.',
    });
  }
  return items;
}

/** Next-24h NPC floor demand per authored (location, category) market, in dollars. Pure. */
export function poolItems(active30d: number, seasonNumber: number, now: Date): NpcForecastItem[] {
  const start = now.toISOString();
  const end = new Date(now.getTime() + 24 * 3600_000).toISOString();
  const items: NpcForecastItem[] = [];
  for (const locationId of Object.keys(NPC_DEMAND_FLOOR)) {
    for (const cat of Object.keys(NPC_DEMAND_FLOOR[locationId] || {}) as ServiceCategory[]) {
      const perMonth = getNpcFloorDemand(locationId, cat, active30d) * getDemandPoolSeasonModifier(cat, seasonNumber);
      const usd = Math.round(perMonth * (24 / HOURS_PER_MONTH));
      if (usd <= 0) continue;
      const locName = LOCATION_MAP.get(locationId)?.name || locationId.replace(/_/g, ' ');
      items.push({
        npcId: `pool:${locationId}:${cat}`,
        npcName: `${locName} · ${CATEGORY_LABELS[cat]} backdrop`,
        resourceSlug: cat,
        side: 'buy',
        quantity: usd,
        windowStartIso: start,
        windowEndIso: end,
        confidence: 'scheduled',
        source: 'pool',
        unit: 'usd',
        locationId,
        category: cat,
      });
    }
  }
  return items.sort((a, b) => b.quantity - a.quantity);
}

// ─── DB-backed builder ──────────────────────────────────────────────────────

function clampHorizon(h: number): number {
  if (!Number.isFinite(h)) return NPC_FORECAST_DEFAULT_HORIZON_HOURS;
  return Math.max(NPC_FORECAST_MIN_HORIZON_HOURS, Math.min(NPC_FORECAST_MAX_HORIZON_HOURS, Math.round(h)));
}

async function industryItems(seed: NpcIndustrySeed, scale: number, horizonHours: number, now: Date): Promise<NpcForecastItem[]> {
  const row = await prisma.npcIndustrialCorp.findUnique({ where: { id: seed.id } });
  const rawInv = ((row?.inventory as Record<string, number> & { __meta?: unknown }) || {});
  const meta: CorpMeta = readMeta(rawInv);
  const inv: Record<string, number> = { ...rawInv };
  delete (inv as Record<string, unknown>).__meta;

  const demandBySlug: Record<string, number> = {};
  const openAskBySlug: Record<string, number> = {};
  for (const out of seed.focus) {
    demandBySlug[out] = await demandSignal(out);
    openAskBySlug[out] = await openAskQty(seed.id, out);
  }

  const ticks = Math.max(1, Math.round(horizonHours / NPC_TICK_HOURS));
  const sim = simulateNpcCorp(seed, { inv, wanted: meta.wanted, demandBySlug, openAskBySlug, scale, ticks });
  const start = now.toISOString();
  const end = new Date(now.getTime() + horizonHours * 3600_000).toISOString();
  const items: NpcForecastItem[] = [];
  const base = { npcId: seed.id, npcName: seed.name, factionId: seed.factionId, windowStartIso: start, windowEndIso: end, source: 'industry' as const, unit: 'units' as const };

  // Raw inputs bought off the NPC curve to run recipes.
  for (const [slug, qty] of Object.entries(sim.rawBuys)) {
    if (qty <= 0) continue;
    items.push({
      ...base, resourceSlug: slug, side: 'buy', quantity: Math.round(qty),
      priceCap: Math.round(RESOURCE_MAP.get(slug as never)?.baseMarketPrice ?? 0) || undefined,
      confidence: 'projected',
      note: 'Bought on the NPC price curve at the live price to run recipes; depends on stock, player demand and treasury.',
    });
  }
  // Standing wants (consumables + recipe shortfalls) → resting buy orders.
  for (const [slug, want] of Object.entries(sim.wanted)) {
    const qty = Math.floor(want);
    if (qty < 1) continue;
    const ref = await referencePrice(slug);
    const isConsumable = slug in seed.consumes;
    items.push({
      ...base, resourceSlug: slug, side: 'buy', quantity: qty,
      priceCap: npcBuyPrice(slug, ref),
      confidence: isConsumable ? 'scheduled' : 'projected',
      note: isConsumable
        ? `Standing consumption of ${seed.consumes[slug]}/week (× population scale ${scale.toFixed(2)}).`
        : 'Recipe input the corp is short of; bid rests until filled.',
    });
  }
  // Output listings from end-of-window stock.
  for (const slug of seed.focus) {
    const qty = forecastListingQty(slug, sim.inv[slug] || 0);
    if (qty <= 0) continue;
    const unitCost = meta.unitCost[slug] || RESOURCE_MAP.get(slug as never)?.baseMarketPrice || 1;
    const firstListed = meta.listedAt[slug] ? new Date(meta.listedAt[slug]).getTime() : now.getTime();
    const ageDays = Math.max(0, (now.getTime() - firstListed) / 86400000);
    items.push({
      ...base, resourceSlug: slug, side: 'sell', quantity: qty,
      priceCap: npcListPrice(seed.marginPct, slug, unitCost, ageDays),
      confidence: 'projected',
      note: 'Units resting on the book at cost-plus; the ask ages toward cost while unsold.',
    });
  }
  return items;
}

/** Uncached forecast build — every input is deterministic server state. */
export async function buildNpcForecast(now: Date = new Date(), horizonHours: number = NPC_FORECAST_DEFAULT_HORIZON_HOURS): Promise<NpcForecast> {
  const horizon = clampHorizon(horizonHours);
  // Same population queries the tick (14d, gte) and the demand-pool cron (30d, gt) use.
  const [activeProfiles, active30d] = await Promise.all([
    prisma.gameProfile.count({ where: { lastSyncAt: { gte: new Date(now.getTime() - 14 * 86400000) } } }),
    prisma.gameProfile.count({ where: { lastSyncAt: { gt: new Date(now.getTime() - 30 * 86400000) } } }),
  ]);
  const scale = populationScale(activeProfiles);
  const governor = buildNpcGovernorSnapshot(active30d, now.getTime());

  const items: NpcForecastItem[] = [];

  const driveRows = await prisma.biddingContract.findMany({
    where: { status: 'open', issuerNpcId: { not: null }, biddingEndsAt: { gt: now } },
    select: { id: true, issuerNpcId: true, requirements: true, maxBid: true, createdAt: true, biddingEndsAt: true },
    orderBy: { biddingEndsAt: 'asc' },
    take: 100,
  });
  items.push(...driveItemsFromRows(driveRows));

  for (const [seedIndex, seed] of NPC_INDUSTRY_SEEDS.entries()) {
    if (seedIndex >= governor.activeIndustryCorps) continue; // dormant under the governor
    try {
      items.push(...await industryItems(seed, scale, horizon, now));
    } catch {
      // A single corp's read failing must not blank the whole forecast.
    }
  }

  items.push(...poolItems(active30d, getCurrentSeasonNumber(now), now));

  return {
    generatedAt: now.toISOString(),
    horizonHours: horizon,
    scale,
    active30d,
    npcGovernor: {
      activePlayers30d: governor.activePlayers30d,
      activeNpcCorps: governor.activeNpcCorps,
      activeIndustryCorps: governor.activeIndustryCorps,
      floorNpcCorps: NPC_GOVERNOR.MARKET_FLOOR,
      floorIndustryCorps: NPC_GOVERNOR.INDUSTRY_FLOOR,
      maxNpcCorps: NPC_GOVERNOR.MARKET_MAX,
      maxIndustryCorps: NPC_GOVERNOR.INDUSTRY_MAX,
      dormantIndustryCorpIds: NPC_INDUSTRY_SEEDS.slice(governor.activeIndustryCorps).map(s => s.id),
    },
    items,
    byResource: summarizeByResource(items),
  };
}

/** Cached forecast (10 min, stale-while-revalidate). */
export async function getNpcForecast(horizonHours: number = NPC_FORECAST_DEFAULT_HORIZON_HOURS): Promise<NpcForecast> {
  const horizon = clampHorizon(horizonHours);
  return withCache(`space-tycoon:npc-forecast:v1:h${horizon}`, () => buildNpcForecast(new Date(), horizon), {
    ttlSeconds: NPC_FORECAST_CACHE_TTL_SECONDS,
    staleWhileRevalidate: true,
    fallbackToStale: true,
  });
}
