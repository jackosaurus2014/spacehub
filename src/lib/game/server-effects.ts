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
// Wave E5 (docs/ECONOMY_PVP_2026-08.md §E5): the three new server-shared
// snapshots this wave delivers — deposit extraction pressure, the labor
// wage index, and per-lane fuel-discount bonuses. Same type-only + clamp
// posture as demandPools above.
import {
  EXTRACTION_PRESSURE_MIN, EXTRACTION_PRESSURE_MAX,
  type ExtractionPressureSnapshot,
} from './extraction-pressure';
import { WAGE_INDEX_MIN, WAGE_INDEX_MAX, type LaborMarketSnapshot } from './labor-market';
import { LANE_BONUS_CAP, type LaneBonusSnapshot } from './trade-lanes';
// Balance Pass 9: the quarterly offense-fee-index snapshot rides the same
// hop (fee-index.ts — factor clamp shared with every consumer).
import { clampFeeIndexFactor } from './fee-index';
// Wave M5 (docs/MEANINGFUL_2026-08.md §M5): the offense snapshot — price
// campaigns, poach offers/outcomes, freight tolls, cornering alerts — rides
// the same hop. Clamping AND poach-outcome application live in offense.ts
// (applyOffenseToState is idempotent via appliedPoachOfferIds).
import { applyOffenseToState, type OffenseSnapshot } from './offense';
// Wave M6 (docs/MEANINGFUL_2026-08.md §M6): the equity snapshot — share
// registry, tenders, holdings — delivered the same hop. Clamp lives in
// share-registry.ts (pure), same type-only posture as demandPools above.
import { clampEquitySnapshot, type EquitySnapshot } from './share-registry';
// AAA Round 1 wave E1 (docs/AAA_PROGRAM_2026-08.md): the Accord Chair
// snapshot — election phase, live tally, the seated Chair's agenda writs and
// this corporation's fracture status — rides the same hop. Clamp lives in
// accord-chair.ts (pure), same type-only posture as demandPools above.
import { clampChairSnapshot, type ChairSnapshot } from './accord-chair';
// AAA Round 2 (docs/AAA_PROGRAM_2026-08.md): the systemic-crisis snapshot —
// the published world index, the assessment target and pool, this
// corporation's pledge, and the seated Chair's relief directive — rides the
// same hop. Clamp lives in systemic-crises.ts (pure), same type-only posture
// as demandPools above.
import { clampCrisisSnapshot, type CrisisSnapshot } from './systemic-crises';
// GAME_DESIGN_REVIEW_2026-09 rows 11 + 14: NPC density governor snapshot and
// settled rivalry stakes ride the same hop. Both modules are pure.
import { activeNpcCorpCount, activeNpcIndustryCount, type NpcGovernorSnapshot } from './npc-companies';
import { RIVALRY_STAKE, RIVALRY_RESULTS_KEEP, type RivalryStakeResult } from './rivalry-stake';
// Diplomacy (2026-09-02): the diplomacy snapshot + reputation events ride
// the same hop the rivalry stakes do (corp-diplomacy.ts).
import { applyDiplomacyRepToState, clampDiplomacySnapshot, type DiplomacySnapshot, type DiplomacyRepEvent } from './corp-diplomacy';

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

/** Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 6 "mega-project
 *  permanentBonus actually applied — audit §1d"): mega-projects.ts's
 *  MegaProjectDefinition.permanentBonus rewards were display-string-only
 *  (never multiplied into the tick). Cooperative mega-projects are
 *  GLOBALLY shared (one MegaProject row per type, not per-player — see
 *  mega-projects.ts header) — once a type reaches server status
 *  'completed', its permanentBonus applies to EVERY synced player, world-
 *  shared like alliance/season bonuses. Same shape/clamp posture as
 *  AllianceBonusSnapshot above; `launchCostReduction` is display-only for
 *  now (no single tick-level launch-cost multiplier site exists yet — see
 *  mega-projects.ts's getMegaProjectBonuses header). */
export interface MegaProjectBonusSnapshot {
  revenueBonus: number;
  miningBonus: number;
  researchBonus: number;
  launchCostReduction: number;
}

export interface ServerEffectsSnapshot {
  allianceBonuses?: AllianceBonusSnapshot | null;
  zoneStandings?: ZoneStandingSnapshot[];
  espionagePerks?: IntelPerkSnapshot[];
  leagueBoost?: LeagueBoostSnapshot | null;
  worldEventBonuses?: WorldEventBonusSnapshot | null;
  mentorshipBonuses?: MentorshipBonusSnapshot | null;
  /** Wave E7: world-shared cooperative mega-project bonuses (see
   *  MegaProjectBonusSnapshot above). */
  megaProjectBonuses?: MegaProjectBonusSnapshot | null;
  /** Wave E4 (Finite Demand Pools, §2.1/§E4): per-(location, category) pool
   *  snapshot — mult, pool size, this player's share, anonymized top-supplier
   *  shares. Applied via mergeDemandPoolSnapshot (re-clamped; previous
   *  playerShare stamped so the Situation Log can flag share drops). */
  demandPools?: DemandPoolSnapshot | null;
  /** Wave E5 (§2.4): per-(location, resource) deposit extraction-pressure
   *  snapshot (extraction-pressure.ts). */
  extractionPressure?: ExtractionPressureSnapshot | null;
  /** Wave E5 (§2.6): server-wide wage-index-per-crew-type snapshot
   *  (labor-market.ts), refreshed by the weekly labor cron. */
  laborMarket?: { index: LaborMarketSnapshot; asOf: number } | null;
  /** Wave E5 (§2.8): per-lane fuel-discount snapshot (trade-lanes.ts). */
  laneBonuses?: LaneBonusSnapshot | null;
  /** Balance Pass 9: quarterly offense-fee-index snapshot (fee-index.ts) —
   *  factor clamp(worldMedianMonthlyNet / $30M, 1, 50), fail-soft 1. */
  feeIndex?: import('./fee-index').FeeIndexSnapshot | null;
  /** Wave M5 (§M5): offense snapshot — campaigns/poach/tolls/cornering
   *  (offense.ts). Applied via applyOffenseToState (idempotent). */
  offense?: OffenseSnapshot | null;
  /** Wave M6 (docs/MEANINGFUL_2026-08.md §M6): share-registry/takeover
   *  snapshot — my capital structure, tenders targeting me, my offers,
   *  my holdings (share-registry.ts). Re-clamped via clampEquitySnapshot;
   *  null = gate closed or never synced (pre-M6 behavior). */
  equity?: EquitySnapshot | null;
  /** AAA Round 1 wave E1: the Accord Chair snapshot (accord-chair.ts).
   *  Re-clamped via clampChairSnapshot; null = gate closed, schema not
   *  pushed, or never synced (pre-E1 behavior — no election, no writs,
   *  never fractured). Read-only: the client never mutates it. */
  chair?: ChairSnapshot | null;
  /** AAA Round 2: the systemic-crisis snapshot (systemic-crises.ts).
   *  Re-clamped via clampCrisisSnapshot; null = schema not pushed, no cycle
   *  published, or never synced (pre-Round-2 behaviour — no crisis at all).
   *  Read-only: the client never mutates it. */
  crisis?: CrisisSnapshot | null;
  /** GAME_DESIGN_REVIEW_2026-09 row 11: NPC density governor — how many of
   *  the per-save NPC corps tick for the current 30-day-active population.
   *  Re-derived from activePlayers30d on apply (never trusted as sent). */
  npcGovernor?: NpcGovernorSnapshot | null;
  /** GAME_DESIGN_REVIEW_2026-09 row 14: settled rivalry-stake WINS for this
   *  profile (PlayerActivity 'rivalry_win' rows, last 4 weeks). Applied
   *  idempotently by activity id — +rep, capped per week on apply too. */
  rivalryStakes?: RivalryStakeResult[] | null;
  /** Diplomacy (2026-09-02): directed contract offers / milestones due /
   *  pact proposals for the Situation Log (corp-diplomacy.ts). Re-clamped
   *  via clampDiplomacySnapshot; null = never synced. */
  diplomacy?: DiplomacySnapshot | null;
  /** Diplomacy: server-side reputation deltas (+1 fulfilled / −2 default /
   *  −3 pact broken), applied idempotently by CorpReputationEvent id. */
  diplomacyRep?: DiplomacyRepEvent[] | null;
  fetchedAtMs: number;
}

/** Row 11: never trust the counts as sent — recompute from the population
 *  number so a bugged/hostile snapshot can't silence the whole backdrop. */
export function clampNpcGovernorSnapshot(snap: NpcGovernorSnapshot | null | undefined): NpcGovernorSnapshot | null {
  if (!snap || typeof snap !== 'object') return null;
  const n = typeof snap.activePlayers30d === 'number' && Number.isFinite(snap.activePlayers30d)
    ? Math.max(0, Math.round(snap.activePlayers30d)) : 0;
  return {
    activePlayers30d: n,
    activeNpcCorps: activeNpcCorpCount(n),
    activeIndustryCorps: activeNpcIndustryCount(n),
    asOf: typeof snap.asOf === 'number' ? snap.asOf : Date.now(),
  };
}

/**
 * Row 14: fold settled rivalry-stake wins into the save. Pure and
 * idempotent — keyed on the PlayerActivity id, so sync retries and multiple
 * tabs can't double-grant. The per-week cap is enforced server-side at
 * settlement AND re-enforced here per weekId as defense in depth.
 */
export function applyRivalryStakesToState(state: GameState, stakes: RivalryStakeResult[] | null | undefined): GameState {
  if (!Array.isArray(stakes) || stakes.length === 0) return state;
  const applied = new Set(state.rivalryStakesApplied || []);
  const perWeek = new Map<number, number>();
  for (const r of state.rivalryResults || []) perWeek.set(r.weekId, (perWeek.get(r.weekId) || 0) + r.rep);
  let reputation = state.reputation || 0;
  const results = [...(state.rivalryResults || [])];
  const eventLog = [...state.eventLog];
  let changed = false;
  for (const s of stakes) {
    if (!s || typeof s.id !== 'string' || applied.has(s.id)) continue;
    if (typeof s.rep !== 'number' || !Number.isFinite(s.rep)) continue;
    const weekId = typeof s.weekId === 'number' ? s.weekId : 0;
    const room = RIVALRY_STAKE.REP_CAP_PER_WEEK - (perWeek.get(weekId) || 0);
    const rep = Math.max(0, Math.min(RIVALRY_STAKE.REP_PER_WIN, Math.min(room, Math.round(s.rep))));
    applied.add(s.id);
    perWeek.set(weekId, (perWeek.get(weekId) || 0) + rep);
    reputation += rep;
    const opponent = typeof s.opponent === 'string' ? s.opponent.slice(0, 50) : 'a rival';
    results.push({ id: s.id, weekId, opponent, rep, atMs: typeof s.atMs === 'number' ? s.atMs : Date.now() });
    eventLog.unshift({
      id: `evt_rivalry_win_${s.id}`,
      date: state.gameDate,
      type: 'milestone' as const,
      title: `⚔️ Rivalry stake won vs ${opponent}`,
      description: rep > 0
        ? `You out-grew ${opponent} week over week. +${rep} reputation.`
        : `You out-grew ${opponent} week over week (weekly reputation cap already reached).`,
    });
    changed = true;
  }
  if (!changed) return state;
  return {
    ...state,
    reputation,
    rivalryStakesApplied: Array.from(applied).slice(-48),
    rivalryResults: results.slice(-RIVALRY_RESULTS_KEEP),
    eventLog: eventLog.slice(0, 200),
  };
}

// ─── Wave E5: clamp helpers (defensive — server data trusted more than
// client, but a bugged aggregate must never explode mining output, payroll,
// or freight cost) ────────────────────────────────────────────────────────

function clampExtractionPressureSnapshot(
  snap: ExtractionPressureSnapshot | null | undefined,
): ExtractionPressureSnapshot | null {
  if (!snap || !snap.entries) return null;
  const entries: ExtractionPressureSnapshot['entries'] = {};
  for (const [key, e] of Object.entries(snap.entries)) {
    if (!e || typeof e.pressure !== 'number' || !Number.isFinite(e.pressure)) continue;
    entries[key] = {
      locationId: e.locationId,
      resourceId: e.resourceId,
      pressure: Math.max(EXTRACTION_PRESSURE_MIN, Math.min(EXTRACTION_PRESSURE_MAX, e.pressure)),
    };
  }
  return { entries, asOf: typeof snap.asOf === 'number' ? snap.asOf : Date.now() };
}

function clampLaborMarketSnapshot(
  snap: { index: LaborMarketSnapshot; asOf: number } | null | undefined,
): { index: LaborMarketSnapshot; asOf: number } | null {
  if (!snap || !snap.index) return null;
  const index: LaborMarketSnapshot = {};
  for (const [type, v] of Object.entries(snap.index)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    index[type as keyof LaborMarketSnapshot] = Math.max(WAGE_INDEX_MIN, Math.min(WAGE_INDEX_MAX, v));
  }
  return { index, asOf: typeof snap.asOf === 'number' ? snap.asOf : Date.now() };
}

// Balance Pass 9: fee-index snapshot clamp — factor bounded [1, 50], a
// bugged aggregate can never turn offense fees into discounts or ×1000s.
function clampFeeIndexSnapshot(
  snap: import('./fee-index').FeeIndexSnapshot | null | undefined,
): import('./fee-index').FeeIndexSnapshot | null {
  if (!snap || typeof snap !== 'object') return null;
  return {
    factor: clampFeeIndexFactor(snap.factor),
    medianMonthlyNet: typeof snap.medianMonthlyNet === 'number' && Number.isFinite(snap.medianMonthlyNet)
      ? Math.round(snap.medianMonthlyNet) : 0,
    asOf: typeof snap.asOf === 'number' ? snap.asOf : Date.now(),
  };
}

function clampLaneBonusSnapshot(snap: LaneBonusSnapshot | null | undefined): LaneBonusSnapshot | null {
  if (!snap || !snap.bonuses) return null;
  const bonuses: Record<string, number> = {};
  for (const [key, v] of Object.entries(snap.bonuses)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    bonuses[key] = Math.max(0, Math.min(LANE_BONUS_CAP, v));
  }
  return { bonuses, asOf: typeof snap.asOf === 'number' ? snap.asOf : Date.now() };
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

// Wave E7: caps match the largest single permanentBonus.baseValue actually
// authored in mega-projects.ts (0.25 mining) with headroom for multiple
// completed projects to stack (a corporation-era-scale achievement, not a
// quick win — the durationDays/moneyCost gates already make stacking rare).
export const MEGA_PROJECT_REVENUE_BONUS_CAP = 0.30;
export const MEGA_PROJECT_MINING_BONUS_CAP = 0.50;
export const MEGA_PROJECT_RESEARCH_BONUS_CAP = 0.40;
export const MEGA_PROJECT_LAUNCH_COST_REDUCTION_CAP = 0.30;

export function clampMegaProjectBonuses(b: MegaProjectBonusSnapshot | null | undefined): MegaProjectBonusSnapshot | null {
  if (!b) return null;
  const safe = (v: unknown, cap: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(cap, v)) : 0;
  return {
    revenueBonus: safe(b.revenueBonus, MEGA_PROJECT_REVENUE_BONUS_CAP),
    miningBonus: safe(b.miningBonus, MEGA_PROJECT_MINING_BONUS_CAP),
    researchBonus: safe(b.researchBonus, MEGA_PROJECT_RESEARCH_BONUS_CAP),
    launchCostReduction: safe(b.launchCostReduction, MEGA_PROJECT_LAUNCH_COST_REDUCTION_CAP),
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
    // Wave E7: cooperative mega-project bonuses reach the tick the same hop
    // allianceBonuses does.
    megaProjectBonuses: eff.megaProjectBonuses !== undefined
      ? clampMegaProjectBonuses(eff.megaProjectBonuses)
      : state.megaProjectBonuses,
    // Wave E4: finite demand pools reach the tick the same hop the alliance
    // bonuses do. Merge stamps prevPlayerShare for share-drop alerts.
    demandPools: eff.demandPools !== undefined
      ? mergeDemandPoolSnapshot(state.demandPools, eff.demandPools)
      : state.demandPools,
    // Wave E5: deposit extraction pressure, labor wage index, and lane fuel
    // discounts reach the tick the same hop demandPools does.
    extractionPressure: eff.extractionPressure !== undefined
      ? clampExtractionPressureSnapshot(eff.extractionPressure)
      : state.extractionPressure,
    laborMarket: eff.laborMarket !== undefined
      ? clampLaborMarketSnapshot(eff.laborMarket)
      : state.laborMarket,
    laneBonuses: eff.laneBonuses !== undefined
      ? clampLaneBonusSnapshot(eff.laneBonuses)
      : state.laneBonuses,
    // Balance Pass 9: the offense-fee-index snapshot reaches the tick the
    // same hop laborMarket does.
    feeIndex: eff.feeIndex !== undefined
      ? clampFeeIndexSnapshot(eff.feeIndex)
      : state.feeIndex,
    // Wave M6: the equity snapshot reaches the tick the same hop demandPools
    // does. Plain clamped stash — the consumers (Situation Log, calendar,
    // the integration-malus multiplier in game-engine.ts) are all pure
    // lenses over state.equity.
    equity: eff.equity !== undefined
      ? clampEquitySnapshot(eff.equity)
      : state.equity,
    // AAA E1: the Chair snapshot reaches the tick the same hop equity does.
    // Plain clamped stash — its consumers (accord-senate's docket writs and
    // fracture exemption, factions.ts's effective standing, the Chair panel)
    // are all pure lenses over state.accordChair.
    accordChair: eff.chair !== undefined
      ? (eff.chair ? clampChairSnapshot(eff.chair) : null)
      : state.accordChair,
    // AAA Round 2: the crisis snapshot reaches the tick the same hop the
    // Chair snapshot does. Plain clamped stash — every consumer
    // (advanceSystemicCrisis, the insurance premium loading, the Situation
    // Log, the Mission Calendar, the Emergency panel) is a pure lens over
    // state.systemicCrisis.
    systemicCrisis: eff.crisis !== undefined
      ? (eff.crisis ? clampCrisisSnapshot(eff.crisis) : null)
      : state.systemicCrisis,
    // Row 11: the NPC density governor reaches the tick the same hop. Counts
    // are re-derived from the population number, never trusted as sent.
    npcGovernor: eff.npcGovernor !== undefined
      ? clampNpcGovernorSnapshot(eff.npcGovernor)
      : state.npcGovernor,
    // Diplomacy (2026-09-02): plain clamped stash — the Situation Log and
    // the Contracts hub badge are pure lenses over state.diplomacy.
    diplomacy: eff.diplomacy !== undefined
      ? clampDiplomacySnapshot(eff.diplomacy)
      : state.diplomacy,
  };

  // Row 14: settled rivalry-stake wins → reputation (idempotent by id).
  if (eff.rivalryStakes !== undefined && eff.rivalryStakes !== null) {
    out = applyRivalryStakesToState(out, eff.rivalryStakes);
  }

  // Diplomacy: contract fulfilment / default / pact-break reputation
  // deltas → reputation (idempotent by CorpReputationEvent id).
  if (eff.diplomacyRep !== undefined && eff.diplomacyRep !== null) {
    out = applyDiplomacyRepToState(out, eff.diplomacyRep);
  }

  // Wave M5: the offense snapshot reaches the tick the same hop demandPools
  // does — but application is more than a stash (poach outcomes move crew
  // headcount, idempotently), so it delegates to offense.ts.
  if (eff.offense !== undefined && eff.offense !== null) {
    out = applyOffenseToState(out, eff.offense);
  }

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
