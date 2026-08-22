// ─── Space Tycoon: Legacy Hall — pure derivation layer (AAA Round 1, E4) ────
//
// docs/AAA_PROGRAM_2026-08.md §R1-E4. Round 1's structural hole H4:
//
//   "48 legacy milestones, 7 infinite stretches, 5 display tiers, 11 victory
//    titles, 8 era medals, season prestige titles — and no surface anywhere
//    that shows a player their own history. The trophies exist; the trophy
//    room does not."
//
// This module is the trophy room's DATA half. It contains zero economy math:
// every number it returns is either read straight off GameState or recomputed
// from an existing pure function (legacy-system.ts, corporate-eras.ts,
// victory-conditions.ts, achievements.ts). Nothing here is written back to
// state, and no new GameState field is introduced.
//
// ─── The honesty contract ──────────────────────────────────────────────────
//
// `LegacyMilestone.check` is an opaque `(state) => boolean`. There is no
// declared progress metric anywhere in legacy-system.ts, so a generic
// "percentage complete" CANNOT be derived from a milestone definition — any
// panel that invented one would be fabricating telemetry, which the program's
// standing bar forbids.
//
// So progress is authored per milestone HERE, as a single term that mirrors
// the check exactly, and two structural rules keep it honest:
//
//   1. A term with `target <= 1` is BINARY by construction. A bar sweeping
//      0 → 1 asserts gradual progress that does not exist ("do you have a
//      building in GEO?" has no 43%). Binary milestones render as a state
//      word, never a percentage.
//   2. `legacy-hall.test.ts` asserts, for every milestone and a battery of
//      states, that `term.current >= term.target` agrees with the milestone's
//      own `check(state)`. The registry cannot drift from the checks without
//      turning the suite red, and a NEW milestone shipping without a term
//      fails the completeness guard. (This is the same "a reward may not ship
//      without a named consumer" discipline E3.3 introduced for mega-project
//      bonuses.)
//
// ─── The reachability contract ─────────────────────────────────────────────
//
// BALANCE.md Pass 5 (C2) measured the BEST archetype's lifetime cumulative
// gross across 50 game-years at ~$611B. Several legacy targets sit one to two
// orders of magnitude past that. Per the founder's Pass 7 ruling those
// horizons are intentional generational content — so they are labelled as
// generational rather than hidden or presented as though they were near.
// Only two bases are used, and both are arithmetic, not vibes:
//   • money targets, against the $611B measurement, and
//   • era-count targets, against corporate-eras.ts's real 90-day ERA_DURATION.
// A count target with no published measurement gets NO horizon label, because
// there is nothing honest to compare it against.

import type { GameState, EraMedal, CompletedCorporateEra } from './types';
import {
  LEGACY_MILESTONES, LEGACY_MILESTONE_MAP, STRETCH_LEGACIES, DEFAULT_LEGACY,
  getLegacyPower, getLegacyDisplayTier, getLegacyBonusBreakdown,
  type LegacyState, type LegacyDisplayTier, type LegacyBonusCategory,
  type LegacyCategoryBreakdown,
} from './legacy-system';
import { ERA_CHARTER_MAP, ERA_DURATION_MS, getEraProgress, type EraProgressView } from './corporate-eras';
import { VICTORY_CONDITIONS, getVictoryProgress } from './victory-conditions';
import { ACHIEVEMENTS } from './achievements';

// ─── Reachability reference ─────────────────────────────────────────────────

/** Best archetype's lifetime cumulative gross over 50 game-years, as measured
 *  by `scripts/sim-50yr.ts` and recorded in BALANCE.md Pass 5 §C2. This is a
 *  MEASUREMENT, not a target or a cap — it exists so the Hall can say
 *  truthfully which horizons sit beyond a best-in-class half-century. */
export const MEASURED_50Y_BEST_GROSS = 611_000_000_000;

/** Real-world days that make a wall-clock horizon "generational". One year of
 *  real time; below it, a horizon is a long campaign, not a generation. */
const GENERATIONAL_REAL_DAYS = 365;

export interface LegacyHorizon {
  /** Always 'generational' today — the field exists so a future class
   *  (e.g. 'seasonal') can be added without changing consumers' shape. */
  className: 'generational';
  /** Plain-language basis, always naming the measurement it derives from. */
  basis: string;
}

function moneyHorizon(target: number): LegacyHorizon | null {
  if (target <= MEASURED_50Y_BEST_GROSS) return null;
  const multiple = target / MEASURED_50Y_BEST_GROSS;
  return {
    className: 'generational',
    basis: `${multiple >= 10 ? Math.round(multiple) : multiple.toFixed(1)}x the best measured 50-year gross ($611B, BALANCE.md Pass 5)`,
  };
}

function eraCountHorizon(eras: number): LegacyHorizon | null {
  const days = (eras * ERA_DURATION_MS) / (24 * 60 * 60 * 1000);
  if (days < GENERATIONAL_REAL_DAYS) return null;
  return {
    className: 'generational',
    basis: `${eras} chartered eras = ${Math.round(days)} real days (~${(days / 365).toFixed(1)} real years)`,
  };
}

// ─── Progress terms ─────────────────────────────────────────────────────────

export type LegacyTermUnit = 'money' | 'count' | 'units';

export interface LegacyProgressTerm {
  /** What is being counted, in the player's language. */
  label: string;
  current: number;
  target: number;
  unit: LegacyTermUnit;
}

interface MilestoneTermDef {
  label: string;
  unit: LegacyTermUnit;
  target: number;
  current: (s: GameState) => number;
  horizon?: LegacyHorizon | null;
}

function completeBuildingsAt(s: GameState, locationIds: string[]): number {
  return s.buildings.filter(b => b.isComplete && locationIds.includes(b.locationId)).length;
}

function totalWorkforce(s: GameState): number {
  const wf = s.workforce;
  if (!wf) return 0;
  return (wf.engineers || 0) + (wf.scientists || 0) + (wf.miners || 0) + (wf.operators || 0);
}

function resourcesAtLeast(s: GameState, threshold: number): number {
  return Object.values(s.resources || {}).filter(q => q >= threshold).length;
}

function completedEras(s: GameState): CompletedCorporateEra[] {
  return s.corporateEras?.completedEras || [];
}

const MEDAL_RANK: Record<EraMedal, number> = {
  filed: 0, bronze: 1, silver: 2, gold: 3, platinum: 4,
};

function erasAtMedal(s: GameState, minimum: EraMedal): number {
  return completedEras(s).filter(e => (MEDAL_RANK[e.medal] ?? 0) >= MEDAL_RANK[minimum]).length;
}

const has = (s: GameState, locationId: string) => (s.unlockedLocations.includes(locationId) ? 1 : 0);

/**
 * One term per milestone, mirroring `legacy-system.ts`'s `check` exactly.
 *
 * The mirroring is not trusted on faith — `legacy-hall.test.ts` runs every
 * milestone's check against every term over a battery of states and fails on
 * any disagreement, and fails again if a milestone has no entry here.
 */
export const MILESTONE_TERMS: Record<string, MilestoneTermDef> = {
  // ── Tier 1 ────────────────────────────────────────────────────────────
  legacy_first_launch: { label: 'Completed LEO facilities', unit: 'count', target: 1, current: s => completeBuildingsAt(s, ['leo']) },
  legacy_orbit_trio: { label: 'Completed orbital facilities', unit: 'count', target: 3, current: s => completeBuildingsAt(s, ['leo', 'geo', 'lunar_orbit', 'mars_orbit']) },
  legacy_first_research: { label: 'Research completed', unit: 'count', target: 5, current: s => s.completedResearch.length },
  legacy_first_billion: { label: 'Lifetime gross earned', unit: 'money', target: 1_000_000_000, current: s => s.totalEarned },
  legacy_geo_expansion: { label: 'GEO unlocked', unit: 'count', target: 1, current: s => has(s, 'geo') },
  legacy_five_services: { label: 'Active services', unit: 'count', target: 5, current: s => s.activeServices.length },
  legacy_first_mine: { label: 'Lifetime units extracted', unit: 'units', target: 100, current: s => s.legacy?.trackers?.totalResourcesMined || 0 },
  legacy_first_crew: { label: 'Crew employed', unit: 'count', target: 3, current: totalWorkforce },
  legacy_ten_buildings: { label: 'Buildings standing', unit: 'count', target: 10, current: s => s.buildings.filter(b => b.isComplete).length },
  legacy_first_contract: { label: 'Contracts completed', unit: 'count', target: 3, current: s => s.completedContracts?.length || 0 },

  // ── Tier 2 ────────────────────────────────────────────────────────────
  legacy_lunar_ops: { label: 'Lunar-surface facilities', unit: 'count', target: 3, current: s => completeBuildingsAt(s, ['lunar_surface']) },
  legacy_twenty_research: { label: 'Research completed', unit: 'count', target: 20, current: s => s.completedResearch.length },
  legacy_ten_billion: { label: 'Lifetime gross earned', unit: 'money', target: 10_000_000_000, current: s => s.totalEarned },
  legacy_mars_footprint: { label: 'Martian surface unlocked', unit: 'count', target: 1, current: s => has(s, 'mars_surface') },
  legacy_fleet_commander: { label: 'Hulls in service', unit: 'count', target: 5, current: s => (s.ships || []).filter(sh => sh.isBuilt).length },
  legacy_resource_baron: { label: 'Resources stocked 500+', unit: 'count', target: 3, current: s => resourcesAtLeast(s, 500) },
  legacy_twenty_buildings: { label: 'Buildings standing', unit: 'count', target: 25, current: s => s.buildings.filter(b => b.isComplete).length },
  legacy_ten_services: { label: 'Active services', unit: 'count', target: 10, current: s => s.activeServices.length },
  legacy_asteroid_ops: { label: 'Belt facilities', unit: 'count', target: 1, current: s => completeBuildingsAt(s, ['asteroid_belt']) },
  legacy_full_crew: { label: 'Crew employed', unit: 'count', target: 10, current: totalWorkforce },

  // ── Tier 3 ────────────────────────────────────────────────────────────
  legacy_hundred_billion: { label: 'Lifetime gross earned', unit: 'money', target: 100_000_000_000, current: s => s.totalEarned },
  legacy_jupiter_reach: { label: 'Jovian system unlocked', unit: 'count', target: 1, current: s => has(s, 'jupiter_system') },
  legacy_forty_research: { label: 'Research completed', unit: 'count', target: 40, current: s => s.completedResearch.length },
  legacy_fifty_buildings: { label: 'Buildings standing', unit: 'count', target: 50, current: s => s.buildings.filter(b => b.isComplete).length },
  legacy_fleet_admiral: { label: 'Hulls in service', unit: 'count', target: 10, current: s => (s.ships || []).filter(sh => sh.isBuilt).length },
  legacy_resource_magnate: { label: 'Resources stocked 1,000+', unit: 'count', target: 5, current: s => resourcesAtLeast(s, 1000) },
  legacy_saturn_frontier: { label: 'Saturnian system unlocked', unit: 'count', target: 1, current: s => has(s, 'saturn_system') },
  legacy_twenty_services: { label: 'Active services', unit: 'count', target: 20, current: s => s.activeServices.length },
  legacy_trillion: { label: 'Lifetime gross earned', unit: 'money', target: 1_000_000_000_000, current: s => s.totalEarned },
  legacy_master_crew: { label: 'Crew employed', unit: 'count', target: 20, current: totalWorkforce },

  // ── Tier 4 ────────────────────────────────────────────────────────────
  legacy_outer_system: { label: 'Outer system unlocked', unit: 'count', target: 1, current: s => has(s, 'outer_system') },
  legacy_all_locations: { label: 'Locations unlocked', unit: 'count', target: 11, current: s => s.unlockedLocations.length },
  legacy_sixty_research: { label: 'Research completed', unit: 'count', target: 60, current: s => s.completedResearch.length },
  legacy_hundred_buildings: { label: 'Buildings standing', unit: 'count', target: 100, current: s => s.buildings.filter(b => b.isComplete).length },
  legacy_ten_trillion: { label: 'Lifetime gross earned', unit: 'money', target: 10_000_000_000_000, current: s => s.totalEarned },
  legacy_resource_emperor: { label: 'Resources stocked 5,000+', unit: 'count', target: 7, current: s => resourcesAtLeast(s, 5000) },
  legacy_fleet_sovereign: { label: 'Hulls in service', unit: 'count', target: 20, current: s => (s.ships || []).filter(sh => sh.isBuilt).length },
  legacy_all_base_research: { label: 'Research completed', unit: 'count', target: 37, current: s => s.completedResearch.length },
  legacy_thirty_services: { label: 'Active services', unit: 'count', target: 30, current: s => s.activeServices.length },
  legacy_endgame_crew: { label: 'Crew employed', unit: 'count', target: 30, current: totalWorkforce },

  // ── Corporate-era family (LS4) ────────────────────────────────────────
  legacy_era_first_charter: { label: 'Eras chronicled', unit: 'count', target: 1, current: s => completedEras(s).length },
  legacy_era_silver: { label: 'Eras at Silver or better', unit: 'count', target: 1, current: s => erasAtMedal(s, 'silver') },
  legacy_era_gold: { label: 'Eras at Gold or better', unit: 'count', target: 1, current: s => erasAtMedal(s, 'gold') },
  legacy_era_platinum: { label: 'Eras at Platinum', unit: 'count', target: 1, current: s => erasAtMedal(s, 'platinum') },
  legacy_era_veteran: { label: 'Eras chronicled', unit: 'count', target: 3, current: s => completedEras(s).length, horizon: eraCountHorizon(3) },
  legacy_era_decade: { label: 'Eras chronicled', unit: 'count', target: 10, current: s => completedEras(s).length, horizon: eraCountHorizon(10) },

  // ── Leader-legacy family (LS6) ────────────────────────────────────────
  legacy_first_retirement: { label: 'Leaders retired', unit: 'count', target: 1, current: s => s.retiredLeaders?.length || 0 },
  legacy_veteran_bench: { label: 'Leaders retired', unit: 'count', target: 5, current: s => s.retiredLeaders?.length || 0 },
};

// ─── Milestone views ────────────────────────────────────────────────────────

export type LegacyProgressKind = 'metered' | 'binary';

export interface LegacyMilestoneView {
  id: string;
  name: string;
  description: string;
  tier: 1 | 2 | 3 | 4;
  bonusCategory: LegacyBonusCategory;
  bonusValue: number;
  /** Authoritative: a milestone once earned is permanent, even if the world
   *  state that earned it later regresses (decommissioned buildings, sold
   *  ore). Never re-derived from `check`. */
  achieved: boolean;
  /** 'binary' when the term's target is 1 — see the honesty contract above. */
  kind: LegacyProgressKind;
  term: LegacyProgressTerm;
  /** 0–1 for metered rows; `null` for binary rows, which have no honest
   *  fractional reading. Consumers must not substitute 0. */
  fraction: number | null;
  horizon: LegacyHorizon | null;
}

/** Term-derived completion — exported for the drift guard, which asserts this
 *  agrees with the milestone's own `check()` on every state in its battery. */
export function isMilestoneTermComplete(state: GameState, milestoneId: string): boolean {
  const def = MILESTONE_TERMS[milestoneId];
  if (!def) return false;
  return def.current(state) >= def.target;
}

function buildMilestoneView(state: GameState, milestoneId: string, achieved: boolean): LegacyMilestoneView | null {
  const def = LEGACY_MILESTONE_MAP.get(milestoneId);
  const termDef = MILESTONE_TERMS[milestoneId];
  if (!def || !termDef) return null;

  const current = termDef.current(state);
  const kind: LegacyProgressKind = termDef.target <= 1 ? 'binary' : 'metered';
  const horizon = termDef.horizon !== undefined
    ? termDef.horizon
    : (termDef.unit === 'money' ? moneyHorizon(termDef.target) : null);

  return {
    id: def.id,
    name: def.name,
    description: def.description,
    tier: def.tier,
    bonusCategory: def.bonusCategory,
    bonusValue: def.bonusValue,
    achieved,
    kind,
    term: { label: termDef.label, current, target: termDef.target, unit: termDef.unit },
    fraction: kind === 'binary' ? null : Math.max(0, Math.min(1, current / termDef.target)),
    horizon,
  };
}

/** Every milestone, in catalogue order, with real progress. */
export function getLegacyMilestoneViews(state: GameState): LegacyMilestoneView[] {
  const earned = new Set(state.legacy?.completedMilestones || []);
  const views: LegacyMilestoneView[] = [];
  for (const m of LEGACY_MILESTONES) {
    const view = buildMilestoneView(state, m.id, earned.has(m.id));
    if (view) views.push(view);
  }
  return views;
}

// ─── Stretch ("dynasty") views ──────────────────────────────────────────────

const STRETCH_UNIT: Record<string, LegacyTermUnit> = {
  stretch_revenue: 'money',
  stretch_buildings: 'count',
  stretch_research: 'count',
  stretch_mining: 'units',
  stretch_contracts: 'count',
  stretch_fleet: 'count',
  stretch_leader_legacy: 'count',
};

export interface LegacyStretchView {
  id: string;
  name: string;
  description: string;
  bonusCategory: LegacyBonusCategory;
  /** Levels banked so far. */
  level: number;
  /** Live value of the stretch's own progress metric. */
  progress: number;
  /** Requirement for the level already held (0 at level 0 — see below). */
  floor: number;
  /** Requirement for the NEXT level. */
  nextRequirement: number;
  /** 0–1 toward the next level. Always metered: a stretch is a running
   *  counter with a declared requirement curve, so a fraction is a real
   *  reading here, unlike a milestone's opaque predicate. */
  fraction: number;
  unit: LegacyTermUnit;
  /** Raw percentage this stretch currently contributes to its category
   *  BEFORE the soft cap — the same `basePercent * ln(1 + n/2)` sum
   *  `legacy-system.ts::getCategoryBonus` accumulates. */
  rawContribution: number;
  horizon: LegacyHorizon | null;
}

export function getLegacyStretchViews(state: GameState): LegacyStretchView[] {
  const levels = state.legacy?.stretchLevels || {};
  return STRETCH_LEGACIES.map(st => {
    const level = levels[st.id] || 0;
    const progress = st.getProgress(state);
    const nextRequirement = st.getRequirement(level + 1);
    // At level 0 the honest floor is zero: `getRequirement(0)` is the curve's
    // base constant, not a bar the player has already cleared, and using it
    // would render a negative (clamped-to-zero) fraction for every new save.
    const floor = level === 0 ? 0 : st.getRequirement(level);
    const span = Math.max(1, nextRequirement - floor);
    let rawContribution = 0;
    for (let n = 1; n <= level; n++) rawContribution += st.basePercent * Math.log(1 + n * 0.5);
    const unit = STRETCH_UNIT[st.id] || 'count';
    return {
      id: st.id,
      name: st.name,
      description: st.description,
      bonusCategory: st.bonusCategory,
      level,
      progress,
      floor,
      nextRequirement,
      fraction: Math.max(0, Math.min(1, (progress - floor) / span)),
      unit,
      rawContribution,
      horizon: unit === 'money' ? moneyHorizon(nextRequirement) : null,
    };
  });
}

// ─── Standing (display-tier ladder) ─────────────────────────────────────────

export interface LegacyTierStep {
  tier: LegacyDisplayTier;
  /** Every condition the step requires, each with live values. `[]` for
   *  Pioneer, which is the floor and has no requirement. */
  terms: LegacyProgressTerm[];
  met: boolean;
}

export interface LegacyStanding {
  displayTier: LegacyDisplayTier;
  legacyPower: number;
  milestonesEarned: number;
  milestonesTotal: number;
  stretchLevels: number;
  steps: LegacyTierStep[];
  /** The first unmet step above the current tier, or null at Legend. */
  next: LegacyTierStep | null;
}

const DISPLAY_TIER_ORDER: LegacyDisplayTier[] = ['Pioneer', 'Colonist', 'Admiral', 'Architect', 'Legend'];

/**
 * The Pioneer → Legend ladder with live requirement readouts.
 *
 * Mirrors `legacy-system.ts::getLegacyDisplayTier`, whose thresholds are
 * otherwise invisible to players. Guarded by a test asserting the highest met
 * step here always equals that function's answer.
 */
export function getLegacyStanding(state: GameState): LegacyStanding {
  const legacy: LegacyState = state.legacy || DEFAULT_LEGACY;
  const completed = legacy.completedMilestones || [];
  const tierCount = (t: number) => completed.filter(id => LEGACY_MILESTONE_MAP.get(id)?.tier === t).length;
  const t2 = tierCount(2);
  const t3 = tierCount(3);
  const t4 = tierCount(4);
  const totalStretch = Object.values(legacy.stretchLevels || {}).reduce((a, b) => a + b, 0);

  const steps: LegacyTierStep[] = [
    { tier: 'Pioneer', terms: [], met: true },
    {
      tier: 'Colonist',
      terms: [{ label: 'Colonist-tier milestones', current: t2, target: 5, unit: 'count' }],
      met: t2 >= 5,
    },
    {
      tier: 'Admiral',
      terms: [{ label: 'Admiral-tier milestones', current: t3, target: 5, unit: 'count' }],
      met: t3 >= 5,
    },
    {
      tier: 'Architect',
      terms: [{ label: 'Architect-tier milestones', current: t4, target: 5, unit: 'count' }],
      met: t4 >= 5,
    },
    {
      tier: 'Legend',
      terms: [
        { label: 'Architect-tier milestones', current: t4, target: 10, unit: 'count' },
        { label: 'Total dynasty levels', current: totalStretch, target: 50, unit: 'count' },
      ],
      met: t4 >= 10 && totalStretch >= 50,
    },
  ];

  // Highest satisfied step wins — the same precedence getLegacyDisplayTier
  // uses by checking Legend first and falling through.
  let displayTier: LegacyDisplayTier = 'Pioneer';
  for (const step of steps) {
    if (step.met) displayTier = step.tier;
  }

  const currentIndex = DISPLAY_TIER_ORDER.indexOf(displayTier);
  const next = steps.slice(currentIndex + 1).find(s => !s.met) || null;

  return {
    displayTier,
    legacyPower: getLegacyPower(legacy),
    milestonesEarned: completed.length,
    milestonesTotal: LEGACY_MILESTONES.length,
    stretchLevels: totalStretch,
    steps,
    next,
  };
}

/** Convenience re-export so the panel imports one module. Unchanged math. */
export function getLegacyStandingBonuses(state: GameState): LegacyCategoryBreakdown[] {
  return getLegacyBonusBreakdown(state.legacy || DEFAULT_LEGACY);
}

/** Guard helper for the display-tier drift test. */
export function getDisplayTierFromLegacy(legacy: LegacyState): LegacyDisplayTier {
  return getLegacyDisplayTier(legacy);
}

// ─── Titles ─────────────────────────────────────────────────────────────────

export interface LegacyTitleView {
  /** Victory id or achievement id. */
  id: string;
  /** The wearable title string. */
  title: string;
  /** The award that grants it. */
  awardName: string;
  source: 'victory' | 'achievement';
  earned: boolean;
  /** 0–1 for unearned victory titles (victory-conditions.ts publishes a real
   *  progress function); `null` for achievements, whose checks are opaque
   *  booleans with no declared metric — rendered as a binary state. */
  fraction: number | null;
  /** True for the title currently shown on the player's leaderboard row. */
  worn: boolean;
}

/**
 * The corporation's title roll.
 *
 * Composition rule: ALL 11 victory titles (earned and outstanding — the
 * marquee long-horizon award, and the Victory tab that shows them is gated at
 * corporation Tier 5, so most players cannot see them anywhere else), but only
 * EARNED achievement titles. Achievements have their own dedicated browser
 * (AchievementsModal); the Hall's job for them is to record which you hold,
 * not to re-list the catalogue.
 *
 * `worn` follows the same precedence E3.5 shipped: a victory title outranks an
 * achievement title, because `page.tsx` writes victories over achievements as
 * the rarer honour. This is DISPLAY precedence only — nothing is written back.
 */
export function getLegacyTitles(state: GameState): LegacyTitleView[] {
  const wornTitle = state.playerTitle || null;
  const earnedVictories = new Set(state.earnedVictories || []);
  const earnedAchievements = new Set(state.earnedAchievements || []);
  const out: LegacyTitleView[] = [];

  for (const v of VICTORY_CONDITIONS) {
    const earned = earnedVictories.has(v.id);
    const prog = earned ? null : getVictoryProgress(state, v.id);
    out.push({
      id: v.id,
      title: v.title,
      awardName: v.name,
      source: 'victory',
      earned,
      fraction: earned ? 1 : (prog ? Math.max(0, Math.min(1, prog.percent)) : null),
      worn: earned && wornTitle === v.title,
    });
  }

  const victoryHoldsTitle = out.some(t => t.worn);
  for (const a of ACHIEVEMENTS) {
    if (!a.title || !earnedAchievements.has(a.id)) continue;
    out.push({
      id: a.id,
      title: a.title,
      awardName: a.name,
      source: 'achievement',
      earned: true,
      fraction: null,
      worn: !victoryHoldsTitle && wornTitle === a.title,
    });
  }

  return out;
}

// ─── The record: eras, leaders, filings ─────────────────────────────────────

export interface LegacyEraRecord {
  eraIndex: number;
  charterId: string;
  charterName: string;
  medal: EraMedal;
  goalLabel: string;
  goalActual: number;
  goalTarget: number;
  startedAtMs: number;
  endedAtMs: number;
  bracketAtStart: number;
  headlineStats: { label: string; value: number }[];
}

export interface LegacyEraRoll {
  active: EraProgressView;
  completed: LegacyEraRecord[];
  /** Count by medal, best-first — the "medal case" readout. */
  medalCounts: { medal: EraMedal; count: number }[];
}

export function getLegacyEraRoll(state: GameState, now: number = Date.now()): LegacyEraRoll {
  const records = completedEras(state);
  const completed: LegacyEraRecord[] = records.map(e => {
    const charter = ERA_CHARTER_MAP.get(e.charterId);
    return {
      eraIndex: e.eraIndex,
      charterId: e.charterId,
      charterName: charter?.name || e.charterId,
      medal: e.medal,
      goalLabel: charter?.goalLabel || 'Charter goal',
      goalActual: e.goalActual,
      goalTarget: e.goalTarget,
      startedAtMs: e.startedAtMs,
      endedAtMs: e.endedAtMs,
      bracketAtStart: e.bracketAtStart,
      headlineStats: e.headlineStats || [],
    };
  }).reverse(); // newest first

  const order: EraMedal[] = ['platinum', 'gold', 'silver', 'bronze', 'filed'];
  const medalCounts = order
    .map(medal => ({ medal, count: records.filter(e => e.medal === medal).length }))
    .filter(m => m.count > 0);

  return { active: getEraProgress(state, now), completed, medalCounts };
}

export interface LegacyFilingSummary {
  quartersOnFile: number;
  latestQuarterNumber: number | null;
  latestNetWorth: number | null;
  latestGrowthPct: number | null;
  /** Sum of profit across every quarter on file. Real arithmetic over stored
   *  reports — not an extrapolation. */
  lifetimeFiledProfit: number;
}

export function getLegacyFilingSummary(state: GameState): LegacyFilingSummary {
  const reports = state.quarterlyReports || [];
  const latest = reports.length > 0 ? reports[reports.length - 1] : null;
  return {
    quartersOnFile: reports.length,
    latestQuarterNumber: latest ? latest.quarterNumber : null,
    latestNetWorth: latest ? latest.netWorth : null,
    latestGrowthPct: latest ? latest.growthRatePct : null,
    lifetimeFiledProfit: reports.reduce((sum, r) => sum + (r.profit || 0), 0),
  };
}
