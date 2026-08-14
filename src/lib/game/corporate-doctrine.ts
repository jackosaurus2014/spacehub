// ─── Space Tycoon: Corporate Doctrine & Board Politics (4X Wave W13) ────────
// docs/4X_BASELINE_2026-08.md §1.7 "Internal politics — factions, edicts,
// policies" (MAJOR gap vs. Stellaris/MoO2, translated corporate not civic,
// "lowest priority of the majors"): "Policies = corporate stances with real
// trade-offs (Safety Culture: −hazard damage +build time; Aggressive
// Schedule: inverse; Open Science: +research speed, publishes your
// discoveries into rivals' feeds; Proprietary: inverse). Edicts = board
// directives with monthly upkeep... Pop factions = workforce constituencies
// (engineers' guild, science staff, belt miners' union — Iron Mara's Belt
// Miners' Guild is already in LORE.md) whose approval feeds the existing
// morale writer (workforce.ts:251-299) instead of a new stat."
//
// Three systems, all pure/deterministic, all additive at already-established
// hook sites — the same commanderBonuses/resBonuses pattern game-engine.ts
// already uses at every revenue/build/research/hazard/payroll calc site:
//
//  1. POLICIES — 3 stance pairs (operations / disclosure / compensation),
//     at most one active choice per category. Switching costs money and is
//     cooldown-gated (DOCTRINE_SWITCH_COOLDOWN_MONTHS) — no free
//     re-toggling, a real economic decision. getDoctrineBonuses() turns the
//     active set into small additive/multiplicative terms consumed
//     additively in game-engine.ts, exactly where commanderBonuses/
//     resBonuses already are.
//
//  2. CONSTITUENCIES — 5 workforce/leadership blocs. LORE.md already names
//     two of them (Belt Miners' Guild — Speaker Iron Mara; The Orbital
//     Engineers' Union); the other 3 are corporate-native (science staff,
//     day-to-day operations crew, executive leadership/board). Approval is
//     a PURE function of current policies + recent state (hazards, cash,
//     directive record, training investment) — it is never persisted, so it
//     can never drift, desync, or need a migration; it is recomputed the
//     same way getWorkforceBonuses() is every time it's read. It feeds
//     updateCrewWellbeing() as ONE additive input (CrewWellbeingInputs.
//     constituencyMoraleDelta — the writer itself is extended, not
//     rewritten). Low approval on any bloc makes narrative-events.ts's
//     `board_politics_demand` chain eligible — the existing event/choice
//     channel, not a new UI surface.
//
//  3. BOARD DIRECTIVES — one quarterly growth/profit/safety target,
//     evaluated and regenerated from quarterly-reports.ts's generation
//     point (recordQuarterlyReport hooks advanceBoardDirectives()
//     additively — the doc's "hook its generation point additively"). A hit
//     grants a small reputation bump (reputation.ts — reputation never
//     decreases, so misses never claw it back); a miss applies a small
//     bounded morale penalty (the same 0.5-1.15 band as every other morale
//     touchpoint) and — via getConstituencyApprovals() reading
//     state.boardDirectives — dents Executive Leadership approval on the
//     next read.

import type { GameState } from './types';
import { getMonthlyPayroll, DEFAULT_WORKFORCE, type WorkforceState } from './workforce';
import { formatMoney, generateId } from './formulas';

// ─── 1. Policies ─────────────────────────────────────────────────────────────

export type DoctrineCategory = 'operations' | 'disclosure' | 'compensation';

export type DoctrinePolicyId =
  | 'safety_first' | 'aggressive_schedule'
  | 'open_science' | 'proprietary'
  | 'generous_compensation' | 'lean_compensation';

export interface DoctrinePolicyDef {
  id: DoctrinePolicyId;
  category: DoctrineCategory;
  name: string;
  icon: string;
  description: string;
  /** The catch — always shown next to the benefit so the trade-off is legible. */
  tradeoff: string;
}

export const DOCTRINE_CATEGORY_LABEL: Record<DoctrineCategory, string> = {
  operations: 'Operations Doctrine',
  disclosure: 'Research Disclosure',
  compensation: 'Compensation Philosophy',
};

export const DOCTRINE_POLICIES: DoctrinePolicyDef[] = [
  {
    id: 'safety_first', category: 'operations', name: 'Safety Culture', icon: '🛡️',
    description: 'Every build follows full hazard-mitigation protocol. Hazard damage is measurably reduced across the fleet and buildings.',
    tradeoff: 'Construction runs slower — inspections and redundancy cost time.',
  },
  {
    id: 'aggressive_schedule', category: 'operations', name: 'Aggressive Schedule', icon: '⏱️',
    description: 'Crews build fast and skip the second inspection pass. Construction speeds up noticeably.',
    tradeoff: 'Hazard mitigation suffers — corners cut are corners hazards find.',
  },
  {
    id: 'open_science', category: 'disclosure', name: 'Open Science', icon: '📖',
    description: 'Findings are published openly, accelerating peer review and your own research pipeline.',
    tradeoff: 'Publishing into the open literature also hands rivals your edge — exclusive-contract revenue softens.',
  },
  {
    id: 'proprietary', category: 'disclosure', name: 'Proprietary', icon: '🔒',
    description: 'Discoveries stay in-house. Exclusivity commands a premium on services and contracts.',
    tradeoff: 'No peer-review acceleration — in-house research runs slower without outside eyes.',
  },
  {
    id: 'generous_compensation', category: 'compensation', name: 'Generous Compensation', icon: '💚',
    description: 'Above-market pay and benefits. Crew morale runs measurably higher.',
    tradeoff: 'Payroll costs rise across every worker on the roster.',
  },
  {
    id: 'lean_compensation', category: 'compensation', name: 'Lean Compensation', icon: '✂️',
    description: 'Minimum-viable pay, aggressively managed overhead. Payroll costs drop.',
    tradeoff: 'Morale takes a real hit — crews notice a lean paycheck.',
  },
];

export const DOCTRINE_POLICY_MAP = new Map(DOCTRINE_POLICIES.map(p => [p.id, p]));

export function getPoliciesForCategory(category: DoctrineCategory): DoctrinePolicyDef[] {
  return DOCTRINE_POLICIES.filter(p => p.category === category);
}

export interface CorporateDoctrineState {
  /** Active policy per category, or unset = neutral (no bonus, no penalty). */
  activePolicies: Partial<Record<DoctrineCategory, DoctrinePolicyId>>;
  /** Total game-months-elapsed (gameDate.year*12+gameDate.month, matching
   *  quarterly-reports.ts's getTotalGameMonthsElapsed convention) a category
   *  was last switched — the cooldown gate. */
  lastSwitchedMonth: Partial<Record<DoctrineCategory, number>>;
}

export const DEFAULT_DOCTRINE: CorporateDoctrineState = {
  activePolicies: {},
  lastSwitchedMonth: {},
};

/** No free re-toggling — a real economic decision per CLAUDE.md's "meaningful
 *  decisions" invariant, not a costless stat-stick swap. */
export const DOCTRINE_SWITCH_COOLDOWN_MONTHS = 6;

/** Reorganization cost scales with payroll (a real doctrine shift is
 *  expensive in proportion to headcount) with a floor so it's never trivial
 *  even for a brand-new, crew-less corporation. */
export function getDoctrineSwitchCost(workforce: WorkforceState | undefined): number {
  const payroll = getMonthlyPayroll(workforce || DEFAULT_WORKFORCE);
  return Math.max(2_000_000, Math.round(payroll * 2));
}

export function canSwitchDoctrinePolicy(
  doctrine: CorporateDoctrineState,
  category: DoctrineCategory,
  currentTotalMonths: number,
): { allowed: boolean; monthsRemaining?: number } {
  const last = doctrine.lastSwitchedMonth[category];
  if (last === undefined) return { allowed: true };
  const elapsed = currentTotalMonths - last;
  if (elapsed >= DOCTRINE_SWITCH_COOLDOWN_MONTHS) return { allowed: true };
  return { allowed: false, monthsRemaining: DOCTRINE_SWITCH_COOLDOWN_MONTHS - elapsed };
}

/**
 * Pure state transform: switch (or clear, via `policyId: null`) the active
 * policy for a category. No-op (returns the SAME state reference) if the
 * target is already active, the category/policy pair is invalid, the switch
 * is on cooldown, or the corporation can't afford the reorganization cost —
 * mirrors the rest of the engine's "invalid action is a no-op" convention
 * (see subsidiaries.ts createSubsidiary).
 */
export function switchDoctrinePolicy(
  state: GameState,
  category: DoctrineCategory,
  policyId: DoctrinePolicyId | null,
  currentTotalMonths: number,
): GameState {
  const doctrine = state.corporateDoctrine || DEFAULT_DOCTRINE;
  const current = doctrine.activePolicies[category] ?? null;
  if (current === policyId) return state;
  if (policyId !== null) {
    const def = DOCTRINE_POLICY_MAP.get(policyId);
    if (!def || def.category !== category) return state;
  }
  const gate = canSwitchDoctrinePolicy(doctrine, category, currentTotalMonths);
  if (!gate.allowed) return state;
  const cost = getDoctrineSwitchCost(state.workforce);
  if (state.money < cost) return state;

  const nextActive = { ...doctrine.activePolicies };
  if (policyId === null) delete nextActive[category];
  else nextActive[category] = policyId;

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    corporateDoctrine: {
      activePolicies: nextActive,
      lastSwitchedMonth: { ...doctrine.lastSwitchedMonth, [category]: currentTotalMonths },
    },
  };
}

export interface DoctrineBonuses {
  /** Additive; combined with resBonuses/commanderBonuses hazard resist and
   *  clamped 0-0.9 at the game-engine.ts call site — can be negative
   *  (Aggressive Schedule) but can never push total resistance below 0. */
  hazardResistanceBonus: number;
  buildSpeedMultiplier: number;
  researchSpeedMultiplier: number;
  revenueMultiplier: number;
  payrollMultiplier: number;
  /** Additive; same site/scale as commanderBonuses.crewMoraleBonus. */
  crewMoraleBonus: number;
}

const NEUTRAL_DOCTRINE_BONUSES: DoctrineBonuses = {
  hazardResistanceBonus: 0,
  buildSpeedMultiplier: 1,
  researchSpeedMultiplier: 1,
  revenueMultiplier: 1,
  payrollMultiplier: 1,
  crewMoraleBonus: 0,
};

/** Pure: active policies -> the additive/multiplicative terms consumed at
 *  game-engine.ts's existing calc sites. Magnitudes deliberately modest
 *  (matched to RARITY_MAGNITUDE's 0.02-0.20 commander-bonus band) — a
 *  doctrine choice is a real tilt, not a dominant strategy. */
export function getDoctrineBonuses(doctrine: CorporateDoctrineState | undefined): DoctrineBonuses {
  const bonuses: DoctrineBonuses = { ...NEUTRAL_DOCTRINE_BONUSES };
  const active = doctrine?.activePolicies;
  if (!active) return bonuses;

  switch (active.operations) {
    case 'safety_first':
      bonuses.hazardResistanceBonus += 0.10;
      bonuses.buildSpeedMultiplier *= 0.92;
      break;
    case 'aggressive_schedule':
      bonuses.hazardResistanceBonus -= 0.10;
      bonuses.buildSpeedMultiplier *= 1.10;
      break;
  }
  switch (active.disclosure) {
    case 'open_science':
      bonuses.researchSpeedMultiplier *= 1.12;
      bonuses.revenueMultiplier *= 0.97;
      break;
    case 'proprietary':
      bonuses.researchSpeedMultiplier *= 0.94;
      bonuses.revenueMultiplier *= 1.03;
      break;
  }
  switch (active.compensation) {
    case 'generous_compensation':
      bonuses.payrollMultiplier *= 1.15;
      bonuses.crewMoraleBonus += 0.04;
      break;
    case 'lean_compensation':
      bonuses.payrollMultiplier *= 0.90;
      bonuses.crewMoraleBonus -= 0.04;
      break;
  }
  return bonuses;
}

// ─── 2. Constituencies ───────────────────────────────────────────────────────

export type ConstituencyId =
  | 'engineers_union' | 'science_directorate' | 'miners_guild'
  | 'operations_corps' | 'executive_leadership';

export interface ConstituencyDef {
  id: ConstituencyId;
  name: string;
  icon: string;
  description: string;
}

/** LORE.md: "The Orbital Engineers' Union — construction workers and
 *  fabricators. Strike-prone and politically powerful." / "Belt Miners'
 *  Guild — labor-cooperative representing ~200,000 registered belt miners...
 *  Speaker: Iron Mara." Grouping the 8 WorkerTypes into 5 blocs (rather than
 *  one per type) keeps the politics legible — a player reads 5 approval
 *  bars, not 8 — while still covering "per crew type + leaders" from the
 *  wave brief: operations_corps folds operator/pilot/negotiator/security/
 *  medic into one day-to-day-operations bloc. */
export const CONSTITUENCIES: ConstituencyDef[] = [
  { id: 'engineers_union', name: "Orbital Engineers' Union", icon: '🔧',
    description: 'Construction crews and fabricators. Strike-prone, politically powerful (LORE.md).' },
  { id: 'science_directorate', name: 'Science Directorate', icon: '🔬',
    description: 'Scientists and research staff — the bloc most sensitive to disclosure policy.' },
  { id: 'miners_guild', name: "Belt Miners' Guild", icon: '⛏️',
    description: "~200,000-member labor cooperative, Speaker Iron Mara (LORE.md). Most exposed to hazards." },
  { id: 'operations_corps', name: 'Operations Corps', icon: '🎯',
    description: 'Operators, pilots, negotiators, security, and medics running day-to-day operations.' },
  { id: 'executive_leadership', name: 'Executive Leadership', icon: '💼',
    description: 'The board and assigned commanders — growth- and cost-disciplined, not labor-aligned.' },
];

export const CONSTITUENCY_MAP = new Map(CONSTITUENCIES.map(c => [c.id, c]));

const BASE_APPROVAL = 62;

/** Per-bloc approval delta for each policy stance. A bloc absent from an
 *  entry is unaffected by that policy. Deliberately creates real tension
 *  between labor blocs and Executive Leadership — there is no policy set
 *  that maximizes every bloc at once. */
const POLICY_PREFERENCE: Record<DoctrinePolicyId, Partial<Record<ConstituencyId, number>>> = {
  safety_first: { engineers_union: 8, miners_guild: 14, operations_corps: 6, science_directorate: 2, executive_leadership: -4 },
  aggressive_schedule: { engineers_union: -8, miners_guild: -14, operations_corps: -6, science_directorate: -2, executive_leadership: 6 },
  open_science: { science_directorate: 12, engineers_union: 2, executive_leadership: -6 },
  proprietary: { science_directorate: -10, engineers_union: -2, executive_leadership: 6 },
  generous_compensation: { engineers_union: 8, miners_guild: 10, operations_corps: 8, science_directorate: 6, executive_leadership: -5 },
  lean_compensation: { engineers_union: -8, miners_guild: -10, operations_corps: -8, science_directorate: -6, executive_leadership: 5 },
};

export type ConstituencyMood = 'restive' | 'uneasy' | 'steady' | 'supportive';

export interface ConstituencyApproval {
  id: ConstituencyId;
  approval: number; // 0-100, rounded
  /** Text label — never rely on bar color alone (CLAUDE.md accessibility). */
  mood: ConstituencyMood;
}

export function moodForApproval(approval: number): ConstituencyMood {
  if (approval < 35) return 'restive';
  if (approval < 55) return 'uneasy';
  if (approval < 75) return 'steady';
  return 'supportive';
}

type ApprovalInputState = Pick<GameState, 'corporateDoctrine' | 'workforce' | 'recentHazards' | 'boardDirectives' | 'money'>;

/**
 * Pure, deterministic given `state` + `now` — recomputed on every read
 * (like getWorkforceBonuses), never persisted. "Recent" windows mirror the
 * game-month/quarter conventions already used elsewhere (game-engine.ts's
 * oneGameMonthMs, quarterly-reports.ts's 3-game-month quarter).
 */
export function getConstituencyApprovals(state: ApprovalInputState, now: number = Date.now()): ConstituencyApproval[] {
  const doctrine = state.corporateDoctrine || DEFAULT_DOCTRINE;
  const active = doctrine.activePolicies;
  const oneGameMonthMs = 6 * 60 * 60 * 1000;
  const oneQuarterMs = oneGameMonthMs * 3;
  const recentHazardCount = (state.recentHazards || []).filter(h => now - h.occurredAtMs < oneQuarterMs).length;
  const lastDirective = (state.boardDirectives || []).slice().reverse().find(d => d.status !== 'pending');
  const trainingBudget = state.workforce?.trainingBudgetPerCrew ?? 0;

  return CONSTITUENCIES.map(bloc => {
    let approval = BASE_APPROVAL;

    for (const policyId of Object.values(active)) {
      if (!policyId) continue;
      approval += POLICY_PREFERENCE[policyId]?.[bloc.id] ?? 0;
    }

    // Hazards hit the blocs actually exposed to them hardest.
    if (bloc.id === 'miners_guild' || bloc.id === 'engineers_union' || bloc.id === 'operations_corps') {
      approval -= Math.min(15, recentHazardCount * 3);
    }

    // Cash trouble worries everyone; leadership most (their job is on the line).
    if (state.money < 0) approval -= bloc.id === 'executive_leadership' ? 12 : 6;

    // Board-directive record: a hit reads as company-wide confidence, a miss
    // reads as pressure on the people who set the targets.
    if (lastDirective) {
      if (lastDirective.status === 'hit') approval += bloc.id === 'executive_leadership' ? 6 : 2;
      else approval -= bloc.id === 'executive_leadership' ? 10 : 3;
    }

    // Visible investment in the workforce buys real goodwill with labor.
    if (trainingBudget > 0 && bloc.id !== 'executive_leadership') approval += 3;

    approval = Math.max(0, Math.min(100, Math.round(approval)));
    return { id: bloc.id, approval, mood: moodForApproval(approval) };
  });
}

/**
 * Board politics -> morale writer. Averages bloc approval, expresses the
 * deviation from BASE_APPROVAL as a small bounded morale delta — one of
 * SEVERAL additive causes updateCrewWellbeing already documents (hazards
 * -0.05 each capped -0.10, cash -0.10); ±0.05 keeps this cause proportionate
 * to those, never dominant.
 */
export function getConstituencyMoraleModifier(approvals: ConstituencyApproval[]): number {
  if (approvals.length === 0) return 0;
  const avg = approvals.reduce((sum, a) => sum + a.approval, 0) / approvals.length;
  const deviation = (avg - BASE_APPROVAL) / 100;
  return Math.max(-0.05, Math.min(0.05, deviation));
}

// ─── 3. Board directives ─────────────────────────────────────────────────────

export type DirectiveMetric = 'growth' | 'profit' | 'safety';

export interface BoardDirective {
  id: string;
  /** The quarter this directive GOVERNS (targets are set one quarter ahead
   *  of evaluation — see generateBoardDirective). */
  quarterIndex: number;
  metric: DirectiveMetric;
  label: string;
  targetValue: number;
  comparator: 'gte' | 'lte';
  status: 'pending' | 'hit' | 'missed';
  actualValue?: number;
  evaluatedAtMs?: number;
}

const DIRECTIVE_METRIC_ORDER: DirectiveMetric[] = ['growth', 'profit', 'safety'];

/** Deterministic rotation, no RNG — quarter 0 opens on growth, then profit,
 *  then safety, repeating. Gives the quarterly loop texture (SESSION_DESIGN
 *  "don't collapse the tempo") without a dice roll. */
function metricForQuarter(quarterIndex: number): DirectiveMetric {
  return DIRECTIVE_METRIC_ORDER[((quarterIndex % 3) + 3) % 3];
}

/** Build the directive that will govern `forQuarterIndex`, informed by the
 *  quarter that was JUST reported (so targets track real performance rather
 *  than being flat/arbitrary). Pure. */
export function generateBoardDirective(
  forQuarterIndex: number,
  priorReport: { profit: number; growthRatePct: number | null } | null,
  recentHazardCount: number,
): BoardDirective {
  const metric = metricForQuarter(forQuarterIndex);
  const id = `directive-q${forQuarterIndex}-${generateId()}`;
  switch (metric) {
    case 'growth': {
      const targetValue = 3; // %, modest and always attainable with real effort
      return {
        id, quarterIndex: forQuarterIndex, metric, comparator: 'gte', targetValue,
        label: `Grow net worth ${targetValue}%+ this quarter`, status: 'pending',
      };
    }
    case 'profit': {
      const targetValue = Math.max(0, priorReport?.profit ?? 0);
      return {
        id, quarterIndex: forQuarterIndex, metric, comparator: 'gte', targetValue,
        label: `Hold quarterly profit at ${formatMoney(targetValue)}+`, status: 'pending',
      };
    }
    case 'safety': {
      const targetValue = Math.max(2, recentHazardCount); // never regress from current pace; floor of 2
      return {
        id, quarterIndex: forQuarterIndex, metric, comparator: 'lte', targetValue,
        label: `Keep hazard incidents at ${targetValue} or fewer`, status: 'pending',
      };
    }
  }
}

/** Pure: score a directive against actuals. */
export function evaluateBoardDirective(
  directive: BoardDirective,
  actuals: { growthRatePct: number | null; profit: number; hazardCount: number },
  now: number,
): BoardDirective {
  const actualValue = directive.metric === 'growth' ? (actuals.growthRatePct ?? 0)
    : directive.metric === 'profit' ? actuals.profit
    : actuals.hazardCount;
  const hit = directive.comparator === 'gte' ? actualValue >= directive.targetValue : actualValue <= directive.targetValue;
  return { ...directive, status: hit ? 'hit' : 'missed', actualValue, evaluatedAtMs: now };
}

export interface BoardDirectiveCycleResult {
  boardDirectives: BoardDirective[];
  /** The directive just evaluated this cycle, if any (for eventLog/UI). */
  evaluated: BoardDirective | null;
  reputationGain: number;
  moraleDelta: number;
}

const MAX_DIRECTIVE_HISTORY = 12; // 3 years' worth

/**
 * Board-directive quarterly cycle: evaluate the directive that governed the
 * quarter just reported, derive its hit/miss consequence, and seed the
 * directive for the NEXT quarter. Pure — no state mutation performed here;
 * the caller (quarterly-reports.ts's recordQuarterlyReport, the doc's
 * "generation point") applies the money-free consequences (reputation,
 * morale) through the same hooks every other system already uses.
 */
export function advanceBoardDirectives(
  state: Pick<GameState, 'boardDirectives' | 'recentHazards'>,
  report: { quarterIndex: number; profit: number; growthRatePct: number | null },
  now: number = Date.now(),
): BoardDirectiveCycleResult {
  const history = state.boardDirectives || [];
  const oneGameMonthMs = 6 * 60 * 60 * 1000;
  const oneQuarterMs = oneGameMonthMs * 3;
  const hazardCountThisQuarter = (state.recentHazards || []).filter(h => now - h.occurredAtMs < oneQuarterMs).length;

  const updated = [...history];
  let evaluated: BoardDirective | null = null;
  let reputationGain = 0;
  let moraleDelta = 0;

  const pendingIdx = updated.findIndex(d => d.quarterIndex === report.quarterIndex && d.status === 'pending');
  if (pendingIdx !== -1) {
    evaluated = evaluateBoardDirective(
      updated[pendingIdx],
      { growthRatePct: report.growthRatePct, profit: report.profit, hazardCount: hazardCountThisQuarter },
      now,
    );
    updated[pendingIdx] = evaluated;
    if (evaluated.status === 'hit') {
      reputationGain = 150;
      moraleDelta = 0.02;
    } else {
      moraleDelta = -0.03;
    }
  }

  const nextQuarterIndex = report.quarterIndex + 1;
  if (!updated.some(d => d.quarterIndex === nextQuarterIndex)) {
    updated.push(generateBoardDirective(
      nextQuarterIndex,
      { profit: report.profit, growthRatePct: report.growthRatePct },
      hazardCountThisQuarter,
    ));
  }

  return {
    boardDirectives: updated.slice(-MAX_DIRECTIVE_HISTORY),
    evaluated,
    reputationGain,
    moraleDelta,
  };
}

/** The directive currently governing play (most recent entry — pending if
 *  the corporation has one, else the most recently evaluated one). */
export function getCurrentBoardDirective(state: Pick<GameState, 'boardDirectives'>): BoardDirective | null {
  const history = state.boardDirectives || [];
  return history.length > 0 ? history[history.length - 1] : null;
}
