// ─── Space Tycoon: Accord Council Senate (4X Wave W11) ──────────────────────
// docs/4X_BASELINE_2026-08.md W11: "Accord Council + faction bite" — upgrades
// the W4 accord_council chain (narrative-events.ts — five binary-choice vote
// stages, kept AS-IS: it is the Council's narrative color/situations, not
// touched by this wave) into a REAL senate:
//
//  1. A quarterly vote engine — a world-shared deterministic DOCKET (which
//     measures are up this quarter is identical for every player, seeded off
//     the quarter index) whose measures carry real economic effects when
//     they pass (tariffs, subsidies, zone regulations, insurance mandates —
//     the categories STATS_DESIGN.md §12 and the W11 brief both cite).
//  2. Player LOBBYING as the decision: spend money and/or faction standing
//     to shift YOUR OWN odds of a measure passing. Odds are PUBLISHED before
//     you commit (intelligence-visible-if-earned, CLAUDE.md invariant) and
//     lobbying influence is capped (BALANCE.md-style: money and standing
//     each have a per-source cap, and the combined shift has its own tighter
//     cap so no single lever dominates).
//  3. Faction standing's economic bite (STATS_DESIGN §12) and faction
//     licensing deals live in factions.ts (getFactionStandingBrokerModifier,
//     isEmbargoed, FACTION_LICENSES/purchaseFactionLicense) — imported here
//     only where the senate needs to READ them (never re-implemented).
//
// Determinism: every roll (docket selection, published-odds variance, the
// pass/fail draw) is seeded via mulberry32(hashStringToSeed(...)) off the
// SHARED world-month index — same convention as hazards.ts/market-events.ts/
// narrative-events.ts ("no Math.random anywhere in this module"). The docket
// and published odds are IDENTICAL for every player on the same quarter
// (world-shared, forecastable); the pass/fail draw is also world-shared
// (same roll value for everyone), but each player's PERSONAL threshold
// (finalOdds) differs based on their own lobbying — so two players can see
// different outcomes on the same measure from the same underlying roll,
// without any cross-player state. No PvP: nobody's lobbying affects anyone
// else's odds.
//
// Effects apply via the ALREADY-WIRED hooks (per the wave brief): this
// module reuses narrative-events.ts's `applyChainConsequence` dispatcher
// (money ledger, per-faction reputation via factions.shiftReputation,
// activeEffects revenue/cost/research multipliers, hazard mitigation,
// morale) rather than inventing a parallel apply path. AccordMeasureEffect
// is a type alias of ChainConsequence for exactly this reason.

import type { GameState, GameEvent } from './types';
import { generateId, mulberry32, hashStringToSeed } from './formulas';
import { applyChainConsequence, type ChainConsequence } from './narrative-events';
import type { FactionId } from './factions';

// ─── Schema ───────────────────────────────────────────────────────────────

export type AccordMeasureCategory =
  | 'tariff'
  | 'subsidy'
  | 'zone_regulation'
  | 'insurance_mandate'
  | 'licensing'
  | 'safety'
  | 'trade';

/** Reuses narrative-events.ts's consequence schema verbatim — same wired
 *  hooks, same apply dispatcher (applyChainConsequence). */
export type AccordMeasureEffect = ChainConsequence;

export interface AccordMeasureDefinition {
  id: string;
  name: string;
  icon: string;
  category: AccordMeasureCategory;
  description: string;
  /** Baseline pass probability BEFORE lobbying or per-quarter variance,
   *  0..1. Published to the player (rounded, ± small world-shared variance)
   *  ahead of the lobbying window closing. */
  baseOdds: number;
  onPass: AccordMeasureEffect;
  onFail: AccordMeasureEffect;
}

export interface AccordDocket {
  /** World-month index of the quarter boundary this docket opened on. */
  quarterIndex: number;
  measureIds: string[];
  resolved: boolean;
}

export type LobbyStance = 'support' | 'oppose';

export interface LobbyingCommitment {
  measureId: string;
  stance: LobbyStance;
  /** EFFECTIVE money already deducted at commit time (capped — see
   *  LOBBY_MONEY_MAX_PP below; a caller offering more than the cap only has
   *  the useful, capped amount actually withdrawn). */
  moneySpent: number;
  favorFactionId?: FactionId;
  /** EFFECTIVE faction-standing points already deducted at commit time
   *  (capped — see LOBBY_FAVOR_MAX_PP below). */
  favorSpent: number;
  committedAtMonth: number;
}

export interface AccordVoteResult {
  quarterIndex: number;
  measureId: string;
  measureName: string;
  icon: string;
  category: AccordMeasureCategory;
  passed: boolean;
  playerStance: LobbyStance | null;
  publishedOdds: number;
  finalOdds: number;
  effectLabel: string;
}

// ─── Deterministic RNG helpers (mirrors narrative-events.ts) ───────────────

function worldRng(tag: string, monthIndex: number): () => number {
  return mulberry32(hashStringToSeed(`stw-senate-world:${tag}:${monthIndex}`));
}

/** Exactly once per quarter, at the quarter boundary — the senate loop. */
export function isQuarterBoundary(monthIndex: number): boolean {
  return monthIndex % 3 === 0;
}

// ─── Measure catalog ────────────────────────────────────────────────────────
// 12 measures spanning every STATS_DESIGN §12 / W11-brief category. Numbers
// authored so BOTH branches of most measures carry a real economic
// consequence (CLAUDE.md: "no cosmetic-only choices") — a few `onFail`
// branches are deliberately a no-op status-quo baseline, matching the
// "nothing happened this vote" reality of a failed motion.

export const DOCKET_SIZE = 3;

export const MEASURE_CATALOG: AccordMeasureDefinition[] = [
  {
    id: 'debris_mitigation_standard', name: 'Debris-Mitigation Standard', icon: '🛰️',
    category: 'zone_regulation', baseOdds: 0.55,
    description: 'A binding debris-mitigation standard for all Accord-signatory operators.',
    onPass: { label: 'Debris-Mitigation Standard Enacted', costMultiplier: 1.04, effectDurationMonths: 4, hazardMitigationBonus: { amount: 0.05, durationMonths: 6 }, factionRep: { 'the-dominion': 6 } },
    onFail: { label: 'Debris-Mitigation Standard Rejected', factionRep: { 'the-dominion': -4, 'void-corsairs': 3 } },
  },
  {
    id: 'nuclear_launch_licensing', name: 'Nuclear Launch Licensing', icon: '☢️',
    category: 'licensing', baseOdds: 0.5,
    description: 'A licensing framework for NTR/fission launches.',
    onPass: { label: 'Nuclear Launch Licensing Enacted', costMultiplier: 1.03, effectDurationMonths: 6, factionRep: { 'the-dominion': 8 } },
    onFail: { label: 'Nuclear Launch Licensing Rejected', revenueMultiplier: 1.02, effectDurationMonths: 6, factionRep: { 'the-syndicate': 5, 'the-dominion': -5 } },
  },
  {
    id: 'he3_export_framework', name: 'He-3 Export Framework', icon: '⚛️',
    category: 'tariff', baseOdds: 0.5,
    description: 'Helium-3 export controls versus an open trade regime.',
    onPass: { label: 'He-3 Export Controls Enacted', revenueMultiplier: 0.98, effectDurationMonths: 4, reputationPoints: 200 },
    onFail: { label: 'He-3 Export Controls Rejected — Open Market', revenueMultiplier: 1.04, effectDurationMonths: 4, factionRep: { 'the-syndicate': 5 } },
  },
  {
    id: 'planetary_protection_categories', name: 'Planetary-Protection Categories', icon: '📋',
    category: 'zone_regulation', baseOdds: 0.5,
    description: 'COSPAR-derived planetary-protection categories for outer-system bodies.',
    onPass: { label: 'Strict Planetary-Protection Categories', factionRep: { 'echo-remnants': 10 }, costMultiplier: 1.03, effectDurationMonths: 4 },
    onFail: { label: 'Permissive Planetary-Protection Categories', factionRep: { 'echo-remnants': -8 }, revenueMultiplier: 1.03, effectDurationMonths: 4 },
  },
  {
    id: 'duty_of_care_mandate', name: 'Crewed-Mission Duty-of-Care Mandate', icon: '🩺',
    category: 'insurance_mandate', baseOdds: 0.55,
    description: 'Mandatory medic staffing on crewed missions.',
    onPass: { label: 'Duty-of-Care Mandate Enacted', costMultiplier: 1.02, effectDurationMonths: 6, moraleDelta: 0.03 },
    onFail: { label: 'Duty-of-Care Mandate Rejected', moraleDelta: -0.02 },
  },
  {
    id: 'orbital_slot_tariff', name: 'Orbital Slot Usage Tariff', icon: '🛰️',
    category: 'tariff', baseOdds: 0.45,
    description: 'A usage tariff on high-value orbital slots (GEO/Lagrange) to fund traffic management.',
    onPass: { label: 'Orbital Slot Tariff Enacted', costMultiplier: 1.03, effectDurationMonths: 6 },
    onFail: { label: 'Orbital Slot Tariff Rejected', revenueMultiplier: 1.01, effectDurationMonths: 3 },
  },
  {
    id: 'research_subsidy_act', name: 'Research Subsidy Act', icon: '🔬',
    category: 'subsidy', baseOdds: 0.5,
    description: 'Accord-funded subsidies for signatory research programs.',
    onPass: { label: 'Research Subsidy Act Passed', moneyReward: 120_000_000, researchSpeedMultiplier: 1.08, effectDurationMonths: 4 },
    onFail: { label: 'Research Subsidy Act Rejected' },
  },
  {
    id: 'belt_zone_safety_regulation', name: 'Belt Zone Safety Regulation', icon: '⛏️',
    category: 'zone_regulation', baseOdds: 0.5,
    description: 'Post-incident safety regulation for asteroid-belt mining zones.',
    onPass: { label: 'Belt Zone Safety Regulation Enacted', costMultiplier: 1.02, effectDurationMonths: 4, hazardMitigationBonus: { amount: 0.05, durationMonths: 5 } },
    onFail: { label: 'Belt Zone Safety Regulation Rejected', factionRep: { 'void-corsairs': 4 } },
  },
  {
    id: 'universal_insurance_mandate', name: 'Universal Insurance Mandate', icon: '🏦',
    category: 'insurance_mandate', baseOdds: 0.45,
    description: 'A mandatory minimum-coverage insurance pool spread across all signatory operators.',
    onPass: { label: 'Universal Insurance Mandate Enacted', costMultiplier: 1.015, effectDurationMonths: 6, hazardMitigationBonus: { amount: 0.04, durationMonths: 6 } },
    onFail: { label: 'Universal Insurance Mandate Rejected' },
  },
  {
    id: 'interstellar_licensing_framework', name: 'Interstellar Licensing Framework', icon: '🚀',
    category: 'licensing', baseOdds: 0.4,
    description: 'A licensing regime for jump-capable interstellar operations, ahead of the endgame era.',
    onPass: { label: 'Interstellar Licensing Framework Enacted', costMultiplier: 1.02, effectDurationMonths: 8, factionRep: { 'the-dominion': 5, 'echo-remnants': 4 } },
    onFail: { label: 'Interstellar Licensing Framework Rejected', revenueMultiplier: 1.01, effectDurationMonths: 4 },
  },
  {
    id: 'belt_miners_guild_wage_accord', name: "Belt Miners' Guild Wage Accord", icon: '⚒️',
    category: 'trade', baseOdds: 0.5,
    description: "A wage and safety accord negotiated by the Belt Miners' Guild.",
    onPass: { label: "Belt Miners' Guild Wage Accord Enacted", costMultiplier: 1.02, effectDurationMonths: 6, moraleDelta: 0.04 },
    onFail: { label: "Belt Miners' Guild Wage Accord Rejected", moraleDelta: -0.03 },
  },
  {
    id: 'graymarket_crackdown', name: 'Gray-Market Crackdown', icon: '🚨',
    category: 'trade', baseOdds: 0.45,
    description: 'A Dominion-backed crackdown on Syndicate gray-market trade.',
    onPass: { label: 'Gray-Market Crackdown Enacted', factionRep: { 'the-syndicate': -10, 'the-dominion': 6 }, costMultiplier: 1.01, effectDurationMonths: 3 },
    onFail: { label: 'Gray-Market Crackdown Rejected', factionRep: { 'the-syndicate': 6, 'the-dominion': -4 } },
  },
];

export const MEASURE_MAP = new Map(MEASURE_CATALOG.map(m => [m.id, m]));

// ─── Docket generation (world-shared, deterministic) ───────────────────────

/** Deterministic Fisher-Yates using the quarter-seeded rng — same docket for
 *  every player on the same quarter. */
export function pickDocketMeasures(quarterIndex: number, count: number = DOCKET_SIZE): string[] {
  const rng = worldRng('docket', quarterIndex);
  const pool = MEASURE_CATALOG.map(m => m.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Published odds: baseOdds ± a small world-shared variance (±5pp),
 *  identical for every player — the "intelligence visible if earned"
 *  forecast the player lobbies against. Clamped so nothing is ever
 *  presented as a certainty. */
export function getPublishedOdds(measureId: string, quarterIndex: number): number {
  const def = MEASURE_MAP.get(measureId);
  if (!def) return 0.5;
  const rng = worldRng(`odds:${measureId}`, quarterIndex);
  const variance = (rng() - 0.5) * 0.10;
  return Math.max(0.1, Math.min(0.9, def.baseOdds + variance));
}

// ─── Lobbying — capped influence (BALANCE.md-style caps) ───────────────────

/** $25M lobbying spend buys 1 percentage point of odds shift. */
export const LOBBY_MONEY_PER_PP = 25_000_000;
/** Money-derived shift caps at 15pp (≈$375M for full effect — further
 *  spend beyond this is never withdrawn, see commitLobbying). */
export const LOBBY_MONEY_MAX_PP = 15;
/** 2 faction-standing points spent ("calling in a favor") buys 1pp. */
export const LOBBY_FAVOR_PER_PP = 2;
/** Favor-derived shift caps at 10pp (≈20 standing points for full effect). */
export const LOBBY_FAVOR_MAX_PP = 10;
/** Combined cap is TIGHTER than money-max + favor-max (15 + 10 = 25) — no
 *  single player can buy certainty by maxing both levers at once, matching
 *  the same "total cut capped below the sum of sub-caps" pattern
 *  market-engine.ts's getEffectiveBrokerFeeRate already uses. */
export const LOBBY_MAX_TOTAL_SHIFT_PP = 20;

/** Effective (already-capped) dollar spend that produces LOBBY_MONEY_MAX_PP. */
export const LOBBY_MONEY_CAP = LOBBY_MONEY_PER_PP * LOBBY_MONEY_MAX_PP;
/** Effective (already-capped) standing spend that produces LOBBY_FAVOR_MAX_PP. */
export const LOBBY_FAVOR_CAP = LOBBY_FAVOR_PER_PP * LOBBY_FAVOR_MAX_PP;

/** Pure: percentage-point odds shift a lobbying spend buys, fully capped.
 *  `moneySpent`/`favorSpent` here are EFFECTIVE (already-capped) amounts. */
export function computeLobbyShiftPct(moneySpent: number, favorSpent: number): number {
  const moneyPP = Math.min(LOBBY_MONEY_MAX_PP, Math.floor(Math.max(0, moneySpent) / LOBBY_MONEY_PER_PP));
  const favorPP = Math.min(LOBBY_FAVOR_MAX_PP, Math.floor(Math.max(0, favorSpent) / LOBBY_FAVOR_PER_PP));
  return Math.min(LOBBY_MAX_TOTAL_SHIFT_PP, moneyPP + favorPP);
}

/**
 * Commit a lobbying position on an open docket measure. Deducts only the
 * EFFECTIVE (capped) money/favor actually useful for the shift — a player
 * offering more than the cap only has the capped amount withdrawn, so
 * over-spending is never punished beyond "wasted opportunity cost".
 *
 * No-op (returns the same state reference) when: no open docket, the
 * measure isn't on it, the docket is already resolved, the player already
 * has a commitment for this measure this quarter (one commitment per
 * measure — no revising after the fact), can't afford the (capped) money
 * spend, or doesn't have enough standing with `favorFactionId` for the
 * (capped) favor spend.
 */
export function commitLobbying(
  state: GameState,
  measureId: string,
  stance: LobbyStance,
  moneySpent: number,
  favorFactionId?: FactionId,
  favorSpent: number = 0,
): GameState {
  const docket = state.accordDocket;
  if (!docket || docket.resolved || !docket.measureIds.includes(measureId)) return state;
  const existing = (state.accordLobbying || []).find(l => l.measureId === measureId);
  if (existing) return state;

  const effectiveMoney = Math.max(0, Math.min(moneySpent, LOBBY_MONEY_CAP));
  const effectiveFavor = favorFactionId ? Math.max(0, Math.min(favorSpent, LOBBY_FAVOR_CAP)) : 0;

  if (effectiveMoney > state.money) return state;
  if (effectiveFavor > 0) {
    const currentRep = state.factionReputation?.[favorFactionId as string] ?? 0;
    if (currentRep - effectiveFavor < -100) return state;
  }

  let next: GameState = {
    ...state,
    money: state.money - effectiveMoney,
    totalSpent: state.totalSpent + effectiveMoney,
  };
  if (effectiveFavor > 0 && favorFactionId) {
    // Direct clamp — mirrors shiftReputation's own clamp, but WITHOUT its
    // "rival gains" branch (that only fires for positive deltas): calling
    // in a favor costs you standing, it doesn't hand your rival anything.
    const current = next.factionReputation || {};
    next = {
      ...next,
      factionReputation: {
        ...current,
        [favorFactionId]: Math.max(-100, Math.min(100, (current[favorFactionId] ?? 0) - effectiveFavor)),
      },
    };
  }

  const commitment: LobbyingCommitment = {
    measureId, stance, moneySpent: effectiveMoney,
    favorFactionId, favorSpent: effectiveFavor,
    committedAtMonth: state.gameDate.year * 12 + state.gameDate.month,
  };
  next = { ...next, accordLobbying: [...(next.accordLobbying || []), commitment] };
  return next;
}

// ─── Resolution ─────────────────────────────────────────────────────────────

const VOTE_HISTORY_CAP = 30;

function resolveMeasure(
  state: GameState,
  measureId: string,
  docket: AccordDocket,
  monthIndex: number,
): { state: GameState; result: AccordVoteResult; event: GameEvent } {
  const def = MEASURE_MAP.get(measureId);
  const publishedOdds = getPublishedOdds(measureId, docket.quarterIndex);
  if (!def) {
    // Should never happen (docket ids always come from MEASURE_CATALOG) —
    // fail safe to a no-op status-quo result rather than throwing mid-tick.
    const result: AccordVoteResult = {
      quarterIndex: docket.quarterIndex, measureId, measureName: measureId, icon: '📜', category: 'trade',
      passed: false, playerStance: null, publishedOdds, finalOdds: publishedOdds, effectLabel: 'Measure withdrawn',
    };
    return { state, result, event: { id: generateId(), date: state.gameDate, type: 'random_event', title: '📜 Measure Withdrawn', description: 'The measure was withdrawn from the docket before a vote.' } };
  }

  const lobby = (state.accordLobbying || []).find(l => l.measureId === measureId);
  const shiftPct = lobby ? computeLobbyShiftPct(lobby.moneySpent, lobby.favorSpent) : 0;
  const signedShift = lobby ? (lobby.stance === 'support' ? shiftPct : -shiftPct) : 0;
  const finalOdds = Math.max(0.05, Math.min(0.95, publishedOdds + signedShift / 100));

  const rng = worldRng(`vote:${measureId}`, docket.quarterIndex);
  const roll = rng();
  const passed = roll < finalOdds;
  const effect = passed ? def.onPass : def.onFail;
  const nextState = applyChainConsequence(state, effect, monthIndex);

  const result: AccordVoteResult = {
    quarterIndex: docket.quarterIndex, measureId, measureName: def.name, icon: def.icon, category: def.category,
    passed, playerStance: lobby?.stance ?? null, publishedOdds, finalOdds, effectLabel: effect.label,
  };
  const event: GameEvent = {
    id: generateId(), date: nextState.gameDate, type: 'random_event',
    title: `${def.icon} ${def.name}: ${passed ? 'PASSED' : 'FAILED'}`,
    description: `${def.description} — ${effect.label}`,
  };
  return { state: nextState, result, event };
}

/**
 * Advance the Accord Senate by one game-month. Called once per month-end
 * from game-engine's processTick, alongside (and independent of) the W4
 * narrative chains. Resolves the current docket when its quarter-long
 * lobbying window has elapsed, then publishes the next quarter's docket.
 * Both transitions can land on the same tick (a docket that opened on
 * quarter boundary Q resolves on quarter boundary Q+3, which is itself a
 * quarter boundary — the next docket publishes immediately after).
 */
export function advanceAccordSenate(
  state: GameState,
  monthIndex: number,
): { state: GameState; events: GameEvent[] } {
  let out = state;
  const events: GameEvent[] = [];

  const docket = out.accordDocket;
  if (docket && !docket.resolved && monthIndex >= docket.quarterIndex + 3) {
    const history = [...(out.accordVoteHistory || [])];
    for (const measureId of docket.measureIds) {
      const { state: next, result, event } = resolveMeasure(out, measureId, docket, monthIndex);
      out = next;
      events.push(event);
      history.unshift(result);
    }
    out = {
      ...out,
      accordDocket: { ...docket, resolved: true },
      accordVoteHistory: history.slice(0, VOTE_HISTORY_CAP),
    };
  }

  if (isQuarterBoundary(monthIndex) && (!out.accordDocket || out.accordDocket.resolved)) {
    const measureIds = pickDocketMeasures(monthIndex);
    out = {
      ...out,
      accordDocket: { quarterIndex: monthIndex, measureIds, resolved: false },
      accordLobbying: [],
    };
    const names = measureIds.map(id => MEASURE_MAP.get(id)?.name || id).join(', ');
    events.push({
      id: generateId(), date: out.gameDate, type: 'random_event',
      title: '🏛️ Accord Council Docket Published',
      description: `This quarter's docket: ${names}. Lobbying is open until the next quarterly session.`,
    });
  }

  return { state: out, events };
}
