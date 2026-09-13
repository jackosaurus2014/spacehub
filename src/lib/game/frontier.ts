// ─── Space Tycoon: Protected Frontier ───────────────────────────────────────
// New-player onramp. First 30 real-world days (or up to $100M net worth)
// the player is in a protected zone: cannot be targeted by rival raids or
// espionage, NPC piracy hazards capped, and starter contracts pay generously.
//
// Graduates automatically when either the time or the net-worth threshold is
// reached. Voluntary early graduation is also allowed — ambitious players can
// opt out to unlock the full competitive economy sooner.

import type { GameState } from './types';
import { BUILDING_MAP, markBookValue } from './buildings';
import { SHIP_MAP } from './ships';
import { RESOURCE_MAP, type ResourceId } from './resources';

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

/** @deprecated M1/F4: this counts capex as destroyed wealth (a $25B mining
 *  platform reads as a −$25B hit the instant it's built, recovered only by
 *  its cash flow) and double-counts operating flows already reflected in
 *  `money` — a 21-satellite spammer that bled cash for two years reads as
 *  poorer (−$2.5B) than an idler who built nothing (+$1.9B), which is
 *  exactly backwards for every consumer keyed to "how rich is this player"
 *  (wealth tax, Frontier graduation, espionage brackets, league seeding —
 *  see docs/MEANINGFUL_2026-08.md F4). All four have migrated to
 *  `computeBookNetWorth` below. Kept only for any remaining save-display
 *  call sites that explicitly want the old flow-based figure (e.g. a
 *  "lifetime cash flow" stat distinct from net worth) — new code should
 *  reach for `computeBookNetWorth`. */
export function computeNetWorth(state: GameState): number {
  return state.money + state.totalEarned - state.totalSpent;
}

// ─── M1/F4: asset-aware book net worth ──────────────────────────────────────
// docs/MEANINGFUL_2026-08.md §5 M1.3. Replaces the flow-based
// money+totalEarned-totalSpent metric (which reads capex as destroyed
// wealth) with a balance-sheet view: cash + depreciated book value of
// completed capital assets + inventory at spot + any escrowed funds still
// owned by the player. This is what "how rich is this corporation" should
// mean for the wealth tax, Frontier graduation, espionage brackets, and
// league seeding — an asset-heavy corp is no longer invisible to all four.
//
// Depreciation: completed buildings/ships book at 60% of baseCost — a
// deliberate haircut (assets aren't worth their sticker price on a forced
// sale, and it keeps building→demolish from ever being a money-pump once
// M2's decommission mechanic lands: salvage stays below book value).
//
// Inventory is valued at each resource's baseMarketPrice (the same
// spot-snapshot proxy economy-report.ts's balance sheet already uses — a
// live order-book spot read is a strict improvement or worth swapping in
// once one is threaded through, but base price is the deterministic,
// client-safe floor).
//
// `escrow`: funds committed to open market orders / contract bid collateral
// / slot-lease bids remain the player's property even while held server-
// side — GameState does not yet carry a running escrow total (order-book
// and contract-bidding escrow live in server-only Prisma rows), so this is
// an explicit optional parameter a caller with access to that ledger can
// pass in. Defaults to 0 (undercounts a player mid-auction slightly; never
// overcounts, which is the safe direction for a wealth-scaling sink).
export const BOOK_VALUE_DEPRECIATION_FACTOR = 0.6;

export function computeBookNetWorth(state: GameState, escrow: number = 0): number {
  let buildingBook = 0;
  for (const b of state.buildings || []) {
    if (!b.isComplete) continue;
    const def = BUILDING_MAP.get(b.definitionId);
    if (def) buildingBook += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
    // D4: Mark refit capex is booked like the base build (mark-upgrades.ts).
    buildingBook += markBookValue(b, BOOK_VALUE_DEPRECIATION_FACTOR);
  }

  let shipBook = 0;
  for (const s of state.ships || []) {
    if (!s.isBuilt) continue;
    const def = SHIP_MAP.get(s.definitionId);
    if (def) shipBook += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
  }

  let inventoryValue = 0;
  for (const [resId, qty] of Object.entries(state.resources || {})) {
    const def = RESOURCE_MAP.get(resId as ResourceId);
    if (def && typeof qty === 'number') inventoryValue += qty * def.baseMarketPrice;
  }

  return Math.round(
    state.money + buildingBook + shipBook + inventoryValue + Math.max(0, escrow),
  );
}

/** Read-only: is the player currently in the Protected Frontier? */
export function isInFrontier(state: GameState, now: number = Date.now()): boolean {
  if (state.frontierStatus === 'graduated') return false;
  if (state.frontierStatus !== 'active') return false;
  const enteredAt = state.frontierEnteredAtMs ?? state.createdAt;
  if (now - enteredAt >= FRONTIER_DURATION_MS) return false;
  // M1/F4: book net worth — an asset-heavy new corp that built up real
  // infrastructure should graduate out of the shield, not hide from it
  // because capex reads as a loss under the old flow-based metric.
  if (computeBookNetWorth(state) >= FRONTIER_HARD_CAP_NET_WORTH) return false;
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
  const netWorth = computeBookNetWorth(state); // M1/F4
  if (timer.remainingMs <= 0 && netWorth >= FRONTIER_GRADUATION_NET_WORTH) return true;
  if (netWorth >= FRONTIER_HARD_CAP_NET_WORTH) return true;
  // If past the time window but still under the graduation net worth, grace a
  // little longer so brand-new players don't get tossed into the shark tank.
  // `remainingMs` is clamped at zero by getFrontierTimer — measure grace from
  // the actual expiration timestamp instead.
  const msPastExpiry = now - timer.expiredAtMs;
  if (msPastExpiry >= 7 * 24 * 60 * 60 * 1000) return true; // +7 day grace
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

// ─── Post-graduation demand-pool glide (Balance Pass 6 — C1) ─────────────────
// docs/BALANCE.md Pass 5 finding C1 ("the graduation cliff"): a fresh
// graduate's entire affordable build menu sits in exactly the pools week-1
// players floor first (0.35–0.38×), so a $100–200M graduate had 0/60
// profitable months in the Pass-5 50-year world while the SAME portfolio
// alone earned +$13.7M/mo. The fix extends the Frontier demand-pool shield
// with a time-based blend: for GRADUATION_GLIDE_MS after graduation, a
// below-neutral pool multiplier glides linearly from 1.0 (neutral, the
// Frontier shield's own value) down to the true market multiplier. Premiums
// (mult > 1) are untouched — same "premiums pay, penalties wait" posture as
// the shield itself. Glide length chosen by simulation (sim-50yr.ts §6c
// glide-length sweep — see BALANCE.md Pass 6): 14 real days = 56 game-months.
// The Pass-5 candidates {4, 6, 8, 12 days} ALL failed the durability bar
// (first profitable month inside the glide, yes — but every one of them
// slid back to the pool floor after the glide ended; 12 days ended at
// breakeven). Day-granular refinement located a sharp phase transition:
// at 14 days the graduate banks enough to un-stall its research ladder and
// build out of the floored starter pools (+$2.1M/mo a decade after glide
// end vs −$1.5M/mo forever at the no-glide baseline); 13 days fails. 14 is
// the shortest durable length, and at half the 30-day Frontier window it
// stays proportionate to the on-ramp it extends.
//
// State: reuses `frontierGraduatedAtMs`, which graduateFrontier has always
// stamped — no new fields, no save migration. Saves that graduated long ago
// (or predate the Frontier system entirely) read fraction 0: veterans get
// nothing.

/** Post-graduation glide window: 14 real days (= 56 game-months at 6h). */
export const GRADUATION_GLIDE_MS = 14 * 24 * 60 * 60 * 1000;

/** Remaining glide strength ∈ [0, 1]: 1 at the moment of graduation, linear
 *  to 0 at GRADUATION_GLIDE_MS, 0 for veterans / never-graduated / Frontier-
 *  active saves (the Frontier's own full shield handles those). */
export function getGraduationGlideFraction(state: GameState, now: number = Date.now()): number {
  if (state.frontierStatus !== 'graduated') return 0;
  const graduatedAt = state.frontierGraduatedAtMs;
  if (typeof graduatedAt !== 'number' || !Number.isFinite(graduatedAt)) return 0;
  const elapsed = now - graduatedAt;
  if (elapsed <= 0) return 1;
  if (elapsed >= GRADUATION_GLIDE_MS) return 0;
  return 1 - elapsed / GRADUATION_GLIDE_MS;
}

/** Blend a below-neutral demand-pool multiplier toward 1.0 by the glide
 *  fraction: mult + (1 − mult) × fraction. Equivalently, the multiplier
 *  floors at a value decaying linearly 1.0 → market rate over the window.
 *  NEVER boosts: mult ≥ 1 (scarcity premiums) and fraction ≤ 0 pass through
 *  unchanged, and the blended value never exceeds 1.0. Pure — shared by the
 *  live tick, away catch-up, every P&L surface (all via
 *  getServiceDemandMultiplier), and the sim harness. */
export function applyGraduationGlide(mult: number, fraction: number): number {
  if (!(fraction > 0) || !(mult < 1)) return mult;
  const f = Math.min(1, fraction);
  return mult + (1 - mult) * f;
}

// ─── Benefits / penalties while in Frontier ──────────────────────────────────

/** Contract payouts inside Frontier get a generosity boost. */
export const FRONTIER_CONTRACT_PAYOUT_MULTIPLIER = 1.25;

// ─── Balance Pass 10 (2026-09-12) — Frontier service-revenue multiplier ──────
// docs/BALANCE.md "Pass 10 — early-game pace". Measured live: a fresh Cape
// Heritage corporation ($75M) nets about +$4.9M per 6-hour game-month, so a
// $100M tier-1 research was five real days of building income. The founder's
// call: service revenue is DOUBLED while the Protected Frontier is active,
// and the doubling DECAYS along the existing 14-day graduation glide
// (getGraduationGlideFraction — 1.0 at graduation, linear to 0), so there is
// never a cliff: 2.0 → 1.0 over the glide, then exactly 1.0 for veterans.
//
// Applied in ONE place per engine: game-engine.ts §1 (live tick),
// away-operations.ts (catch-up), economy-report.ts + ResourceBar.tsx (P&L
// surfaces), and mirrored on the server in resource-plausibility.ts
// computeServerMonthlyGrossDetailed via frontierRevenueMultiplierUpperBound
// — the sync money ceiling MUST see the same doubling or every new player's
// income is rejected as implausible (the 2026-09-12 contract-credit bug).

/** Service-revenue multiplier while the Protected Frontier is active. */
export const FRONTIER_REVENUE_MULTIPLIER = 2.0;

/** Pure: the multiplier for a given Frontier-active flag and glide fraction.
 *  active → FRONTIER_REVENUE_MULTIPLIER; else 1 + (F − 1) × fraction. */
export function frontierRevenueMultiplierFor(active: boolean, glideFraction: number): number {
  if (active) return FRONTIER_REVENUE_MULTIPLIER;
  const f = Math.max(0, Math.min(1, Number.isFinite(glideFraction) ? glideFraction : 0));
  if (f <= 0) return 1;
  return 1 + (FRONTIER_REVENUE_MULTIPLIER - 1) * f;
}

/** The live client read: 2.0 while isInFrontier, gliding to 1.0 over
 *  GRADUATION_GLIDE_MS after graduation, 1.0 for veterans / 'none'. */
export function getFrontierRevenueMultiplier(state: GameState, now: number = Date.now()): number {
  return frontierRevenueMultiplierFor(isInFrontier(state, now), getGraduationGlideFraction(state, now));
}

/** Server-side UPPER BOUND on the multiplier, from what the sync route knows
 *  for certain: the profile's createdAt. A corporation can be Frontier-active
 *  until FRONTIER_DURATION_MS (+ the 7-day grace shouldAutoGraduate allows)
 *  after creation, and the latest possible graduation starts the latest
 *  possible glide — so the bound is 2.0 through that window and then decays
 *  along the same glide curve. It is ≥ the client's real multiplier at every
 *  instant (a voluntary early graduate is strictly lower), which is the safe
 *  direction for a plausibility CEILING; it is never below it. */
export const FRONTIER_LATEST_GRADUATION_MS = FRONTIER_DURATION_MS + 7 * 24 * 60 * 60 * 1000;

export function frontierRevenueMultiplierUpperBound(createdAtMs: number | undefined | null, nowMs: number = Date.now()): number {
  if (typeof createdAtMs !== 'number' || !Number.isFinite(createdAtMs)) return 1;
  const elapsed = nowMs - createdAtMs;
  if (elapsed < FRONTIER_LATEST_GRADUATION_MS) return FRONTIER_REVENUE_MULTIPLIER;
  const sinceLatestGraduation = elapsed - FRONTIER_LATEST_GRADUATION_MS;
  if (sinceLatestGraduation >= GRADUATION_GLIDE_MS) return 1;
  return frontierRevenueMultiplierFor(false, 1 - sinceLatestGraduation / GRADUATION_GLIDE_MS);
}

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
  const netWorth = computeBookNetWorth(state); // M1/F4
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
