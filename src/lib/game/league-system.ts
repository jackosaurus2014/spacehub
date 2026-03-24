// ─── Space Tycoon: Tiered/Bracketed League System ────────────────────────────
// Players compete in leagues of similar net worth on weekly rotating metrics.
// Brackets of 50 players. Top 5 promote, bottom 5 demote (with shields).

import { getCurrentWeekId } from './weekly-events';

// ─── League Definitions ─────────────────────────────────────────────────────

export interface LeagueDefinition {
  league: number;        // 1-8
  name: string;
  color: string;         // hex color
  icon: string;          // emoji
  minNetWorth: number;   // floor (inclusive)
  maxNetWorth: number;   // ceiling (exclusive), Infinity for top
}

export const LEAGUES: LeagueDefinition[] = [
  { league: 1, name: 'Suborbital',       color: '#6b7280', icon: '🚀', minNetWorth: 0,                    maxNetWorth: 100_000_000 },
  { league: 2, name: 'Orbital',          color: '#22c55e', icon: '🛰️', minNetWorth: 100_000_000,          maxNetWorth: 500_000_000 },
  { league: 3, name: 'Lunar',            color: '#3b82f6', icon: '🌙', minNetWorth: 500_000_000,          maxNetWorth: 5_000_000_000 },
  { league: 4, name: 'Interplanetary',   color: '#a855f7', icon: '🪐', minNetWorth: 5_000_000_000,        maxNetWorth: 50_000_000_000 },
  { league: 5, name: 'Deep Space',       color: '#f59e0b', icon: '⭐', minNetWorth: 50_000_000_000,       maxNetWorth: 200_000_000_000 },
  { league: 6, name: 'Stellar',          color: '#ef4444', icon: '🌟', minNetWorth: 200_000_000_000,      maxNetWorth: 500_000_000_000 },
  { league: 7, name: 'Intergalactic',    color: '#ec4899', icon: '🌌', minNetWorth: 500_000_000_000,      maxNetWorth: 2_000_000_000_000 },
  { league: 8, name: 'Galactic',         color: '#8b5cf6', icon: '✨', minNetWorth: 2_000_000_000_000,    maxNetWorth: Infinity },
];

export function getLeagueDefinition(league: number): LeagueDefinition {
  return LEAGUES[Math.max(0, Math.min(league - 1, LEAGUES.length - 1))];
}

// ─── Metric Definitions ─────────────────────────────────────────────────────

export type MetricSlug =
  | 'net_worth_growth'
  | 'revenue'
  | 'buildings'
  | 'research'
  | 'mining'
  | 'trade_volume'
  | 'services'
  | 'contracts'
  | 'exploration'
  | 'total_earned';

export interface MetricDefinition {
  slug: MetricSlug;
  name: string;
  description: string;
  icon: string;
  /** How to extract the "current value" from a GameProfile for snapshotting */
  profileField: string;
  /** 'percentage' = (current - start) / start, 'absolute' = current - start */
  scoreType: 'percentage' | 'absolute';
}

export const METRICS: MetricDefinition[] = [
  {
    slug: 'net_worth_growth',
    name: 'Net Worth Growth',
    description: 'Grow your net worth by the largest percentage this week.',
    icon: '📈',
    profileField: 'netWorth',
    scoreType: 'percentage',
  },
  {
    slug: 'revenue',
    name: 'Revenue Race',
    description: 'Earn the highest revenue relative to your starting net worth.',
    icon: '💰',
    profileField: 'totalEarned',
    scoreType: 'percentage',
  },
  {
    slug: 'buildings',
    name: 'Construction Blitz',
    description: 'Complete the most buildings this week.',
    icon: '🏗️',
    profileField: 'buildingCount',
    scoreType: 'absolute',
  },
  {
    slug: 'research',
    name: 'Innovation Sprint',
    description: 'Complete the most research projects this week.',
    icon: '🔬',
    profileField: 'researchCount',
    scoreType: 'absolute',
  },
  {
    slug: 'mining',
    name: 'Mining Output',
    description: 'Mine the most resources this week.',
    icon: '⛏️',
    profileField: 'netWorth', // Uses resource tracking; snapshot netWorth as proxy
    scoreType: 'absolute',
  },
  {
    slug: 'trade_volume',
    name: 'Trade Volume',
    description: 'Execute the highest trading volume on the market.',
    icon: '📊',
    profileField: 'totalEarned',
    scoreType: 'absolute',
  },
  {
    slug: 'services',
    name: 'Service Empire',
    description: 'Activate the most services this week.',
    icon: '📡',
    profileField: 'serviceCount',
    scoreType: 'absolute',
  },
  {
    slug: 'contracts',
    name: 'Contract Hustler',
    description: 'Complete the most contracts and bounties this week.',
    icon: '📋',
    profileField: 'buildingCount', // proxy; real tracking via sync
    scoreType: 'absolute',
  },
  {
    slug: 'exploration',
    name: 'Frontier Explorer',
    description: 'Unlock and expand to the most new locations.',
    icon: '🗺️',
    profileField: 'locationsUnlocked',
    scoreType: 'absolute',
  },
  {
    slug: 'total_earned',
    name: 'Wealth Accumulator',
    description: 'Accumulate the highest total earnings this week.',
    icon: '🏦',
    profileField: 'totalEarned',
    scoreType: 'percentage',
  },
];

export function getMetricDefinition(slug: string): MetricDefinition | undefined {
  return METRICS.find(m => m.slug === slug);
}

// ─── League Assignment (Anti-Sandbagging) ────────────────────────────────────

/**
 * Determine the league for a player based on their effective net worth.
 * Uses anti-sandbagging: considers peak net worth (cannot drop more than
 * a certain % from peak without being held in a higher league).
 *
 * @returns league number 1-8
 */
export function assignPlayerToLeague(netWorth: number, peakNetWorth: number): number {
  // Effective net worth = max of current net worth and 60% of peak (anti-sandbagging)
  const effectiveNetWorth = Math.max(netWorth, peakNetWorth * 0.6);

  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (effectiveNetWorth >= LEAGUES[i].minNetWorth) {
      return LEAGUES[i].league;
    }
  }
  return 1;
}

// ─── Metric Scoring ──────────────────────────────────────────────────────────

/**
 * Calculate the metric score given the metric type and the start/current values.
 * For percentage metrics: (current - start) / max(start, 1) * 100
 * For absolute metrics: current - start
 */
export function calculateMetricScore(
  metric: MetricDefinition,
  startValue: number,
  currentValue: number,
): number {
  const delta = currentValue - startValue;

  if (metric.scoreType === 'percentage') {
    // Percentage growth from start. Avoid division by zero.
    const base = Math.max(startValue, 1);
    return (delta / base) * 100;
  }

  // Absolute delta
  return Math.max(0, delta);
}

// ─── Reward Structure ────────────────────────────────────────────────────────

export interface LeagueReward {
  cashReward: number;
  title: string | null;
  boostType: 'construction' | 'research' | null;
  boostMultiplier: number;
  boostDurationSeconds: number;
}

// Cash rewards by league, indexed by reward tier (0=1st, 1=2nd, ... 5=11th-50th)
const LEAGUE_CASH_REWARDS: Record<number, number[]> = {
  1: [5_000_000,   3_000_000,   2_000_000,   1_000_000,    500_000,     200_000],
  2: [15_000_000,  10_000_000,  7_000_000,   3_000_000,    1_500_000,   500_000],
  3: [50_000_000,  30_000_000,  20_000_000,  10_000_000,   5_000_000,   2_000_000],
  4: [200_000_000, 120_000_000, 80_000_000,  40_000_000,   20_000_000,  8_000_000],
  5: [1_000_000_000, 600_000_000, 400_000_000, 200_000_000, 100_000_000, 40_000_000],
  6: [5_000_000_000, 3_000_000_000, 2_000_000_000, 1_000_000_000, 500_000_000, 200_000_000],
  7: [20_000_000_000, 12_000_000_000, 8_000_000_000, 4_000_000_000, 2_000_000_000, 800_000_000],
  8: [100_000_000_000, 60_000_000_000, 40_000_000_000, 20_000_000_000, 10_000_000_000, 4_000_000_000],
};

/**
 * Determine the reward tier from rank (1-based).
 * 0 = 1st, 1 = 2nd, 2 = 3rd, 3 = 4th-5th, 4 = 6th-10th, 5 = 11th-50th
 */
function getRewardTier(rank: number): number {
  if (rank === 1) return 0;
  if (rank === 2) return 1;
  if (rank === 3) return 2;
  if (rank <= 5) return 3;
  if (rank <= 10) return 4;
  return 5;
}

/**
 * Get the rewards for a given rank and league number.
 */
export function getLeagueRewards(rank: number, league: number): LeagueReward {
  const tier = getRewardTier(rank);
  const clampedLeague = Math.max(1, Math.min(8, league));
  const cashReward = LEAGUE_CASH_REWARDS[clampedLeague]?.[tier] ?? 0;

  // Titles for top 3
  let title: string | null = null;
  if (rank === 1) title = 'League Champion';
  else if (rank === 2) title = 'League Contender';
  else if (rank === 3) title = 'Rising Star';

  // Speed boosts for top 10
  let boostType: 'construction' | 'research' | null = null;
  let boostMultiplier = 1;
  let boostDurationSeconds = 0;

  if (rank === 1) {
    boostType = 'construction';
    boostMultiplier = 3.0;
    boostDurationSeconds = 4 * 3600;
  } else if (rank === 2) {
    boostType = 'construction';
    boostMultiplier = 2.5;
    boostDurationSeconds = 3 * 3600;
  } else if (rank === 3) {
    boostType = 'research';
    boostMultiplier = 2.0;
    boostDurationSeconds = 3 * 3600;
  } else if (rank <= 5) {
    boostType = 'construction';
    boostMultiplier = 1.5;
    boostDurationSeconds = 2 * 3600;
  } else if (rank <= 10) {
    boostType = 'research';
    boostMultiplier = 1.5;
    boostDurationSeconds = 1 * 3600;
  }

  return { cashReward, title, boostType, boostMultiplier, boostDurationSeconds };
}

// ─── Weekly Metric Rotation ──────────────────────────────────────────────────

/**
 * Deterministic metric selection for a given week number.
 * Rotates through the 10 metrics in a fixed order.
 */
export function getWeeklyMetric(weekNumber?: number): MetricDefinition {
  const week = weekNumber ?? getCurrentWeekId();
  const index = ((week % METRICS.length) + METRICS.length) % METRICS.length;
  return METRICS[index];
}

/**
 * Get the metric slug string for a given week number.
 */
export function getWeeklyMetricSlug(weekNumber?: number): MetricSlug {
  return getWeeklyMetric(weekNumber).slug;
}

// ─── Bracket Size & Promotion/Demotion Constants ─────────────────────────────

export const BRACKET_SIZE = 50;
export const PROMOTION_COUNT = 5;    // Top 5 promote
export const DEMOTION_COUNT = 5;     // Bottom 5 demote (unless shielded)

/**
 * Determine whether a rank is in the promotion zone (top 5).
 */
export function isPromotionZone(rank: number): boolean {
  return rank >= 1 && rank <= PROMOTION_COUNT;
}

/**
 * Determine whether a rank is in the demotion zone (bottom 5 of bracket).
 */
export function isDemotionZone(rank: number, bracketSize: number): boolean {
  return rank > bracketSize - DEMOTION_COUNT && rank <= bracketSize;
}

/**
 * Assign players to brackets of BRACKET_SIZE using serpentine draft.
 * Returns an array of arrays, each inner array being one bracket's player IDs.
 */
export function assignBrackets(playerIds: string[]): string[][] {
  if (playerIds.length === 0) return [];

  const numBrackets = Math.max(1, Math.ceil(playerIds.length / BRACKET_SIZE));
  const brackets: string[][] = Array.from({ length: numBrackets }, () => []);

  for (let i = 0; i < playerIds.length; i++) {
    const pass = Math.floor(i / numBrackets);
    let groupIndex = i % numBrackets;
    // Serpentine: reverse direction on odd passes
    if (pass % 2 === 1) {
      groupIndex = numBrackets - 1 - groupIndex;
    }
    brackets[groupIndex].push(playerIds[i]);
  }

  return brackets;
}

// ─── Week Timing Helpers ─────────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the start timestamp (ms) for a given week ID.
 */
export function getWeekStartMs(weekId: number): number {
  return weekId * WEEK_MS;
}

/**
 * Get the end timestamp (ms) for a given week ID.
 */
export function getWeekEndMs(weekId: number): number {
  return (weekId + 1) * WEEK_MS;
}

/**
 * Get time remaining in the current week (ms).
 */
export function getTimeRemainingMs(): number {
  const elapsed = Date.now() % WEEK_MS;
  return WEEK_MS - elapsed;
}
