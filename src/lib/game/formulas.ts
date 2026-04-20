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
