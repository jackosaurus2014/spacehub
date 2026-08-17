// ─── Space Tycoon: Economy Simulation Harness ───────────────────────────────
// REUSABLE TOOL (keep) — docs/MEANINGFUL_2026-08.md Part 1 was produced with
// this. Runs scripted multi-player strategies over N game-months against the
// REAL engine math: it imports the actual pure modules (formulas, demand
// pools, pool-share pricing, the consumption engine, extraction pressure,
// labor market, building/service defs) rather than re-implementing them, so
// when a curve or constant changes, re-running the sims shows the new
// economy. No DB, no Date.now dependence in the results, fully deterministic.
//
// Usage: npx tsx scripts/sim-strategies.ts   (the runner; this file is a lib)
//
// Fidelity notes (what is real vs. approximated):
//   REAL: serviceSaturationMultiplier, computePoolAggregates +
//         computePoolMultiplier (multi-player shared pools — the server
//         cron's own pure core), processConsumptionForMonth (the actual E3
//         engine), applyExtractionEvent/computeExtractionPressure (E5),
//         corporateOverheadMonthly, executiveCompensationMonthly,
//         scaledBuildingCost, getPowerByLocation, building/service/resource
//         defs and prices, computeWageIndex.
//   APPROXIMATED (documented in the spec):
//     - Buildings complete instantly (real build timers are minutes-to-an-
//       hour vs 6-real-hour game months — negligible at month granularity);
//       max builds/month models construction-slot throughput.
//     - The ~14 private multipliers (research/commanders/legacy/etc.) are
//       held at 1.0 to isolate the STRUCTURAL curves the founder directive
//       is about. They multiply revenue AND are capped, so they shift levels,
//       not shapes.
//     - Market inputs are bought at basePrice × 1.08 (NPC maker min half-
//       spread 6% + 2% fee — the real floor cost of the 'market' supply
//       policy); mined output sells at basePrice × 0.97 (contract/broker
//       path). Season modifier held neutral (1.0).
//     - active30d = 0 (full NPC demand floor). npcPopulationScaler scenarios
//       can be passed explicitly.

import { BUILDINGS, BUILDING_MAP, getPowerByLocation, getCraftingSpeedMultiplier } from '../src/lib/game/buildings';
import { CHAIN_MAP } from '../src/lib/game/production-chains';
import { SERVICE_MAP } from '../src/lib/game/services';
import { MINING_PRODUCTION, RESOURCE_MAP } from '../src/lib/game/resources';
import type { ResourceId } from '../src/lib/game/resources';
import {
  serviceSaturationMultiplier,
  corporateOverheadMonthly,
  executiveCompensationMonthly,
  scaledBuildingCost,
} from '../src/lib/game/formulas';
import { BOOK_VALUE_DEPRECIATION_FACTOR } from '../src/lib/game/frontier';
import {
  computePoolAggregates,
  getServiceCategory,
  demandPoolKey,
  type ProfileActivitySummary,
} from '../src/lib/game/demand-pools';
import { computePoolMultiplier } from '../src/lib/game/service-pricing';
import { processConsumptionForMonth, DEFAULT_CONSUMPTION_STATE, CONSUMPTION_EFFICIENCY_FLOOR, storageCapacityUnits } from '../src/lib/game/consumption';
import { getNpcVolumeCap } from '../src/lib/game/npc-volume-caps';
import {
  applyExtractionEvent,
  computeExtractionPressure,
  extractionKey,
} from '../src/lib/game/extraction-pressure';
import { priceLinkedMiningRevenue } from '../src/lib/game/mining-pricing';
import type { MarketSnapshot } from '../src/lib/game/spot-price';
import type { GameState } from '../src/lib/game/types';
// ─── Balance Pass 3 (PvP): shared-world modules the multi-player world
// config exercises — all REAL engine imports, never reimplemented.
import {
  computeLaborAggregates,
  sumCrewQuarters,
  type LaborActivitySummary,
} from '../src/lib/game/labor-market';
import { WORKER_TYPES, type WorkerType } from '../src/lib/game/workforce';
import {
  calculatePriceAfterMining,
  calculatePriceAfterTrade,
  calculateIdleDecay,
} from '../src/lib/game/market-engine';
import { RESOURCES } from '../src/lib/game/resources';

export const GAME_MONTH_MS = 21_600 * 1000; // server-time.ts REAL_SECONDS_PER_GAME_MONTH
export const INPUT_BUY_MULT = 1.08; // NPC maker min half-spread 0.06 + FEE_RATE 0.02
export const OUTPUT_SELL_MULT = 0.97; // spot −3% broker (delivery-contract/no-fee path is spot)

let nextInstance = 1;
export function makeBuilding(definitionId: string, locationId: string) {
  return { instanceId: `sim_${nextInstance++}`, definitionId, locationId, isComplete: true };
}

export interface SimBuilding {
  instanceId: string;
  definitionId: string;
  locationId: string;
  isComplete: boolean;
}

export interface SimPlayer {
  name: string;
  money: number;
  totalEarned: number;
  totalSpent: number;
  buildings: SimBuilding[];
  resources: Record<string, number>;
  /** last month's per-building consumption efficiency (1 = fully supplied) */
  efficiency: Record<string, number>;
  /** strategy hook: called at the start of each month; returns definitionIds
   *  (with locations) it wants to build this month, in order. */
  plan: (p: SimPlayer, month: number) => { definitionId: string; locationId: string }[];
  maxBuildsPerMonth: number;
  /** if false, shortfalls are NOT bought from the market (runs degraded) */
  buysInputs: boolean;
  /** Balance Pass 1: if false, leftover inventory is never sold — the
   *  "resource hoarder" worst case (stockpiles only grow). Default true
   *  (the original always-liquidate behavior). */
  sellsLeftovers: boolean;
  /** Balance Pass 2: crafting-queue plan — PRODUCTION_CHAINS recipe ids in
   *  priority order. Each month the single refining slot (game-engine.ts
   *  `activeRefining`) runs recipes from this list, first-listed first,
   *  bounded by (a) the month's real-seconds budget ÷ each recipe's
   *  effective duration (fab-count speed bonus applied, exactly
   *  getCraftingSpeedMultiplier) and (b) inputs ALREADY IN STOCK — the
   *  crafting model is a surplus SINK, it never market-buys inputs.
   *  requiredBuilding is enforced against the player's completed fleet;
   *  requiredResearch is assumed complete (same neutrality stance as the
   *  harness's other private multipliers — gating by research would
   *  understate the sink this model exists to measure). Empty/absent =
   *  no crafting (every legacy table byte-identical). */
  craftPlan?: string[];
  /** Balance Pass 3 (PvP): crew headcount per worker type. Only read when
   *  the world's `laborMarket` opt is ON — payroll is then charged at the
   *  REAL shared wage index (labor-market.ts computeLaborAggregates over
   *  every player in the world). Absent/flag-off = no payroll modeled
   *  (legacy tables byte-identical). */
  headcount?: Partial<Record<WorkerType, number>>;
  /** Balance Pass 3: this player's crew trainingLevel (0-1) for the labor
   *  aggregation's mitigation term. Default 0.5 (labor-market.ts default). */
  trainingLevel?: number;
  history: MonthRow[];
}

// ─── Balance Pass 1: per-month resource flow decomposition ──────────────────
// GENERATION: mined (MINING_PRODUCTION × extraction pressure × eff) +
// produced (producesPerMonth recipes). Colony output is intentionally absent:
// COLONY_MINING_PRODUCTION is not wired into the live tick (audited 2026-08),
// so the real engine generates nothing from colonies either.
// DRAINS: consumed (consumesPerMonth recipes), construction (resourceCost on
// builds, when the world models it), sold (leftover sales — optionally capped
// at what the NPC maker can actually absorb per game-month).
export interface ResourceFlows {
  mined: Record<string, number>;
  produced: Record<string, number>;
  consumed: Record<string, number>;
  /** Full resourceCost units settled for this month's builds (drawn from
   *  stock first, shortfall market-bought) — only when
   *  world.opts.constructionMaterials is on. */
  construction: Record<string, number>;
  /** Leftover units actually sold this month. */
  sold: Record<string, number>;
  /** Leftover units the NPC absorption cap refused (npcSaleCaps mode) —
   *  they stay in inventory. */
  unsold: Record<string, number>;
  /** Units destroyed by storage integrity (volatile boiloff + warehouse
   *  overflow decay — consumption.ts, Balance Pass 1). */
  decayed: Record<string, number>;
  /** Units bought from the market (recipe-input shortfall + construction
   *  material shortfall). */
  bought: Record<string, number>;
  /** Balance Pass 2: input units consumed by the crafting queue (a drain). */
  craftedIn: Record<string, number>;
  /** Balance Pass 2: output units produced by the crafting queue (generation). */
  craftedOut: Record<string, number>;
  /** Balance Pass 2: units sold through the delivery-contract outlet (a
   *  drain, separate from NPC-capped leftover sales). */
  contractSold: Record<string, number>;
}

export function emptyFlows(): ResourceFlows {
  return {
    mined: {}, produced: {}, consumed: {}, construction: {}, sold: {},
    unsold: {}, decayed: {}, bought: {}, craftedIn: {}, craftedOut: {}, contractSold: {},
  };
}

function addFlow(rec: Record<string, number>, res: string, qty: number): void {
  if (qty <= 0) return;
  rec[res] = (rec[res] || 0) + qty;
}

/** Reporting bucket for stockpile totals (CLAUDE.md stat categories). */
export type ResourceBucket = 'raw' | 'refined' | 'component' | 'product';

export function resourceBucket(resourceId: string): ResourceBucket {
  const cat = RESOURCE_MAP.get(resourceId as ResourceId)?.category;
  if (cat === 'refined' || cat === 'component' || cat === 'product') return cat;
  return 'raw';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Units/game-month the NPC market maker can absorb for one resource: the
 *  per-REAL-day standing-order cap × (game-month length ÷ one real day).
 *  With 6h game months this is cap ÷ 4 — the honest ceiling on "just dump
 *  it on the NPC" liquidation for a continuously-online player. */
export function npcAbsorptionPerMonth(resourceId: string, monthMs: number = GAME_MONTH_MS): number {
  return getNpcVolumeCap(resourceId) * (monthMs / DAY_MS);
}

export interface MonthRow {
  month: number;
  money: number;
  netWorthEst: number;
  revenue: number;
  operating: number;
  maintenance: number;
  overhead: number;
  execComp: number;
  inputCost: number;
  resourceSales: number;
  /** Balance Pass 2: revenue from the delivery-contract outlet this month
   *  (0 unless world.opts.contractOutlet is set). Included in `net`. */
  contractSales?: number;
  /** Balance Pass 3: monthly payroll at the shared wage index — present only
   *  when world.opts.laborMarket is on. Included in `net`. */
  payroll?: number;
  net: number;
  buildingCount: number;
  capex: number;
  poolMults: Record<string, number>;
  avgEfficiency: number;
  // ─── Balance Pass 1 (optional, populated by every stepMonth run) ────────
  /** This month's resource flow decomposition. */
  flows?: ResourceFlows;
  /** End-of-month stockpile snapshot (units, rounded to 2dp). */
  stock?: Record<string, number>;
  /** End-of-month stockpile totals by bucket (units). */
  stockByBucket?: Record<ResourceBucket, number>;
  /** End-of-month stockpile book value at base prices ($). */
  stockValue?: number;
}

export interface SimWorldOpts {
  /** Balance Pass 1: cap each month's leftover sales per resource at what
   *  the NPC maker's standing orders can actually absorb
   *  (npcAbsorptionPerMonth). Off by default — the original harness fiction
   *  of infinite liquidation, kept for the historical M-wave tables. */
  npcSaleCaps?: boolean;
  /** Balance Pass 1: settle each build's `resourceCost` (drawn from stock,
   *  shortfall bought at base × INPUT_BUY_MULT) — the construction material
   *  drain the real engine charges (command-queue.ts). Off by default so the
   *  historical money tables don't shift. */
  constructionMaterials?: boolean;
  /** Balance Pass 2: delivery-contract outlet — the sink the Pass-1 audit
   *  world couldn't see. The live game lets a player complete
   *  `getDailyDeliveryCap()` delivery contracts per rolling 24h (4 base, +1
   *  space_logistics research, +1 tier 5), each asking for a faction-typical
   *  quantity of ONE resource, paid at live spot with NO broker fee
   *  (delivery-contracts.ts). Model: each game-month the player may sell up
   *  to capPerDay × (monthMs/DAY) × CONTRACT_OUTLET_TYPICAL_QTY units of
   *  its post-NPC-cap leftover surplus (highest book value first) at spot
   *  ×1.0. Faction payment multipliers (0.9–1.5, mean 1.2) are conservatively
   *  held at 1.0. Off by default — legacy tables unchanged. */
  contractOutlet?: { capPerDay: number };
  // ─── Balance Pass 3 (PvP) — multi-player shared-world switches. All off
  // by default: every legacy single-player table is byte-identical.
  /** With npcSaleCaps ON, contend the NPC maker's monthly absorption budget
   *  ACROSS players instead of granting each player its own full cap. The
   *  budget is consumed first-come in player array order — matching the real
   *  order book's price-time FIFO (market-orderbook.ts matchOrders: the
   *  earlier-resting ask fills first; there is no fair-split mechanism).
   *  NOTE the ordering bias this implies is REAL game behavior, not a sim
   *  artifact: whoever gets their ask on the book first eats the NPC bid.
   *  The delivery-contract outlet is deliberately NOT contended — the real
   *  daily cap is per-save (delivery-contracts.ts reads the player's own
   *  completedDeliveries), not a shared pool. */
  contendedNpcCaps?: boolean;
  /** Charge each player a monthly payroll at the REAL shared wage index:
   *  computeLaborAggregates over every player's `headcount` + crew quarters
   *  (labor-market.ts — the weekly cron's pure core). Off = no payroll
   *  (the harness's historical stance: workforce held out entirely). */
  laborMarket?: boolean;
  /** Evolve world.spotSnapshot from the players' COMBINED physical flows
   *  each month, using the real market-engine price-impact functions:
   *  mined units → calculatePriceAfterMining, sold units (leftover + contract
   *  sales) → calculatePriceAfterTrade(sell side), then the hourly
   *  mean-reversion cron's calculateIdleDecay applied once per real hour of
   *  the game-month (6 calls at 60 idle minutes each — the same ≤10%-of-gap
   *  step the /market/mean-revert route takes). Prices are updated at month
   *  END, so a month's sales settle at the PREVIOUS month's spot — mirroring
   *  the real lag between fills and the cron. Approximation stated: the live
   *  path clamps impact per SYNC call, not per month; one monthly call with
   *  MAX_BACKGROUND_IMPACT/MAX_TRADE_IMPACT clamps is the coarse-grained
   *  equivalent and slightly UNDERSTATES what a burst-syncing seller could
   *  do — conservative for a crash-damage audit. */
  dynamicSpot?: boolean;
  /** Resources under a declared price campaign: mean reversion SKIPS them
   *  (the mean-revert route consults active campaigns — price-campaigns.ts
   *  mechanic #1). Only meaningful with dynamicSpot on. */
  campaignSlugs?: string[];
}

/** Balance Pass 2: expected units per delivery contract. Derivation from
 *  delivery-contracts.ts generateContract: baseQty ~ U[20,200] (mean 110) ×
 *  mean faction quantityMultiplier ((1.2+0.8+1.0+0.5+0.9+0.7)/6 = 0.85)
 *  ≈ 93.5 → 94. */
export const CONTRACT_OUTLET_TYPICAL_QTY = 94;

export interface SimWorld {
  players: SimPlayer[];
  /** shared deposit accumulators: key -> { acc, atMs } */
  extraction: Map<string, { acc: number; atMs: number }>;
  active30d: number;
  monthMs: number;
  opts: SimWorldOpts;
  /** Wave M5 (§3.2 O2 / §6 "price-campaign duel"): optional world spot
   *  snapshot. Absent = base prices everywhere (the pre-M5 default). A
   *  scenario can pin a resource at the anti-cornering band floor
   *  (base × 0.3) to model a fully-pressed price campaign — mining_output
   *  cash revenue AND leftover-inventory sales both read it, exactly like
   *  the live engine reads state.marketSnapshot. */
  spotSnapshot?: MarketSnapshot | null;
}

export function newWorld(
  players: SimPlayer[],
  active30d = 0,
  spotSnapshot: MarketSnapshot | null = null,
  opts: SimWorldOpts = {},
): SimWorld {
  return { players, extraction: new Map(), active30d, monthMs: GAME_MONTH_MS, spotSnapshot, opts };
}

export function newPlayer(
  name: string,
  money: number,
  plan: SimPlayer['plan'],
  opts: Partial<Pick<SimPlayer, 'maxBuildsPerMonth' | 'buysInputs' | 'sellsLeftovers' | 'craftPlan' | 'headcount' | 'trainingLevel'>> = {},
): SimPlayer {
  return {
    name, money, totalEarned: 0, totalSpent: 0,
    buildings: [], resources: {}, efficiency: {},
    plan, maxBuildsPerMonth: opts.maxBuildsPerMonth ?? 2,
    buysInputs: opts.buysInputs ?? true,
    sellsLeftovers: opts.sellsLeftovers ?? true,
    craftPlan: opts.craftPlan,
    headcount: opts.headcount,
    trainingLevel: opts.trainingLevel,
    history: [],
  };
}

/** Count same-definition buildings at a location (engine cost-scaling rule). */
function countAtLocation(p: SimPlayer, definitionId: string, locationId: string): number {
  return p.buildings.filter(b => b.definitionId === definitionId && b.locationId === locationId).length;
}

/** M1/F4: mirrors frontier.ts's computeBookNetWorth — cash + depreciated
 *  building book (all sim buildings are `isComplete: true`) + inventory at
 *  base price. The sim never builds ships, so ship book is always 0. */
export function bookNetWorth(p: SimPlayer): number {
  let buildingBook = 0;
  for (const b of p.buildings) {
    const def = BUILDING_MAP.get(b.definitionId);
    if (def) buildingBook += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
  }
  let inventoryValue = 0;
  for (const [res, qty] of Object.entries(p.resources)) {
    const price = RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0;
    inventoryValue += qty * price;
  }
  return Math.round(p.money + buildingBook + inventoryValue);
}

/** Profile summary in demand-pools' shape: buildings + one service instance
 *  per (building × enabledService) — mirrors the engine's auto-activation. */
export function toActivitySummary(p: SimPlayer): ProfileActivitySummary {
  const services: { definitionId: string; locationId: string }[] = [];
  for (const b of p.buildings) {
    const def = BUILDING_MAP.get(b.definitionId);
    if (!def) continue;
    for (const svcId of def.enabledServices) {
      services.push({ definitionId: svcId, locationId: b.locationId });
    }
  }
  return {
    id: p.name,
    buildings: p.buildings.map(b => ({ definitionId: b.definitionId, locationId: b.locationId, isComplete: true })),
    services,
    ships: [],
  };
}

/** Season-neutral pool multipliers for the whole world, via the server
 *  cron's real pure core. Returns key -> multiplier. */
export function computeWorldPoolMults(world: SimWorld): Record<string, number> {
  const aggregates = computePoolAggregates(world.players.map(toActivitySummary), world.active30d);
  const out: Record<string, number> = {};
  aggregates.forEach((agg, key) => {
    out[key] = computePoolMultiplier(agg.dNpc + agg.dDerived, agg.cSupply);
  });
  return out;
}

/** One world month. Order: purchases → pools (post-purchase fleet) →
 *  consumption (procure + process, REAL engine) → service revenue & costs →
 *  mining (shared extraction pressure) → sinks → bookkeeping. */
export function stepMonth(world: SimWorld, month: number): void {
  const nowMs = month * world.monthMs;

  // ── 0. Balance Pass 3 (PvP) shared-world state ────────────────────────
  // 0a. Dynamic spot: lazily seed the snapshot at base prices (asOf 0 —
  //     deterministic; getSpotPrice never staleness-checks a MarketSnapshot).
  if (world.opts.dynamicSpot && !world.spotSnapshot) {
    const prices: Record<string, number> = {};
    for (const r of RESOURCES) prices[r.id] = r.baseMarketPrice;
    world.spotSnapshot = { prices, asOf: 0 };
  }
  // 0b. Shared NPC absorption budget (contendedNpcCaps): ONE monthly budget
  //     per resource for the whole world, consumed first-come in player
  //     array order — the order book's price-time FIFO, not a fair split.
  const npcBudget: Map<string, number> | null =
    world.opts.npcSaleCaps && world.opts.contendedNpcCaps ? new Map() : null;
  const takeNpcBudget = (res: string, want: number): number => {
    if (!npcBudget) return want; // per-player cap handled at the call site
    const remaining = npcBudget.has(res)
      ? (npcBudget.get(res) as number)
      : npcAbsorptionPerMonth(res, world.monthMs);
    const granted = Math.max(0, Math.min(want, remaining));
    npcBudget.set(res, remaining - granted);
    return granted;
  };
  // 0c. Labor market: aggregate every player's headcount + crew quarters
  //     through the REAL weekly-cron core (labor-market.ts) — one shared
  //     wage index per crew type for the whole world this month.
  let wageIndexByType: Map<WorkerType, number> | null = null;
  if (world.opts.laborMarket) {
    const summaries: LaborActivitySummary[] = world.players.map(p => ({
      id: p.name,
      headcount: p.headcount || {},
      trainingLevel: p.trainingLevel,
      crewQuarters: sumCrewQuarters(p.buildings),
    }));
    const aggregates = computeLaborAggregates(summaries);
    wageIndexByType = new Map();
    aggregates.forEach((agg, type) => wageIndexByType!.set(type, agg.index));
  }
  // Combined physical flows for the dynamic-spot update (0a) — filled in
  // during the per-player loop, applied at month end (§7).
  const combinedMined: Record<string, number> = {};
  const combinedSold: Record<string, number> = {};

  // ── 1. Purchases ──────────────────────────────────────────────────────
  for (const p of world.players) {
    const flows = emptyFlows();
    (p as SimPlayer & { _flows?: ResourceFlows })._flows = flows;
    const wants = p.plan(p, month).slice(0, p.maxBuildsPerMonth);
    let capex = 0;
    for (const want of wants) {
      const def = BUILDING_MAP.get(want.definitionId);
      if (!def) continue;
      const cost = scaledBuildingCost(def.baseCost, countAtLocation(p, want.definitionId, want.locationId));
      if (p.money < cost) break;
      p.money -= cost;
      p.totalSpent += cost;
      capex += cost;
      p.buildings.push(makeBuilding(want.definitionId, want.locationId));
      // Balance Pass 1 (opt-in): settle the build's resourceCost the way
      // command-queue.ts does — draw stock first, buy the shortfall.
      if (world.opts.constructionMaterials && def.resourceCost) {
        for (const [res, qty] of Object.entries(def.resourceCost)) {
          if (!qty || qty <= 0) continue;
          const fromStock = Math.min(p.resources[res] || 0, qty);
          const shortfall = qty - fromStock;
          if (fromStock > 0) p.resources[res] = (p.resources[res] || 0) - fromStock;
          if (shortfall > 0) {
            const price = (RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0) * INPUT_BUY_MULT;
            const matCost = shortfall * price;
            p.money -= matCost;
            p.totalSpent += matCost;
            capex += matCost;
            addFlow(flows.bought, res, shortfall);
          }
          addFlow(flows.construction, res, qty);
        }
      }
    }
    (p as SimPlayer & { _capex?: number })._capex = capex;
  }

  // ── 2. Shared demand pools (the E4 server cron's pure core) ───────────
  const poolMults = computeWorldPoolMults(world);

  // ── 3-6. Per-player economics ─────────────────────────────────────────
  for (const p of world.players) {
    // 3. Consumption (REAL E3 engine). Market policy: buy shortfall at
    //    spot × INPUT_BUY_MULT first, then let the engine draw it.
    let inputCost = 0;
    const need: Record<string, number> = {};
    for (const b of p.buildings) {
      const consumes = BUILDING_MAP.get(b.definitionId)?.consumesPerMonth;
      if (!consumes) continue;
      for (const [res, amt] of Object.entries(consumes)) {
        need[res] = (need[res] || 0) + amt;
      }
    }
    const flows = (p as SimPlayer & { _flows?: ResourceFlows })._flows || emptyFlows();
    if (p.buysInputs) {
      for (const [res, amt] of Object.entries(need)) {
        const shortfall = Math.max(0, amt - (p.resources[res] || 0));
        if (shortfall > 0) {
          const price = RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0;
          const cost = shortfall * price * INPUT_BUY_MULT;
          inputCost += cost;
          p.money -= cost;
          p.totalSpent += cost;
          p.resources[res] = (p.resources[res] || 0) + shortfall;
          addFlow(flows.bought, res, shortfall);
        }
      }
    }
    const pseudoState = {
      buildings: p.buildings,
      resources: p.resources,
      locationInventories: {},
      logisticsUnlocked: false, // draw everything from the global pool
      completedResearch: [] as string[],
      // storageDecayStartMonth −9999 ⇒ the storage-integrity ramp
      // (consumption.ts, Balance Pass 1) is at FULL rate — the sim measures
      // steady-state behavior, not the 36-real-hour migration grace.
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE, lastProcessedMonth: month - 1, phaseInStartMonth: null, storageDecayStartMonth: -9999 },
      eventLog: [] as unknown[],
      gameDate: { year: 2026 + Math.floor(month / 12), month: (month % 12) + 1 },
    } as unknown as GameState;
    const consResult = processConsumptionForMonth(pseudoState, month);
    p.resources = { ...(consResult.state.resources || {}) };
    p.efficiency = { ...(consResult.state.consumptionState?.efficiency || {}) };
    for (const [res, q] of Object.entries(consResult.storageLosses || {})) {
      addFlow(flows.decayed, res, q);
    }
    // Balance Pass 1: reconstruct the engine's per-resource recipe flows from
    // the efficiency it reported. In the sim, phase-in = 1 and research
    // consumption-reduction = 1, so:
    //   supplied  = (eff − FLOOR) / (1 − FLOOR)
    //   consumed_i = consumesPerMonth_i × supplied
    //   produced_o = producesPerMonth_o × eff
    // — exactly processConsumptionForMonth's math inverted (eff is rounded
    // to 3dp by the engine; flow error ≤0.1%, fine for reporting).
    for (const b of p.buildings) {
      const bDef = BUILDING_MAP.get(b.definitionId);
      if (!bDef || (!bDef.consumesPerMonth && !bDef.producesPerMonth)) continue;
      const eff = p.efficiency[b.instanceId] ?? 1;
      const supplied = Math.max(0, Math.min(1,
        (eff - CONSUMPTION_EFFICIENCY_FLOOR) / (1 - CONSUMPTION_EFFICIENCY_FLOOR)));
      if (bDef.consumesPerMonth) {
        for (const [res, amt] of Object.entries(bDef.consumesPerMonth)) {
          addFlow(flows.consumed, res, amt * supplied);
        }
      }
      if (bDef.producesPerMonth) {
        for (const [res, amt] of Object.entries(bDef.producesPerMonth)) {
          addFlow(flows.produced, res, amt * eff);
        }
      }
    }

    // 4. Service revenue & operating costs (engine §1 structural stack:
    //    saturation × pool × power × supplyEfficiency; private multipliers 1.0)
    // M3/F3 (docs/MEANINGFUL_2026-08.md §M3): mining_output services no
    // longer add flat `sDef.revenuePerMonth` here — §5 below prices their
    // ACTUAL extracted units at spot (mining-pricing.ts), matching
    // game-engine.ts §1's substitution. `eff` (consumption efficiency) is
    // folded into §5's mined-unit figure instead of multiplied here, so it
    // isn't double-applied.
    const power = getPowerByLocation(p.buildings);
    const saturationCounts = new Map<string, number>();
    let revenue = 0, operating = 0, maintenance = 0;
    const effVals: number[] = [];
    for (const b of p.buildings) {
      const bDef = BUILDING_MAP.get(b.definitionId);
      if (!bDef) continue;
      maintenance += bDef.maintenanceCostPerMonth;
      const eff = p.efficiency[b.instanceId] ?? 1;
      effVals.push(eff);
      const powerRatio = power[b.locationId] ? power[b.locationId].ratio : 1;
      // station presence bonus (engine: +15%/station at location, cap +50%)
      const stationBonus = Math.min(0.5, p.buildings.filter(o =>
        o.locationId === b.locationId && BUILDING_MAP.get(o.definitionId)?.category === 'space_station').length * 0.15);
      for (const svcId of bDef.enabledServices) {
        const sDef = SERVICE_MAP.get(svcId);
        if (!sDef) continue;
        const bucketKey = `${svcId}@${b.locationId}`;
        const pos = saturationCounts.get(bucketKey) || 0;
        saturationCounts.set(bucketKey, pos + 1);
        operating += sDef.operatingCostPerMonth;
        if (sDef.type === 'mining_output') continue; // priced in §5 below (fabrication_output byproduct producers stay on this flat/pool path)
        const cat = getServiceCategory(svcId);
        const poolMult = cat ? (poolMults[demandPoolKey(b.locationId, cat)] ?? 1) : 1;
        revenue += sDef.revenuePerMonth
          * serviceSaturationMultiplier(pos)
          * poolMult
          * powerRatio
          * (1 + stationBonus)
          * eff;
      }
    }

    // 5. Mining (shared extraction pressure — E5 server accumulator, real
    //    math) — physical units credited to inventory exactly as before.
    //    M3/F3: the SAME units now also price cash revenue directly
    //    (`revenue`, via mining-pricing.ts's price-linked formula, saturation-
    //    discounted like any other service) instead of the old flat rate;
    //    `resourceSales` below is the UNRELATED, still-existing secondary
    //    stream — a player manually selling genuinely leftover inventory.
    const saturationCounts2 = new Map<string, number>();
    for (const b of p.buildings) {
      const bDef = BUILDING_MAP.get(b.definitionId);
      if (!bDef) continue;
      const eff = p.efficiency[b.instanceId] ?? 1;
      for (const svcId of bDef.enabledServices) {
        const production = MINING_PRODUCTION[svcId];
        if (!production) continue;
        const isMiningOutput = SERVICE_MAP.get(svcId)?.type === 'mining_output';
        const bucketKey = `${svcId}@${b.locationId}`;
        const pos = saturationCounts2.get(bucketKey) || 0;
        saturationCounts2.set(bucketKey, pos + 1);
        const saturationMult = serviceSaturationMultiplier(pos);
        const unitsPerResource: Record<string, number> = {};
        for (const { resource, amountPerMonth } of production) {
          const key = extractionKey(b.locationId, resource);
          const prev = world.extraction.get(key) || { acc: 0, atMs: nowMs - world.monthMs };
          const pressure = computeExtractionPressure(
            // read with decay-to-now applied (server read path)
            prev.acc * Math.pow(0.9, Math.max(0, nowMs - prev.atMs) / 86_400_000),
          );
          const mined = amountPerMonth * pressure * eff;
          const updated = applyExtractionEvent(prev.acc, prev.atMs, mined, resource, nowMs);
          world.extraction.set(key, { acc: updated.accumulated, atMs: updated.updatedAtMs });
          p.resources[resource] = (p.resources[resource] || 0) + mined;
          unitsPerResource[resource] = mined;
          addFlow(flows.mined, resource, mined);
          if (world.opts.dynamicSpot) combinedMined[resource] = (combinedMined[resource] || 0) + mined;
        }
        // Only true mining_output services price-link cash revenue here —
        // fabrication_output byproduct producers (e.g. svc_fabrication_lunar)
        // already earned their flat/pool-priced revenue in §4 above; their
        // physical byproduct units are still credited to inventory (loop
        // above), unaffected by M3.
        if (isMiningOutput) {
          revenue += priceLinkedMiningRevenue(svcId, unitsPerResource, world.spotSnapshot) * saturationMult;
        }
      }
    }
    // 5b. Crafting queue (Balance Pass 2) — the player sink the Pass-1 audit
    //     couldn't see. Mirrors game-engine.ts's single `activeRefining`
    //     slot run continuously (the same 24/7 assumption npcAbsorptionPerMonth
    //     already makes): the month's budget is monthMs real-seconds; each run
    //     of a recipe costs timeSeconds ÷ getCraftingSpeedMultiplier (the
    //     fab-count bonus, real math) and inputs are drawn from EXISTING
    //     stock only, never market-bought and never below next month's
    //     recipe keep-back (`need`) — crafting drains surplus, it doesn't
    //     manufacture demand. requiredBuilding gates each recipe against the
    //     player's completed fleet.
    if (p.craftPlan && p.craftPlan.length > 0) {
      const speedMult = getCraftingSpeedMultiplier(p.buildings);
      let secondsLeft = world.monthMs / 1000;
      const builtIds = new Set(p.buildings.map(b => b.definitionId));
      for (const recipeId of p.craftPlan) {
        const recipe = CHAIN_MAP.get(recipeId);
        if (!recipe || !builtIds.has(recipe.requiredBuilding)) continue;
        const runSeconds = recipe.timeSeconds / speedMult;
        if (runSeconds <= 0) continue;
        const runsByTime = Math.floor(secondsLeft / runSeconds);
        if (runsByTime <= 0) continue;
        let runsByInputs = Infinity;
        for (const [res, qty] of Object.entries(recipe.inputs)) {
          const available = Math.max(0, (p.resources[res] || 0) - (need[res] || 0));
          runsByInputs = Math.min(runsByInputs, Math.floor(available / qty));
        }
        // Informed-player guard: never craft an output past its storage cap
        // (consumption.ts storageCapacityUnits) — above it, output decays
        // 15%/game-month, so "craft into decay" destroys value and the new
        // storage-visibility UI tells the player exactly that. Without this
        // guard the crafting sink is overstated by decay-churn.
        const outCap = storageCapacityUnits(p.buildings as unknown as GameState['buildings'], recipe.outputId);
        const outRoom = Math.max(0, outCap - (p.resources[recipe.outputId] || 0));
        const runsByOutputCap = Math.floor(outRoom / recipe.outputQuantity);
        const runs = Math.min(runsByTime, runsByOutputCap, Number.isFinite(runsByInputs) ? runsByInputs : 0);
        if (runs <= 0) continue;
        secondsLeft -= runs * runSeconds;
        for (const [res, qty] of Object.entries(recipe.inputs)) {
          const drawn = qty * runs;
          p.resources[res] = Math.max(0, (p.resources[res] || 0) - drawn);
          addFlow(flows.craftedIn, res, drawn);
        }
        const out = recipe.outputQuantity * runs;
        p.resources[recipe.outputId] = (p.resources[recipe.outputId] || 0) + out;
        addFlow(flows.craftedOut, recipe.outputId, out);
      }
    }

    let resourceSales = 0;
    // Sell every resource not needed as next month's input, at spot −3%.
    // Balance Pass 1: a hoarder (sellsLeftovers=false) skips this entirely;
    // npcSaleCaps mode caps each resource's monthly sale at what the NPC
    // maker's standing orders can absorb (per-real-day cap × month length) —
    // the unabsorbed remainder stays in inventory.
    if (p.sellsLeftovers) {
      for (const [res, qty] of Object.entries(p.resources)) {
        const keep = need[res] || 0;
        let sell = Math.max(0, qty - keep);
        if (sell > 0 && world.opts.npcSaleCaps) {
          // Balance Pass 3: with contendedNpcCaps the absorbable amount is
          // whatever is LEFT of the world's shared monthly budget (consumed
          // first-come in player order — order-book FIFO); otherwise the
          // legacy per-player full cap.
          const absorbable = npcBudget
            ? takeNpcBudget(res, sell)
            : npcAbsorptionPerMonth(res, world.monthMs);
          const unabsorbed = Math.max(0, sell - absorbable);
          if (unabsorbed > 0) addFlow(flows.unsold, res, unabsorbed);
          sell = Math.min(sell, absorbable);
        }
        if (sell > 0) {
          const base = RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0;
          // M5: leftover sales read the world spot snapshot when one is set
          // (price-campaign scenarios) — base price otherwise, as before.
          const price = world.spotSnapshot?.prices?.[res] ?? base;
          resourceSales += sell * price * OUTPUT_SELL_MULT;
          p.resources[res] = qty - sell;
          addFlow(flows.sold, res, sell);
          if (world.opts.dynamicSpot) combinedSold[res] = (combinedSold[res] || 0) + sell;
        }
      }
    }

    // 5c. Delivery-contract outlet (Balance Pass 2, opt-in) — after the
    //     NPC-capped dump, the player may still move a bounded contract
    //     budget's worth of surplus at spot with no fee (the real game's
    //     no-fee delivery channel, capped per rolling 24h). Highest-value
    //     surplus first — the honest "which contracts would a specialist
    //     accept" heuristic.
    let contractSales = 0;
    if (p.sellsLeftovers && world.opts.contractOutlet) {
      const contractsPerMonth = world.opts.contractOutlet.capPerDay * (world.monthMs / DAY_MS);
      let unitsBudget = contractsPerMonth * CONTRACT_OUTLET_TYPICAL_QTY;
      const surplus = Object.entries(p.resources)
        .map(([res, qty]) => {
          const avail = Math.max(0, qty - (need[res] || 0));
          const price = world.spotSnapshot?.prices?.[res]
            ?? (RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0);
          return { res, avail, price };
        })
        .filter(e => e.avail > 0 && e.price > 0)
        .sort((a, b) => b.price - a.price);
      for (const e of surplus) {
        if (unitsBudget <= 0) break;
        const sell = Math.min(e.avail, unitsBudget);
        unitsBudget -= sell;
        contractSales += sell * e.price; // spot ×1.0 — the no-fee channel
        p.resources[e.res] = (p.resources[e.res] || 0) - sell;
        addFlow(flows.contractSold, e.res, sell);
        // These units found a real buyer after all — they are no longer
        // "unsold" for this month's telemetry.
        if (flows.unsold[e.res]) {
          flows.unsold[e.res] = Math.max(0, flows.unsold[e.res] - sell);
          if (flows.unsold[e.res] === 0) delete flows.unsold[e.res];
        }
      }
    }

    // 6. Scaling sinks (engine §1b/§1c formulas verbatim)
    // Balance Pass 3 (laborMarket): payroll at the shared wage index —
    // count × base salary × index(type), exactly labor-market.ts's
    // getMonthlyPayrollWithWageIndex math against this month's world-wide
    // aggregate index.
    let payroll = 0;
    if (wageIndexByType && p.headcount) {
      for (const wDef of WORKER_TYPES) {
        const n = p.headcount[wDef.type] || 0;
        if (n <= 0) continue;
        payroll += n * wDef.salary * (wageIndexByType.get(wDef.type) ?? 1);
      }
      payroll = Math.round(payroll);
    }
    const overhead = corporateOverheadMonthly(p.buildings.length);
    // M1/F4: exec comp keys off BOOK net worth now (asset-aware), matching
    // game-engine.ts's §1c. bookNetWorth reads p.money BEFORE this month's
    // grossIn/grossOut settle below — same "up-to-date running cash, current
    // holdings" timing the real tick uses.
    const netWorthEst = bookNetWorth(p);
    const execComp = executiveCompensationMonthly(netWorthEst);

    const grossIn = revenue + resourceSales + contractSales;
    const grossOut = operating + maintenance + overhead + execComp + payroll;
    p.money += grossIn - grossOut;
    p.totalEarned += grossIn;
    p.totalSpent += grossOut;

    const effAvg = effVals.length ? effVals.reduce((a, b) => a + b, 0) / effVals.length : 1;
    // Balance Pass 1: end-of-month stockpile snapshot + bucket totals.
    const stock: Record<string, number> = {};
    const stockByBucket: Record<ResourceBucket, number> = { raw: 0, refined: 0, component: 0, product: 0 };
    let stockValue = 0;
    for (const [res, qty] of Object.entries(p.resources)) {
      if (!qty || qty <= 0) continue;
      stock[res] = Math.round(qty * 100) / 100;
      stockByBucket[resourceBucket(res)] += qty;
      stockValue += qty * (RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0);
    }
    const row: MonthRow = {
      month,
      money: p.money,
      netWorthEst: bookNetWorth(p), // M1/F4: asset-aware book net worth
      revenue,
      operating,
      maintenance,
      overhead,
      execComp,
      inputCost,
      resourceSales,
      contractSales,
      net: grossIn - grossOut - inputCost,
      buildingCount: p.buildings.length,
      capex: (p as SimPlayer & { _capex?: number })._capex || 0,
      poolMults,
      avgEfficiency: Math.round(effAvg * 1000) / 1000,
      flows,
      stock,
      stockByBucket,
      stockValue: Math.round(stockValue),
    };
    // Balance Pass 3: payroll only stamped when the labor market is modeled —
    // legacy rows keep their exact shape.
    if (world.opts.laborMarket) row.payroll = payroll;
    p.history.push(row);
  }

  // ── 7. Dynamic spot update (Balance Pass 3, opt-in) ───────────────────
  // Month-end: combined MINED units press the shared spot down through the
  // real calculatePriceAfterMining; combined SOLD units press it down as
  // sell-side trades (calculatePriceAfterTrade); then the mean-reversion
  // cron's calculateIdleDecay heals the gap once per real hour of the
  // game-month — except for resources under a declared price campaign
  // (campaignSlugs), which mean-revert skips while active
  // (price-campaigns.ts mechanic #1). All functions are the live engine's.
  if (world.opts.dynamicSpot && world.spotSnapshot) {
    const prices = { ...world.spotSnapshot.prices };
    const campaigned = new Set(world.opts.campaignSlugs || []);
    const hoursPerMonth = Math.max(1, Math.round(world.monthMs / 3_600_000));
    const touched = new Set<string>([...Object.keys(combinedMined), ...Object.keys(combinedSold), ...Object.keys(prices)]);
    for (const res of Array.from(touched)) {
      const def = RESOURCE_MAP.get(res as ResourceId);
      if (!def) continue;
      const base = def.baseMarketPrice;
      const vol = (def as { volatility?: number }).volatility ?? 0.05;
      const minP = (def as { minPrice?: number }).minPrice ?? Math.max(1, Math.round(base * 0.1));
      const maxP = (def as { maxPrice?: number }).maxPrice ?? base * 10;
      let price = prices[res] ?? base;
      const minedQty = combinedMined[res] || 0;
      if (minedQty > 0) price = calculatePriceAfterMining(price, base, minedQty, vol, minP, maxP);
      const soldQty = combinedSold[res] || 0;
      if (soldQty > 0) price = calculatePriceAfterTrade(price, base, soldQty, false, vol, minP, maxP);
      if (!campaigned.has(res)) {
        for (let h = 0; h < hoursPerMonth; h++) {
          price = calculateIdleDecay(price, base, 60, minP, maxP);
        }
      }
      prices[res] = price;
    }
    world.spotSnapshot = { ...world.spotSnapshot, prices };
  }
}

// ─── Balance Pass 1: sink-coverage analytics ────────────────────────────────

export interface SinkCoverageRow {
  resource: string;
  generated: number; // mined + produced + craftedOut (units/mo)
  drained: number;   // consumed + construction + sold + contractSold + craftedIn + decayed (units/mo)
  ratio: number;     // drained / generated (Infinity when generated = 0)
  stock: number;     // end-of-month stock (units)
}

/** Per-resource sink-coverage at one month of a player's history: monthly
 *  drains ÷ monthly generation. Ratios far below 1 = unbounded pileup.
 *  Balance Pass 2: crafting-queue inputs (craftedIn) and contract-outlet
 *  sales (contractSold) count as drains; crafting outputs (craftedOut)
 *  count as generation. */
export function sinkCoverage(row: MonthRow): SinkCoverageRow[] {
  const f = row.flows;
  if (!f) return [];
  const resourceSet = new Set<string>([
    ...Object.keys(f.mined), ...Object.keys(f.produced),
    ...Object.keys(f.consumed), ...Object.keys(f.construction), ...Object.keys(f.sold),
    ...Object.keys(f.decayed),
    ...Object.keys(f.craftedIn || {}), ...Object.keys(f.craftedOut || {}),
    ...Object.keys(f.contractSold || {}),
  ]);
  const out: SinkCoverageRow[] = [];
  for (const res of Array.from(resourceSet)) {
    const generated = (f.mined[res] || 0) + (f.produced[res] || 0) + (f.craftedOut?.[res] || 0);
    const drained = (f.consumed[res] || 0) + (f.construction[res] || 0) + (f.sold[res] || 0)
      + (f.decayed[res] || 0) + (f.craftedIn?.[res] || 0) + (f.contractSold?.[res] || 0);
    out.push({
      resource: res,
      generated: Math.round(generated * 100) / 100,
      drained: Math.round(drained * 100) / 100,
      ratio: generated > 0 ? Math.round((drained / generated) * 100) / 100 : Infinity,
      stock: Math.round((row.stock?.[res] || 0) * 10) / 10,
    });
  }
  out.sort((a, b) => (a.ratio - b.ratio) || (b.generated - a.generated));
  return out;
}

/** Extraction-pressure readout per (location:resource) key at "now" for a
 *  finished world — how hard the deposit brake is biting at the end. */
export function extractionPressureReport(world: SimWorld, months: number): { key: string; pressure: number }[] {
  const nowMs = months * world.monthMs;
  const out: { key: string; pressure: number }[] = [];
  world.extraction.forEach((v, key) => {
    const acc = v.acc * Math.pow(0.9, Math.max(0, nowMs - v.atMs) / DAY_MS);
    out.push({ key, pressure: Math.round(computeExtractionPressure(acc) * 1000) / 1000 });
  });
  out.sort((a, b) => a.pressure - b.pressure);
  return out;
}

export function runWorld(world: SimWorld, months: number): void {
  for (let m = 0; m < months; m++) stepMonth(world, m);
}

// ─── Marginal-ROI probe (static steady-state analysis) ──────────────────────
// "Does the Nth building's marginal ROI actually fall toward/below zero at
// saturation?" — computes the steady monthly net of a SOLO fleet of N
// identical buildings (pool + saturation + power + inputs + overhead; exec
// comp excluded — it scales with wealth, not with the marginal building),
// then diffs N vs N-1.

export interface MarginalRow {
  n: number;
  unitCost: number;       // scaled cost of the Nth building
  poolMult: number;
  fleetNet: number;       // steady monthly net of the N-fleet
  marginalNet: number;    // fleetNet(N) − fleetNet(N−1)
  marginalROIpctPerMonth: number; // marginalNet / unitCost
  paybackMonths: number;  // unitCost / marginalNet (Infinity if ≤0)
}

/** Per-game-month deposit decay factor: 0.9^ (6h / 24h). */
const EXTRACTION_DECAY_PER_GAME_MONTH = Math.pow(0.9, GAME_MONTH_MS / 86_400_000);

/** Steady-state shared extraction pressure for a fleet's mining production at
 *  one location — fixed point of pressure → contribution → accumulator. */
export function steadyStatePressure(unitsPerMonthBySens: { units: number; sens: number }[]): number {
  let p = 1;
  for (let i = 0; i < 80; i++) {
    const c = unitsPerMonthBySens.reduce((a, e) => a + e.units * p * e.sens, 0);
    const acc = c / (1 - EXTRACTION_DECAY_PER_GAME_MONTH);
    p = computeExtractionPressure(acc);
  }
  return p;
}

export function marginalCurve(
  definitionId: string,
  locationId: string,
  maxN: number,
  opts: {
    powerPlanDefId?: string; powerPlanEvery?: number;
    /** private multiplier stack sensitivity (research/commanders/etc.), default 1.0 */
    revenueMult?: number;
  } = {},
): MarginalRow[] {
  const rows: MarginalRow[] = [];
  const revMult = opts.revenueMult ?? 1;
  let prevNet = 0;
  for (let n = 1; n <= maxN; n++) {
    const p = newPlayer('probe', 0, () => []);
    for (let i = 0; i < n; i++) p.buildings.push(makeBuilding(definitionId, locationId));
    // optional power support fleet (e.g. 1 solar farm per 2 datacenters)
    let powerCount = 0;
    if (opts.powerPlanDefId && opts.powerPlanEvery) {
      powerCount = Math.ceil(n / opts.powerPlanEvery);
      for (let i = 0; i < powerCount; i++) p.buildings.push(makeBuilding(opts.powerPlanDefId, locationId));
    }
    const world = newWorld([p]);
    const poolMults = computeWorldPoolMults(world);
    const power = getPowerByLocation(p.buildings);
    const saturationCounts = new Map<string, number>();
    let revenue = 0, operating = 0, maintenance = 0, inputCost = 0;
    // mining_output pricing here: M3/F3 (docs/MEANINGFUL_2026-08.md §M3)
    // price-links `mining_output` cash revenue instead of a flat rate — but
    // this function's `fleetNet` represents a STEADY (permanent-fleet-size)
    // monthly net for every OTHER system precisely because those systems
    // (pools, saturation curves, power) are memoryless equilibria with no
    // time dimension. Deposit extraction pressure is NOT memoryless — it's
    // an accumulator that decays toward its floor only after many months of
    // CONTINUOUS extraction (extraction-pressure.ts's 0.9^(6h/24h) per-
    // game-month decay), so "steady state" for pressure means "a very long
    // time from now", not "the instant this building completes". Since this
    // function is the M1 first-copy-ROI CI guard's engine (buildMenuFirst
    // CopySweep — "what does building this TODAY look like"), mining
    // revenue here is priced at NEUTRAL pressure (1.0, freshly-built
    // deposit) rather than the long-run steadyStatePressure fixed point —
    // the honest "day 1" reading. The real decay-over-months dynamic this
    // deliberately excludes is instead visible in sim-strategies.ts's 24-
    // game-month stepMonth tables, which run the REAL time-accumulating
    // extraction-pressure engine. `mining_output` gate (not "has a
    // MINING_PRODUCTION entry") matters: fabrication_output services like
    // svc_fabrication_lunar also produce small byproduct resources via
    // MINING_PRODUCTION but keep their ordinary flat/pool-priced revenue —
    // only true mining_output services get the F3 substitution.
    const miningInstances: { svcId: string; production: { resource: string; amountPerMonth: number }[]; powerRatio: number; saturationMult: number }[] = [];
    for (const b of p.buildings) {
      const bDef = BUILDING_MAP.get(b.definitionId)!;
      maintenance += bDef.maintenanceCostPerMonth;
      if (bDef.consumesPerMonth) {
        for (const [res, amt] of Object.entries(bDef.consumesPerMonth)) {
          inputCost += amt * (RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0) * INPUT_BUY_MULT;
        }
      }
      const powerRatio = power[b.locationId] ? power[b.locationId].ratio : 1;
      for (const svcId of bDef.enabledServices) {
        const sDef = SERVICE_MAP.get(svcId);
        if (!sDef) continue;
        const bucketKey = `${svcId}@${b.locationId}`;
        const pos = saturationCounts.get(bucketKey) || 0;
        saturationCounts.set(bucketKey, pos + 1);
        operating += sDef.operatingCostPerMonth;
        if (sDef.type === 'mining_output') {
          miningInstances.push({
            svcId, production: MINING_PRODUCTION[svcId] || [], powerRatio,
            saturationMult: serviceSaturationMultiplier(pos),
          });
          continue;
        }
        const cat = getServiceCategory(svcId);
        const poolMult = cat ? (poolMults[demandPoolKey(b.locationId, cat)] ?? 1) : 1;
        revenue += sDef.revenuePerMonth * revMult * serviceSaturationMultiplier(pos) * poolMult * powerRatio;
      }
    }
    let miningSales = 0;
    for (const inst of miningInstances) {
      const unitsPerResource: Record<string, number> = {};
      for (const { resource, amountPerMonth } of inst.production) {
        unitsPerResource[resource] = amountPerMonth * inst.powerRatio; // neutral pressure=1 (see note above)
      }
      miningSales += priceLinkedMiningRevenue(inst.svcId, unitsPerResource, undefined) * revMult * inst.saturationMult;
    }
    const overhead = corporateOverheadMonthly(p.buildings.length);
    const fleetNet = revenue + miningSales - operating - maintenance - overhead - inputCost;
    const unitCost = scaledBuildingCost(BUILDING_MAP.get(definitionId)!.baseCost, n - 1);
    const marginalNet = fleetNet - prevNet;
    const catForDisplay = (() => {
      const svcId = BUILDING_MAP.get(definitionId)!.enabledServices[0];
      const cat = svcId ? getServiceCategory(svcId) : null;
      return cat ? (poolMults[demandPoolKey(locationId, cat)] ?? 1) : 1;
    })();
    rows.push({
      n, unitCost,
      poolMult: Math.round(catForDisplay * 1000) / 1000,
      fleetNet: Math.round(fleetNet),
      marginalNet: Math.round(marginalNet),
      marginalROIpctPerMonth: unitCost > 0 ? Math.round((marginalNet / unitCost) * 10000) / 100 : 0,
      paybackMonths: marginalNet > 0 ? Math.round(unitCost / marginalNet) : Infinity,
    });
    prevNet = fleetNet;
  }
  return rows;
}

// ─── Build-menu first-copy sweep (§2.1 dominance audit / M1 acceptance) ─────
// The location -> cheapest-generator pairing every "first copy at this
// location" probe needs when the building has a power requirement. Shared by
// scripts/sim-strategies.ts (the printed table) and the M1 regression test
// (tier-ladder-first-copy-roi.test.ts) so the two never drift apart.
export const LOCATION_POWER_PLAN: Partial<Record<string, { powerPlanDefId: string; powerPlanEvery: number }>> = {
  leo: { powerPlanDefId: 'solar_farm_orbital', powerPlanEvery: 1 },
  lunar_surface: { powerPlanDefId: 'solar_farm_lunar', powerPlanEvery: 1 },
  mars_surface: { powerPlanDefId: 'solar_farm_mars', powerPlanEvery: 1 },
  mars_orbit: { powerPlanDefId: 'nuclear_reactor_mars_orbit', powerPlanEvery: 1 },
  asteroid_belt: { powerPlanDefId: 'nuclear_reactor_asteroid', powerPlanEvery: 1 },
  jupiter_system: { powerPlanDefId: 'nuclear_reactor_jupiter', powerPlanEvery: 1 },
  saturn_system: { powerPlanDefId: 'nuclear_reactor_saturn', powerPlanEvery: 1 },
  lunar_orbit: { powerPlanDefId: 'solar_array_lunar_orbit', powerPlanEvery: 1 },
};

/** First-copy (N=1) marginal-ROI row for every revenue building at its
 *  required location, solo/base-multipliers — the build-menu dominance
 *  sweep. Buildings with no enabledServices or no requiredLocation are
 *  skipped (nothing to measure). Power-hungry buildings are paired with the
 *  cheapest same-location generator per LOCATION_POWER_PLAN; buildings with
 *  no requirement (or none available, e.g. RTG-powered outer-system rigs)
 *  run unpowered. */
export function buildMenuFirstCopySweep(): { def: { id: string; tier: number; requiredLocation?: string; baseCost: number }; loc: string; row: MarginalRow }[] {
  const out: { def: { id: string; tier: number; requiredLocation?: string; baseCost: number }; loc: string; row: MarginalRow }[] = [];
  for (const def of BUILDINGS) {
    if (!def.enabledServices || def.enabledServices.length === 0) continue;
    const loc = def.requiredLocation;
    if (!loc) continue;
    const powerOpts = def.powerRequired ? (LOCATION_POWER_PLAN[loc] || {}) : {};
    try {
      const [r1] = marginalCurve(def.id, loc, 1, powerOpts);
      out.push({ def, loc, row: r1 });
    } catch { /* skip defs that fail to probe */ }
  }
  return out;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

export function fm(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function mdTable(headers: string[], rows: (string | number)[][]): string {
  const line = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map(line)].join('\n');
}
