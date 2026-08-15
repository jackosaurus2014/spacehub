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
import { MENTOR_REVENUE_BONUS_CAP, MENTEE_BOOST_CAP } from './constants';
import type { DemandPoolSnapshot, DemandPoolEntry } from './demand-pools';
import { clampDemandMultiplier } from './service-pricing';

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

/** Sol Events (real-world feed, src/lib/game/real-world-feed.ts): modest,
 *  time-bounded, world-shared bonuses derived from real launch-window /
 *  program-milestone events. Queued by WorldEventsBanner.tsx (public feed,
 *  no auth required — unlike the rest of this snapshot, which only ever
 *  arrives via the authenticated sync route) alongside whatever the sync
 *  pipeline already queued. Deliberately flat, no compounding, no PvP. */
export interface WorldEventBonusSnapshot {
  contractPayoutBonus: number;
  researchSpeedBonus: number;
  expiresAtMs: number;
}

/** Mentorship (LS2 mechanic 3 — docs/LIVE_SERVICE_2026-08.md §LS2): wires
 *  catchup-mechanics.ts's previously dead-code calculateMentorshipRewards
 *  through a real server pairing (GameMentorship, prisma schema). Computed
 *  in sync/route.ts exactly like allianceBonuses (§1) — a profile is either
 *  a mentor (revenueBonus only, up to +5%) or a mentee (all three, up to
 *  +20%), never both at once. */
export interface MentorshipBonusSnapshot {
  revenueBonus: number;
  miningBonus: number;
  researchBonus: number;
}

export interface ServerEffectsSnapshot {
  allianceBonuses?: AllianceBonusSnapshot | null;
  zoneStandings?: ZoneStandingSnapshot[];
  espionagePerks?: IntelPerkSnapshot[];
  leagueBoost?: LeagueBoostSnapshot | null;
  worldEventBonuses?: WorldEventBonusSnapshot | null;
  mentorshipBonuses?: MentorshipBonusSnapshot | null;
  /** Wave E4 (Finite Demand Pools, §2.1/§E4): per-(location, category) pool
   *  snapshot — mult, pool size, this player's share, anonymized top-supplier
   *  shares. Applied via mergeDemandPoolSnapshot (re-clamped; previous
   *  playerShare stamped so the Situation Log can flag share drops). */
  demandPools?: DemandPoolSnapshot | null;
  fetchedAtMs: number;
}

// ─── Wave E4: demand-pool snapshot merge ────────────────────────────────────

/**
 * Sanitize an incoming demand-pool snapshot and stamp each entry's
 * prevPlayerShare from the previous snapshot — the delta the Situation Log's
 * "competitor undercutting at X" items key off. Pure; defensive clamps on
 * every numeric field (same posture as clampAllianceBonuses: server data is
 * trusted more than client data, but a bugged aggregate must never explode
 * the revenue product).
 */
export function mergeDemandPoolSnapshot(
  prev: DemandPoolSnapshot | null | undefined,
  next: DemandPoolSnapshot | null | undefined,
): DemandPoolSnapshot | null {
  if (!next || typeof next.asOf !== 'number' || !next.pools || typeof next.pools !== 'object') return prev ?? null;
  const share = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  const money = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
  const pools: Record<string, DemandPoolEntry> = {};
  for (const [key, e] of Object.entries(next.pools)) {
    if (!e || typeof e !== 'object') continue;
    const prevEntry = prev?.pools?.[key];
    pools[key] = {
      locationId: String(e.locationId || key.split(':')[0] || ''),
      category: e.category,
      mult: clampDemandMultiplier(e.mult),
      dTotal: money(e.dTotal),
      dNpc: money(e.dNpc),
      cSupply: money(e.cSupply),
      playerShare: share(e.playerShare),
      prevPlayerShare: prevEntry ? share(prevEntry.playerShare) : share(e.playerShare),
      topShares: Array.isArray(e.topShares) ? e.topShares.slice(0, 3).map(share) : [],
      supplierCount: typeof e.supplierCount === 'number' && Number.isFinite(e.supplierCount)
        ? Math.max(0, Math.floor(e.supplierCount)) : 0,
    };
  }
  return { pools, asOf: next.asOf };
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

// Sol Events caps — deliberately small (CLAUDE.md "effects modest"). These
// are flat flavor bonuses, not stackable per-event-instance; a bugged feed
// can never exceed +10%.
export const WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP = 0.10;
export const WORLD_EVENT_RESEARCH_SPEED_BONUS_CAP = 0.10;

export function clampWorldEventBonuses(
  b: WorldEventBonusSnapshot | null | undefined,
  nowMs: number = Date.now(),
): WorldEventBonusSnapshot | null {
  if (!b) return null;
  if (typeof b.expiresAtMs !== 'number' || b.expiresAtMs <= nowMs) return null;
  const safe = (v: unknown, cap: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(cap, v)) : 0;
  return {
    contractPayoutBonus: safe(b.contractPayoutBonus, WORLD_EVENT_CONTRACT_PAYOUT_BONUS_CAP),
    researchSpeedBonus: safe(b.researchSpeedBonus, WORLD_EVENT_RESEARCH_SPEED_BONUS_CAP),
    expiresAtMs: b.expiresAtMs,
  };
}

export function clampMentorshipBonuses(b: MentorshipBonusSnapshot | null | undefined): MentorshipBonusSnapshot | null {
  if (!b) return null;
  const safe = (v: unknown, cap: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(cap, v)) : 0;
  // A mentor's revenueBonus and a mentee's revenueBonus share the same field
  // but different caps depending on role; the server never sends both roles
  // in one snapshot, so clamping to the WIDER cap here is safe — the
  // narrower per-role cap is already enforced where the snapshot is built
  // (sync/route.ts), this is only a defensive ceiling against a bugged
  // aggregate, same posture as clampAllianceBonuses.
  const wideCap = Math.max(MENTOR_REVENUE_BONUS_CAP, MENTEE_BOOST_CAP);
  return {
    revenueBonus: safe(b.revenueBonus, wideCap),
    miningBonus: safe(b.miningBonus, MENTEE_BOOST_CAP),
    researchBonus: safe(b.researchBonus, MENTEE_BOOST_CAP),
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
    // Sol Events (real-world feed): world-shared launch-window / milestone
    // bonuses, queued independently by WorldEventsBanner.tsx. Re-clamped
    // (and expiry-checked) here rather than trusted from the snapshot —
    // same defensive posture as clampAllianceBonuses above.
    worldEventBonuses: eff.worldEventBonuses !== undefined
      ? clampWorldEventBonuses(eff.worldEventBonuses, eff.fetchedAtMs)
      : state.worldEventBonuses,
    // LS2 mechanic 3: mentorship bonuses reach the tick the same hop
    // allianceBonuses does.
    mentorshipBonuses: eff.mentorshipBonuses !== undefined
      ? clampMentorshipBonuses(eff.mentorshipBonuses)
      : state.mentorshipBonuses,
    // Wave E4: finite demand pools reach the tick the same hop the alliance
    // bonuses do. Merge stamps prevPlayerShare for share-drop alerts.
    demandPools: eff.demandPools !== undefined
      ? mergeDemandPoolSnapshot(state.demandPools, eff.demandPools)
      : state.demandPools,
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
