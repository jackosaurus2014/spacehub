// ─── Space Tycoon: The Exit Decision — Mothball & Decommission ──────────────
// docs/MEANINGFUL_2026-08.md §M2 / finding F5: "over-building is punished
// (P2) but irrecoverable — a player who mis-expands bleeds maintenance
// forever with no exit decision." This module is the exit valve:
//
//   MOTHBALL — pause a building: zero revenue, zero consumption/production,
//   25% maintenance. Cheap-ish to restart (a small spin-up fee) after a
//   1-game-month delay. The "ride out a market crash" tool — reversible.
//
//   DECOMMISSION — scrap a building for PARTIAL recovery: 40% of baseCost
//   back in cash, 50% of resourceCost back in materials. T1/T2 buildings
//   scrap instantly; T3+ buildings take a 1-game-month teardown before the
//   building is removed and recovery is credited. Irreversible. Recovery is
//   deliberately below book value (BALANCE.md: "salvage below book value so
//   build->demolish can never money-pump") and reads the UN-scaled
//   `def.baseCost` — the Nth-copy cost-scaling premium
//   (formulas.scaledBuildingCost) is never refunded, so working off the
//   position penalty of over-building at one location is never a profitable
//   round-trip.
//
// Both actions key off the SAME shared server world-month clock consumption
// .ts/hazards.ts/standing-directives.ts already use (server-time.ts's
// getGlobalGameDate().totalMonths in the live tick;
// getTotalGameMonths(getGlobalGameDate(now)) in away-operations.ts's catch-up
// loop) — never the player's personal state.gameDate — so a reactivation or
// teardown scheduled while offline resolves identically whether the player
// is watching the live tick or reconciling an away-catch-up ledger. The two
// process*ForMonth functions below are the single entry points BOTH paths
// call, mirroring consumption.ts's advanceConsumptionToMonth pattern exactly
// (same elapsed months in ⇒ same transitions out, no double-processing).
//
// Every revenue/consumption/mining/demand-pool-capacity site that reads
// building status funnels through isBuildingOperational() — a building is
// "operational" (produces revenue, draws/produces recipe inputs, claims
// demand-pool capacity) iff status is absent or 'active'. Everything else
// (mothballed / reactivating / decommissioning) is a non-operational state:
// same treatment everywhere, one predicate, no drift between call sites.

import type { GameState, GameEvent, BuildingDefinition, BuildingInstance } from './types';
import { BUILDING_MAP } from './buildings';
import { RESOURCE_MAP } from './resources';
import type { ResourceId } from './resources';
import { generateId, formatMoney } from './formulas';
import { MAX_EVENT_LOG } from './constants';

// ─── Constants (§M2) ─────────────────────────────────────────────────────────

/** Mothballed/reactivating/decommissioning buildings still pay this fraction
 *  of their normal monthly maintenance — "paused", not "free". */
export const MOTHBALL_MAINTENANCE_FRACTION = 0.25;

/** Cash recovery fraction of `def.baseCost` on decommission — deliberately
 *  below book value (BALANCE.md sinks-first invariant: recovery can never be
 *  a profit path vs a fresh build). Reads the UN-scaled base cost, not
 *  whatever scaledBuildingCost premium was actually paid for this copy — the
 *  Nth-satellite premium is sunk, never refunded. */
export const DECOMMISSION_MONEY_RECOVERY_FRACTION = 0.40;

/** Material recovery fraction of `def.resourceCost` on decommission. */
export const DECOMMISSION_RESOURCE_RECOVERY_FRACTION = 0.50;

/** Tier at/above which decommission takes a real teardown instead of being
 *  instant (T1/T2 scrap immediately — spec: "T3+ takes 1 game-month
 *  teardown"). */
export const DECOMMISSION_TEARDOWN_MIN_TIER = 3;

/** Game-months a T3+ teardown takes before recovery is credited. */
export const DECOMMISSION_TEARDOWN_MONTHS = 1;

/** Game-months a mothballed building takes to spin back up once reactivated. */
export const REACTIVATION_SPINUP_MONTHS = 1;

/** One-time reactivation fee — "cheap-ish to restart" (spec), scaled off
 *  baseCost so bigger facilities cost more to bring back, but always far
 *  below a fresh build. */
export const REACTIVATION_FEE_FRACTION = 0.05;

// ─── Status predicates — THE single source every call site reads ───────────

type StatusBearing = Pick<BuildingInstance, 'status'> | null | undefined;

/** True when a building is fully operational: earns revenue, draws/produces
 *  recipe inputs, and counts toward demand-pool capacity. Absent status (pre-
 *  M2 saves, and every fresh build) defaults to operational — additive, no
 *  behavior change for buildings nobody ever mothballed/decommissioned. A
 *  missing building reference (`bld` undefined — e.g. no linked instance
 *  found) also defaults to operational, matching every pre-M2 call site's
 *  existing "no building found ⇒ full effect" fallback. */
export function isBuildingOperational(bld: StatusBearing): boolean {
  if (!bld) return true;
  return !bld.status || bld.status === 'active';
}

/** True for any paused/transitional non-operational state — used to gate the
 *  25% maintenance rate (mothballed, reactivating, AND mid-teardown all pay
 *  the same reduced rate; only fully 'active' pays full price). */
export function isBuildingNonOperational(bld: StatusBearing): boolean {
  return !isBuildingOperational(bld);
}

export function isBuildingMothballed(bld: StatusBearing): boolean {
  return !!bld && bld.status === 'mothballed';
}

export function isBuildingReactivating(bld: StatusBearing): boolean {
  return !!bld && bld.status === 'reactivating';
}

export function isBuildingDecommissioning(bld: StatusBearing): boolean {
  return !!bld && bld.status === 'decommissioning';
}

/** Maintenance multiplier for a building's status — 1.0 normally, 25% for
 *  any paused/transitional state. Multiply into the existing
 *  maintenanceCostPerMonth formula at every site (game-engine.ts §2,
 *  away-operations.ts's mirror loop). */
export function getMothballMaintenanceMultiplier(bld: StatusBearing): number {
  return isBuildingOperational(bld) ? 1 : MOTHBALL_MAINTENANCE_FRACTION;
}

// ─── Decommission recovery math ─────────────────────────────────────────────

export interface DecommissionRecovery {
  money: number;
  resources: Record<string, number>;
}

/** Pure recovery calculator — the never-profitable invariant lives here:
 *  money is 40% of the UN-scaled baseCost, resources are 50% of the
 *  resourceCost quantities (floored, never rounded up). A build-then-
 *  decommission round trip always returns strictly less cash+material value
 *  than was spent (see mothball.test.ts's invariant test). */
export function computeDecommissionRecovery(def: BuildingDefinition): DecommissionRecovery {
  const money = Math.round(def.baseCost * DECOMMISSION_MONEY_RECOVERY_FRACTION);
  const resources: Record<string, number> = {};
  if (def.resourceCost) {
    for (const [resId, qty] of Object.entries(def.resourceCost)) {
      const recovered = Math.floor(qty * DECOMMISSION_RESOURCE_RECOVERY_FRACTION);
      if (recovered > 0) resources[resId] = recovered;
    }
  }
  return { money, resources };
}

function formatResourceList(resources: Record<string, number>): string {
  const parts = Object.entries(resources).map(([resId, qty]) => {
    const name = RESOURCE_MAP.get(resId as ResourceId)?.name || resId.replace(/_/g, ' ');
    return `${qty} ${name}`;
  });
  return parts.length > 0 ? parts.join(', ') : 'no materials';
}

function pushEvent(state: GameState, event: Omit<GameEvent, 'id' | 'date'>): GameEvent[] {
  return [{ id: generateId(), date: state.gameDate, ...event }, ...state.eventLog].slice(0, MAX_EVENT_LOG);
}

// ─── Mutators (pure — GameState in, GameState out, same house style as
//      consumption.ts's setBuildingSupplyPolicy) ────────────────────────────

/**
 * Pause a completed, fully-active building. Immediate effect the very next
 * tick: its linked service stops earning revenue AND stops paying its
 * operating cost (game-engine.ts §1 skips the whole service for a
 * non-operational owner), its recipe stops drawing/producing
 * (consumption.ts), and its own building maintenance drops to 25%
 * (game-engine.ts §2). No-op on buildings under construction or already in a
 * non-active status.
 */
export function mothballBuilding(state: GameState, instanceId: string, monthIndex: number): GameState {
  const bld = state.buildings.find(b => b.instanceId === instanceId);
  if (!bld || !bld.isComplete || !isBuildingOperational(bld)) return state;
  const def = BUILDING_MAP.get(bld.definitionId);
  if (!def) return state;

  const buildings = state.buildings.map(b => b.instanceId === instanceId
    ? { ...b, status: 'mothballed' as const, mothballedAtMonth: monthIndex, reactivationStartMonth: undefined }
    : b);

  return {
    ...state,
    buildings,
    eventLog: pushEvent(state, {
      type: 'random_event',
      title: `⏸ ${def.name} mothballed`,
      description: `Paused: zero revenue, zero recipe consumption/production, maintenance cut to ${Math.round(MOTHBALL_MAINTENANCE_FRACTION * 100)}%. Reactivate any time from the Build tab — a ${REACTIVATION_SPINUP_MONTHS}-game-month spin-up applies.`,
    }),
  };
}

/**
 * Begin reactivating a mothballed building. Charges a small upfront spin-up
 * fee (money only — no-op, no charge, if the corporation can't afford it),
 * flips status to 'reactivating' (still zero revenue/consumption, still 25%
 * maintenance), and stamps the world-month the spin-up started.
 * processMothballTransitionsForMonth flips it back to 'active' once
 * REACTIVATION_SPINUP_MONTHS have elapsed on the shared server clock.
 */
export function reactivateBuilding(state: GameState, instanceId: string, monthIndex: number): GameState {
  const bld = state.buildings.find(b => b.instanceId === instanceId);
  if (!bld || !isBuildingMothballed(bld)) return state;
  const def = BUILDING_MAP.get(bld.definitionId);
  if (!def) return state;

  const fee = Math.round(def.baseCost * REACTIVATION_FEE_FRACTION);
  if (state.money < fee) return state;

  const buildings = state.buildings.map(b => b.instanceId === instanceId
    ? { ...b, status: 'reactivating' as const, reactivationStartMonth: monthIndex }
    : b);

  return {
    ...state,
    money: state.money - fee,
    totalSpent: state.totalSpent + fee,
    buildings,
    eventLog: pushEvent(state, {
      type: 'random_event',
      title: `▶ ${def.name} reactivating`,
      description: `Spin-up fee ${formatMoney(fee)} paid. Back online (full revenue + consumption) in ${REACTIVATION_SPINUP_MONTHS} game month${REACTIVATION_SPINUP_MONTHS === 1 ? '' : 's'}.`,
    }),
  };
}

/**
 * Scrap a completed building. T1/T2 (tier < DECOMMISSION_TEARDOWN_MIN_TIER)
 * scrap instantly — building removed, its solely-linked service dropped,
 * recovery credited this call. T3+ buildings begin a teardown instead:
 * status flips to 'decommissioning' (zero revenue/consumption, 25%
 * maintenance) and processScheduledDecommissionsForMonth removes the
 * building + credits recovery once DECOMMISSION_TEARDOWN_MONTHS elapse.
 * No-op on buildings under construction or already decommissioning.
 */
export function decommissionBuilding(state: GameState, instanceId: string, monthIndex: number): GameState {
  const bld = state.buildings.find(b => b.instanceId === instanceId);
  if (!bld || !bld.isComplete || isBuildingDecommissioning(bld)) return state;
  const def = BUILDING_MAP.get(bld.definitionId);
  if (!def) return state;

  if (def.tier >= DECOMMISSION_TEARDOWN_MIN_TIER) {
    const completesAtMonth = monthIndex + DECOMMISSION_TEARDOWN_MONTHS;
    const buildings = state.buildings.map(b => b.instanceId === instanceId
      ? { ...b, status: 'decommissioning' as const, decommissionCompletesAtMonth: completesAtMonth }
      : b);
    const recovery = computeDecommissionRecovery(def);
    return {
      ...state,
      buildings,
      eventLog: pushEvent(state, {
        type: 'random_event',
        title: `🛠 ${def.name} decommissioning`,
        description: `Teardown underway (${DECOMMISSION_TEARDOWN_MONTHS} game month) — paused in the meantime. On completion: ${formatMoney(recovery.money)} + ${formatResourceList(recovery.resources)} recovered.`,
      }),
    };
  }

  // T1/T2 — instant scrap.
  const recovery = computeDecommissionRecovery(def);
  const buildings = state.buildings.filter(b => b.instanceId !== instanceId);
  const activeServices = state.activeServices.filter(s =>
    !(s.linkedBuildingIds?.length === 1 && s.linkedBuildingIds[0] === instanceId)
  );
  const resources = { ...state.resources };
  for (const [resId, qty] of Object.entries(recovery.resources)) {
    resources[resId] = (resources[resId] || 0) + qty;
  }

  return {
    ...state,
    buildings,
    activeServices,
    resources,
    money: state.money + recovery.money,
    totalEarned: state.totalEarned + recovery.money,
    eventLog: pushEvent(state, {
      type: 'random_event',
      title: `🗑 ${def.name} decommissioned`,
      description: `Recovered ${formatMoney(recovery.money)} + ${formatResourceList(recovery.resources)} (below book value — never a profit vs a fresh build).`,
    }),
  };
}

// ─── Month-boundary transition processors — shared by the live tick
//      (game-engine.ts, isMonthEnd) and away catch-up (away-operations.ts's
//      per-elapsed-month loop), same pattern as consumption.ts's
//      advanceConsumptionToMonth / processConsumptionForMonth pairing. ──────

/** Flip any 'reactivating' building whose spin-up window has elapsed back to
 *  'active'. Pure, idempotent (re-running for the same monthIndex is a
 *  no-op once already flipped). */
export function processMothballTransitionsForMonth(state: GameState, monthIndex: number): GameState {
  let changed = false;
  const flippedNames: string[] = [];
  const buildings = state.buildings.map(b => {
    if (!isBuildingReactivating(b) || b.reactivationStartMonth === undefined) return b;
    if (monthIndex - b.reactivationStartMonth < REACTIVATION_SPINUP_MONTHS) return b;
    changed = true;
    const def = BUILDING_MAP.get(b.definitionId);
    if (def) flippedNames.push(def.name);
    return { ...b, status: 'active' as const, reactivationStartMonth: undefined };
  });
  if (!changed) return state;
  const names = Array.from(new Set(flippedNames)).slice(0, 3).join(', ');
  const extra = flippedNames.length > 3 ? ` +${flippedNames.length - 3} more` : '';
  return {
    ...state,
    buildings,
    eventLog: pushEvent(state, {
      type: 'random_event',
      title: '✅ Spin-up complete',
      description: `${names || 'Facility'}${extra} back online at full revenue and consumption.`,
    }),
  };
}

/** Remove any 'decommissioning' building whose teardown window has elapsed
 *  and credit its recovery. Pure, idempotent. */
export function processScheduledDecommissionsForMonth(state: GameState, monthIndex: number): GameState {
  const due = state.buildings.filter(b =>
    isBuildingDecommissioning(b) && b.decommissionCompletesAtMonth !== undefined && monthIndex >= b.decommissionCompletesAtMonth
  );
  if (due.length === 0) return state;

  const dueIds = new Set(due.map(b => b.instanceId));
  const buildings = state.buildings.filter(b => !dueIds.has(b.instanceId));
  const activeServices = state.activeServices.filter(s =>
    !(s.linkedBuildingIds?.length === 1 && dueIds.has(s.linkedBuildingIds[0]))
  );

  let money = state.money;
  let totalEarned = state.totalEarned;
  const resources = { ...state.resources };
  const names: string[] = [];
  for (const b of due) {
    const def = BUILDING_MAP.get(b.definitionId);
    if (!def) continue;
    const recovery = computeDecommissionRecovery(def);
    money += recovery.money;
    totalEarned += recovery.money;
    for (const [resId, qty] of Object.entries(recovery.resources)) {
      resources[resId] = (resources[resId] || 0) + qty;
    }
    names.push(def.name);
  }

  const uniqueNames = Array.from(new Set(names)).slice(0, 3).join(', ');
  const extra = names.length > 3 ? ` +${names.length - 3} more` : '';
  return {
    ...state,
    buildings,
    activeServices,
    resources,
    money,
    totalEarned,
    eventLog: pushEvent(state, {
      type: 'random_event',
      title: '🗑 Decommission complete',
      description: `${uniqueNames || 'Facility'}${extra} scrapped and removed; recovery credited.`,
    }),
  };
}
