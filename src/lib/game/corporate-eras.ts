// ─── Space Tycoon: Corporate Eras (Live-Service Wave LS4) ───────────────────
// docs/LIVE_SERVICE_2026-08.md §LS4. "Your corporation lives in named eras
// with chosen mandates; finished eras become permanent public history."
//
// At Tier 3+, a corporation charters a 90-REAL-DAY epoch with a declared
// focus (one of 8 charters). Each charter grants a mild bonus paired with a
// mild malus — a real economic trade-off, never a free win (CLAUDE.md
// "meaningful decisions" + "no dominant strategies"). Era boundaries are
// wall-clock (Date.now()), NOT game-date — this is the LS4 spec's explicit
// design ("decoupled from tick speed via LS1's clock fix; lapsed players'
// eras still end, and the debrief covers it"). Because the boundary check is
// a pure `now >= endsAtMs` comparison, it produces the IDENTICAL result
// whether evaluated on a live tick or during LS1 away-catchup — "deterministic
// era boundaries, same math for everyone" (no drift risk, no duplicate
// scheduling state, same discipline as world-calendar.ts).
//
// Charter goals are absolute and BRACKET-SCALED: the corporation's league
// bracket (league-system.ts assignPlayerToLeague) at charter time sets how
// much of the goal stat is required for each medal, so a Suborbital-league
// startup and a Galactic-league titan are graded fairly against their own
// scale, never against each other's raw numbers.
//
// No stacking: exactly one era can be active at a time, and its focus
// bonus/malus applies only while active. Era medals feed legacy-system.ts as
// a new milestone family (additive, inside the existing legacy soft caps —
// see legacy-system.ts's "era" milestones).

import type {
  GameState, EraCharterId, EraMedal, EraStatSnapshot,
  ActiveCorporateEra, CompletedCorporateEra, CorporateErasState,
} from './types';
import { assignPlayerToLeague } from './league-system';
import { computeNetWorth } from './frontier';
import { DEFAULT_LEGACY } from './legacy-system';
import { generateId } from './formulas';

// ─── Constants ───────────────────────────────────────────────────────────────

export const ERA_DURATION_MS = 90 * 24 * 60 * 60 * 1000; // 90 real days
/** Corporations below this tier haven't earned board-level chartering yet —
 *  matches the spec ("At Tier 3+"). */
export const ERA_MIN_CORPORATION_TIER = 3;

export const DEFAULT_CORPORATE_ERAS: CorporateErasState = {
  currentEra: null,
  completedEras: [],
};

// ─── Charter definitions ─────────────────────────────────────────────────────

export type EraModifierCategory = 'revenue' | 'cost' | 'buildSpeed' | 'researchSpeed' | 'mining';
export type EraGoalMetric = keyof EraStatSnapshot;
export type EraGoalDirection = 'atLeast' | 'atMost';

export interface EraFocusTerm {
  category: EraModifierCategory;
  /** Signed fraction the modifier math applies as (1 + value) — uniform
   *  across every category. A bonus is always FAVORABLE and a malus always
   *  UNFAVORABLE, but "favorable" flips sign for 'cost': a revenue/
   *  buildSpeed/researchSpeed/mining bonus is positive (e.g. +0.10) and its
   *  malus counterpart negative (e.g. -0.08), while a COST bonus is negative
   *  (cheaper, e.g. -0.12) and a cost malus is positive (pricier overhead,
   *  e.g. +0.08). formatFocusTerm() renders the raw signed value either way
   *  ("+8% operating overhead" correctly reads as bad). */
  value: number;
}

export interface EraCharterDef {
  id: EraCharterId;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  bonus: EraFocusTerm;
  malus: EraFocusTerm;
  goalMetric: EraGoalMetric;
  goalDirection: EraGoalDirection;
  goalLabel: string;
  /** Target at league bracket 1 (Suborbital) before scaling — see
   *  getEraGoalTarget(). */
  goalBaseTarget: number;
}

const MODIFIER_LABEL: Record<EraModifierCategory, string> = {
  revenue: 'service revenue',
  cost: 'operating overhead',
  buildSpeed: 'construction speed',
  researchSpeed: 'research speed',
  mining: 'mining output',
};

export function formatFocusTerm(term: EraFocusTerm): string {
  const pct = Math.round(Math.abs(term.value) * 100);
  const sign = term.value >= 0 ? '+' : '-';
  return `${sign}${pct}% ${MODIFIER_LABEL[term.category]}`;
}

export const ERA_CHARTERS: EraCharterDef[] = [
  {
    id: 'expansion_era',
    name: 'Expansion Era',
    icon: '🏗️',
    tagline: 'Grow the footprint, worry about the overhead later.',
    description: 'Aggressive service rollout across every held location. Revenue climbs, but the sprawl costs more to administer.',
    bonus: { category: 'revenue', value: 0.10 },
    malus: { category: 'cost', value: 0.08 },
    goalMetric: 'buildingsCompleted',
    goalDirection: 'atLeast',
    goalLabel: 'New buildings completed',
    goalBaseTarget: 8,
  },
  {
    id: 'research_renaissance',
    name: 'Research Renaissance',
    icon: '🔬',
    tagline: 'Every department gets a lab budget.',
    description: 'R&D funding surges corporation-wide. Breakthroughs come faster, but so does the administrative overhead of running parallel programs.',
    bonus: { category: 'researchSpeed', value: 0.12 },
    malus: { category: 'cost', value: 0.08 },
    goalMetric: 'researchCompleted',
    goalDirection: 'atLeast',
    goalLabel: 'Research projects completed',
    goalBaseTarget: 6,
  },
  {
    id: 'consolidation',
    name: 'Consolidation',
    icon: '📐',
    tagline: 'Trim the fat, protect the margin.',
    description: 'A disciplined efficiency drive: renegotiated contracts, deferred non-essential spending. Overhead falls, but the growth engine idles.',
    bonus: { category: 'cost', value: -0.12 },
    malus: { category: 'revenue', value: -0.08 },
    goalMetric: 'totalSpent',
    goalDirection: 'atMost',
    goalLabel: 'Total spend kept under',
    goalBaseTarget: 250_000_000,
  },
  {
    id: 'belt_century',
    name: 'Belt Century',
    icon: '☄️',
    tagline: 'Every asteroid is a shift report.',
    description: 'Mining operations run around the clock. Extraction output surges, but construction crews are stretched thin covering the belt.',
    bonus: { category: 'mining', value: 0.15 },
    malus: { category: 'buildSpeed', value: -0.08 },
    goalMetric: 'resourcesMined',
    goalDirection: 'atLeast',
    goalLabel: 'Resources mined',
    goalBaseTarget: 4_000,
  },
  {
    id: 'science_age',
    name: 'Science Age',
    icon: '🧪',
    tagline: 'The labs come first — everything else waits.',
    description: 'Nearly the whole R&D budget, plus mining crews reassigned to survey duty. Research accelerates further than any other charter; extraction suffers for it.',
    bonus: { category: 'researchSpeed', value: 0.10 },
    malus: { category: 'mining', value: -0.08 },
    goalMetric: 'researchCompleted',
    goalDirection: 'atLeast',
    goalLabel: 'Research projects completed',
    goalBaseTarget: 10,
  },
  {
    id: 'logistics_empire',
    name: 'Logistics Empire',
    icon: '🚚',
    tagline: 'Build the fleet, build it fast.',
    description: 'Shipyards run overtime and construction crews prioritize the fleet. Vessels launch faster, but the expanded logistics network raises standing overhead.',
    bonus: { category: 'buildSpeed', value: 0.12 },
    malus: { category: 'cost', value: 0.06 },
    goalMetric: 'shipsBuilt',
    goalDirection: 'atLeast',
    goalLabel: 'Ships built',
    goalBaseTarget: 5,
  },
  {
    id: 'civic_era',
    name: 'Civic Era',
    icon: '🏛️',
    tagline: 'Every deal gets lobbied, every measure gets a position.',
    description: 'Executive attention shifts to the Accord Senate and faction relations. Trade terms improve, but the C-suite has less bandwidth for the research pipeline.',
    bonus: { category: 'revenue', value: 0.08 },
    malus: { category: 'researchSpeed', value: -0.08 },
    goalMetric: 'reputation',
    goalDirection: 'atLeast',
    goalLabel: 'Reputation gained',
    goalBaseTarget: 150,
  },
  {
    id: 'interstellar_prelude',
    name: 'Interstellar Prelude',
    icon: '🌌',
    tagline: 'Everything built this era points at the heliopause.',
    description: 'Shipyard capacity is reserved for expedition-class hulls. Construction on expedition prep accelerates; commercial services are deprioritized in the meantime.',
    bonus: { category: 'buildSpeed', value: 0.10 },
    malus: { category: 'revenue', value: -0.08 },
    goalMetric: 'expeditionsLaunched',
    goalDirection: 'atLeast',
    goalLabel: 'Expeditions launched',
    goalBaseTarget: 1,
  },
];

export const ERA_CHARTER_MAP = new Map(ERA_CHARTERS.map(c => [c.id, c]));

// ─── Bracket scaling ─────────────────────────────────────────────────────────

/** League bracket 1 (Suborbital) = 1.0x; each higher bracket requires
 *  proportionally more of the same stat for the same medal — "fair at every
 *  scale" per the spec, without needing per-bracket goal tables. */
export function getEraBracketScale(bracket: number): number {
  const clamped = Math.max(1, Math.min(8, Math.floor(bracket) || 1));
  return 1 + (clamped - 1) * 0.5; // bracket 1 -> 1.0x, bracket 8 -> 4.5x
}

export function getEraGoalTarget(charter: EraCharterDef, bracketAtStart: number): number {
  return charter.goalBaseTarget * getEraBracketScale(bracketAtStart);
}

// ─── Stat snapshot / goal metric extraction ──────────────────────────────────

export function getEraStatSnapshot(state: GameState): EraStatSnapshot {
  const legacy = state.legacy || DEFAULT_LEGACY;
  return {
    buildingsCompleted: legacy.trackers?.totalBuildingsCompleted ?? state.buildings.filter(b => b.isComplete).length,
    researchCompleted: state.completedResearch.length,
    resourcesMined: legacy.trackers?.totalResourcesMined ?? 0,
    shipsBuilt: legacy.trackers?.totalShipsBuilt ?? (state.ships || []).filter(s => s.isBuilt).length,
    reputation: state.reputation || 0,
    expeditionsLaunched: (state.expeditions || []).length,
    totalSpent: state.totalSpent,
    netWorth: computeNetWorth(state),
  };
}

function getMetricValue(snapshot: EraStatSnapshot, metric: EraGoalMetric): number {
  return snapshot[metric];
}

/** Raw goal-completion ratio: 1.0 = target exactly met. For 'atLeast' goals,
 *  ratio = actual delta / target (uncapped — overshoot can push well past
 *  platinum). For 'atMost' ceiling goals (Consolidation's spend cap), the
 *  two branches meet continuously at score=1 when actual==target: spending
 *  nothing tops out at exactly 2.0 (actual=0 -> 1 + target/target = 2), and
 *  overspending decays smoothly toward 0 (target/actual), so the function is
 *  continuous and monotonic across the whole domain — no cliff at the
 *  target boundary. */
export function computeEraGoalScore(
  charter: EraCharterDef,
  actual: number,
  target: number,
): number {
  if (target <= 0) return 0;
  if (charter.goalDirection === 'atLeast') {
    return Math.max(0, actual) / target;
  }
  // atMost: actual is a spend total (>= 0 always in practice).
  const safeActual = Math.max(0, actual);
  if (safeActual <= target) {
    return 1 + (target - safeActual) / target;
  }
  return Math.max(0, target / safeActual);
}

const MEDAL_THRESHOLDS: { medal: EraMedal; min: number }[] = [
  { medal: 'platinum', min: 1.5 },
  { medal: 'gold', min: 1.0 },
  { medal: 'silver', min: 0.6 },
  { medal: 'bronze', min: 0.25 },
  { medal: 'filed', min: 0 },
];

export function getEraMedalForScore(score: number): EraMedal {
  for (const t of MEDAL_THRESHOLDS) {
    if (score >= t.min) return t.medal;
  }
  return 'filed';
}

// ─── Era focus modifiers (applied while an era is active) ───────────────────

export interface EraModifiers {
  revenueMultiplier: number;
  costMultiplier: number;
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  miningMultiplier: number;
}

export const NEUTRAL_ERA_MODIFIERS: EraModifiers = {
  revenueMultiplier: 1,
  costMultiplier: 1,
  buildSpeedMultiplier: 1,
  researchSpeedMultiplier: 1,
  miningMultiplier: 1,
};

function applyTerm(mods: EraModifiers, term: EraFocusTerm): EraModifiers {
  const next = { ...mods };
  switch (term.category) {
    case 'revenue': next.revenueMultiplier *= (1 + term.value); break;
    case 'cost': next.costMultiplier *= (1 + term.value); break;
    case 'buildSpeed': next.buildSpeedMultiplier *= (1 + term.value); break;
    case 'researchSpeed': next.researchSpeedMultiplier *= (1 + term.value); break;
    case 'mining': next.miningMultiplier *= (1 + term.value); break;
  }
  return next;
}

/** The currently-active era's bonus/malus pair as ready-to-multiply factors,
 *  or the neutral 1.0 set if no era is chartered — safe to call on any save,
 *  including pre-LS4 saves with no `corporateEras` field at all. Pure. */
export function getActiveEraModifiers(state: GameState | undefined | null): EraModifiers {
  const active = state?.corporateEras?.currentEra;
  if (!active) return NEUTRAL_ERA_MODIFIERS;
  const charter = ERA_CHARTER_MAP.get(active.charterId);
  if (!charter) return NEUTRAL_ERA_MODIFIERS;
  let mods = applyTerm(NEUTRAL_ERA_MODIFIERS, charter.bonus);
  mods = applyTerm(mods, charter.malus);
  return mods;
}

// ─── Lifecycle: charter / progress / complete ────────────────────────────────

export interface EraChartabilityCheck {
  allowed: boolean;
  reason?: string;
}

export function canCharterEra(state: GameState, now: number = Date.now()): EraChartabilityCheck {
  const tier = state.corporationTier || 1;
  if (tier < ERA_MIN_CORPORATION_TIER) {
    return { allowed: false, reason: `Requires Corporation Tier ${ERA_MIN_CORPORATION_TIER}+ (currently Tier ${tier}).` };
  }
  if (state.corporateEras?.currentEra) {
    return { allowed: false, reason: 'An era is already in progress. It must complete before the next one is chartered.' };
  }
  return { allowed: true };
}

/** Charter a new era. No-op (returns the same state reference) if the
 *  charter id is unknown or canCharterEra() would reject it — callers should
 *  check canCharterEra() first for a user-facing reason, but this is safe to
 *  call defensively either way. */
export function charterEra(state: GameState, charterId: EraCharterId, now: number = Date.now()): GameState {
  const charter = ERA_CHARTER_MAP.get(charterId);
  if (!charter) return state;
  const gate = canCharterEra(state, now);
  if (!gate.allowed) return state;

  const netWorth = computeNetWorth(state);
  const bracketAtStart = assignPlayerToLeague(netWorth, netWorth);
  const priorEras = state.corporateEras?.completedEras || [];
  const eraIndex = priorEras.length;

  const active: ActiveCorporateEra = {
    eraIndex,
    charterId,
    startedAtMs: now,
    endsAtMs: now + ERA_DURATION_MS,
    bracketAtStart,
    startSnapshot: getEraStatSnapshot(state),
  };

  return {
    ...state,
    corporateEras: {
      currentEra: active,
      completedEras: priorEras,
    },
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'milestone' as const,
      title: `🏛️ Era Chartered: ${charter.name}`,
      description: `${charter.tagline} (${formatFocusTerm(charter.bonus)} / ${formatFocusTerm(charter.malus)}). 90 real days on the clock.`,
    }, ...state.eventLog].slice(0, 50),
  };
}

export interface EraProgressView {
  active: boolean;
  charter?: EraCharterDef;
  era?: ActiveCorporateEra;
  daysElapsed: number;
  daysRemaining: number;
  pctComplete: number;
  goalTarget: number;
  goalActual: number;
  goalScore: number;
  liveMedal: EraMedal;
}

const NO_ACTIVE_ERA_PROGRESS: EraProgressView = {
  active: false,
  daysElapsed: 0,
  daysRemaining: 0,
  pctComplete: 0,
  goalTarget: 0,
  goalActual: 0,
  goalScore: 0,
  liveMedal: 'filed',
};

/** Pure, read-only live view of the active era's progress — safe to call on
 *  every render (does not mutate state). Returns a neutral "no active era"
 *  shape when nothing is chartered. */
export function getEraProgress(state: GameState, now: number = Date.now()): EraProgressView {
  const active = state.corporateEras?.currentEra;
  if (!active) return NO_ACTIVE_ERA_PROGRESS;
  const charter = ERA_CHARTER_MAP.get(active.charterId);
  if (!charter) return NO_ACTIVE_ERA_PROGRESS;

  const elapsedMs = Math.max(0, now - active.startedAtMs);
  const totalMs = Math.max(1, active.endsAtMs - active.startedAtMs);
  const daysElapsed = elapsedMs / (24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, (active.endsAtMs - now) / (24 * 60 * 60 * 1000));
  const pctComplete = Math.min(1, elapsedMs / totalMs);

  const goalTarget = getEraGoalTarget(charter, active.bracketAtStart);
  const currentSnapshot = getEraStatSnapshot(state);
  const startValue = getMetricValue(active.startSnapshot, charter.goalMetric);
  const currentValue = getMetricValue(currentSnapshot, charter.goalMetric);
  const goalActual = charter.goalDirection === 'atLeast'
    ? currentValue - startValue
    : Math.max(0, currentValue - startValue);
  const goalScore = computeEraGoalScore(charter, goalActual, goalTarget);

  return {
    active: true,
    charter,
    era: active,
    daysElapsed,
    daysRemaining,
    pctComplete,
    goalTarget,
    goalActual,
    goalScore,
    liveMedal: getEraMedalForScore(goalScore),
  };
}

export function shouldCompleteEra(state: GameState, now: number = Date.now()): boolean {
  const active = state.corporateEras?.currentEra;
  return !!active && now >= active.endsAtMs;
}

/** Build the headline stat cards for a completed era's Chronicle entry — a
 *  few generic deltas worth reading as history regardless of charter. */
function buildHeadlineStats(start: EraStatSnapshot, end: EraStatSnapshot): { label: string; value: number }[] {
  return [
    { label: 'Net worth growth', value: Math.round(end.netWorth - start.netWorth) },
    { label: 'Buildings completed', value: end.buildingsCompleted - start.buildingsCompleted },
    { label: 'Research completed', value: end.researchCompleted - start.researchCompleted },
    { label: 'Ships built', value: end.shipsBuilt - start.shipsBuilt },
  ];
}

/** Complete the active era, if its 90-day window has elapsed. No-op (returns
 *  the same state reference) otherwise — safe to call every tick.
 *
 *  notableEvents best-effort note: eventLog stores GameDate (the player's own
 *  in-game calendar), not wall-clock time, and — per appendix defect #2 —
 *  a lapsed player's gameDate does not track real elapsed days 1:1 even
 *  after LS1's catch-up re-anchoring. Rather than fabricate a precise
 *  era-window filter off a clock that doesn't reliably correspond to the
 *  90 real days just elapsed, this takes the milestone-type events still
 *  present in the capped 50-entry log at completion time — an honest
 *  "recent highlights" list, the same tolerance world-calendar.ts documents
 *  for its own `estimated` entries. */
export function completeCurrentEra(state: GameState, now: number = Date.now()): GameState {
  if (!shouldCompleteEra(state, now)) return state;
  const active = state.corporateEras!.currentEra!;
  const charter = ERA_CHARTER_MAP.get(active.charterId);
  if (!charter) {
    // Unknown charter id (shouldn't happen outside a corrupted/foreign save)
    // — clear the dangling active era rather than getting stuck forever.
    return { ...state, corporateEras: { currentEra: null, completedEras: state.corporateEras?.completedEras || [] } };
  }

  const endSnapshot = getEraStatSnapshot(state);
  const goalTarget = getEraGoalTarget(charter, active.bracketAtStart);
  const startValue = getMetricValue(active.startSnapshot, charter.goalMetric);
  const endValue = getMetricValue(endSnapshot, charter.goalMetric);
  const goalActual = charter.goalDirection === 'atLeast'
    ? endValue - startValue
    : Math.max(0, endValue - startValue);
  const goalScore = computeEraGoalScore(charter, goalActual, goalTarget);
  const medal = getEraMedalForScore(goalScore);

  const notableEvents = (state.eventLog || [])
    .filter(e => e.type === 'milestone')
    .slice(0, 5)
    .map(e => e.title);

  const record: CompletedCorporateEra = {
    eraIndex: active.eraIndex,
    charterId: active.charterId,
    startedAtMs: active.startedAtMs,
    endedAtMs: now,
    bracketAtStart: active.bracketAtStart,
    medal,
    goalScore,
    goalActual,
    goalTarget,
    headlineStats: buildHeadlineStats(active.startSnapshot, endSnapshot),
    notableEvents,
  };

  const MEDAL_LABEL: Record<EraMedal, string> = {
    platinum: '🏆 Platinum', gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze', filed: '📁 Filed',
  };

  return {
    ...state,
    corporateEras: {
      currentEra: null,
      completedEras: [...(state.corporateEras?.completedEras || []), record],
    },
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'milestone' as const,
      title: `📜 Era Complete: ${charter.name} — ${MEDAL_LABEL[medal]}`,
      description: `${charter.goalLabel}: ${Math.round(goalActual).toLocaleString()} / ${Math.round(goalTarget).toLocaleString()} target. The Era Charters panel has your full report — chronicle it on your public corp page whenever you're ready.`,
    }, ...state.eventLog].slice(0, 50),
  };
}

// ─── Legacy-system helper reads (kept here, consumed by legacy-system.ts
// without a circular import — legacy-system.ts reads state.corporateEras
// directly using the CompletedCorporateEra type from types.ts). ────────────

export function getCompletedEraCount(state: GameState): number {
  return (state.corporateEras?.completedEras || []).length;
}

export function getBestEraMedal(state: GameState): EraMedal | null {
  const eras = state.corporateEras?.completedEras || [];
  if (eras.length === 0) return null;
  const order: EraMedal[] = ['filed', 'bronze', 'silver', 'gold', 'platinum'];
  let best: EraMedal = 'filed';
  for (const e of eras) {
    if (order.indexOf(e.medal) > order.indexOf(best)) best = e.medal;
  }
  return best;
}
