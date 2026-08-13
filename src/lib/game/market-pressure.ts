// ─── Space Tycoon: market pressure hand-off (audit Wave E — A5-i / A5-iv) ────
// Audit §1d-5: "Mining never moves prices — sync/route.ts applies
// minedThisTick pressure but useGameSync.ts never sends it." And §1d-4:
// "NPC market pressure is a write-only accumulator … zero readers."
//
// Fix: the engine accumulates both flows into GameState.pendingMarketFlows
// (V15 additive field, persists across reloads so untransmitted pressure is
// not lost); useGameSync sends them with each sync (`minedThisTick` — the
// exact payload field the audit identifies as missing — plus
// `npcMarketFlows`); the sync route applies them to the shared
// MarketResource rows at the gentle 1/3-of-trade impact
// (calculatePriceAfterMining / calculatePriceAfterBackgroundFlow). After a
// 200 response, useGameSync queues a flush here and processFullTick
// subtracts the transmitted amounts on the next tick — the same single-slot
// hand-off pattern as ledger-reconcile.ts / server-effects.ts (React hooks
// cannot mutate game state directly).
//
// Anonymous/solo players never sync: their flows accumulate to the caps
// below and stop — bounded memory, zero behavior change (matching the
// audit's note that the shared market only exists server-side).

import type { GameState } from './types';

export interface MarketFlows {
  /** Units mined since last successful sync, by resource id (always ≥ 0). */
  mined: Record<string, number>;
  /** Net NPC trade flow since last sync, by resource id.
   *  Positive = NPC sells (supply in, price down); negative = NPC buys. */
  npc: Record<string, number>;
}

export const EMPTY_MARKET_FLOWS: MarketFlows = { mined: {}, npc: {} };

/** Client-side accumulation caps — bound state size for players who never
 *  sync, and bound the burst any one sync can deliver (the server clamps
 *  again per POLICY.md — client data is client-claimed). */
export const MINED_FLOW_CAP = 5_000;
export const NPC_FLOW_CAP = 1_000;

/** Merge freshly-mined amounts into the pending flows (pure). */
export function accumulateMinedFlows(
  pending: MarketFlows | undefined,
  mined: Record<string, number>,
): MarketFlows {
  const base = pending || EMPTY_MARKET_FLOWS;
  const entries = Object.entries(mined).filter(([, q]) => Number.isFinite(q) && q > 0);
  if (entries.length === 0) return base;
  const out = { ...base.mined };
  for (const [res, q] of entries) {
    out[res] = Math.min(MINED_FLOW_CAP, (out[res] || 0) + Math.round(q));
  }
  return { mined: out, npc: base.npc };
}

/** Merge NPC trade actions into the pending flows (pure).
 *  Follows npc-engine's sign convention: positive quantity = sell. */
export function accumulateNpcFlows(
  pending: MarketFlows | undefined,
  actions: { resourceId: string; quantity: number }[],
): MarketFlows {
  const base = pending || EMPTY_MARKET_FLOWS;
  if (actions.length === 0) return base;
  const out = { ...base.npc };
  for (const a of actions) {
    if (!a || !Number.isFinite(a.quantity) || a.quantity === 0) continue;
    const next = (out[a.resourceId] || 0) + Math.round(a.quantity);
    out[a.resourceId] = Math.max(-NPC_FLOW_CAP, Math.min(NPC_FLOW_CAP, next));
  }
  return { mined: base.mined, npc: out };
}

/** Subtract transmitted amounts after a successful sync (pure, clamped ≥ 0
 *  for mined; NPC flows subtract toward zero). Amounts accrued while the
 *  request was in flight survive. */
export function subtractTransmittedFlows(
  pending: MarketFlows | undefined,
  sent: MarketFlows,
): MarketFlows {
  const base = pending || EMPTY_MARKET_FLOWS;
  const mined: Record<string, number> = {};
  for (const [res, q] of Object.entries(base.mined)) {
    const remaining = q - (sent.mined[res] || 0);
    if (remaining > 0) mined[res] = remaining;
  }
  const npc: Record<string, number> = {};
  for (const [res, q] of Object.entries(base.npc)) {
    const sentQ = sent.npc[res] || 0;
    // Subtract only in the transmitted direction; clamp past zero.
    const remaining = (q > 0) === (sentQ > 0) || sentQ === 0
      ? (q > 0 ? Math.max(0, q - sentQ) : Math.min(0, q - sentQ))
      : q;
    if (remaining !== 0) npc[res] = remaining;
  }
  return { mined, npc };
}

// ─── Hand-off queue (client only; single slot, merged) ───────────────────────

let pendingFlush: MarketFlows | null = null;

/** Queue the flows a successful sync just transmitted. Called by useGameSync. */
export function queueMarketFlowFlush(sent: MarketFlows): void {
  if (!sent) return;
  if (!pendingFlush) {
    pendingFlush = { mined: { ...sent.mined }, npc: { ...sent.npc } };
    return;
  }
  for (const [res, q] of Object.entries(sent.mined)) {
    pendingFlush.mined[res] = (pendingFlush.mined[res] || 0) + q;
  }
  for (const [res, q] of Object.entries(sent.npc)) {
    pendingFlush.npc[res] = (pendingFlush.npc[res] || 0) + q;
  }
}

/** Consume the queued flush (engine, once per tick). */
export function consumeMarketFlowFlush(): MarketFlows | null {
  const f = pendingFlush;
  pendingFlush = null;
  return f;
}

/** Test helper — clears the queue. */
export function __clearMarketFlowQueue(): void {
  pendingFlush = null;
}

/** Apply a consumed flush to state (pure). */
export function applyMarketFlowFlush(state: GameState, flush: MarketFlows): GameState {
  return {
    ...state,
    pendingMarketFlows: subtractTransmittedFlows(state.pendingMarketFlows, flush),
  };
}
