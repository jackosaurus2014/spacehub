// ─── Space Tycoon: server-authoritative assets — client reconciliation ───────
// docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings".
//
// The sync route diffs the client's `buildings[]` against the profile's
// ServerAsset rows. In ASSET_LEDGER_MODE=enforce a client building with no
// server row was never paid for server-side, so the route drops it from the
// persisted buildingsData and returns
//
//   assetLedger: { mode, rejectedInstanceIds: string[] }
//
// This module is the CLIENT half: useGameSync queues the rejection here and
// game-engine.processFullTick applies it on the next tick (the same
// single-slot hand-off as ledger-reconcile.ts — React hooks cannot mutate
// game state directly). Removal refunds NOTHING: the asset was never bought
// through the server, so there is nothing to give back. Idempotent by
// instanceId set — a duplicate response finds nothing left to remove.

import type { GameState } from './types';
import { generateId } from './formulas';
import { MAX_EVENT_LOG } from './constants';

export interface AssetReconciliation {
  mode: 'off' | 'shadow' | 'enforce' | string;
  rejectedInstanceIds: string[];
}

/**
 * Remove the rejected buildings (and any service linked SOLELY to one of
 * them) from state. Pure; returns the same reference when nothing matched.
 */
export function applyAssetReconciliationToState(state: GameState, rec: AssetReconciliation | null | undefined): GameState {
  if (!rec || !Array.isArray(rec.rejectedInstanceIds) || rec.rejectedInstanceIds.length === 0) return state;
  const ids = new Set(rec.rejectedInstanceIds.filter((id): id is string => typeof id === 'string' && id.length > 0));
  if (ids.size === 0) return state;
  const removed = (state.buildings || []).filter(b => ids.has(b.instanceId));
  if (removed.length === 0) return state;
  const buildings = state.buildings.filter(b => !ids.has(b.instanceId));
  const activeServices = (state.activeServices || []).filter(s => {
    const linked = Array.isArray(s.linkedBuildingIds) ? s.linkedBuildingIds : [];
    return !(linked.length > 0 && linked.every(id => ids.has(id)));
  });
  return {
    ...state,
    buildings,
    activeServices,
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'random_event' as const,
      title: `Registry correction: ${removed.length} structure${removed.length === 1 ? '' : 's'} removed`,
      description: 'The corporate registry had no paid construction record for these structures, so they were struck from the books. Buildings are ordered through the registry — if you believe this is an error, use the Feedback tab.',
    }, ...state.eventLog].slice(0, MAX_EVENT_LOG),
  };
}

// ─── Hand-off queue (client only; single slot, merged by instanceId) ─────────

let pending: AssetReconciliation | null = null;

export function queueAssetReconciliation(rec: AssetReconciliation): void {
  if (!rec || !Array.isArray(rec.rejectedInstanceIds) || rec.rejectedInstanceIds.length === 0) return;
  if (!pending) {
    pending = { mode: rec.mode, rejectedInstanceIds: Array.from(new Set(rec.rejectedInstanceIds)) };
    return;
  }
  pending = {
    mode: rec.mode,
    rejectedInstanceIds: Array.from(new Set([...pending.rejectedInstanceIds, ...rec.rejectedInstanceIds])),
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
