// ─── Space Tycoon: client inventory attestations (phase 2) ──────────────────
// docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase 2".
//
// The two biggest client-only inventory movements the server could not see
// before phase 2 were crafting outputs (resources IN — the refining
// completion in game-engine.processFullTick) and building / ship / research
// resource spend (resources OUT — page.tsx's build handlers). The engine
// accumulates both into GameState.pendingInventoryAttestations; useGameSync
// sends them with each sync as `craftedThisTick` / `builtThisTick`; the sync
// route caps them against the engine's own recipe throughput / definition
// costs (resource-plausibility.ts computeCraftAttestationCaps /
// capBuildAttestation), ledgers them as client_craft_output /
// client_build_spend, and lets accepted craft output widen the growth the
// server-owned map accepts that sync. After a 200 the hook queues a flush
// here and processFullTick subtracts exactly what was sent — the same
// single-slot hand-off as market-pressure.ts / offense.ts (React hooks
// cannot mutate game state directly).
//
// Solo players never sync: the accumulators cap out below and stop —
// bounded memory, zero behaviour change.

import type { GameState } from './types';

export interface InventoryAttestations {
  /** Recipe outputs credited since the last successful sync, by resource. */
  crafted: Record<string, number>;
  /** Building / ship / research resource spend since the last sync. */
  built: Record<string, number>;
}

export const EMPTY_INVENTORY_ATTESTATIONS: InventoryAttestations = { crafted: {}, built: {} };

/** Client-side accumulation caps (the server caps again, per POLICY.md). */
export const CRAFTED_ATTEST_CAP = 10_000;
export const BUILT_ATTEST_CAP = 10_000;

function merge(
  base: Record<string, number>,
  add: Record<string, number>,
  cap: number,
): Record<string, number> {
  const entries = Object.entries(add).filter(([, q]) => Number.isFinite(q) && q > 0);
  if (entries.length === 0) return base;
  const out = { ...base };
  for (const [res, q] of entries) {
    out[res] = Math.min(cap, (out[res] || 0) + Math.round(q));
  }
  return out;
}

/** Merge crafting outputs into the pending attestations (pure). */
export function accumulateCraftedOutput(
  pending: InventoryAttestations | undefined,
  crafted: Record<string, number>,
): InventoryAttestations {
  const base = pending || EMPTY_INVENTORY_ATTESTATIONS;
  const next = merge(base.crafted, crafted, CRAFTED_ATTEST_CAP);
  return next === base.crafted ? base : { ...base, crafted: next };
}

/** Merge build / ship / research resource spend into the pending attestations (pure). */
export function accumulateBuiltSpend(
  pending: InventoryAttestations | undefined,
  spent: Record<string, number>,
): InventoryAttestations {
  const base = pending || EMPTY_INVENTORY_ATTESTATIONS;
  const next = merge(base.built, spent, BUILT_ATTEST_CAP);
  return next === base.built ? base : { ...base, built: next };
}

/** Subtract transmitted amounts after a successful sync (pure, clamped ≥ 0).
 *  Amounts accrued while the request was in flight survive. */
export function subtractTransmittedAttestations(
  pending: InventoryAttestations | undefined,
  sent: InventoryAttestations,
): InventoryAttestations {
  const base = pending || EMPTY_INVENTORY_ATTESTATIONS;
  const sub = (map: Record<string, number>, sentMap: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const [res, q] of Object.entries(map)) {
      const remaining = q - (sentMap[res] || 0);
      if (remaining > 0) out[res] = remaining;
    }
    return out;
  };
  return { crafted: sub(base.crafted, sent.crafted || {}), built: sub(base.built, sent.built || {}) };
}

// ─── Hand-off queue (client only; single slot, merged) ───────────────────────

let pendingFlush: InventoryAttestations | null = null;

/** Queue the attestations a successful sync just transmitted. Called by useGameSync. */
export function queueAttestationFlush(sent: InventoryAttestations): void {
  if (!sent) return;
  if (!pendingFlush) {
    pendingFlush = { crafted: { ...(sent.crafted || {}) }, built: { ...(sent.built || {}) } };
    return;
  }
  for (const [res, q] of Object.entries(sent.crafted || {})) {
    pendingFlush.crafted[res] = (pendingFlush.crafted[res] || 0) + q;
  }
  for (const [res, q] of Object.entries(sent.built || {})) {
    pendingFlush.built[res] = (pendingFlush.built[res] || 0) + q;
  }
}

/** Consume the queued flush (engine, once per tick). */
export function consumeAttestationFlush(): InventoryAttestations | null {
  const f = pendingFlush;
  pendingFlush = null;
  return f;
}

/** Test helper — clears the queue. */
export function __clearAttestationQueue(): void {
  pendingFlush = null;
}

/** Apply a consumed flush to state (pure). */
export function applyAttestationFlush(state: GameState, flush: InventoryAttestations): GameState {
  return {
    ...state,
    pendingInventoryAttestations: subtractTransmittedAttestations(state.pendingInventoryAttestations, flush),
  };
}
