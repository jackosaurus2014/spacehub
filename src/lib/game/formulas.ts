// ─── Space Tycoon: Math Formulas ────────────────────────────────────────────

import { BUILDING_COST_SCALE, RESEARCH_REVENUE_BONUS, RESEARCH_COST_TIER_EXPONENT, RESEARCH_TIME_TIER_EXPONENT } from './constants';
import type { GameDate, GameState } from './types';

/** Scale building cost based on count of same type at same location */
export function scaledBuildingCost(baseCost: number, countAtLocation: number): number {
  return Math.round(baseCost * Math.pow(BUILDING_COST_SCALE, countAtLocation));
}

/** Scale research cost by tier */
export function scaledResearchCost(baseCost: number, tier: number): number {
  return Math.round(baseCost * Math.pow(tier, RESEARCH_COST_TIER_EXPONENT));
}

/** Scale research time by tier */
export function scaledResearchTime(baseMonths: number, tier: number): number {
  return Math.ceil(baseMonths * Math.pow(tier, RESEARCH_TIME_TIER_EXPONENT));
}

/** Revenue multiplier from completed relevant research (capped at 2.0x) */
export function revenueMultiplier(relevantResearchCount: number): number {
  return Math.min(2.0, 1.0 + relevantResearchCount * RESEARCH_REVENUE_BONUS);
}

/**
 * Monthly executive compensation — CEO, CFO, board, legal retainers, consultants.
 * Scales with net worth above a $100M exemption threshold. Prevents wealthy
 * players from passively accumulating cash with no ongoing costs.
 *
 * Audit Wave E (Change #9 / C5 "Late-game recurring sinks"): the flat 0.03%/mo
 * rate was "outrun by any empire earning >0.36% on net worth" (audit §5
 * inflation verdict). Per the audit's spec — "Escalate exec comp: 0.03%/mo →
 * progressive brackets reaching ~0.15%/mo above $1T" — the tax is now
 * MARGINAL-bracketed like a progressive income tax:
 *
 *   $100M – $10B   : 0.03% / month   (unchanged — early/mid game untouched)
 *   $10B  – $100B  : 0.06% / month
 *   $100B – $1T    : 0.10% / month
 *   > $1T          : 0.15% / month
 *
 * Examples:
 *   - $1B net worth:   $270K/mo   (identical to pre-Wave-E)
 *   - $10B:            $2.97M/mo  (identical — bracket boundary)
 *   - $100B:           $56.97M/mo (was $30M)
 *   - $1T:             $956.97M/mo (was $300M)
 *   - $10T:            $14.46B/mo (~0.145%/mo blended — approaches 1.8%/yr)
 *
 * BALANCE.md invariants: extends an ongoing sink (not income) ✓, cost scales
 * with player wealth ✓, sublinear revenue unaffected ✓, mitigation path via
 * corporation-tier maintenance reductions (applied in game-engine) ✓.
 */
const EXEC_COMP_BRACKETS: { floor: number; rate: number }[] = [
  { floor: 100_000_000,        rate: 0.0003 },  // 0.03%/mo
  { floor: 10_000_000_000,     rate: 0.0006 },  // 0.06%/mo
  { floor: 100_000_000_000,    rate: 0.0010 },  // 0.10%/mo
  { floor: 1_000_000_000_000,  rate: 0.0015 },  // 0.15%/mo
];

export function executiveCompensationMonthly(netWorth: number): number {
  if (netWorth <= EXEC_COMP_BRACKETS[0].floor) return 0;
  let total = 0;
  for (let i = 0; i < EXEC_COMP_BRACKETS.length; i++) {
    const { floor, rate } = EXEC_COMP_BRACKETS[i];
    const ceiling = i + 1 < EXEC_COMP_BRACKETS.length ? EXEC_COMP_BRACKETS[i + 1].floor : Infinity;
    if (netWorth <= floor) break;
    const taxableInBracket = Math.min(netWorth, ceiling) - floor;
    total += taxableInBracket * rate;
  }
  return Math.round(total);
}

/**
 * Monthly corporate overhead — administrative / HR / compliance / audit costs
 * that scale superlinearly with building count. Tiny for small operations,
 * meaningful for megacorps. Money sink that prevents unchecked infrastructure
 * accumulation.
 *
 * Formula: 100_000 × count^1.4
 *   - 1 building: $100K (trivial)
 *   - 5 buildings: ~$950K (notable)
 *   - 10: ~$2.5M
 *   - 25: ~$8.8M
 *   - 50: ~$23M
 *   - 100: ~$63M (roughly 10-15% of typical mid-game gross revenue)
 *   - 200: ~$173M
 *
 * Corporation-tier maintenance reductions apply (economies of scale).
 */
export function corporateOverheadMonthly(buildingCount: number): number {
  if (buildingCount <= 0) return 0;
  return Math.round(100_000 * Math.pow(buildingCount, 1.4));
}

/**
 * Market saturation multiplier for duplicate services at the same location.
 * The Nth (0-indexed) instance of the same service at the same location earns
 * proportionally less revenue than the first. Floor of ~35% ensures high-volume
 * fleets still earn something — no fleet is infinitely profitable.
 *
 * Curve: 0.35 + 0.65 * 0.92^position
 *   - 1st instance (pos=0): 100%
 *   - 2nd (pos=1): 95%
 *   - 5th (pos=4): 80%
 *   - 10th (pos=9): 70%
 *   - 20th (pos=19): 58%
 *   - 50th (pos=49): 42%
 *   - 100th (pos=99): 36%
 *
 * This closes the "spam 50 telecom sats for linear revenue" exploit while
 * keeping the first few satellites of any type fully valuable.
 */
export function serviceSaturationMultiplier(positionInBucket: number): number {
  return 0.35 + 0.65 * Math.pow(0.92, Math.max(0, positionInBucket));
}

/** Compare two game dates: returns negative if a < b, 0 if equal, positive if a > b */
export function compareDates(a: GameDate, b: GameDate): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

/** Advance a game date by N months */
export function advanceDate(date: GameDate, months: number): GameDate {
  const totalMonths = (date.year * 12 + date.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return { year, month };
}

/** Format game date for display */
export function formatGameDate(date: GameDate): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.month - 1]} ${date.year}`;
}

/** Format money for display */
export function formatMoney(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000_000) return `$${(amount / 1_000_000_000_000).toFixed(1)}T`;
  if (Math.abs(amount) >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

/** Format seconds into human-readable duration (e.g. "5m 30s", "2h 15m") */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Format remaining seconds as countdown (e.g. "4:32", "1:23:45") */
export function formatCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return 'Done!';
  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = Math.floor(remainingSeconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Generate a simple unique ID */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Seeded RNG (audit Waves D+E: "deterministic — seeded rng patterns only") ─
// Same mulberry32 generator the expedition engine fixed at Wave 10
// (expeditions.ts:212). Hazard rolls, disaster rolls, and the global market
// event schedule all draw from hash-derived seeds so outcomes are replayable,
// save-scum-proof, and identical for every player observing the same world
// month — no Math.random in any new tick path.

/** Deterministic PRNG. Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit FNV-1a hash for string-derived seeds. */
export function hashStringToSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Calculate monthly net income for current state */
export function calculateNetIncome(state: GameState, serviceDefinitions: Map<string, { revenuePerMonth: number; operatingCostPerMonth: number }>, buildingDefinitions: Map<string, { maintenanceCostPerMonth: number }>): number {
  let revenue = 0;
  let costs = 0;

  for (const svc of state.activeServices) {
    const def = serviceDefinitions.get(svc.definitionId);
    if (def) {
      revenue += def.revenuePerMonth * svc.revenueMultiplier;
      costs += def.operatingCostPerMonth;
    }
  }

  for (const bld of state.buildings) {
    if (bld.isComplete) {
      const def = buildingDefinitions.get(bld.definitionId);
      if (def) costs += def.maintenanceCostPerMonth;
    }
  }

  return Math.round(revenue - costs);
}
