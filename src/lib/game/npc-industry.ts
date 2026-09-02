/**
 * NPC industrial corporations — the manufactured-goods backdrop.
 *
 * Founder ruling (2026-08-29): componentry and hardware are manufactured, not
 * mined; they reach the market only when a player or an NPC corporation
 * fabricates them and lists them. This module is the NPC half of that:
 *
 *   1. Each corp buys RAW inputs on the NPC price curve (the same math the
 *      /market/trade route applies to players — so NPC manufacturing pushes
 *      raw prices up and draws raw supply down), runs recipes it has the
 *      facility tier for, and holds the output in a finite inventory.
 *   2. It lists what it built as SELL limit orders at unit cost × (1 + margin),
 *      never below cost, aging unsold stock down toward cost. Nothing is
 *      listed that was not built; the market maker rests no orders for
 *      manufactured goods at all (npc-volume-caps.ts).
 *   3. It BUYS the hardware its own operations consume with buy orders at a
 *      discount to reference — bounded demand that players can fill.
 *   4. Everything scales down as the player population grows (NPC_BACKDROP.md:
 *      a floor, not a ceiling) and is throttled by a finite treasury.
 *
 * Runs hourly from /api/space-tycoon/market/npc-industry. Fills settle in
 * market-orderbook.ts (isNpcCorpId branches). Per-save NPC rivals in
 * npc-engine.ts are a different, client-side system and are untouched.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { PRODUCTION_CHAINS, facilityTierFor, type ProductDefinition } from './production-chains';
import { MANUFACTURED_RESOURCE_IDS } from './economic-sinks';
import { RESOURCE_MAP } from './resources';
import { calculatePriceAfterTrade, getSupplyPriceMultiplier, MINIMUM_MARKET_SUPPLY } from './market-engine';
import { matchOrders, NPC_CORP_PREFIX } from './market-orderbook';
import { activeNpcIndustryCount } from './npc-companies';

export interface NpcIndustrySeed {
  id: string;
  name: string;
  factionId: string;
  /** Highest recipe tier the corp's facilities can run (1-4). */
  capacityTier: number;
  /** Ask markup over unit cost. */
  marginPct: number;
  /** Goods this corp manufactures for sale. */
  focus: string[];
  /** Goods this corp consumes, units per week — becomes standing buy demand. */
  consumes: Record<string, number>;
  /** Opening treasury, $ — finite; refilled only by sales and a small stipend. */
  seedTreasury: number;
  blurb: string;
}

/** Five of the ten named NPC companies (npc-companies.ts) with an industrial
 *  arm. Names and factions match LORE.md so contracts and quarterlies read
 *  consistently. */
export const NPC_INDUSTRY_SEEDS: NpcIndustrySeed[] = [
  {
    id: `${NPC_CORP_PREFIX}stellar`, name: 'Stellar Industries', factionId: 'the-syndicate',
    capacityTier: 2, marginPct: 0.22,
    focus: ['steel_ingots', 'aluminum_alloy', 'structural_beams', 'electronics_package'],
    consumes: { propulsion_unit: 2, solar_panel_array: 2 },
    seedTreasury: 2_000_000_000,
    blurb: 'Bulk metals and structures. The commodity end of the hardware market.',
  },
  {
    id: `${NPC_CORP_PREFIX}helios`, name: 'Helios Energy', factionId: 'the-syndicate',
    capacityTier: 2, marginPct: 0.20,
    focus: ['rocket_fuel', 'solar_panel_array', 'refined_rare_earth'],
    consumes: { structural_beams: 4, electronics_package: 2 },
    seedTreasury: 1_500_000_000,
    blurb: 'Fuel and power hardware; buys structure to build depots.',
  },
  {
    id: `${NPC_CORP_PREFIX}nova`, name: 'Nova Aerospace', factionId: 'void-corsairs',
    capacityTier: 3, marginPct: 0.30,
    focus: ['propulsion_unit', 'satellite_bus', 'station_module'],
    consumes: { structural_beams: 8, electronics_package: 4, solar_panel_array: 3, life_support_pack: 3 },
    seedTreasury: 3_000_000_000,
    blurb: 'Integrator: buys components, sells buses and station kits.',
  },
  {
    id: `${NPC_CORP_PREFIX}frontier`, name: 'Frontier Spacecraft', factionId: 'void-corsairs',
    capacityTier: 3, marginPct: 0.28,
    focus: ['life_support_pack', 'satellite_bus', 'ai_compute_cluster'],
    consumes: { propulsion_unit: 3, electronics_package: 6, aluminum_alloy: 20 },
    seedTreasury: 2_500_000_000,
    blurb: 'Crewed-systems specialist; a steady buyer of electronics and propulsion.',
  },
  {
    id: `${NPC_CORP_PREFIX}deep_space`, name: 'Deep Space Holdings', factionId: 'echo-remnants',
    capacityTier: 4, marginPct: 0.40,
    focus: ['fusion_core', 'habitat_pod', 'ai_compute_cluster'],
    consumes: { station_module: 1, satellite_bus: 1, life_support_pack: 6 },
    seedTreasury: 6_000_000_000,
    blurb: 'Top-of-chain, low volume, expensive. Buys finished modules for its outer-system holdings.',
  },
];

export const NPC_INDUSTRY_NAMES: Record<string, string> = Object.fromEntries(NPC_INDUSTRY_SEEDS.map((s) => [s.id, s.name]));

/** Inventory targets and per-tick production caps by recipe tier. Small on
 *  purpose (BALANCE.md: component storage cap 150, product cap 60 — NPC
 *  stock must stay well under what one player can hold). */
const TARGET_CAP: Record<number, number> = { 1: 40, 2: 12, 3: 3, 4: 1 };
const BATCHES_PER_TICK: Record<number, number> = { 1: 4, 2: 2, 3: 1, 4: 1 };
const LIST_CAP: Record<number, number> = { 1: 30, 2: 10, 3: 3, 4: 1 };
const STIPEND_PER_TICK = 25_000_000;
const TREASURY_CAP = 8_000_000_000;
const AGE_DISCOUNT_PER_DAY = 0.05;
const MIN_MARKUP_OVER_COST = 1.05;
const BUY_DISCOUNT = 0.95;
const TICK_HOURS = 1;
/** Standing-buy backlog cap for a manufactured input a recipe is short of. */
const WANTED_CAP = 24;
/** Largest single buy order a corp rests per good per tick. */
const MAX_BUY_ORDER_QTY = 6;

// ─── Per-tick quantity helpers (shared with npc-forecast.ts) ────────────────
// The published NPC demand forecast (CLAUDE.md: "NPC demand is visible and
// forecastable") must equal what this tick actually does, so every quantity
// and price decision below is a pure exported helper that BOTH the tick and
// buildNpcForecast call. There is deliberately no second formula anywhere;
// npc-forecast.test.ts holds the parity guard.

export const NPC_TICK_HOURS = TICK_HOURS;
export const NPC_WANTED_CAP = WANTED_CAP;
export const NPC_MAX_BUY_ORDER_QTY = MAX_BUY_ORDER_QTY;
export const NPC_BUY_DISCOUNT = BUY_DISCOUNT;

/** Units of a consumable a corp adds to its standing want each tick. */
export function npcConsumptionWantPerTick(perWeek: number, scale: number): number {
  return (perWeek / 168) * TICK_HOURS * scale;
}

/** Inventory target for a recipe output this tick (demand = demandSignal). */
export function npcProductionTarget(tier: number, demand: number, scale: number): number {
  return Math.max(1, Math.min(TARGET_CAP[tier] ?? 1, Math.round((2 + demand) * scale)));
}

export function npcBatchesPerTick(tier: number): number {
  return BATCHES_PER_TICK[tier] ?? 1;
}

export function npcListCap(tier: number): number {
  return LIST_CAP[tier] ?? 1;
}

/** Want after a recipe comes up short of a manufactured input. */
export function npcShortfallWant(currentWant: number, inputQty: number): number {
  return Math.min(WANTED_CAP, currentWant + inputQty);
}

/** Buy-order size rested for a still-wanted quantity. */
export function npcBuyOrderQty(stillWanted: number): number {
  return Math.min(stillWanted, MAX_BUY_ORDER_QTY);
}

/** Bid price for a manufactured good at a reference price. */
export function npcBuyPrice(slug: string, referencePrice: number): number {
  return clampToBand(slug, referencePrice * BUY_DISCOUNT);
}

/** Ask price for a listed good: cost-plus, aged toward cost, floored. */
export function npcListPrice(marginPct: number, slug: string, unitCost: number, ageDays: number): number {
  const markup = Math.max(MIN_MARKUP_OVER_COST, (1 + marginPct) * Math.pow(1 - AGE_DISCOUNT_PER_DAY, ageDays));
  // Cost-plus, but not a fire sale: NPC corps are not charities, and spot
  // (which pays contracts) follows the last fill. Floor at 75% of base,
  // aging no lower than 60%.
  const base = RESOURCE_MAP.get(slug as never)?.baseMarketPrice ?? unitCost;
  const floor = base * Math.max(0.6, 0.75 * Math.pow(1 - AGE_DISCOUNT_PER_DAY, ageDays));
  return clampToBand(slug, Math.max(unitCost * markup, floor));
}

type Inv = Record<string, number>;
export interface CorpMeta { unitCost: Record<string, number>; wanted: Record<string, number>; listedAt: Record<string, string> }

export function readMeta(inv: Inv & { __meta?: unknown }): CorpMeta {
  const m = (inv.__meta as Partial<CorpMeta> | undefined) || {};
  return { unitCost: { ...(m.unitCost || {}) }, wanted: { ...(m.wanted || {}) }, listedAt: { ...(m.listedAt || {}) } };
}

/**
 * NPC share recedes as the player base grows (NPC_BACKDROP.md): full weight
 * up to ~10 active corporations, a quarter at 200+.
 */
export function populationScale(activeProfiles: number): number {
  if (activeProfiles <= 10) return 1;
  return Math.max(0.25, 1 - (activeProfiles - 10) / 250);
}

export function recipeTierOf(outputId: string): number | null {
  // Early-fab wave: a product can now have multiple recipes at different
  // tiers (e.g. the T2 terrestrial satellite-bus route beside the T3
  // component chain). List caps key off the PRODUCT class, so take the
  // highest recipe tier — order-independent, and preserves pre-wave caps.
  const tiers = PRODUCTION_CHAINS.filter((p) => p.outputId === outputId).map((p) => p.tier);
  return tiers.length ? Math.max(...tiers) : null;
}

/**
 * Buy `quantity` of a raw resource from the NPC curve — the same price and
 * supply math the player trade route applies, so NPC demand is visible in
 * raw prices. Returns the cost, or null when the curve cannot fill it.
 */
export async function curveBuy(resourceSlug: string, quantity: number): Promise<number | null> {
  const def = RESOURCE_MAP.get(resourceSlug as never);
  if (!def || MANUFACTURED_RESOURCE_IDS.includes(resourceSlug)) return null;
  const resource = await prisma.marketResource.findUnique({ where: { slug: resourceSlug } });
  if (!resource) return null;
  const available = Math.max(MINIMUM_MARKET_SUPPLY, resource.totalSupply);
  if (quantity > available) return null;
  const baseline = def.startingSupply || 1000;
  const effectiveNow = resource.currentPrice * getSupplyPriceMultiplier(resource.totalSupply, baseline);
  const cost = Math.round(effectiveNow * quantity);
  const newBasePrice = calculatePriceAfterTrade(resource.currentPrice, resource.basePrice, quantity, true, resource.volatility, resource.minPrice, resource.maxPrice);
  const newSupply = Math.max(0, resource.totalSupply - quantity);
  await prisma.marketResource.update({
    where: { id: resource.id },
    data: { currentPrice: newBasePrice, totalSupply: newSupply, totalDemand: resource.totalDemand + quantity },
  });
  return cost;
}

/** Reference price in whole dollars for a manufactured good: last fill, else curve current, else base. */
export async function referencePrice(slug: string): Promise<number> {
  const fill = await prisma.marketFill.findFirst({ where: { resourceSlug: slug }, orderBy: { createdAt: 'desc' }, select: { pricePerUnit: true } });
  if (fill?.pricePerUnit) return fill.pricePerUnit;
  const row = await prisma.marketResource.findUnique({ where: { slug }, select: { currentPrice: true } });
  if (row?.currentPrice) return Math.round(row.currentPrice);
  return RESOURCE_MAP.get(slug as never)?.baseMarketPrice ?? 0;
}

/** Player demand signal for a good: open non-NPC bids plus a 3-day run-rate of recent player buys. */
export async function demandSignal(slug: string): Promise<number> {
  const since = new Date(Date.now() - 7 * 86400000);
  const [bids, fills] = await Promise.all([
    prisma.marketLimitOrder.aggregate({
      where: { resourceSlug: slug, side: 'buy', status: { in: ['open', 'partial'] }, NOT: { profileId: { startsWith: '__NPC_' } } },
      _sum: { quantity: true, filledQty: true },
    }),
    prisma.marketFill.aggregate({
      where: { resourceSlug: slug, createdAt: { gte: since }, NOT: { buyerProfileId: { startsWith: '__NPC_' } } },
      _sum: { quantity: true },
    }),
  ]);
  const openBids = (bids._sum.quantity || 0) - (bids._sum.filledQty || 0);
  const runRate = ((fills._sum.quantity || 0) / 7) * 3;
  return Math.max(0, openBids + runRate);
}

export async function openAskQty(corpId: string, slug: string): Promise<number> {
  const a = await prisma.marketLimitOrder.aggregate({
    where: { profileId: corpId, resourceSlug: slug, side: 'sell', status: { in: ['open', 'partial'] } },
    _sum: { quantity: true, filledQty: true },
  });
  return (a._sum.quantity || 0) - (a._sum.filledQty || 0);
}

export function clampToBand(slug: string, price: number): number {
  // Same band the order route enforces (price-band.ts): [0.3x, 3x] of base,
  // inside the resource's absolute min/max.
  const def = RESOURCE_MAP.get(slug as never);
  const base = def?.baseMarketPrice ?? price;
  const lo = Math.max(def?.minPrice ?? 1, Math.round(base * 0.3));
  const hi = Math.min(def?.maxPrice ?? Number.MAX_SAFE_INTEGER, Math.round(base * 3));
  return Math.min(hi, Math.max(lo, Math.round(price)));
}

export interface CorpTickResult {
  corpId: string;
  built: Record<string, number>;
  listed: Record<string, number>;
  bought: Record<string, number>;
  consumed: Record<string, number>;
  treasury: number;
  skipped: string[];
}

async function ensureCorp(seed: NpcIndustrySeed) {
  return prisma.npcIndustrialCorp.upsert({
    where: { id: seed.id },
    create: { id: seed.id, name: seed.name, factionId: seed.factionId, capacityTier: seed.capacityTier, marginPct: seed.marginPct, treasury: seed.seedTreasury, inventory: {} },
    update: { name: seed.name, factionId: seed.factionId, capacityTier: seed.capacityTier, marginPct: seed.marginPct },
  });
}

/**
 * Manufacture toward inventory targets, tier by tier so lower-tier output
 * feeds higher-tier recipes in the same tick. Mutates `inv`/`meta`; returns
 * what was built and the treasury after purchases.
 */
async function produce(seed: NpcIndustrySeed, inv: Inv, meta: CorpMeta, treasury: number, scale: number, skipped: string[]): Promise<{ built: Record<string, number>; treasury: number }> {
  const built: Record<string, number> = {};
  const recipes = PRODUCTION_CHAINS
    .filter((r) => seed.focus.includes(r.outputId) && facilityTierFor(r) <= seed.capacityTier)
    .sort((a, b) => a.tier - b.tier);
  for (const r of recipes) {
    const out = r.outputId;
    const demand = await demandSignal(out);
    const have = (inv[out] || 0) + (await openAskQty(seed.id, out));
    const target = npcProductionTarget(r.tier, demand, scale);
    let batches = 0;
    while (have + (built[out] || 0) < target && batches < npcBatchesPerTick(r.tier)) {
      const outcome = await runRecipe(r, inv, meta, treasury);
      if (!outcome.ok) {
        skipped.push(`${seed.name}: ${r.id} — ${outcome.reason}`);
        // A manufactured input we are short of becomes a standing buy order —
        // real cross-corp/player demand (Nova bids for electronics; a player
        // who fabricates them can fill it).
        if (outcome.shortOf) meta.wanted[outcome.shortOf] = npcShortfallWant(meta.wanted[outcome.shortOf] || 0, r.inputs[outcome.shortOf] || 1);
        break;
      }
      treasury = outcome.treasury;
      built[out] = (built[out] || 0) + r.outputQuantity;
      batches++;
    }
  }
  return { built, treasury };
}

async function runRecipe(r: ProductDefinition, inv: Inv, meta: CorpMeta, treasury: number): Promise<{ ok: true; treasury: number } | { ok: false; reason: string; shortOf?: string }> {
  // Manufactured inputs must already be in stock (built earlier this tick or
  // bought on the book); raw inputs come off the curve at live prices.
  let cost = 0;
  const rawBuys: Array<[string, number]> = [];
  for (const [id, qty] of Object.entries(r.inputs)) {
    if (MANUFACTURED_RESOURCE_IDS.includes(id)) {
      if ((inv[id] || 0) < qty) return { ok: false, reason: `short of ${id}`, shortOf: id };
      cost += (meta.unitCost[id] || RESOURCE_MAP.get(id as never)?.baseMarketPrice || 0) * qty;
    } else {
      rawBuys.push([id, qty]);
      const def = RESOURCE_MAP.get(id as never);
      cost += (def?.baseMarketPrice || 0) * qty; // estimate for the affordability check
    }
  }
  if (treasury < cost * 1.5) return { ok: false, reason: 'treasury' };
  let paid = 0;
  for (const [id, qty] of rawBuys) {
    const c = await curveBuy(id, qty);
    if (c == null) return { ok: false, reason: `curve cannot supply ${id}` };
    paid += c;
  }
  for (const [id, qty] of Object.entries(r.inputs)) {
    if (MANUFACTURED_RESOURCE_IDS.includes(id)) {
      inv[id] = (inv[id] || 0) - qty;
      paid += (meta.unitCost[id] || RESOURCE_MAP.get(id as never)?.baseMarketPrice || 0) * qty;
    }
  }
  const unit = paid / r.outputQuantity;
  const prev = meta.unitCost[r.outputId];
  meta.unitCost[r.outputId] = prev ? Math.round(prev * 0.6 + unit * 0.4) : Math.round(unit);
  inv[r.outputId] = (inv[r.outputId] || 0) + r.outputQuantity;
  return { ok: true, treasury: treasury - paid };
}

/** Cancel the corp's open orders (nothing was escrowed) and relist from inventory. */
async function relist(seed: NpcIndustrySeed, inv: Inv, meta: CorpMeta, scale: number): Promise<Record<string, number>> {
  await prisma.marketLimitOrder.updateMany({
    where: { profileId: seed.id, side: 'sell', status: { in: ['open', 'partial'] } },
    data: { status: 'cancelled' },
  });
  const listed: Record<string, number> = {};
  const now = Date.now();
  for (const slug of seed.focus) {
    const qty = Math.floor(inv[slug] || 0);
    if (qty <= 0) { delete meta.listedAt[slug]; continue; }
    const tier = recipeTierOf(slug) ?? 2;
    const listQty = Math.min(qty, npcListCap(tier));
    const unitCost = meta.unitCost[slug] || RESOURCE_MAP.get(slug as never)?.baseMarketPrice || 1;
    const firstListed = meta.listedAt[slug] ? new Date(meta.listedAt[slug]).getTime() : now;
    if (!meta.listedAt[slug]) meta.listedAt[slug] = new Date(now).toISOString();
    const ageDays = Math.max(0, (now - firstListed) / 86400000);
    const price = npcListPrice(seed.marginPct, slug, unitCost, ageDays);
    await prisma.marketLimitOrder.create({
      data: { profileId: seed.id, resourceSlug: slug, side: 'sell', quantity: listQty, pricePerUnit: price, escrowAmount: 0, status: 'open', source: 'npc-industry', expiresAt: new Date(now + 26 * 3600000) },
    });
    listed[slug] = listQty;
    await matchOrders(slug).catch((e) => logger.warn('npc-industry: match failed', { slug, error: String(e) }));
  }
  void scale;
  return listed;
}

/** Consume what the corp uses, buying on the book when stock runs short. */
async function procure(seed: NpcIndustrySeed, inv: Inv, meta: CorpMeta, treasury: number, scale: number): Promise<{ bought: Record<string, number>; consumed: Record<string, number> }> {
  await prisma.marketLimitOrder.updateMany({
    where: { profileId: seed.id, side: 'buy', status: { in: ['open', 'partial'] } },
    data: { status: 'cancelled' },
  });
  const bought: Record<string, number> = {};
  const consumed: Record<string, number> = {};
  let exposure = 0;
  for (const [slug, perWeek] of Object.entries(seed.consumes)) {
    meta.wanted[slug] = (meta.wanted[slug] || 0) + npcConsumptionWantPerTick(perWeek, scale);
  }
  for (const slug of Object.keys(meta.wanted)) {
    if (!MANUFACTURED_RESOURCE_IDS.includes(slug)) { delete meta.wanted[slug]; continue; }
    const want = Math.floor(meta.wanted[slug]);
    if (want < 1) continue;
    const isConsumable = slug in seed.consumes;
    const use = Math.min(want, Math.floor(inv[slug] || 0));
    if (use > 0) {
      meta.wanted[slug] -= use;
      if (isConsumable) { inv[slug] -= use; consumed[slug] = use; }
    }
    const still = Math.floor(meta.wanted[slug]);
    if (still < 1) continue;
    const ref = await referencePrice(slug);
    const price = npcBuyPrice(slug, ref);
    const qty = npcBuyOrderQty(still);
    const cost = price * qty * 1.02;
    if (treasury - exposure < cost * 3) continue; // keep a cushion; demand is real but not reckless
    exposure += cost;
    await prisma.marketLimitOrder.create({
      data: { profileId: seed.id, resourceSlug: slug, side: 'buy', quantity: qty, pricePerUnit: price, escrowAmount: 0, status: 'open', source: 'npc-industry', expiresAt: new Date(Date.now() + 26 * 3600000) },
    });
    bought[slug] = qty;
    await matchOrders(slug).catch((e) => logger.warn('npc-industry: match failed', { slug, error: String(e) }));
  }
  return { bought, consumed };
}

/** Reason string a dormant corp's tick result carries in `skipped`. */
export const NPC_DORMANT_REASON = 'dormant (population governor)';

/**
 * Cancel a dormant corp's resting orders gracefully — both sides, nothing
 * is escrowed for NPC corps (relist() already does this for the sell side
 * every tick). Exported for the governor test.
 */
export async function cancelDormantCorpOrders(corpId: string): Promise<number> {
  const res = await prisma.marketLimitOrder.updateMany({
    where: { profileId: corpId, status: { in: ['open', 'partial'] } },
    data: { status: 'cancelled' },
  });
  return res.count;
}

export async function runNpcIndustryTick(now: Date = new Date()): Promise<{ scale: number; activeProfiles: number; active30d: number; activeIndustryCorps: number; corps: CorpTickResult[] }> {
  const [activeProfiles, active30d] = await Promise.all([
    prisma.gameProfile.count({ where: { lastSyncAt: { gte: new Date(now.getTime() - 14 * 86400000) } } }),
    prisma.gameProfile.count({ where: { lastSyncAt: { gt: new Date(now.getTime() - 30 * 86400000) } } }),
  ]);
  const scale = populationScale(activeProfiles);
  // GAME_DESIGN_REVIEW_2026-09 row 11 — density governor: the TAIL of the
  // seed order goes dormant as the 30-day-active population grows (floor 2).
  const activeIndustryCorps = activeNpcIndustryCount(active30d);
  const results: CorpTickResult[] = [];
  for (const [seedIndex, seed] of NPC_INDUSTRY_SEEDS.entries()) {
    const skipped: string[] = [];
    if (seedIndex >= activeIndustryCorps) {
      try {
        const cancelled = await cancelDormantCorpOrders(seed.id);
        if (cancelled > 0) logger.info('npc-industry: dormant corp orders cancelled', { corpId: seed.id, cancelled });
      } catch (e) {
        logger.warn('npc-industry: dormant cancel failed', { corpId: seed.id, error: String(e) });
      }
      results.push({ corpId: seed.id, built: {}, listed: {}, bought: {}, consumed: {}, treasury: 0, skipped: [NPC_DORMANT_REASON] });
      continue;
    }
    try {
      const row = await ensureCorp(seed);
      // Re-read after any fills since the row was upserted: fills mutate inventory/treasury in matchOrders.
      const fresh = await prisma.npcIndustrialCorp.findUnique({ where: { id: seed.id } });
      const inv: Inv = { ...(((fresh ?? row).inventory as Inv) || {}) };
      const meta = readMeta(inv);
      delete (inv as Record<string, unknown>).__meta;
      let treasury = Math.min(TREASURY_CAP, (fresh ?? row).treasury + STIPEND_PER_TICK * scale);

      const { built, treasury: afterBuild } = await produce(seed, inv, meta, treasury, scale, skipped);
      treasury = afterBuild;
      const listed = await relist(seed, inv, meta, scale);
      const { bought, consumed } = await procure(seed, inv, meta, treasury, scale);
      const unitsBuilt = Object.values(built).reduce((a, b) => a + b, 0);

      // Persist; fills that happened during matchOrders above already adjusted
      // the row, so merge: take the row's treasury delta since we read it.
      const latest = await prisma.npcIndustrialCorp.findUnique({ where: { id: seed.id } });
      const fillDelta = latest ? latest.treasury - (fresh ?? row).treasury : 0;
      const latestInv = ((latest?.inventory as Inv) || {});
      // Inventory: our working copy already reflects production/consumption;
      // apply any fill deltas the matcher wrote against the pre-tick copy.
      for (const [k, v] of Object.entries(latestInv)) {
        if (k === '__meta') continue;
        const pre = ((fresh ?? row).inventory as Inv)[k] || 0;
        const delta = v - pre;
        if (delta !== 0) inv[k] = Math.max(0, (inv[k] || 0) + delta);
      }
      const stored = JSON.parse(JSON.stringify({ ...inv, __meta: meta }));
      await prisma.npcIndustrialCorp.update({
        where: { id: seed.id },
        data: { inventory: stored, treasury: treasury + fillDelta, unitsBuilt: { increment: unitsBuilt }, lastTickAt: now },
      });
      results.push({ corpId: seed.id, built, listed, bought, consumed, treasury: treasury + fillDelta, skipped });
    } catch (error) {
      logger.error('npc-industry: corp tick failed', { corp: seed.id, error: error instanceof Error ? error.message : String(error) });
      results.push({ corpId: seed.id, built: {}, listed: {}, bought: {}, consumed: {}, treasury: 0, skipped: [...skipped, 'tick failed'] });
    }
  }
  return { scale, activeProfiles, active30d, activeIndustryCorps, corps: results };
}
