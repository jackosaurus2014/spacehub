// ─── Space Tycoon: Talent Poaching — aimable wage war (Wave M5, ─────────────
// docs/MEANINGFUL_2026-08.md §3.2 O4 / §M5). Pre-M5 labor was only a shared
// index — "you cannot aim at a rival's crew". This module adds the aimed
// version: escrowed signing-bonus offers for up to 10% of a rival's named
// crew type, with a 48h counteroffer window on the defender's side.
//
// THE DECISION ON BOTH SIDES (CLAUDE.md "meaningful decisions"):
//   Attacker: pay 6 months' salary × wage index × 1.5 per head (escrowed) +
//   a burned action fee — is that crew worth more to you than the cash?
//   Defender: match 75% of the bonus within 48h to retain (burned — the
//   money goes to the crew, not to any player), or let them walk and keep
//   the cash. `guild_arbitration` research grants one FREE retention per
//   28-day season.
//
// SELF-LIMITING: every successful poach bumps the GLOBAL wage index for
// that crew type (+0.02 per head, clamped at the 1.6 cap) until the weekly
// labor cron re-settles it — poaching wars heat the whole market, including
// the attacker's own payroll.
//
// SHIELDS: Frontier corps are immune BOTH directions (server-side proxy
// below); per-target cooldown 30 days; offer counts are hard-capped.
// NO COMBAT: crew choose to move for money — nothing is destroyed; the
// signing bonus and any retention payment are burned (BALANCE.md sinks).
//
// BOUNDARY: money flows (escrow / refund / fee) ride the One-Wallet ledger
// server-side. The crew headcount transfer reaches BOTH saves through the
// sync offense snapshot (offense.ts applyOffenseToState), applied
// idempotently via GameState.appliedPoachOfferIds — the deterministic tick
// never computes cross-player state itself. [SAVE] V38.

import type { WorkerType } from './workforce';
import { WORKER_MAP } from './workforce';
import { WAGE_INDEX_MIN, WAGE_INDEX_MAX } from './labor-market';
import { FRONTIER_DURATION_MS, FRONTIER_HARD_CAP_NET_WORTH } from './frontier';
import { applyFeeIndex } from './fee-index';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Signing bonus = this many months of the crew type's salary… */
export const POACH_SIGNING_BONUS_MONTHS = 6;
/** …times the live wage index, times this premium (spec: "6-month salary ×
 *  wage index × 1.5"). */
export const POACH_BONUS_PREMIUM = 1.5;

/** At most this fraction of the target's headcount of that type per offer. */
export const POACH_MAX_FRACTION = 0.10;
/** Targets with fewer than this many crew of a type cannot be poached for
 *  it at all (a 3-person team losing anyone is a wipe, not a raid). */
export const POACH_MIN_TARGET_HEADCOUNT = 4;
/** Absolute per-offer cap regardless of target size (bounds escrow math). */
export const POACH_MAX_CREW_PER_OFFER = 25;

/** Defender's response window — 48 real hours (weekly-loop tempo). */
export const POACH_COUNTEROFFER_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Retaining costs this fraction of the signing bonus (burned). */
export const POACH_COUNTEROFFER_MATCH_FRACTION = 0.75;

/** Burned action fee per offer (espionage-style, never refunded — even a
 *  withdrawn or defeated offer cost something real). Balance Pass 9: the
 *  CHARGED fee is this × the quarterly fee-index factor (fee-index.ts,
 *  clamp(worldMedianMonthlyNet / $30M, 1, 50)) — sim-validated: factor 1
 *  at relaunch (this $10M is correctly sized there), rising to ~×3.7 at
 *  mid-game where the flat fee had become a rounding error. Use
 *  computePoachActionFee — never this raw constant — at charge/display
 *  sites. */
export const POACH_ACTION_FEE = 10_000_000;

/** The REAL charged/displayed poach action fee: base × fee-index factor.
 *  Server routes pass getServerFeeIndexFactor(); UI passes
 *  getFeeIndexFactor(state) — both fail-soft to 1. */
export function computePoachActionFee(feeIndexFactor: number = 1): number {
  return applyFeeIndex(POACH_ACTION_FEE, feeIndexFactor);
}

/** Per-(attacker, target) cooldown between offers — 30 real days. */
export const POACH_TARGET_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

/** Global wage-index bump per successfully poached head (clamped at the
 *  WAGE_INDEX_MAX cap; the weekly labor cron re-settles it afterwards). */
export const POACH_WAGE_BUMP_PER_CREW = 0.02;

/** Same offense net-worth floor as espionage/campaigns. */
export const POACH_MIN_NET_WORTH = 200_000_000;

/** Research id granting one free retention per 28-day season (added to the
 *  research tree this wave — economy family). */
export const GUILD_ARBITRATION_TECH_ID = 'guild_arbitration';
/** Season length used for the free-retention allowance window. */
export const POACH_FREE_RETENTION_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

// ─── Pure math ──────────────────────────────────────────────────────────────

/** How many crew of a type an offer may raid from a target with `count`. */
export function maxPoachableCount(targetHeadcount: number): number {
  if (!Number.isFinite(targetHeadcount) || targetHeadcount < POACH_MIN_TARGET_HEADCOUNT) return 0;
  return Math.min(
    POACH_MAX_CREW_PER_OFFER,
    Math.max(1, Math.floor(targetHeadcount * POACH_MAX_FRACTION)),
  );
}

/** Total escrowed signing bonus for an offer. */
export function computeSigningBonus(crewType: WorkerType, n: number, wageIndex: number): number {
  const def = WORKER_MAP.get(crewType);
  if (!def || !Number.isFinite(n) || n < 1) return 0;
  const idx = Math.max(WAGE_INDEX_MIN, Math.min(WAGE_INDEX_MAX, Number.isFinite(wageIndex) ? wageIndex : 1));
  return Math.round(n * def.salary * POACH_SIGNING_BONUS_MONTHS * idx * POACH_BONUS_PREMIUM);
}

/** What the defender pays (burned) to retain. */
export function computeRetentionCost(signingBonusTotal: number): number {
  return Math.round(Math.max(0, signingBonusTotal) * POACH_COUNTEROFFER_MATCH_FRACTION);
}

/**
 * Chance the target identifies WHO is poaching (the offer itself is always
 * visible — crew don't get secret job offers without HR noticing). The
 * target's espionage security level raises attribution; the ATTACKER's own
 * security crew launder the approach (finally a reason to hire `security` —
 * spec verbatim). Identified attackers take a public reputation hit.
 */
export function computePoachDetectionChance(attackerSecurityCrew: number, targetSecurityLevel: number): number {
  const raw = 0.5
    + 0.04 * Math.max(0, Math.min(10, targetSecurityLevel))
    - 0.01 * Math.max(0, Math.min(30, attackerSecurityCrew));
  return Math.max(0.15, Math.min(0.95, raw));
}

/** Apply a successful poach's wage-pressure bump to a live index value. */
export function applyPoachWageBump(currentIndex: number, poachedCount: number): number {
  const idx = Number.isFinite(currentIndex) ? currentIndex : 1;
  const bumped = idx + POACH_WAGE_BUMP_PER_CREW * Math.max(0, poachedCount);
  return Math.max(WAGE_INDEX_MIN, Math.min(WAGE_INDEX_MAX, bumped));
}

/**
 * Server-side Frontier proxy ([FRONTIER] invariant): the client's exact
 * frontier flag never syncs, but profile creation time ≈ frontier entry and
 * the server netWorth is now asset-aware (M1). A corp inside the 30-day
 * window that hasn't crossed the hard cap is treated as protected — immune
 * to poaching (and campaign declaration) in BOTH directions. Generous on
 * purpose: the shield can only over-protect, never under-protect.
 */
export function isServerFrontierProtected(
  createdAtMs: number,
  netWorth: number,
  nowMs: number = Date.now(),
): boolean {
  if (!Number.isFinite(createdAtMs)) return false;
  return nowMs - createdAtMs < FRONTIER_DURATION_MS && netWorth < FRONTIER_HARD_CAP_NET_WORTH;
}
