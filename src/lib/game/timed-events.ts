// ─── Space Tycoon: Dynamic Timed Events ──────────────────────────────────────
// Short-duration competitive challenges (2-12 hours) that spawn randomly.
// Goals are SCALED to the player's current income/score at the time the
// event spawns, so they're fair for players at any stage.
//
// Events appear in the Contracts tab alongside regular contracts.
// Players can complete as many as they qualify for during the window.

import type { GameState } from './types';

export type EventCategory = 'mining' | 'building' | 'research' | 'trading' | 'expansion' | 'fleet' | 'revenue' | 'milestone';

export interface TimedEventTemplate {
  id: string;
  name: string;
  icon: string;
  category: EventCategory;
  description: string;
  /** Duration in real hours (2-12) */
  durationHours: number;
  /** Function that returns the scaled target based on player state */
  getTarget: (state: GameState) => number;
  /** Function that returns current progress */
  getProgress: (state: GameState) => number;
  /** Label for the target (e.g., "iron mined", "buildings completed") */
  targetLabel: string;
  /** Base reward multiplier — actual reward = multiplier × player monthly income */
  rewardMultiplier: number;
  /** Speed boost reward type (null = cash only) */
  boostReward?: 'construction' | 'research' | null;
}

// ─── Target rule: every target is a DELTA above the state at spawn ──────────
// game-engine.ts step 8 freezes `target: template.getTarget(state)` onto the
// occurrence when it spawns, then every tick compares `getProgress(state)`
// against that frozen number. So a target that is any FRACTION of the same
// quantity getProgress reads is already satisfied the instant it spawns, and
// the event pays its full rewardAmount for zero work. That bug shipped on six
// templates (evt_precious_metals ×4, evt_research_marathon ×3,
// evt_construction_sprint ×2.5, evt_satellite_deploy ×2, evt_iron_rush ×2,
// evt_water_collection ×1.5) plus evt_survey_expedition (a flat target of 1
// against a probe count that is usually ≥1), and was worth ~$500M/day to an
// established corporation. Fixed 2026-09-14 — see docs/BALANCE.md.
//
// THE RULE: getTarget(s) MUST be strictly greater than getProgress(s) for
// every reachable state. Use deltaTarget() for counts and stockpiles, or a
// growth factor > 1 for money-like quantities (evt_profit_target,
// evt_earnings_streak, evt_resource_hoarder). Never a fraction of progress.
// timed-events-targets.test.ts enforces this for all templates.

/**
 * `current + delta`, where delta is at least `flatFloor` and grows with the
 * player's scale by `growthFraction`. Guarantees target > current for any
 * current ≥ 0 as long as flatFloor ≥ 1 (rounding error is < 0.5).
 *
 * @param flatFloor      new units/count the event asks for at the low end —
 *                       sized against what the relevant production could
 *                       plausibly deliver inside durationHours (see each
 *                       template's comment). One game-month = 6 real hours
 *                       (server-time.ts REAL_SECONDS_PER_GAME_MONTH), so a
 *                       4 h window is 0.67 of a *PerMonth production figure.
 * @param growthFraction keeps the ask meaningful for a corporation sitting on
 *                       a large stockpile, without turning into the old
 *                       fraction-of-progress bug (the flat floor is added on
 *                       top of `current`, never compared against it).
 */
function deltaTarget(current: number, flatFloor: number, growthFraction = 0): number {
  const c = Math.max(0, current);
  return Math.round(c) + Math.max(flatFloor, Math.round(c * growthFraction));
}

/** evt_survey_expedition's measured quantity — built, not-yet-consumed survey
 *  probes (they are single-use and leave the fleet on expedition). */
function countReadyProbes(s: GameState): number {
  return (s.ships || []).filter(sh => sh.definitionId === 'survey_probe' && sh.isBuilt).length;
}

/** evt_infrastructure_push's measured quantity. Shared by getTarget and
 *  getProgress so the two can never drift apart again — the original bug on
 *  that template was a target counting ALL buildings and a progress counting
 *  only this subset. */
function countInfrastructure(s: GameState): number {
  return s.buildings.filter(b => b.isComplete && (
    b.definitionId.includes('ground') || b.definitionId.includes('solar') || b.definitionId.includes('fabrication')
  )).length;
}

// ─── Event Templates (20+) ──────────────────────────────────────────────────
// Targets use getTarget() which scales based on the player's current state.
// A new player with $5M/mo income gets achievable targets.
// A late-game player with $200M/mo income gets proportionally harder targets.

export const EVENT_TEMPLATES: TimedEventTemplate[] = [
  // ═══ MINING EVENTS ═══
  {
    id: 'evt_iron_rush',
    name: 'Iron Rush',
    icon: '⛏️',
    category: 'mining',
    description: 'Mine as much iron as possible before time runs out.',
    durationHours: 4,
    // WAS: half of the TOTAL stockpile across every resource, against a
    // progress that reads iron alone — instant whenever iron was more than
    // half the stockpile, unreachable otherwise. Target and progress now
    // measure the same thing: iron.
    // +150 iron in 4 h ≈ 45% of one Asteroid Mining Rig's window output
    // (500 iron/game-month × 0.67 month = 333) or a little over one Mars
    // Mining Operation's (200/mo → 133). Reachable with a single rig, worth
    // spinning up a second. +5% keeps it real for a stockpile-rich corp.
    getTarget: (s) => deltaTarget(s.resources?.iron || 0, 150, 0.05),
    getProgress: (s) => s.resources?.iron || 0,
    targetLabel: 'iron in inventory',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_rare_earth_hunt',
    name: 'Rare Earth Hunt',
    icon: '💎',
    category: 'mining',
    description: 'Accumulate rare earth elements.',
    durationHours: 6,
    // Already sound (a +15 delta); restated through the helper so every
    // stockpile target in the file reads the same way. Numerically identical:
    // rare_earth + 15 was never below the old floor of 10. This is the
    // calibration anchor for the other mining events — 15 rare earth in 6 h
    // is ~75% of one Asteroid Mining Rig's window output (20/mo × 1 month).
    getTarget: (s) => deltaTarget(s.resources?.rare_earth || 0, 15),
    getProgress: (s) => s.resources?.rare_earth || 0,
    targetLabel: 'rare earth in inventory',
    rewardMultiplier: 3,
    boostReward: 'research',
  },
  {
    id: 'evt_water_collection',
    name: 'Water Collection Drive',
    icon: '💧',
    category: 'mining',
    description: 'Stockpile lunar or Mars water.',
    durationHours: 4,
    // WAS: 40% of the water already held + 30 — satisfied on spawn for anyone
    // above ~50 units.
    // +40 water in 4 h ≈ 60% of one Lunar Ice Mine's window output
    // (100/game-month × 0.67 = 67); a Mars Mining Operation adds 53 more.
    // The growth term is a deliberately low 4%: water boils off at 2% per
    // game-month (consumption.ts VOLATILE_BOILOFF_PER_MONTH), so a big
    // stockpile is already losing ~1.3% inside a 4 h window and a steeper
    // fraction would make the event unwinnable for a hoarder.
    getTarget: (s) => deltaTarget((s.resources?.lunar_water || 0) + (s.resources?.mars_water || 0), 40, 0.04),
    getProgress: (s) => (s.resources?.lunar_water || 0) + (s.resources?.mars_water || 0),
    targetLabel: 'water units',
    rewardMultiplier: 1.5,
    boostReward: null,
  },
  {
    id: 'evt_precious_metals',
    name: 'Precious Metals Bonanza',
    icon: '🥇',
    category: 'mining',
    description: 'Accumulate platinum or gold.',
    durationHours: 8,
    // WAS: 30% of the precious metals already held + 5 — satisfied on spawn
    // for anyone holding 8+ units. This is the ×4 template, the richest payout
    // in the file, and the one the founder saw paying ~$500M for nothing.
    // +25 units in 8 h ≈ 75% of one Asteroid Mining Rig's window output
    // (platinum_group 10/mo + gold 15/mo = 25/mo × 1.33 months = 33) — the
    // same 75%-of-one-rig ask as evt_rare_earth_hunt, over a longer window
    // because this is the highest multiplier here.
    getTarget: (s) => deltaTarget((s.resources?.platinum_group || 0) + (s.resources?.gold || 0), 25, 0.05),
    getProgress: (s) => (s.resources?.platinum_group || 0) + (s.resources?.gold || 0),
    targetLabel: 'precious metal units',
    rewardMultiplier: 4,
    boostReward: null,
  },

  // ═══ BUILDING EVENTS ═══
  {
    id: 'evt_construction_sprint',
    name: 'Construction Sprint',
    icon: '🏗️',
    category: 'building',
    description: 'Complete buildings as fast as you can.',
    durationHours: 6,
    // WAS: 15% of the completed-building count + 2 — satisfied on spawn from
    // the third building onward.
    // +3 completed buildings in 6 h: tier-1 structures build in 3-7 real
    // minutes and tier-2 in 15-20 (buildings.ts realBuildSeconds), so three
    // is a genuine but comfortable sprint; the money and resource costs are
    // the real constraint, which is the economic decision this event wants.
    getTarget: (s) => deltaTarget(s.buildings.filter(b => b.isComplete).length, 3),
    getProgress: (s) => s.buildings.filter(b => b.isComplete).length,
    targetLabel: 'completed buildings',
    rewardMultiplier: 2.5,
    boostReward: 'construction',
  },
  {
    id: 'evt_satellite_deploy',
    name: 'Satellite Deployment Blitz',
    icon: '📡',
    category: 'building',
    description: 'Deploy new satellites across any orbit.',
    durationHours: 4,
    // WAS: 20% of the satellite count + 2 — satisfied on spawn from the
    // second satellite onward. (Not in the original bug report; found by
    // evaluating the block.)
    // +3 satellites in 4 h: sat_* definitions build in 4-15 real minutes
    // (buildings.ts realBuildSeconds 240-900), so three is well inside the
    // window and the constraint is cash plus orbital slots.
    getTarget: (s) => deltaTarget(
      s.buildings.filter(b => b.isComplete && b.definitionId.startsWith('sat_')).length, 3,
    ),
    getProgress: (s) => s.buildings.filter(b => b.isComplete && b.definitionId.startsWith('sat_')).length,
    targetLabel: 'satellites deployed',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_infrastructure_push',
    name: 'Infrastructure Push',
    icon: '🏭',
    category: 'building',
    description: 'Build ground stations, solar farms, or fabrication facilities.',
    durationHours: 6,
    // WAS: 10% of ALL completed buildings + 1, against a progress that counts
    // only the ground/solar/fabrication SUBSET — two different quantities.
    // Instant for anyone whose infrastructure count already exceeded a tenth
    // of their total estate (e.g. 20 buildings → target 3, and 5 of them
    // solar farms → complete on spawn). Target now counts the same subset.
    // +2 infrastructure buildings in 6 h: ground stations and solar farms are
    // tier 1-2 (realBuildSeconds 300-1200), so two is the same effort profile
    // as the ×2 evt_satellite_deploy over a longer window.
    getTarget: (s) => deltaTarget(countInfrastructure(s), 2),
    getProgress: (s) => countInfrastructure(s),
    targetLabel: 'infrastructure buildings',
    rewardMultiplier: 2,
    boostReward: 'construction',
  },

  // ═══ RESEARCH EVENTS ═══
  {
    id: 'evt_research_marathon',
    name: 'Research Marathon',
    icon: '🔬',
    category: 'research',
    description: 'Complete research projects during the event window.',
    durationHours: 8,
    // WAS: 8% of the completed-research count + 1 — satisfied on spawn from
    // the second tech onward.
    // +2 techs in 8 h: tier-1/2/3 techs take 10/30/90 real minutes
    // (research-tree.ts TIER_RESEARCH_SECONDS) and the tree allows two
    // parallel slots, so two completions is routine mid-game. A deep-tier
    // corporation queueing 4 h (T4) or 12 h (T5) techs will sometimes let
    // this one expire — that is the intended trade-off, not a bug: the ×3
    // payout should not be free for the players who research least often.
    getTarget: (s) => deltaTarget(s.completedResearch.length, 2),
    getProgress: (s) => s.completedResearch.length,
    targetLabel: 'researches completed',
    rewardMultiplier: 3,
    boostReward: 'research',
  },
  {
    id: 'evt_tech_diversity',
    name: 'Technology Diversity',
    icon: '🧪',
    category: 'research',
    description: 'Have research completed across multiple categories.',
    durationHours: 12,
    // SOUND as written (audited 2026-09-14): cats.size + 1 is a delta, and the
    // max(3, …) floor only ever raises it (progress 2 → target 3).
    getTarget: (s) => {
      const cats = new Set(s.completedResearch.map(id => {
        const r = RESEARCH_MAP_IMPORT?.get(id);
        return r?.category;
      }).filter(Boolean));
      return Math.max(3, cats.size + 1);
    },
    getProgress: (s) => {
      const cats = new Set(s.completedResearch.map(id => {
        const r = RESEARCH_MAP_IMPORT?.get(id);
        return r?.category;
      }).filter(Boolean));
      return cats.size;
    },
    targetLabel: 'research categories',
    rewardMultiplier: 2,
    boostReward: 'research',
  },

  // ═══ REVENUE EVENTS ═══
  {
    id: 'evt_revenue_surge',
    name: 'Revenue Surge',
    icon: '📈',
    category: 'revenue',
    description: 'Increase your active service count.',
    durationHours: 6,
    getTarget: (s) => Math.max(1, s.activeServices.length + 1),
    getProgress: (s) => s.activeServices.length,
    targetLabel: 'active services',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_profit_target',
    name: 'Profit Target',
    icon: '💵',
    category: 'revenue',
    description: 'Reach a cash target based on your current holdings.',
    durationHours: 8,
    getTarget: (s) => Math.round(s.money * 1.3 + 10_000_000),
    getProgress: (s) => s.money,
    targetLabel: 'cash on hand',
    rewardMultiplier: 1.5,
    boostReward: null,
  },
  {
    id: 'evt_earnings_streak',
    name: 'Earnings Streak',
    icon: '🔥',
    category: 'revenue',
    description: 'Earn total revenue above a target.',
    durationHours: 6,
    getTarget: (s) => Math.round(s.totalEarned * 1.1 + 50_000_000),
    getProgress: (s) => s.totalEarned,
    targetLabel: 'total earned',
    rewardMultiplier: 2,
    boostReward: null,
  },

  // ═══ FLEET EVENTS ═══
  {
    id: 'evt_fleet_buildup',
    name: 'Fleet Buildup',
    icon: '🚢',
    category: 'fleet',
    description: 'Build and deploy operational ships.',
    durationHours: 6,
    getTarget: (s) => Math.max(1, (s.ships || []).filter(sh => sh.isBuilt).length + 1),
    getProgress: (s) => (s.ships || []).filter(sh => sh.isBuilt).length,
    targetLabel: 'operational ships',
    rewardMultiplier: 2.5,
    boostReward: 'construction',
  },
  {
    id: 'evt_mining_fleet',
    name: 'Mining Fleet Deployment',
    icon: '⛏️',
    category: 'fleet',
    description: 'Get mining ships actively extracting resources.',
    durationHours: 4,
    getTarget: (s) => Math.max(1, (s.ships || []).filter(sh => sh.status === 'mining').length + 1),
    getProgress: (s) => (s.ships || []).filter(sh => sh.status === 'mining').length,
    targetLabel: 'ships mining',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_survey_expedition',
    name: 'Survey Expedition',
    icon: '📡',
    category: 'fleet',
    description: 'Build and launch survey probes.',
    durationHours: 3,
    // WAS: a flat 1, ignoring state entirely — satisfied on spawn for anyone
    // already holding a built survey probe, which is most players who have
    // unlocked them. (Not in the original bug report; found by evaluating the
    // block.)
    // +1 probe in 3 h: survey probes are $25M and build in 3 real minutes
    // (ships.ts survey_probe buildTimeSeconds 180), so one is the right ask
    // for the shortest window and the joint-lowest multiplier in the file.
    getTarget: (s) => deltaTarget(countReadyProbes(s), 1),
    getProgress: (s) => countReadyProbes(s),
    targetLabel: 'survey probes ready',
    rewardMultiplier: 1.5,
    boostReward: null,
  },

  // ═══ EXPANSION EVENTS ═══
  {
    id: 'evt_new_frontier',
    name: 'New Frontier',
    icon: '🗺️',
    category: 'expansion',
    description: 'Unlock a new location in the solar system.',
    durationHours: 12,
    getTarget: (s) => s.unlockedLocations.length + 1,
    getProgress: (s) => s.unlockedLocations.length,
    targetLabel: 'locations unlocked',
    rewardMultiplier: 3,
    boostReward: 'construction',
  },
  {
    id: 'evt_multi_location',
    name: 'Multi-Location Operations',
    icon: '🌍',
    category: 'expansion',
    description: 'Have completed buildings across multiple locations.',
    durationHours: 8,
    // SOUND as written (audited 2026-09-14): locs.size + 1 is a delta; the
    // max(2, …) floor only raises it.
    getTarget: (s) => {
      const locs = new Set(s.buildings.filter(b => b.isComplete).map(b => b.locationId));
      return Math.max(2, locs.size + 1);
    },
    getProgress: (s) => {
      const locs = new Set(s.buildings.filter(b => b.isComplete).map(b => b.locationId));
      return locs.size;
    },
    targetLabel: 'locations with buildings',
    rewardMultiplier: 2.5,
    boostReward: null,
  },

  // ═══ MILESTONE EVENTS ═══
  {
    id: 'evt_hire_spree',
    name: 'Hiring Spree',
    icon: '👷',
    category: 'milestone',
    description: 'Grow your workforce.',
    durationHours: 4,
    // SOUND as written (audited 2026-09-14): headcount + 1. Modest for a ×1.5
    // payout, but it is a real delta — hire one head — so it is out of scope
    // for the instantly-satisfiable fix.
    getTarget: (s) => {
      const wf = s.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
      const total = wf.engineers + wf.scientists + wf.miners + wf.operators;
      return Math.max(1, total + 1);
    },
    getProgress: (s) => {
      const wf = s.workforce || { engineers: 0, scientists: 0, miners: 0, operators: 0 };
      return wf.engineers + wf.scientists + wf.miners + wf.operators;
    },
    targetLabel: 'total crew members',
    rewardMultiplier: 1.5,
    boostReward: null,
  },
  {
    id: 'evt_resource_hoarder',
    name: 'Resource Hoarder',
    icon: '📦',
    category: 'milestone',
    description: 'Stockpile total resources across all types.',
    durationHours: 6,
    // SOUND as written (audited 2026-09-14): a growth FACTOR of 1.25 on the
    // same quantity progress reads, plus 20 — always above current, unlike the
    // fractional targets this wave fixed. Grow the total stockpile 25% in one
    // game-month. Steep at scale by design; it is the hoarding event.
    getTarget: (s) => {
      const total = Object.values(s.resources || {}).reduce((a, b) => a + b, 0);
      return Math.max(50, Math.round(total * 1.25 + 20));
    },
    getProgress: (s) => Object.values(s.resources || {}).reduce((a, b) => a + b, 0),
    targetLabel: 'total resource units',
    rewardMultiplier: 2,
    boostReward: null,
  },
  {
    id: 'evt_contract_completionist',
    name: 'Contract Completionist',
    icon: '📋',
    category: 'milestone',
    description: 'Complete any contract during the event window.',
    durationHours: 8,
    getTarget: (s) => (s.completedContracts || []).length + 1,
    getProgress: (s) => (s.completedContracts || []).length,
    targetLabel: 'contracts completed',
    rewardMultiplier: 2.5,
    boostReward: 'research',
  },
  {
    id: 'evt_diversified_income',
    name: 'Diversified Income',
    icon: '🏦',
    category: 'milestone',
    description: 'Have services generating revenue at multiple locations.',
    durationHours: 10,
    // SOUND as written (audited 2026-09-14): locs.size + 1 is a delta; the
    // max(2, …) floor only raises it.
    getTarget: (s) => {
      const locs = new Set(s.activeServices.map(svc => svc.locationId));
      return Math.max(2, locs.size + 1);
    },
    getProgress: (s) => {
      const locs = new Set(s.activeServices.map(svc => svc.locationId));
      return locs.size;
    },
    targetLabel: 'locations with active services',
    rewardMultiplier: 2,
    boostReward: null,
  },
];

// Lazy import to avoid circular dependency
let RESEARCH_MAP_IMPORT: Map<string, { category: string }> | null = null;
try {
  const { RESEARCH_MAP } = require('./research-tree');
  RESEARCH_MAP_IMPORT = RESEARCH_MAP;
} catch {}

/** How long a COMPLETED event stays on the save (game-engine.ts step 8).
 *  Was 1 h; 24 h since 2026-09-13 because the sync reports completed
 *  occurrences to the server's money credit (contract-credit.ts
 *  computeTimedEventCredit) and a completion whose tab closed before the
 *  next sync must still be on the save when the player returns. Must stay
 *  under TIMED_EVENT_CREDIT_MAX_AGE_MS (48 h). */
export const TIMED_EVENT_COMPLETED_RETENTION_MS = 24 * 3600_000;
/** How long ContractsPanel lists a completed event (the old 1 h). */
export const TIMED_EVENT_COMPLETED_DISPLAY_MS = 3600_000;

/** Pick a random event appropriate for the current time */
export function rollTimedEvent(): TimedEventTemplate {
  const index = Math.floor(Math.random() * EVENT_TEMPLATES.length);
  return EVENT_TEMPLATES[index];
}

/** Calculate the cash reward for a timed event based on player's monthly income */
export function calculateEventReward(template: TimedEventTemplate, state: GameState): number {
  // Estimate monthly income from active services
  let monthlyIncome = 0;
  for (const svc of state.activeServices) {
    monthlyIncome += 5_000_000; // Rough average per service
  }
  monthlyIncome = Math.max(monthlyIncome, 10_000_000); // Minimum $10M base

  return Math.round(monthlyIncome * template.rewardMultiplier);
}
