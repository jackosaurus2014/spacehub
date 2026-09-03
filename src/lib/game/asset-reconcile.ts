// ─── Space Tycoon: server-authoritative assets — client reconciliation ───────
// docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings" and "Phase 3
// slices 2-5".
//
// The sync route diffs the client's `buildings[]`, `completedResearch[]`,
// `ships[]` and `unlockedLocations[]` against the profile's ServerAsset rows
// (+ ColonyClaims for locations). In ASSET_LEDGER_MODE=enforce a client
// asset with no server row was never paid for server-side, so the route
// drops it from the persisted columns and returns
//
//   assetLedger: {
//     mode,
//     rejectedInstanceIds: string[],   // buildings
//     rejectedResearchIds: string[],   // research definition ids
//     rejectedShipIds: string[],       // ship instance ids
//     rejectedLocationIds: string[],   // location ids
//   }
//
// This module is the CLIENT half: useGameSync queues the rejection here and
// game-engine.processFullTick applies it on the next tick (the same
// single-slot hand-off as ledger-reconcile.ts — React hooks cannot mutate
// game state directly). Removal refunds NOTHING: the asset was never bought
// through the server, so there is nothing to give back. Idempotent by id
// set — a duplicate response finds nothing left to remove. Services are
// never reconciled here: the engine derives them from buildings every tick,
// so removing a building removes its service on its own.

import type { GameState } from './types';
import { generateId } from './formulas';
import { MAX_EVENT_LOG } from './constants';

export interface AssetReconciliation {
  mode: 'off' | 'shadow' | 'enforce' | string;
  rejectedInstanceIds: string[];
  rejectedResearchIds?: string[];
  rejectedShipIds?: string[];
  rejectedLocationIds?: string[];
}

/** Locations that can never be struck (server-assets.ts STARTING_LOCATIONS). */
const STARTING_LOCATIONS = ['earth_surface', 'leo'];

function idSet(list: unknown): Set<string> {
  return new Set(Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string' && id.length > 0) : []);
}

export function reconciliationIsEmpty(rec: AssetReconciliation | null | undefined): boolean {
  if (!rec) return true;
  return idSet(rec.rejectedInstanceIds).size === 0
    && idSet(rec.rejectedResearchIds).size === 0
    && idSet(rec.rejectedShipIds).size === 0
    && idSet(rec.rejectedLocationIds).size === 0;
}

/**
 * Remove the rejected buildings (and any service linked SOLELY to one of
 * them), research ids, ships and unlocked locations from state. Pure;
 * returns the same reference when nothing matched.
 */
export function applyAssetReconciliationToState(state: GameState, rec: AssetReconciliation | null | undefined): GameState {
  if (reconciliationIsEmpty(rec) || !rec) return state;
  const ids = idSet(rec.rejectedInstanceIds);
  const researchIds = idSet(rec.rejectedResearchIds);
  const shipIds = idSet(rec.rejectedShipIds);
  const locationIds = idSet(rec.rejectedLocationIds);
  STARTING_LOCATIONS.forEach(l => locationIds.delete(l));

  const removedBuildings = (state.buildings || []).filter(b => ids.has(b.instanceId));
  const removedResearch = (state.completedResearch || []).filter(id => researchIds.has(id));
  const removedShips = (state.ships || []).filter(s => shipIds.has(s.instanceId));
  const removedLocations = (state.unlockedLocations || []).filter(l => locationIds.has(l));
  const total = removedBuildings.length + removedResearch.length + removedShips.length + removedLocations.length;
  if (total === 0) return state;

  const buildings = removedBuildings.length > 0 ? state.buildings.filter(b => !ids.has(b.instanceId)) : state.buildings;
  const activeServices = removedBuildings.length > 0
    ? (state.activeServices || []).filter(s => {
        const linked = Array.isArray(s.linkedBuildingIds) ? s.linkedBuildingIds : [];
        return !(linked.length > 0 && linked.every(id => ids.has(id)));
      })
    : state.activeServices;
  const parts: string[] = [];
  if (removedBuildings.length > 0) parts.push(`${removedBuildings.length} structure${removedBuildings.length === 1 ? '' : 's'}`);
  if (removedResearch.length > 0) parts.push(`${removedResearch.length} research project${removedResearch.length === 1 ? '' : 's'}`);
  if (removedShips.length > 0) parts.push(`${removedShips.length} ship${removedShips.length === 1 ? '' : 's'}`);
  if (removedLocations.length > 0) parts.push(`${removedLocations.length} location unlock${removedLocations.length === 1 ? '' : 's'}`);
  return {
    ...state,
    buildings,
    activeServices,
    completedResearch: removedResearch.length > 0 ? state.completedResearch.filter(id => !researchIds.has(id)) : state.completedResearch,
    ships: removedShips.length > 0 ? (state.ships || []).filter(s => !shipIds.has(s.instanceId)) : state.ships,
    unlockedLocations: removedLocations.length > 0 ? state.unlockedLocations.filter(l => !locationIds.has(l)) : state.unlockedLocations,
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'random_event' as const,
      title: `Registry correction: ${parts.join(', ')} removed`,
      description: 'The corporate registry had no paid record for these, so they were struck from the books. Buildings, research, ships and location unlocks are ordered through the registry — if you believe this is an error, use the Feedback tab.',
    }, ...state.eventLog].slice(0, MAX_EVENT_LOG),
  };
}

// ─── Hand-off queue (client only; single slot, merged by id) ────────────────

let pending: AssetReconciliation | null = null;

function union(a: unknown, b: unknown): string[] {
  return Array.from(new Set([...Array.from(idSet(a)), ...Array.from(idSet(b))]));
}

export function queueAssetReconciliation(rec: AssetReconciliation): void {
  if (reconciliationIsEmpty(rec)) return;
  if (!pending) {
    pending = {
      mode: rec.mode,
      rejectedInstanceIds: union(rec.rejectedInstanceIds, []),
      rejectedResearchIds: union(rec.rejectedResearchIds, []),
      rejectedShipIds: union(rec.rejectedShipIds, []),
      rejectedLocationIds: union(rec.rejectedLocationIds, []),
    };
    return;
  }
  pending = {
    mode: rec.mode,
    rejectedInstanceIds: union(pending.rejectedInstanceIds, rec.rejectedInstanceIds),
    rejectedResearchIds: union(pending.rejectedResearchIds, rec.rejectedResearchIds),
    rejectedShipIds: union(pending.rejectedShipIds, rec.rejectedShipIds),
    rejectedLocationIds: union(pending.rejectedLocationIds, rec.rejectedLocationIds),
  };
}

export function consumeAssetReconciliation(): AssetReconciliation | null {
  const rec = pending;
  pending = null;
  return rec;
}

/** Test helper — clears the queue. */
export function __clearAssetReconciliationQueue(): void {
  pending = null;
}
