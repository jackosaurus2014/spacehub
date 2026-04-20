// ─── Space Tycoon: Protected Frontier ───────────────────────────────────────
// New-player onramp. First 30 real-world days (or up to $100M net worth)
// the player is in a protected zone: cannot be targeted by rival raids or
// espionage, NPC piracy hazards capped, and starter contracts pay generously.
//
// Graduates automatically when either the time or the net-worth threshold is
// reached. Voluntary early graduation is also allowed — ambitious players can
// opt out to unlock the full competitive economy sooner.

import type { GameState } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum protected period — 30 real-world days from first game creation. */
export const FRONTIER_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Automatic graduation threshold. Net worth that lets a player hold their own
 *  against early rivals. Below this at day 30, grace extends briefly. */
export const FRONTIER_GRADUATION_NET_WORTH = 100_000_000;

/** Absolute hard cap — no one stays in Frontier past this net worth regardless of time. */
export const FRONTIER_HARD_CAP_NET_WORTH = 500_000_000;

// ─── Status helpers ───────────────────────────────────────────────────────────

export type FrontierStatus = 'active' | 'graduated' | 'none';

export function computeNetWorth(state: GameState): number {
  return state.money + state.totalEarned - state.totalSpent;
}

/** Read-only: is the player currently in the Protected Frontier? */
export function isInFrontier(state: GameState, now: number = Date.now()): boolean {
  if (state.frontierStatus === 'graduated') return false;
  if (state.frontierStatus !== 'active') return false;
  const enteredAt = state.frontierEnteredAtMs ?? state.createdAt;
  if (now - enteredAt >= FRONTIER_DURATION_MS) return false;
  if (computeNetWorth(state) >= FRONTIER_HARD_CAP_NET_WORTH) return false;
  return true;
}

/** Elapsed + remaining time in the Frontier, in milliseconds. */
export function getFrontierTimer(state: GameState, now: number = Date.now()): {
  enteredAtMs: number;
  elapsedMs: number;
  remainingMs: number;
  expiredAtMs: number;
} {
  const enteredAt = state.frontierEnteredAtMs ?? state.createdAt;
  const expiredAt = enteredAt + FRONTIER_DURATION_MS;
  return {
    enteredAtMs: enteredAt,
    elapsedMs: Math.max(0, now - enteredAt),
    remainingMs: Math.max(0, expiredAt - now),
    expiredAtMs: expiredAt,
  };
}

/** Have the exit conditions been reached? (time, net worth, or hard cap) */
export function shouldAutoGraduate(state: GameState, now: number = Date.now()): boolean {
  const timer = getFrontierTimer(state, now);
  const netWorth = computeNetWorth(state);
  if (timer.remainingMs <= 0 && netWorth >= FRONTIER_GRADUATION_NET_WORTH) return true;
  if (netWorth >= FRONTIER_HARD_CAP_NET_WORTH) return true;
  // If past the time window but still under the graduation net worth, grace a
  // little longer so brand-new players don't get tossed into the shark tank.
  if (timer.remainingMs <= -7 * 24 * 60 * 60 * 1000) return true; // +7 day grace
  return false;
}

/** Actively graduate the player from the Frontier (voluntary or auto). */
export function graduateFrontier(state: GameState, now: number = Date.now()): GameState {
  if (state.frontierStatus !== 'active') return state;
  return {
    ...state,
    frontierStatus: 'graduated',
    frontierGraduatedAtMs: now,
  };
}

/** Initialize Frontier for a fresh save — called from getNewGameState. */
export function initializeFrontier(createdAtMs: number): {
  frontierStatus: FrontierStatus;
  frontierEnteredAtMs: number;
} {
  return {
    frontierStatus: 'active',
    frontierEnteredAtMs: createdAtMs,
  };
}

// ─── Benefits / penalties while in Frontier ──────────────────────────────────

/** Contract payouts inside Frontier get a generosity boost. */
export const FRONTIER_CONTRACT_PAYOUT_MULTIPLIER = 1.25;

/** NPC piracy / sabotage events are fully suppressed inside Frontier. */
export function isHostileEventSuppressed(state: GameState, now: number = Date.now()): boolean {
  return isInFrontier(state, now);
}

/** PvP rivals cannot target Frontier players. */
export function canBeTargetedByRivals(state: GameState, now: number = Date.now()): boolean {
  return !isInFrontier(state, now);
}

/** Espionage (incoming) is blocked for Frontier players. */
export function canBeTargetedByEspionage(state: GameState, now: number = Date.now()): boolean {
  return !isInFrontier(state, now);
}

// ─── Presentation ─────────────────────────────────────────────────────────────

export interface FrontierSummary {
  status: FrontierStatus;
  inFrontier: boolean;
  remainingMs: number;
  remainingDays: number;
  netWorth: number;
  netWorthProgressPct: number;
  canGraduateNow: boolean;
  autoGraduateReady: boolean;
}

export function getFrontierSummary(state: GameState, now: number = Date.now()): FrontierSummary {
  const status = state.frontierStatus || 'none';
  const timer = getFrontierTimer(state, now);
  const netWorth = computeNetWorth(state);
  return {
    status,
    inFrontier: isInFrontier(state, now),
    remainingMs: timer.remainingMs,
    remainingDays: Math.max(0, Math.ceil(timer.remainingMs / (24 * 60 * 60 * 1000))),
    netWorth,
    netWorthProgressPct: Math.min(100, (netWorth / FRONTIER_GRADUATION_NET_WORTH) * 100),
    canGraduateNow: status === 'active',
    autoGraduateReady: shouldAutoGraduate(state, now),
  };
}
