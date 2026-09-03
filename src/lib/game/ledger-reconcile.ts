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
import { REAL_MS_PER_GAME_MONTH } from './server-time';

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

// ─── Server-authoritative inventory, phase 2 — sync-authored ledger rows ─────
// docs/SECURITY_AUDIT_2026-09.md "Phase 2". The sync route itself writes
// three kinds of GameLedgerEntry that the ordinary One-Wallet flow must
// treat specially:
//
//   client_craft_output / client_build_spend — ATTESTATIONS the client sent
//     (craftedThisTick / builtThisTick, capped server-side). The client's own
//     map already contains these movements, so they are NEVER returned as
//     pending deltas (a client applying them would double-count its own
//     crafting) and never folded into serverResources (the sync applied them
//     when it wrote the row). Audit trail only.
//   server_resource_correction — a DOWNWARD delta the server sends so a client
//     whose map drifted above server truth converges. It IS returned to the
//     client (normal pending row) but is never folded (it came out of the
//     server map, it does not go back in).
export const CLIENT_ATTESTED_LEDGER_REASONS = ['client_craft_output', 'client_build_spend'] as const;
export const SERVER_RESOURCE_CORRECTION_REASON = 'server_resource_correction' as const;
export const SYNC_AUTHORED_LEDGER_REASONS = [
  ...CLIENT_ATTESTED_LEDGER_REASONS,
  SERVER_RESOURCE_CORRECTION_REASON,
] as const;
/** Game exploit batch 2026-09-02 (H-5): market/trade now debits/credits the
 *  server columns and ledgers both legs, but the CLIENT applies the trade
 *  locally on the 2xx (MarketPanel / CraftingPanel contract), so these rows
 *  must never come back as pending deltas (they would double-apply). They
 *  are NOT stamped folded: the resource leg folds into serverResources like
 *  any other server-side move. */
export const CLIENT_APPLIED_LEDGER_REASONS = [
  'market_trade_buy_payment',
  'market_trade_buy_goods',
  'market_trade_sell_goods',
  'market_trade_sell_proceeds',
  // Phase 3 slice 1 (server-authoritative buildings): the asset routes debit /
  // credit the server columns and ledger every leg, but the CLIENT applies
  // the build / refit / scrap / reactivation / repair locally on the 2xx
  // (page.tsx handlers), so these rows never come back as pending deltas.
  // Their resource legs are NOT stamped folded — they fold into
  // serverResources like market_trade goods.
  'building_build',
  'building_build_resources',
  'building_refit',
  'building_refit_resources',
  'building_decommission_recovery',
  'building_reactivation_fee',
  'building_rush_repair',
  // Phase 3 slices 2-5: research / ship / location orders — same contract.
  'research_start',
  'research_start_resources',
  'ship_build',
  'ship_build_resources',
  'ship_scrap_recovery',
  'location_unlock',
] as const;
/** Every reason the client's pending-delta query must exclude. */
export const PENDING_EXCLUDED_LEDGER_REASONS = [
  ...CLIENT_ATTESTED_LEDGER_REASONS,
  ...CLIENT_APPLIED_LEDGER_REASONS,
] as const;

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

// ─── Wave E1 plausibility clamp (docs/ECONOMY_PVP_2026-08.md §E1, exploit #5) ─
//
// "Client money is the reconciliation base": reconcileBalance above computes
// `reconciledMoney = clientMoney + ledgerDelta` — the LEDGER corrects deltas
// (server-verified debits/credits), but `clientMoney` itself, the BASE of
// that sum, was never checked against anything. An edited save (or a
// forged sync POST body) that claims `money: 999999999999999` is simply
// believed and persisted.
//
// This is a stopgap, not the full server-authoritative wallet program
// (SIMULATION_INTEGRITY_TOOLING.md): it bounds how much the client-claimed
// figure may have plausibly grown since the profile's last sync.
//
// Clock unification (2026-09-02, docs/GAME_DESIGN_REVIEW_2026-09.md D1): the
// old ceiling was a flat $2M/s, derived from a real-calendar month while the
// engine ran a 60 s month — 33,000x looser than its own comment. It is now
// STATE-DERIVED:
//
//   headroom = min( serverMonthlyGross x MONEY_HEADROOM_MULT x elapsedMonths,
//                   MAX_ABSOLUTE_INCOME_PER_MS x elapsedMs )
//   elapsedMonths = elapsedMs / REAL_MS_PER_GAME_MONTH   (6 real hours)
//
// where `serverMonthlyGross` is the profile's theoretical-max monthly gross
// revenue from the engine's own formula evaluated over the PERSISTED row
// (resource-plausibility.ts computeServerMonthlyGross — every server-known
// term real, every client-only multiplier at its documented cap), and the
// absolute term is a $500K/s backstop that no legitimate corporation
// approaches. There is NO per-request floor (exploit batch C-2). Ledger-
// mediated income (contracts, mega-projects, bounties...) is NOT subject to
// this ceiling — it is added on top via `moneyDelta`, which is independently
// server-verified. One-off client-side credits larger than one window's
// headroom (a science-mission payoff, a narrative reward) are absorbed over
// the following syncs as headroom accrues — the persisted figure lags, the
// client's own balance is never touched.

/** Multiplier on the state-derived monthly gross — headroom for the
 *  multipliers the server cannot see and for tick bursts after a tab wakes. */
export const MONEY_HEADROOM_MULT = 2.0;
/** Absolute backstop: $500 per ms = $500K/s ≈ $10.8B per 6 h game-month. */
export const MAX_ABSOLUTE_INCOME_PER_MS = 500;
/** Below this much wall-clock since the last persisted sync the client gets
 *  ZERO growth headroom (money may only stay <= prevMoney + ledger deltas).
 *  Game exploit batch 2026-09-02 (C-2): this used to be a FLOOR — every
 *  request was granted at least 5 s x $2M/s = $10M of headroom, and since
 *  every sync also wrote lastSyncAt = now, a tight loop minted ~$2B/min. The
 *  sync route additionally rejects any sync < SYNC_MIN_INTERVAL_MS apart. */
export const MIN_PLAUSIBILITY_ELAPSED_MS = 5_000;
export const MAX_PLAUSIBILITY_ELAPSED_MS = 30 * 24 * 3600_000; // 30d cap

/** Server-enforced per-profile sync cadence (sync/route.ts). The client
 *  interval is 60 s with a 30 s floor (useGameSync.ts), so 10 s never clips
 *  an honest client. */
export const SYNC_MIN_INTERVAL_MS = 10_000;

/** The elapsed window the ceilings use: 0 below MIN_PLAUSIBILITY_ELAPSED_MS
 *  (no floor — C-2), linear up to the 30-day cap. Shared with the resource
 *  clamp (resource-plausibility.ts elapsedGameMonths). */
export function plausibleElapsedMs(elapsedMs: number): number {
  const raw = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const safe = Math.min(MAX_PLAUSIBILITY_ELAPSED_MS, Math.max(0, raw));
  return safe < MIN_PLAUSIBILITY_ELAPSED_MS ? 0 : safe;
}

/** Growth headroom the plausibility ceiling grants for `elapsedMs` of wall
 *  clock given the profile's server-derived monthly gross (formula in the
 *  header). Time-proportional, never floored, always bounded by the
 *  absolute backstop. A profile with no revenue-producing state gets zero. */
export function plausibleIncomeHeadroom(elapsedMs: number, serverMonthlyGross: number): number {
  const safe = plausibleElapsedMs(elapsedMs);
  if (safe <= 0) return 0;
  const gross = Number.isFinite(serverMonthlyGross) && serverMonthlyGross > 0 ? serverMonthlyGross : 0;
  const elapsedMonths = safe / REAL_MS_PER_GAME_MONTH;
  const stateDerived = gross * MONEY_HEADROOM_MULT * elapsedMonths;
  const backstop = safe * MAX_ABSOLUTE_INCOME_PER_MS;
  // Defensive: a non-finite state term (only reachable with a broken clock
  // constant) must degrade to the backstop, never to an unbounded ceiling.
  const headroom = Number.isFinite(stateDerived) ? Math.min(stateDerived, backstop) : backstop;
  return Math.round(headroom);
}

export interface PlausibilityClampResult {
  /** The client-claimed money figure, clamped to the plausible ceiling. */
  clampedMoney: number;
  wasClamped: boolean;
  /** How much of the client's claim was rejected (0 when not clamped). */
  rejectedExcess: number;
  ceiling: number;
  /** The headroom granted this window (ceiling - prevMoney). */
  headroom: number;
}

/**
 * Bound a client-claimed money figure against how much it could plausibly
 * have grown (via client-simulated tick income only — ledger deltas are
 * handled separately) since `prevMoney` was last persisted, `elapsedMs` ago,
 * for a profile whose persisted state can gross at most `serverMonthlyGross`
 * per game-month. Never restricts downward movement (spending, losses,
 * hazards are unrestricted) — only clamps implausible upward jumps. Headroom
 * is strictly time-proportional: a re-sync inside
 * MIN_PLAUSIBILITY_ELAPSED_MS gets none.
 */
export function clampPlausibleMoney(
  clientMoney: number,
  prevMoney: number,
  elapsedMs: number,
  serverMonthlyGross: number,
): PlausibilityClampResult {
  const safeClient = Number.isFinite(clientMoney) ? clientMoney : 0;
  const safePrev = Number.isFinite(prevMoney) ? prevMoney : 0;
  const headroom = plausibleIncomeHeadroom(elapsedMs, serverMonthlyGross);
  const ceiling = safePrev + headroom;

  if (safeClient > ceiling) {
    return { clampedMoney: ceiling, wasClamped: true, rejectedExcess: safeClient - ceiling, ceiling, headroom };
  }
  return { clampedMoney: safeClient, wasClamped: false, rejectedExcess: 0, ceiling, headroom };
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
