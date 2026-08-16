// ─── Space Tycoon: Pool-Share Service Pricing (Economic PvP Wave E4) ─────────
// docs/ECONOMY_PVP_2026-08.md §2.1 + §E4. This file used to be the global
// log10 instance-count decay ("10,000 rival instances of a tier-1 service
// cost you just −24%" — audit §1b called it toothless). That decay is
// RETIRED. The file survives as the spec directs: the pool-share calculator.
//
// The split math (§2.1 "Payout"):
//   Each supplier's capacity C_i shares a finite market pool D.
//   Saturated (C > D):    rev_i = D × C_i / C  ⇒ per-$ rate = D / C
//                          — competitors literally take your customers; total
//                          extraction from a market never exceeds D no matter
//                          how much capacity is stacked (strictly sublinear,
//                          stronger than the old saturation curve).
//   Undersupplied (C ≤ D): rev_i = C_i × min(1.25, 1 + 0.5 × (D−C)/D)
//                          — scarcity premium: the first mover at an
//                          underserved location earns up to +25%.
//
// Because the saturated payout is proportional to capacity, the per-dollar
// rate D/C is the SAME for every supplier in the market — which is what lets
// the server deliver ONE bounded multiplier per (location, category) in the
// sync snapshot instead of per-player payouts. Bounds [0.35, 1.25]: the
// floor matches the old per-location saturation curve's floor, so no save's
// revenue falls off a cliff on migration.
//
// Away-catch-up parity: getServiceDemandMultiplier is THE single multiplier
// source for the live tick (game-engine.ts), away catch-up
// (away-operations.ts), and every P&L display (economy-report.ts,
// DashboardPanel, ResourceBar) — same state in, same multiplier out.

import type { GameState } from './types';
import { isInFrontier } from './frontier';
import { getCurrentSeasonNumber } from './seasonal-events';
// Meaningful Decisions Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5):
// a mothballed/reactivating/decommissioning building withdraws from the
// demand-pool economy entirely — no derived demand, no capacity claim
// ("a visible supply withdrawal rivals can see in the pool intel", per the
// spec). isBuildingOperational is the single shared predicate.
import { isBuildingOperational } from './mothball';
import {
  getServiceCategory,
  demandPoolKey,
  getNpcFloorBase,
  getNpcSupplyCapacity,
  getDemandPoolSeasonModifier,
  deriveActivityDemand,
  computeCapacityByMarket,
  getDemandPoolPhaseInFraction,
  DEMAND_POOL_STALE_MS,
  SERVICE_CATEGORIES,
  type ActivityService,
  type DemandPoolEntry,
  type DemandPoolRow,
  type DemandPoolSnapshot,
  type ServiceCategory,
} from './demand-pools';

// ─── Bounds (§2.1) ──────────────────────────────────────────────────────────

/** Hard floor — same as the per-location saturation curve's asymptote, so a
 *  fully-saturated market still pays 35% (migration safety, §E4 [BAL]). */
export const DEMAND_MULT_FLOOR = 0.35;

/** Scarcity premium cap — undersupplied markets pay up to +25%. */
export const DEMAND_PREMIUM_CAP = 1.25;

// ─── The pool-share calculator ──────────────────────────────────────────────

/**
 * Per-dollar revenue multiplier for a market with pool demand D and total
 * supplier capacity C (both $/month). See file header for the derivation.
 * D ≤ 0 (unauthored market) is neutral; C ≤ 0 (nobody supplies) pays the
 * full first-mover premium.
 */
export function computePoolMultiplier(D: number, C: number): number {
  if (!Number.isFinite(D) || D <= 0) return 1;
  if (!Number.isFinite(C) || C <= 0) return DEMAND_PREMIUM_CAP;
  if (C > D) return Math.max(DEMAND_MULT_FLOOR, D / C);
  return Math.min(DEMAND_PREMIUM_CAP, 1 + 0.5 * ((D - C) / D));
}

/** A supplier's capacity share of a market, 0..1. */
export function computeCapacityShare(supplierCapacity: number, totalCapacity: number): number {
  if (!Number.isFinite(totalCapacity) || totalCapacity <= 0) return 0;
  return Math.max(0, Math.min(1, supplierCapacity / totalCapacity));
}

/** Clamp a snapshot-delivered multiplier into the documented range — server
 *  values are clamped before send, this is the defensive re-clamp on apply
 *  (same posture as clampAllianceBonuses). */
export function clampDemandMultiplier(mult: unknown): number {
  if (typeof mult !== 'number' || !Number.isFinite(mult)) return 1;
  return Math.max(DEMAND_MULT_FLOOR, Math.min(DEMAND_PREMIUM_CAP, mult));
}

// ─── Deterministic local pool (solo / logged-out / stale snapshot) ──────────
// The cross-player boundary (§2 architecture invariant): a client NEVER
// computes another player's contribution. The local pool is authored NPC
// floor (full backdrop — an unsynced world is a quiet one, active30d = 0)
// biased by the world-clock season modifier, plus the player's OWN derived
// demand, against NPC supply plus the player's OWN capacity. Pure function
// of (own save, world clocks) — deterministic, and identical between the
// live tick and away catch-up.

/** Wave M2: buildings/services belonging to a non-operational (mothballed /
 *  reactivating / decommissioning) building — filtered out of every
 *  derived-demand and capacity computation below. A service counts as
 *  operational only when EVERY building it's linked to is operational
 *  (in practice always a single 1:1 link — see game-engine.ts §5's
 *  "each completed building gets its own service instance"). */
function operationalActivityInputs(state: GameState) {
  const buildingStatus = new Map((state.buildings || []).map(b => [b.instanceId, b]));
  const buildings = (state.buildings || []).filter(b => isBuildingOperational(b));
  const services = (state.activeServices || []).filter(s =>
    !s.linkedBuildingIds?.length || s.linkedBuildingIds.every(id => isBuildingOperational(buildingStatus.get(id)))
  );
  return { buildings, services };
}

export function computeLocalPoolMultiplier(
  state: GameState,
  locationId: string,
  category: ServiceCategory,
  seasonNumber: number,
): number {
  const key = demandPoolKey(locationId, category);
  const { buildings: opBuildings, services: opServices } = operationalActivityInputs(state);
  const ownActivity = deriveActivityDemand({
    id: 'self',
    buildings: opBuildings.map(b => ({
      definitionId: b.definitionId, locationId: b.locationId, isComplete: b.isComplete,
    })),
    services: opServices.map(s => ({
      definitionId: s.definitionId, locationId: s.locationId,
    })),
    ships: (state.ships || []).map(s => ({ currentLocation: s.currentLocation })),
  });
  const mod = getDemandPoolSeasonModifier(category, seasonNumber);
  const D = getNpcFloorBase(locationId, category) * mod + (ownActivity.get(key) || 0);
  const ownCapacity = computeCapacityByMarket(
    opServices.map(s => ({ definitionId: s.definitionId, locationId: s.locationId })),
  ).get(key) || 0;
  const C = getNpcSupplyCapacity(locationId, category, 0) + ownCapacity;
  return computePoolMultiplier(D, C);
}

// ─── Sync-down snapshot builder (server helper, pure) ───────────────────────

/**
 * Build the sync-down snapshot from stored LocationDemandPool rows + the
 * requesting player's own service list — the buildMarketSnapshot pattern
 * (pool math stays out of the route so it's testable without a database).
 *
 * The season modifier is applied at READ time, not stored — a season
 * super-cycle shifts every pool the moment it lands, deterministically for
 * server and client alike, without waiting out the 7-day EMA.
 *
 * If the hourly aggregate hasn't seen this player's capacity yet (first
 * sync after standing up a service), their own capacity is counted into C
 * on the fly — a player is never paid a scarcity premium their own
 * capacity has already filled.
 */
export function buildDemandPoolSnapshot(
  rows: DemandPoolRow[],
  ownServices: ActivityService[],
  seasonNumber: number,
  asOf: number = Date.now(),
): DemandPoolSnapshot {
  const ownCap = computeCapacityByMarket(ownServices);
  const pools: Record<string, DemandPoolEntry> = {};
  for (const r of rows) {
    if (!r || !SERVICE_CATEGORIES.includes(r.category as ServiceCategory)) continue;
    const category = r.category as ServiceCategory;
    const key = demandPoolKey(r.locationId, category);
    const mod = getDemandPoolSeasonModifier(category, seasonNumber);
    const dNpc = Math.max(0, r.dNpc || 0);
    const dTotal = Math.round((dNpc + Math.max(0, r.dDerived || 0)) * mod);
    const own = ownCap.get(key) || 0;
    const cSupply = Math.round(Math.max(Math.max(0, r.cSupply || 0), own));
    const mult = clampDemandMultiplier(computePoolMultiplier(dTotal, cSupply));
    const topShares = Array.isArray(r.topShares)
      ? (r.topShares as unknown[]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
          .map(v => Math.max(0, Math.min(1, v))).slice(0, 3)
      : [];
    pools[key] = {
      locationId: r.locationId,
      category,
      mult: Math.round(mult * 1000) / 1000,
      dTotal,
      dNpc: Math.round(dNpc * mod),
      cSupply,
      playerShare: cSupply > 0 ? Math.round(Math.min(1, own / cSupply) * 1000) / 1000 : 0,
      topShares,
      supplierCount: typeof r.supplierCount === 'number' ? Math.max(0, Math.floor(r.supplierCount)) : 0,
    };
  }
  return { pools, asOf };
}

// ─── THE multiplier every revenue path uses ─────────────────────────────────

/**
 * Demand-pool revenue multiplier for one service instance. Replaces the old
 * `servicePriceMultipliers[definitionId]` read everywhere.
 *
 * Resolution order:
 *  1. mining_output services → 1.0 (they compete through the shared market
 *     price + extraction pressure, §2.4 — never double-taxed by pools).
 *  2. Fresh server snapshot for (location, category) → its clamped mult.
 *  3. Otherwise → the deterministic local pool (above).
 * Then: phase-in blend toward 1.0 (25%→100% over 3 game-months from the V33
 * migration anchor — same grandfather pattern E3 used), Protected-Frontier
 * shield (new corps are never pushed BELOW neutral by rival saturation; the
 * scarcity premium still applies), and the final [0.35, 1.25] clamp.
 */
export function getServiceDemandMultiplier(
  state: GameState,
  definitionId: string,
  locationId: string,
  monthIndex: number,
  nowMs: number = Date.now(),
): number {
  const category = getServiceCategory(definitionId);
  if (!category) return 1;

  const snapshot: DemandPoolSnapshot | null | undefined = state.demandPools;
  const entry: DemandPoolEntry | undefined = snapshot?.pools?.[demandPoolKey(locationId, category)];
  const fresh = !!snapshot && typeof snapshot.asOf === 'number' && nowMs - snapshot.asOf <= DEMAND_POOL_STALE_MS;

  const rawMult = entry && fresh
    ? clampDemandMultiplier(entry.mult)
    : computeLocalPoolMultiplier(state, locationId, category, getCurrentSeasonNumber(new Date(nowMs)));

  const phase = getDemandPoolPhaseInFraction(state.demandPoolPhaseInStartMonth, monthIndex);
  let mult = 1 + (rawMult - 1) * phase;

  // Protected Frontier (§E4 item 5 / CLAUDE.md on-ramp canon): frontier
  // corporations are shielded from rival saturation — the same shield
  // consumption and hazards use. Premiums still pay (the on-ramp stays
  // generous), penalties don't bite until graduation.
  if (mult < 1 && isInFrontier(state, nowMs)) mult = 1;

  return Math.max(DEMAND_MULT_FLOOR, Math.min(DEMAND_PREMIUM_CAP, mult));
}
