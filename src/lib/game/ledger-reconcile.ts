// ─── Space Tycoon: One Wallet — client-side ledger reconciliation ────────────
// Audit Change #1 (A1). The server keeps a signed delta ledger
// (GameLedgerEntry) of every server-side debit/credit: order escrow/fills,
// bid collateral/payouts, mega-project and alliance contributions, treasury
// deposits, espionage costs, bounty escrow/payouts, league rewards.
//
// The sync route no longer lets the raw client money figure erase that
// history: it reconciles (clientMoney + unacked deltas) and returns the
// pending deltas to the client. This module is the CLIENT half:
//
//   1. Pure math (sumLedgerEntries / reconcileBalance / applyResourceDeltas)
//      — shared with the server route and unit-tested.
//   2. A tiny hand-off queue: useGameSync receives the sync response and
//      queues the reconciliation; game-engine.processFullTick consumes it on
//      the next tick and applies it into GameState atomically (money +
//      resources + ack cursor move in the same state update, which is what
//      makes retries idempotent — see applyReconciliationToState).
//
// Solo players (not logged in, or with no server-side transactions) have an
// empty ledger: delta = 0, nothing changes, zero behavior difference.

import type { GameState } from './types';

/** Wire-format ledger entry as returned by the sync route. */
export interface LedgerEntryLite {
  seq: number;
  moneyDelta: number;
  resourceSlug?: string | null;
  resourceDelta?: number;
  reason?: string;
  refId?: string | null;
}

export interface LedgerReconciliation {
  /** Highest seq covered by this reconciliation (new ack cursor). */
  maxSeq: number;
  /** Sum of pending money deltas (signed). */
  moneyDelta: number;
  /** Net pending resource deltas by slug (signed). */
  resourceDeltas: Record<string, number>;
  /** Optional human-readable entry summaries (for UI feeds). */
  entries?: LedgerEntryLite[];
}

// ─── Pure math ───────────────────────────────────────────────────────────────

/** Sum a batch of ledger entries into net money + per-resource deltas. */
export function sumLedgerEntries(entries: LedgerEntryLite[]): {
  moneyDelta: number;
  resourceDeltas: Record<string, number>;
  maxSeq: number;
} {
  let moneyDelta = 0;
  let maxSeq = 0;
  const resourceDeltas: Record<string, number> = {};
  for (const e of entries) {
    if (!e || typeof e.seq !== 'number') continue;
    if (typeof e.moneyDelta === 'number' && Number.isFinite(e.moneyDelta)) {
      moneyDelta += e.moneyDelta;
    }
    if (e.resourceSlug && typeof e.resourceDelta === 'number' && Number.isFinite(e.resourceDelta) && e.resourceDelta !== 0) {
      resourceDeltas[e.resourceSlug] = (resourceDeltas[e.resourceSlug] || 0) + e.resourceDelta;
    }
    if (e.seq > maxSeq) maxSeq = e.seq;
  }
  return { moneyDelta: Math.round(moneyDelta), resourceDeltas, maxSeq };
}

/**
 * Reconcile a client-reported balance against pending ledger entries.
 * Entries at or below `ackSeq` are already reflected in the client figure
 * and are excluded — this is what makes sync retries idempotent: replaying
 * the same request (same ackSeq, same entries) produces the same figure.
 */
export function reconcileBalance(
  clientMoney: number,
  entries: LedgerEntryLite[],
  ackSeq: number,
): { reconciledMoney: number; moneyDelta: number; resourceDeltas: Record<string, number>; maxSeq: number; pending: LedgerEntryLite[] } {
  const safeAck = Number.isFinite(ackSeq) && ackSeq > 0 ? Math.floor(ackSeq) : 0;
  const pending = entries.filter(e => e && typeof e.seq === 'number' && e.seq > safeAck);
  const { moneyDelta, resourceDeltas, maxSeq } = sumLedgerEntries(pending);
  const base = Number.isFinite(clientMoney) ? clientMoney : 0;
  return {
    reconciledMoney: Math.round(base + moneyDelta),
    moneyDelta,
    resourceDeltas,
    maxSeq: Math.max(maxSeq, safeAck),
    pending,
  };
}

/** Apply signed resource deltas onto an inventory map, clamped at zero. */
export function applyResourceDeltas(
  resources: Record<string, number>,
  deltas: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...resources };
  for (const [slug, delta] of Object.entries(deltas)) {
    if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) continue;
    out[slug] = Math.max(0, Math.round((out[slug] || 0) + delta));
  }
  return out;
}

/**
 * Apply a server reconciliation into game state. Idempotent: entries are
 * only applied when the reconciliation covers seqs beyond the state's ack
 * cursor, and the money delta + resource deltas + cursor advance happen in
 * one immutable state update (so a persisted save is always internally
 * consistent — money that includes deltas up to seq N always carries
 * serverLedgerAck = N).
 */
export function applyReconciliationToState(state: GameState, rec: LedgerReconciliation): GameState {
  const ack = state.serverLedgerAck ?? 0;
  if (!rec || typeof rec.maxSeq !== 'number' || rec.maxSeq <= ack) return state;
  const moneyDelta = Number.isFinite(rec.moneyDelta) ? Math.round(rec.moneyDelta) : 0;
  const resourceDeltas = rec.resourceDeltas || {};
  const nextResources = applyResourceDeltas(state.resources || {}, resourceDeltas);
  return {
    ...state,
    money: state.money + moneyDelta,
    totalEarned: moneyDelta > 0 ? state.totalEarned + moneyDelta : state.totalEarned,
    totalSpent: moneyDelta < 0 ? state.totalSpent - moneyDelta : state.totalSpent,
    resources: nextResources,
    serverLedgerAck: rec.maxSeq,
  };
}

// ─── Hand-off queue (client only) ────────────────────────────────────────────
// useGameSync (React hook) cannot mutate game state directly — the state
// setter lives in page.tsx, which a concurrent agent owns. Instead the hook
// queues the reconciliation here and the engine consumes it on the next
// processFullTick. Single-slot: a newer reconciliation supersedes an
// unconsumed older one (it always covers a superset of pending entries).

let pendingReconciliation: LedgerReconciliation | null = null;

export function queueServerReconciliation(rec: LedgerReconciliation): void {
  if (!rec || typeof rec.maxSeq !== 'number') return;
  if (pendingReconciliation && pendingReconciliation.maxSeq >= rec.maxSeq) return;
  pendingReconciliation = rec;
}

export function consumeServerReconciliation(): LedgerReconciliation | null {
  const rec = pendingReconciliation;
  pendingReconciliation = null;
  return rec;
}

/** Test helper — clears the queue. */
export function __clearReconciliationQueue(): void {
  pendingReconciliation = null;
}
