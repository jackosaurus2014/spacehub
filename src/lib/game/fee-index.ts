// ─── Space Tycoon: Offense Fee Index (Balance Pass 9 — docs/BALANCE.md) ─────
// Pass 8 prescription #4: fixed offense fees (talent-poach action fee,
// freight-toll caps, cornering/espionage intel-product fees) stop scaling
// with the economy — a $10M poach fee that is real money at relaunch is a
// rounding error for a mid-game whale (Pass 8 measured poach firing at
// ratio 1.41 at era B where the correctly-sized fee is ~×3.7). Fix: those
// fees multiply by a single world-economy factor,
//
//   feeIndexFactor = clamp(worldMedianMonthlyNet / $30M, 1, 50)
//
// recomputed QUARTERLY (real-world UTC calendar quarter — the same boundary
// LS9's Realignment uses) and SERVER-computed (public-quarterly/telemetry
// truth — fee-index-server.ts). Delivered to the client via the sync
// snapshot as the optional GameState.feeIndex field (same pattern as
// laborMarket / orbitalSlotLeases — no save migration, fail-soft factor 1).
//
// AT RELAUNCH THE FACTOR IS 1 BY DESIGN: the world median monthly net sits
// far below $30M on a fresh world, so this wave ships the MECHANISM, not a
// day-one price change (sim-validated: factor 1 at era A, ~×3.7 at era B).
//
// Charge-time discipline: the SERVER recomputes its own factor at every
// charge site (poach route, standing-demand route, espionage execute, the
// sync toll-credit cap) — the client field exists so UI fee displays and
// the client-side freight-toll math (offense.ts computeFreightTolls) show
// and debit the SAME multiplied number. Server-computed numbers are never
// re-derived client-side.

import type { GameState } from './types';

/** The median-monthly-net anchor the factor is normalized against. */
export const FEE_INDEX_MEDIAN_REF = 30_000_000;
/** Factor bounds — never a discount (min 1), capped ×50. */
export const FEE_INDEX_FACTOR_MIN = 1;
export const FEE_INDEX_FACTOR_MAX = 50;

/** A snapshot older than this reads as factor 1 — a stale (quarterly)
 *  stat must never overcharge an offline player. Two quarters + slack. */
export const FEE_INDEX_STALE_MS = 200 * 24 * 60 * 60 * 1000;

/** The sync-delivered snapshot shape (optional GameState.feeIndex). */
export interface FeeIndexSnapshot {
  /** clamp(medianMonthlyNet / $30M, 1, 50) — server-computed. */
  factor: number;
  /** The underlying stat, for display/telemetry legibility. */
  medianMonthlyNet: number;
  asOf: number;
}

/** The factor formula itself — pure, shared by the server computation,
 *  the sim harness, and tests. */
export function computeFeeIndexFactor(worldMedianMonthlyNet: number): number {
  if (!Number.isFinite(worldMedianMonthlyNet) || worldMedianMonthlyNet <= 0) {
    return FEE_INDEX_FACTOR_MIN;
  }
  return Math.max(
    FEE_INDEX_FACTOR_MIN,
    Math.min(FEE_INDEX_FACTOR_MAX, worldMedianMonthlyNet / FEE_INDEX_MEDIAN_REF),
  );
}

/** Clamp a raw snapshot factor into legal bounds (defensive — same posture
 *  as clampLaborMarketSnapshot). */
export function clampFeeIndexFactor(factor: unknown): number {
  if (typeof factor !== 'number' || !Number.isFinite(factor)) return FEE_INDEX_FACTOR_MIN;
  return Math.max(FEE_INDEX_FACTOR_MIN, Math.min(FEE_INDEX_FACTOR_MAX, factor));
}

/** Read the fee-index factor off a save — the deterministic client read.
 *  Fail-soft 1: absent snapshot (never synced / pre-Pass-9 save / schema
 *  lag) and stale snapshot both read neutral. */
export function getFeeIndexFactor(
  state: Pick<GameState, 'feeIndex'> | null | undefined,
  nowMs: number = Date.now(),
): number {
  const snap = state?.feeIndex;
  if (!snap || typeof snap.asOf !== 'number') return FEE_INDEX_FACTOR_MIN;
  if (nowMs - snap.asOf > FEE_INDEX_STALE_MS) return FEE_INDEX_FACTOR_MIN;
  return clampFeeIndexFactor(snap.factor);
}

/** Apply the factor to a base fee (rounded dollars). */
export function applyFeeIndex(baseFee: number, factor: number): number {
  return Math.round(Math.max(0, baseFee) * clampFeeIndexFactor(factor));
}
