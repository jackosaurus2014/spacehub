// ─── Space Tycoon: ore → product refining (mining Phase C) ───────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §4 "Processing" + §8 row C, and the
// founder ruling of 2026-09-12 (§9 ruling 1): "ore is a REAL intermediate
// resource that must be hauled and refined. Phase C ships the refinery
// ratios". Phase A fixed the four ore ids so this module never migrates a
// save (asteroids.ts ORE_RESOURCE_BY_CLASS).
//
// The shape of the decision this creates:
//   raw    — mine ore, haul the ROCK home, sell it at the ore price. One
//            hold = one hold of ore.
//   refine — mine ore and process it at the field. The slag never leaves the
//            field, so a hold carries the CONCENTRATE: 100 units of metallic
//            ore become ~14 units of product worth ~1.85x the ore (before
//            the mobile recovery loss). Fewer trips, each far more valuable,
//            at the cost of a slower cycle, a refining opex and the
//            18% the mobile plant cannot recover.
//
// Every output is a resource the market ALREADY trades (resources.ts is
// untouched by Phase C). The class mixes are the real ones: C-types carry
// water ice, ammonia and organics; S-types are structural metal; M-types are
// iron-nickel with platinum-group and gold inclusions; X-types are the
// exotic-bearing matrices of the outer swarms.
//
// Balance note (docs/BALANCE.md Pass 15, and Pass 14 "opening scarcity"):
// C / M / X outputs are belt-, lunar- and outer-origin goods, so they carry
// the SAME opening scarcity premium their ore does and refining wins on a
// fresh world as well as a mature one. S-type outputs are fabricated goods
// (flat 1.0x on the NPC curve) and therefore DO lag raw silicate ore while
// the ore market is still empty — that is a real market signal, deliberately
// left in: silicate refines to structural metal Earth already has.
//
// Pure. No React, no DB. Shared by mining-orders.ts (the quote + local
// settlement), server-mining.ts (the completion pass, which is the only path
// that creates refined product for a synced profile) and scripts/sim-mining.ts.

import { ORE_RESOURCE_BY_CLASS, type AsteroidClass, type OreResourceId } from './asteroids';
import { RESOURCE_MAP, type ResourceId } from './resources';

// ─── Recovery (the loss factor) ──────────────────────────────────────────────

/** What a MOBILE plant (Refinery Barge) actually recovers of a recipe's
 *  full yield. The remaining 18% is slag, boil-off and the fraction a
 *  centrifuge in freefall simply cannot separate — the design's "mobile
 *  refining at a lower ratio than a fixed refinery" (§5). */
export const MOBILE_REFINERY_RECOVERY = 0.82;

/** A fixed refinery's recovery, for when a location-based refinery consumes
 *  ore (not shipped in Phase C — the ratio is fixed here so the two can
 *  never drift). */
export const FIXED_REFINERY_RECOVERY = 0.95;

/** Power, reagents and slag handling, as a share of the ore's BASE price per
 *  ore unit processed. Burned through the ledger (`refining_opex`) — a money
 *  sink that scales with what is being processed, never with what it sells
 *  for, so a market spike never makes refining free. */
export const REFINE_OPEX_SHARE = 0.06;

// ─── Recipes ─────────────────────────────────────────────────────────────────

export interface RefineryOutput {
  resourceId: ResourceId;
  /** Units of this product from 100 units of ore at FULL recovery. */
  unitsPer100Ore: number;
}

export interface RefineryRecipe {
  oreId: OreResourceId;
  class: AsteroidClass;
  name: string;
  description: string;
  outputs: readonly RefineryOutput[];
}

/**
 * The four recipes. Ratios are authored at FULL recovery; every caller
 * multiplies by a recovery factor (MOBILE_REFINERY_RECOVERY aboard a barge).
 * Value ratios at base prices (docs/BALANCE.md Pass 15): every recipe lands
 * within 1.83x-1.86x the ore's own base value at full recovery, so no ore
 * class is a dominant refine.
 */
export const REFINERY_RECIPES: readonly RefineryRecipe[] = [
  {
    oreId: 'ore_carbonaceous', class: 'C', name: 'Volatile cracking',
    description: 'Bake the rock: water ice sublimes off first, then ammonia, and the organics are separated from the residue.',
    outputs: [
      { resourceId: 'lunar_water', unitsPer100Ore: 12 },
      { resourceId: 'ammonia', unitsPer100Ore: 20 },
      { resourceId: 'organic_compounds', unitsPer100Ore: 2 },
    ],
  },
  {
    oreId: 'ore_silicate', class: 'S', name: 'Silicate smelting',
    description: 'Solar-thermal smelting of an ordinary chondrite: structural steel and aluminium alloy, and a great deal of slag.',
    outputs: [
      { resourceId: 'steel_ingots', unitsPer100Ore: 18 },
      { resourceId: 'aluminum_alloy', unitsPer100Ore: 5 },
    ],
  },
  {
    oreId: 'ore_metallic', class: 'M', name: 'Carbonyl separation',
    description: 'The Mond process in freefall: iron-nickel off as carbonyl gas, the platinum-group and gold inclusions left behind as concentrate.',
    outputs: [
      { resourceId: 'steel_ingots', unitsPer100Ore: 15 },
      { resourceId: 'platinum_group', unitsPer100Ore: 1.6 },
      { resourceId: 'gold', unitsPer100Ore: 1 },
    ],
  },
  {
    oreId: 'ore_exotic', class: 'X', name: 'Exotic matrix separation',
    description: 'The outer-swarm matrices no fixed refinery on Earth is tuned for: exotic material first, then the rare-earth fraction.',
    outputs: [
      { resourceId: 'exotic_materials', unitsPer100Ore: 5.5 },
      { resourceId: 'rare_earth', unitsPer100Ore: 8 },
      { resourceId: 'refined_rare_earth', unitsPer100Ore: 0.6 },
    ],
  },
];

export const REFINERY_RECIPE_BY_ORE: ReadonlyMap<string, RefineryRecipe> =
  new Map(REFINERY_RECIPES.map(r => [r.oreId, r]));

export function getRefineryRecipe(oreId: string | null | undefined): RefineryRecipe | undefined {
  return oreId ? REFINERY_RECIPE_BY_ORE.get(oreId) : undefined;
}

export function recipeForClass(cls: AsteroidClass): RefineryRecipe | undefined {
  return REFINERY_RECIPE_BY_ORE.get(ORE_RESOURCE_BY_CLASS[cls]);
}

export function isRefinableOre(oreId: string | null | undefined): boolean {
  return !!oreId && REFINERY_RECIPE_BY_ORE.has(oreId);
}

// ─── Yield maths ─────────────────────────────────────────────────────────────

/** Product MASS (units of output) from one unit of ore at `recovery`. This is
 *  what decides how much ore a hold can swallow: the hold carries the
 *  product, not the rock. */
export function refinedMassPerOreUnit(oreId: string, recovery: number = MOBILE_REFINERY_RECOVERY): number {
  const recipe = getRefineryRecipe(oreId);
  if (!recipe) return 0;
  const per100 = recipe.outputs.reduce((s, o) => s + o.unitsPer100Ore, 0);
  return (per100 / 100) * clampRecovery(recovery);
}

/**
 * The product of refining `oreUnits` at `recovery`, as whole units keyed by
 * resource id. Rounded per output (a run too small to yield a whole unit of
 * a trace product yields none of it — the concentrate is not divisible).
 * Deterministic: the server settlement and the client quote agree exactly.
 */
export function refineOutputs(oreId: string, oreUnits: number, recovery: number = MOBILE_REFINERY_RECOVERY): Record<string, number> {
  const recipe = getRefineryRecipe(oreId);
  const units = Math.max(0, Math.floor(oreUnits));
  const out: Record<string, number> = {};
  if (!recipe || units <= 0) return out;
  const r = clampRecovery(recovery);
  for (const o of recipe.outputs) {
    const qty = Math.round((o.unitsPer100Ore / 100) * units * r);
    if (qty > 0) out[o.resourceId] = (out[o.resourceId] || 0) + qty;
  }
  return out;
}

/** Total product units of a refine run (the mass the hold must hold). */
export function refinedUnitTotal(outputs: Record<string, number>): number {
  return Object.values(outputs).reduce((s, n) => s + Math.max(0, n), 0);
}

/** Apply a proportional loss (an NPC shakedown on the run home) to a product
 *  manifest, taking whole units and never more than what is there. Returns
 *  the surviving manifest and the units actually lost. */
export function applyProductLoss(outputs: Record<string, number>, lossShare: number): { outputs: Record<string, number>; unitsLost: number } {
  const share = Math.max(0, Math.min(1, Number.isFinite(lossShare) ? lossShare : 0));
  if (share <= 0) return { outputs: { ...outputs }, unitsLost: 0 };
  const next: Record<string, number> = {};
  let lost = 0;
  // Highest-value line first, so a toll takes what a pirate would take.
  const lines = Object.entries(outputs).sort((a, b) => unitPrice(b[0]) - unitPrice(a[0]));
  const totalUnits = refinedUnitTotal(outputs);
  let toTake = Math.min(totalUnits, Math.max(share > 0 && totalUnits > 0 ? 1 : 0, Math.round(totalUnits * share)));
  for (const [slug, qty] of lines) {
    const take = Math.min(qty, toTake);
    const keep = qty - take;
    toTake -= take;
    lost += take;
    if (keep > 0) next[slug] = keep;
  }
  return { outputs: next, unitsLost: lost };
}

/** Market value of a product manifest. `priceOf` defaults to base prices;
 *  the server passes live spot, the sim passes whichever it is testing. */
export function productValue(outputs: Record<string, number>, priceOf: (slug: string) => number = unitPrice): number {
  let v = 0;
  for (const [slug, qty] of Object.entries(outputs)) v += Math.max(0, qty) * Math.max(0, priceOf(slug));
  return Math.round(v);
}

/** The refining opex for a run: REFINE_OPEX_SHARE of the ore's base price per
 *  ore unit processed. Burned (`refining_opex`). */
export function refineOpex(oreId: string, oreUnits: number): number {
  const orePrice = unitPrice(oreId);
  return Math.max(0, Math.round(orePrice * REFINE_OPEX_SHARE * Math.max(0, Math.floor(oreUnits))));
}

/** No single refine order may tie a hull up for longer than this. The hold
 *  would happily swallow the concentrate of several thousand ore units, but a
 *  twelve-hour order is already two game-months — past that the run stops
 *  being a decision and becomes a nap (CLAUDE.md "don't collapse the tempo":
 *  refining lives on the daily loop, not the campaign loop). Split a bigger
 *  run into several orders. */
export const REFINE_MAX_BATCH_HOURS = 12;

/** The largest batch a hull can take in one order given its extraction rate
 *  (0 or omitted when the ore is already aboard) and its plant rate, under
 *  REFINE_MAX_BATCH_HOURS. */
export function maxOreBatchForTime(extractionPerHour: number, refineOrePerHour: number): number {
  const plant = Math.max(1, refineOrePerHour || 0);
  const perUnitHours = (extractionPerHour > 0 ? 1 / extractionPerHour : 0) + 1 / plant;
  if (perUnitHours <= 0) return 1;
  return Math.max(1, Math.floor(REFINE_MAX_BATCH_HOURS / perUnitHours));
}

/** Real seconds to process `oreUnits` on a hull rated at `refineOrePerHour`. */
export function refineSeconds(oreUnits: number, refineOrePerHour: number): number {
  const rate = Math.max(1, refineOrePerHour || 0);
  return Math.ceil((Math.max(0, oreUnits) / rate) * 3600);
}

/**
 * The largest ore batch a hull can process in one run: the hold must carry
 * the PRODUCT, so the cap is capacity ÷ product mass per ore unit. This is
 * the whole reason to refine at the field — a 400-unit hold that carries 400
 * units of metallic ore carries the concentrate of ~2,770 units instead.
 */
export function maxOreBatchForHold(oreId: string, cargoCapacity: number, recovery: number = MOBILE_REFINERY_RECOVERY): number {
  const per = refinedMassPerOreUnit(oreId, recovery);
  if (per <= 0) return 0;
  return Math.max(1, Math.floor(Math.max(0, cargoCapacity) / per));
}

/** Value ratio of a recipe against the ore it consumes, at base prices — the
 *  documented headline of docs/BALANCE.md Pass 15. */
export function recipeValueRatio(oreId: string, recovery: number = 1): number {
  const orePrice = unitPrice(oreId);
  if (orePrice <= 0) return 0;
  const per100 = refineOutputs(oreId, 100, recovery);
  return Math.round((productValue(per100) / (orePrice * 100)) * 1000) / 1000;
}

function clampRecovery(r: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(r) ? r : MOBILE_REFINERY_RECOVERY));
}

function unitPrice(slug: string): number {
  return RESOURCE_MAP.get(slug as ResourceId)?.baseMarketPrice ?? 0;
}
