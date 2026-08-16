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

import { BUILDING_MAP, getPowerByLocation } from '../src/lib/game/buildings';
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
import { processConsumptionForMonth, DEFAULT_CONSUMPTION_STATE } from '../src/lib/game/consumption';
import {
  applyExtractionEvent,
  computeExtractionPressure,
  extractionKey,
  getExtractionSensitivity,
} from '../src/lib/game/extraction-pressure';
import type { GameState } from '../src/lib/game/types';

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
  history: MonthRow[];
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
  net: number;
  buildingCount: number;
  capex: number;
  poolMults: Record<string, number>;
  avgEfficiency: number;
}

export interface SimWorld {
  players: SimPlayer[];
  /** shared deposit accumulators: key -> { acc, atMs } */
  extraction: Map<string, { acc: number; atMs: number }>;
  active30d: number;
  monthMs: number;
}

export function newWorld(players: SimPlayer[], active30d = 0): SimWorld {
  return { players, extraction: new Map(), active30d, monthMs: GAME_MONTH_MS };
}

export function newPlayer(
  name: string,
  money: number,
  plan: SimPlayer['plan'],
  opts: Partial<Pick<SimPlayer, 'maxBuildsPerMonth' | 'buysInputs'>> = {},
): SimPlayer {
  return {
    name, money, totalEarned: 0, totalSpent: 0,
    buildings: [], resources: {}, efficiency: {},
    plan, maxBuildsPerMonth: opts.maxBuildsPerMonth ?? 2,
    buysInputs: opts.buysInputs ?? true,
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

  // ── 1. Purchases ──────────────────────────────────────────────────────
  for (const p of world.players) {
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
        }
      }
    }
    const pseudoState = {
      buildings: p.buildings,
      resources: p.resources,
      locationInventories: {},
      logisticsUnlocked: false, // draw everything from the global pool
      completedResearch: [] as string[],
      consumptionState: { ...DEFAULT_CONSUMPTION_STATE, lastProcessedMonth: month - 1, phaseInStartMonth: null },
      eventLog: [] as unknown[],
      gameDate: { year: 2026 + Math.floor(month / 12), month: (month % 12) + 1 },
    } as unknown as GameState;
    const consResult = processConsumptionForMonth(pseudoState, month);
    p.resources = { ...(consResult.state.resources || {}) };
    p.efficiency = { ...(consResult.state.consumptionState?.efficiency || {}) };

    // 4. Service revenue & operating costs (engine §1 structural stack:
    //    saturation × pool × power × supplyEfficiency; private multipliers 1.0)
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
        const cat = getServiceCategory(svcId);
        const poolMult = cat ? (poolMults[demandPoolKey(b.locationId, cat)] ?? 1) : 1;
        revenue += sDef.revenuePerMonth
          * serviceSaturationMultiplier(pos)
          * poolMult
          * powerRatio
          * (1 + stationBonus)
          * eff;
        operating += sDef.operatingCostPerMonth;
      }
    }

    // 5. Mining (shared extraction pressure — E5 server accumulator, real math)
    let resourceSales = 0;
    const saturationCounts2 = new Map<string, number>();
    for (const b of p.buildings) {
      const bDef = BUILDING_MAP.get(b.definitionId);
      if (!bDef) continue;
      const eff = p.efficiency[b.instanceId] ?? 1;
      for (const svcId of bDef.enabledServices) {
        const production = MINING_PRODUCTION[svcId];
        if (!production) continue;
        const bucketKey = `${svcId}@${b.locationId}`;
        const pos = saturationCounts2.get(bucketKey) || 0;
        saturationCounts2.set(bucketKey, pos + 1);
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
        }
      }
    }
    // Sell every resource not needed as next month's input, at spot −3%.
    for (const [res, qty] of Object.entries(p.resources)) {
      const keep = need[res] || 0;
      const sell = Math.max(0, qty - keep);
      if (sell > 0) {
        const price = RESOURCE_MAP.get(res as ResourceId)?.baseMarketPrice || 0;
        resourceSales += sell * price * OUTPUT_SELL_MULT;
        p.resources[res] = qty - sell;
      }
    }

    // 6. Scaling sinks (engine §1b/§1c formulas verbatim)
    const overhead = corporateOverheadMonthly(p.buildings.length);
    // M1/F4: exec comp keys off BOOK net worth now (asset-aware), matching
    // game-engine.ts's §1c. bookNetWorth reads p.money BEFORE this month's
    // grossIn/grossOut settle below — same "up-to-date running cash, current
    // holdings" timing the real tick uses.
    const netWorthEst = bookNetWorth(p);
    const execComp = executiveCompensationMonthly(netWorthEst);

    const grossIn = revenue + resourceSales;
    const grossOut = operating + maintenance + overhead + execComp;
    p.money += grossIn - grossOut;
    p.totalEarned += grossIn;
    p.totalSpent += grossOut;

    const effAvg = effVals.length ? effVals.reduce((a, b) => a + b, 0) / effVals.length : 1;
    p.history.push({
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
      net: grossIn - grossOut - inputCost,
      buildingCount: p.buildings.length,
      capex: (p as SimPlayer & { _capex?: number })._capex || 0,
      poolMults,
      avgEfficiency: Math.round(effAvg * 1000) / 1000,
    });
  }
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
    // mining: steady-state SHARED deposit pressure across the whole fleet
    const miningBySens: { units: number; sens: number; res: string; powerRatio: number }[] = [];
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
        const cat = getServiceCategory(svcId);
        const poolMult = cat ? (poolMults[demandPoolKey(b.locationId, cat)] ?? 1) : 1;
        revenue += sDef.revenuePerMonth * revMult * serviceSaturationMultiplier(pos) * poolMult * powerRatio;
        operating += sDef.operatingCostPerMonth;
        const production = MINING_PRODUCTION[svcId];
        if (production) {
          for (const { resource, amountPerMonth } of production) {
            miningBySens.push({
              units: amountPerMonth,
              sens: getExtractionSensitivity(resource),
              res: resource,
              powerRatio,
            });
          }
        }
      }
    }
    let miningSales = 0;
    if (miningBySens.length > 0) {
      const pressure = steadyStatePressure(miningBySens.map(e => ({ units: e.units * e.powerRatio, sens: e.sens })));
      for (const e of miningBySens) {
        miningSales += e.units * e.powerRatio * pressure * (RESOURCE_MAP.get(e.res as ResourceId)?.baseMarketPrice || 0) * OUTPUT_SELL_MULT;
      }
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
