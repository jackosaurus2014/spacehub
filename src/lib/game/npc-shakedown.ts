// ─── Space Tycoon: NPC shakedowns on the ore run home (mining Phase B) ──────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §4 "Events while mining": "NPC
// pirate shakedown in unpatrolled fields (existing NPC piracy; escorts and
// point-defence reduce it)". Founder ruling 4 (§9): the Escort Cutter is a
// SECURITY ship — it only reduces NPC shakedown odds and never targets
// players. docs/POLICY.md "Ship Visibility" / "No Combat" apply: there is no
// player-vs-player effect anywhere in this module, and nothing here can be
// pointed at another corporation's hull.
//
// Model: a mining order with a RETURN leg (mine + return_store/return_sell,
// or a 'return' order) crosses the lane from the field's parent back to its
// destination. Each lane has a per-leg shakedown probability
// (SHAKEDOWN_LANE_RISK — the NPC piracy geography hazards.ts already uses:
// belt and outer system hot, cislunar quiet). On a hit the Void Corsairs
// take SHAKEDOWN_TAKE_SHARE of the ore aboard; the hull is never destroyed
// and the crew never harmed — it is a toll, not a battle. An Escort Cutter
// ASSIGNED to the order multiplies the odds by ESCORT_ASSIGNED_ODDS_MULT; a
// cutter merely STATIONED idle at the field's parent by ESCORT_STATIONED_
// ODDS_MULT. The Protected Frontier keeps its existing shield (odds 0 for a
// profile inside FRONTIER_DURATION_MS — frontier.ts isHostileEventSuppressed
// on the client, createdAt on the server) and the Frontier field itself
// (Near-Earth Cluster) has no lane risk at all.
//
// The roll is DETERMINISTIC in the order id (mulberry32 over a hash) so the
// server settlement and a local replay agree, and the outcome is written on
// the MiningOrder row (shakedownUnits / shakedownRepelled) — the Situation
// Log line is derived from that, never from a client claim.
//
// Pure. Shared by mining-orders.ts (quote + local play), server-mining.ts
// (settlement) and scripts/sim-mining.ts.

import { hashString, mulberry32 } from './asteroids';

/** Per-return-leg shakedown probability by the field's parent location. */
export const SHAKEDOWN_LANE_RISK: Readonly<Record<string, number>> = {
  lunar_orbit: 0,        // Near-Earth Cluster — the Frontier field, patrolled
  asteroid_belt: 0.12,   // Inner Belt — the Corsairs' home water
  ceres_surface: 0.10,   // Ceres Approaches — busy, lightly policed
  jupiter_system: 0.08,  // Trojans — far, thin traffic
  outer_system: 0.15,    // Kuiper Fringe — nobody is coming to help
};

/** Share of the ore aboard the Corsairs take on a hit. */
export const SHAKEDOWN_TAKE_SHARE = 0.25;

/** Odds multiplier when an Escort Cutter is ASSIGNED to the order (flies
 *  the run). −75%: the decision the cutter creates is "patrol or pay". */
export const ESCORT_ASSIGNED_ODDS_MULT = 0.25;

/** Odds multiplier when a cutter is merely STATIONED (idle, unassigned) at
 *  the field's parent — it covers the field's approaches, not the lane. */
export const ESCORT_STATIONED_ODDS_MULT = 0.5;

export type EscortCover = 'none' | 'stationed' | 'assigned';

/** Lane risk for a field parent (0 where the map has no piracy). */
export function laneShakedownRisk(parentLocationId: string): number {
  const r = SHAKEDOWN_LANE_RISK[parentLocationId];
  return typeof r === 'number' && Number.isFinite(r) ? Math.max(0, Math.min(1, r)) : 0;
}

/** The odds of a shakedown on ONE return leg. `frontier` = the profile is
 *  inside the Protected Frontier (shield → 0). */
export function shakedownOdds(parentLocationId: string, cover: EscortCover, frontier: boolean): number {
  if (frontier) return 0;
  const base = laneShakedownRisk(parentLocationId);
  if (base <= 0) return 0;
  const mult = cover === 'assigned' ? ESCORT_ASSIGNED_ODDS_MULT : cover === 'stationed' ? ESCORT_STATIONED_ODDS_MULT : 1;
  return Math.round(base * mult * 10_000) / 10_000;
}

export interface ShakedownOutcome {
  /** The deterministic roll in [0, 1). */
  roll: number;
  odds: number;
  /** Odds the same run would have carried with no cover — for the
   *  "repelled" line (the roll would have hit without the escort). */
  uncoveredOdds: number;
  hit: boolean;
  /** true when the roll was inside the uncovered odds but outside the
   *  covered odds: the escort made the difference. */
  repelled: boolean;
  unitsLost: number;
  unitsLanded: number;
}

/**
 * Settle the shakedown for one return leg. Deterministic in `seedKey` (the
 * order id). `unitsAboard` is the ore ON the hull for the leg (after
 * extraction pressure). Never throws; a 0-unit leg is never shaken down.
 */
export function settleShakedown(
  seedKey: string,
  parentLocationId: string,
  cover: EscortCover,
  frontier: boolean,
  unitsAboard: number,
): ShakedownOutcome {
  const units = Math.max(0, Math.floor(unitsAboard));
  const odds = shakedownOdds(parentLocationId, cover, frontier);
  const uncoveredOdds = shakedownOdds(parentLocationId, 'none', frontier);
  const roll = mulberry32(hashString(`shakedown:${seedKey}`))();
  const hit = units > 0 && odds > 0 && roll < odds;
  const repelled = units > 0 && !hit && uncoveredOdds > odds && roll < uncoveredOdds;
  const unitsLost = hit ? Math.min(units, Math.max(1, Math.round(units * SHAKEDOWN_TAKE_SHARE))) : 0;
  return { roll, odds, uncoveredOdds, hit, repelled, unitsLost, unitsLanded: units - unitsLost };
}

/** Expected ore lost per return leg — the number the quote shows and the sim
 *  books (odds × take share × units). */
export function expectedShakedownLoss(parentLocationId: string, cover: EscortCover, frontier: boolean, unitsAboard: number): number {
  return Math.round(shakedownOdds(parentLocationId, cover, frontier) * SHAKEDOWN_TAKE_SHARE * Math.max(0, unitsAboard) * 100) / 100;
}

/** Whether an order of this shape crosses a lane on the way home. */
export function orderHasReturnLeg(mode: string, thenAction: string): boolean {
  return mode === 'return' || (mode === 'mine' && thenAction !== 'hold');
}
