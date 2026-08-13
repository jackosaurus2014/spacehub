// ─── Space Tycoon: server-computed effects hand-off (audit Wave B) ───────────
// Audit Change #6 (A2 alliance bonus pipe-through) + A7 (territory pays) +
// A8 (espionage rewards) + A3 (league promotion boosts).
//
// The sync route already computes per-player alliance bonuses, zone
// standings, espionage rewards, and finalized league results — but until
// this wave "the entire alliance bonus pipeline is severed one hop before
// the player's tick" (audit §1a "Alliances"). This module is that missing
// hop. It mirrors the ledger-reconcile hand-off pattern:
//
//   useGameSync (React hook, cannot mutate game state) queues the snapshot →
//   game-engine.processFullTick consumes it on the next tick and stores it
//   on GameState via applyServerEffectsToState → processTick multiplies the
//   stored bonuses into revenue/mining/research/build-speed.
//
// Solo / logged-out players never receive a snapshot: state fields stay
// undefined and every consumer falls back to neutral multipliers.

import type { GameState } from './types';

export interface AllianceBonusSnapshot {
  revenueBonus: number;    // fraction, e.g. 0.25 = +25%
  miningBonus: number;
  researchBonus: number;
  buildSpeedBonus: number;
  /** Diplomacy trade-agreement broker-fee reduction (audit A2), informational
   *  client-side — the mechanical fee cut is applied server-side in
   *  market/trade/route.ts. */
  tradeBonus?: number;
}

export interface ZoneStandingSnapshot {
  zoneSlug: string;
  sharePct: number;
  isGovernor: boolean;
  /** Zone-wide monthly service base revenue across all synced players —
   *  the governor tax base (audit A7). */
  taxBaseMonthly: number;
}

export interface IntelPerkSnapshot {
  type: 'market_discount' | 'headhunt_voucher';
  discount: number;        // fraction, e.g. 0.10 / 0.50
  expiresAtMs: number;
  resources?: string[];    // market_discount: resource slugs it covers
}

export interface LeagueBoostSnapshot {
  seasonId: string;
  rank: number;
  league: number;
  boostType: 'construction' | 'research';
  boostMultiplier: number;
  boostDurationSeconds: number;
}

export interface ServerEffectsSnapshot {
  allianceBonuses?: AllianceBonusSnapshot | null;
  zoneStandings?: ZoneStandingSnapshot[];
  espionagePerks?: IntelPerkSnapshot[];
  leagueBoost?: LeagueBoostSnapshot | null;
  fetchedAtMs: number;
}

// ─── Safety clamps (BALANCE.md "design invariants") ──────────────────────────
// Server data is trusted more than client data, but a bugged aggregate must
// never explode the revenue product. Caps chosen from the max legitimate
// stacks visible in alliance-events/research/treasury/projects.

export const ALLIANCE_REVENUE_BONUS_CAP = 0.75;
export const ALLIANCE_MINING_BONUS_CAP = 0.50;
export const ALLIANCE_RESEARCH_BONUS_CAP = 0.50;
export const ALLIANCE_BUILD_SPEED_BONUS_CAP = 0.50;

export function clampAllianceBonuses(b: AllianceBonusSnapshot | null | undefined): AllianceBonusSnapshot | null {
  if (!b) return null;
  const safe = (v: unknown, cap: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(cap, v)) : 0;
  return {
    revenueBonus: safe(b.revenueBonus, ALLIANCE_REVENUE_BONUS_CAP),
    miningBonus: safe(b.miningBonus, ALLIANCE_MINING_BONUS_CAP),
    researchBonus: safe(b.researchBonus, ALLIANCE_RESEARCH_BONUS_CAP),
    buildSpeedBonus: safe(b.buildSpeedBonus, ALLIANCE_BUILD_SPEED_BONUS_CAP),
    tradeBonus: safe(b.tradeBonus, 0.50),
  };
}

/**
 * Apply a server-effects snapshot into game state. Pure + idempotent:
 * re-applying the same snapshot yields the same state (league boosts are
 * deduped via claimedLeagueBoostSeasonIds, everything else is a plain
 * overwrite of the server-owned mirror fields).
 */
export function applyServerEffectsToState(state: GameState, eff: ServerEffectsSnapshot): GameState {
  if (!eff) return state;

  let out: GameState = {
    ...state,
    // Audit A2: alliance bonuses finally reach the tick.
    allianceBonuses: clampAllianceBonuses(eff.allianceBonuses) || state.allianceBonuses,
    // Audit A7: zone standings (governor/stakeholder) for the tick.
    zoneStandings: Array.isArray(eff.zoneStandings) ? eff.zoneStandings : state.zoneStandings,
    // Audit A8: espionage rewards become consumable perks.
    activeIntelPerks: Array.isArray(eff.espionagePerks)
      ? eff.espionagePerks.filter(p => p && typeof p.expiresAtMs === 'number' && p.expiresAtMs > eff.fetchedAtMs)
      : state.activeIntelPerks,
  };

  // Audit §1b "Leagues": grant the promotion boost the league system defines
  // (league-system.ts getLeagueRewards boostType/boostMultiplier were
  // computed and dropped — "never create an ActiveBoost"). Granted into
  // availableBoosts (player activates when ready — a 1-4h boost auto-lit at
  // login would be wasted). Deduped per season so sync retries can't
  // double-grant. Deterministic id — no Math.random in tick paths.
  const boost = eff.leagueBoost;
  if (
    boost &&
    boost.seasonId &&
    boost.boostType &&
    boost.boostMultiplier > 1 &&
    boost.boostDurationSeconds > 0 &&
    !(state.claimedLeagueBoostSeasonIds || []).includes(boost.seasonId)
  ) {
    out = {
      ...out,
      claimedLeagueBoostSeasonIds: [...(state.claimedLeagueBoostSeasonIds || []), boost.seasonId].slice(-12),
      availableBoosts: [
        ...(out.availableBoosts || []),
        {
          id: `boost_league_${boost.seasonId}`,
          type: boost.boostType,
          multiplier: boost.boostMultiplier,
          durationSeconds: boost.boostDurationSeconds,
          source: 'league_reward',
          label: `League rank #${boost.rank}: ${boost.boostMultiplier}x ${boost.boostType} (${Math.round(boost.boostDurationSeconds / 3600)}h)`,
        },
      ],
      eventLog: [{
        id: `evt_league_boost_${boost.seasonId}`,
        date: state.gameDate,
        type: 'milestone' as const,
        title: `🏁 League reward: ${boost.boostMultiplier}x ${boost.boostType} boost`,
        description: `Finished rank #${boost.rank} in league ${boost.league}. Boost added to your available boosts.`,
      }, ...out.eventLog].slice(0, 200),
    };
  }

  return out;
}

// ─── Hand-off queue (client only) ────────────────────────────────────────────
// Single-slot, newest wins — a fresher snapshot always supersedes an
// unconsumed older one. Same pattern as ledger-reconcile.ts.

let pendingEffects: ServerEffectsSnapshot | null = null;

export function queueServerEffects(eff: ServerEffectsSnapshot): void {
  if (!eff || typeof eff.fetchedAtMs !== 'number') return;
  if (pendingEffects && pendingEffects.fetchedAtMs >= eff.fetchedAtMs) return;
  pendingEffects = eff;
}

export function consumeServerEffects(): ServerEffectsSnapshot | null {
  const eff = pendingEffects;
  pendingEffects = null;
  return eff;
}

/** Test helper — clears the queue. */
export function __clearServerEffectsQueue(): void {
  pendingEffects = null;
}
