// ─── Space Tycoon: Alliance Cooperative Competition — Events & Scoring ───────
// Defines alliance event types, scoring rules, participation multipliers,
// power score computation, tier brackets, and XP/level formulas.

// ─── Event Type Definitions ──────────────────────────────────────────────────

export type AllianceEventType =
  | 'asteroid_rush'
  | 'launch_blitz'
  | 'research_sprint'
  | 'builders_rally'
  | 'trade_volume'
  | 'colony_expedition'
  | 'fleet_mobilization'
  | 'contract_sweep'
  | 'galactic_gold_rush'
  | 'sector_dominance';

export type AllianceEventCategory = 'sprint' | 'challenge' | 'mega_event';

export interface AllianceEventDefinition {
  type: AllianceEventType;
  name: string;
  icon: string;
  category: AllianceEventCategory;
  description: string;
  durationDays: number;
  /** Scoring rules: maps a sub-metric to its point value */
  scoringRules: Record<string, number>;
  /** Minimum total score threshold to qualify for top rewards */
  minimumTotalThreshold: number;
}

export const ALLIANCE_EVENT_DEFINITIONS: AllianceEventDefinition[] = [
  // ─── SPRINT EVENTS (5 days, weekly rotation) ───────────────────────────
  {
    type: 'asteroid_rush',
    name: 'Asteroid Rush',
    icon: '☄️',
    category: 'sprint',
    description: 'Mine as many resources as possible! Higher-tier resources earn more points.',
    durationDays: 5,
    scoringRules: {
      iron: 1,
      aluminum: 1,
      lunar_water: 1,
      mars_water: 1,
      titanium: 3,
      methane: 2,
      ethane: 2,
      gold: 5,
      rare_earth: 5,
      platinum_group: 10,
      helium3: 25,
      exotic_materials: 50,
    },
    minimumTotalThreshold: 500,
  },
  {
    type: 'launch_blitz',
    name: 'Launch Blitz',
    icon: '🚀',
    category: 'sprint',
    description: 'Maximize revenue from launch_payload services. Each dollar of launch revenue = 1 point.',
    durationDays: 5,
    scoringRules: {
      launch_revenue: 1, // Per dollar of launch revenue
    },
    minimumTotalThreshold: 500,
  },
  {
    type: 'research_sprint',
    name: 'Research Sprint',
    icon: '🔬',
    category: 'sprint',
    description: 'Complete research projects! Higher-tier research earns more points.',
    durationDays: 5,
    scoringRules: {
      tier1_research: 1,
      tier2_research: 3,
      tier3_research: 8,
      tier4_research: 15,
      tier5_research: 25,
    },
    minimumTotalThreshold: 500,
  },
  {
    type: 'builders_rally',
    name: "Builder's Rally",
    icon: '🏗️',
    category: 'sprint',
    description: 'Construct and upgrade buildings. New buildings earn full points, upgrades earn half.',
    durationDays: 5,
    scoringRules: {
      tier1_building: 1,
      tier2_building: 3,
      tier3_building: 8,
      tier4_building: 15,
      tier5_building: 25,
      tier1_upgrade: 1,
      tier2_upgrade: 2,
      tier3_upgrade: 4,
      tier4_upgrade: 8,
      tier5_upgrade: 13,
    },
    minimumTotalThreshold: 500,
  },
  {
    type: 'trade_volume',
    name: 'Trade Volume',
    icon: '📊',
    category: 'sprint',
    description: 'Fill market orders! Each dollar of trade volume = 1 point.',
    durationDays: 5,
    scoringRules: {
      trade_value: 1, // Per dollar of trade volume
    },
    minimumTotalThreshold: 500,
  },

  // ─── CHALLENGE EVENTS (7 days, bi-weekly rotation) ─────────────────────
  {
    type: 'colony_expedition',
    name: 'Colony Expedition',
    icon: '🌍',
    category: 'challenge',
    description: 'Unlock new locations and expand your reach! 100 points per $1B spent on location unlocks.',
    durationDays: 7,
    scoringRules: {
      location_unlock_value: 100, // Per $1B spent on unlocks
    },
    minimumTotalThreshold: 1000,
  },
  {
    type: 'fleet_mobilization',
    name: 'Fleet Mobilization',
    icon: '🛸',
    category: 'challenge',
    description: 'Build ships and deliver cargo. Ship building and hauling both earn points.',
    durationDays: 7,
    scoringRules: {
      ship_built_light: 5,
      ship_built_medium: 15,
      ship_built_heavy: 30,
      ship_built_capital: 50,
      cargo_delivered: 1, // Per unit of cargo delivered
    },
    minimumTotalThreshold: 1000,
  },
  {
    type: 'contract_sweep',
    name: 'Contract Sweep',
    icon: '📋',
    category: 'challenge',
    description: 'Complete as many contracts as possible. Higher-difficulty contracts earn more.',
    durationDays: 7,
    scoringRules: {
      contract_easy: 1,
      contract_medium: 3,
      contract_hard: 8,
      contract_elite: 15,
    },
    minimumTotalThreshold: 1000,
  },

  // ─── MEGA-EVENTS (14 days, monthly) ────────────────────────────────────
  {
    type: 'galactic_gold_rush',
    name: 'Galactic Gold Rush',
    icon: '💰',
    category: 'mega_event',
    description: 'Grow your net worth! Average member growth % is the score. Activity rate matters.',
    durationDays: 14,
    scoringRules: {
      avg_growth_pct: 1, // Score = average member net worth growth %, scaled
    },
    minimumTotalThreshold: 5000,
  },
  {
    type: 'sector_dominance',
    name: 'Sector Dominance',
    icon: '🏴',
    category: 'mega_event',
    description: 'Dominate solar system zones through activity. 10 bonus points per zone claimed.',
    durationDays: 14,
    scoringRules: {
      zone_claimed: 10,
      activity_points: 1, // Per activity point across all zones
    },
    minimumTotalThreshold: 5000,
  },
];

export const ALLIANCE_EVENT_MAP = new Map(
  ALLIANCE_EVENT_DEFINITIONS.map(e => [e.type, e])
);

// ─── Point Calculation ───────────────────────────────────────────────────────

/**
 * Calculate points for a contribution to a specific event type.
 * `metrics` is a bag of sub-metric values (e.g. { iron: 500, titanium: 200 })
 * Returns the total score for this contribution.
 */
export function calculateEventPoints(
  eventType: AllianceEventType,
  metrics: Record<string, number>,
): number {
  const def = ALLIANCE_EVENT_MAP.get(eventType);
  if (!def) return 0;

  let total = 0;
  for (const [metric, value] of Object.entries(metrics)) {
    const pointsPerUnit = def.scoringRules[metric] ?? 0;
    total += value * pointsPerUnit;
  }
  return Math.round(total);
}

// ─── Participation Multiplier ────────────────────────────────────────────────

/**
 * Returns the participation multiplier based on the ratio of active members.
 * "Active" = contributed at least 1 point during the event.
 */
export function getParticipationMultiplier(
  activeMemberCount: number,
  totalMemberCount: number,
): number {
  if (totalMemberCount <= 0) return 0.9;
  const ratio = activeMemberCount / totalMemberCount;
  if (ratio >= 1.0) return 1.25;
  if (ratio >= 0.75) return 1.10;
  if (ratio >= 0.50) return 1.00;
  return 0.90;
}

/**
 * Calculate the final alliance event score.
 * Raw total * participation multiplier.
 */
export function calculateAllianceEventScore(
  rawTotal: number,
  activeMemberCount: number,
  totalMemberCount: number,
): { totalScore: number; perCapitaScore: number; multiplier: number } {
  const multiplier = getParticipationMultiplier(activeMemberCount, totalMemberCount);
  const totalScore = Math.round(rawTotal * multiplier);
  const perCapitaScore = activeMemberCount > 0
    ? Math.round((totalScore / activeMemberCount) * 100) / 100
    : 0;
  return { totalScore, perCapitaScore, multiplier };
}

/**
 * Check if an alliance meets the minimum total score threshold for top rewards.
 */
export function meetsMinimumThreshold(
  eventCategory: AllianceEventCategory,
  totalScore: number,
): boolean {
  const thresholds: Record<AllianceEventCategory, number> = {
    sprint: 500,
    challenge: 1000,
    mega_event: 5000,
  };
  return totalScore >= (thresholds[eventCategory] ?? 500);
}

// ─── Alliance Power Score ────────────────────────────────────────────────────

/**
 * 25% level + 30% event performance + 20% projects + 15% activity + 10% net worth
 * Normalized to 0-10,000 scale.
 */
export function calculateAlliancePowerScore(alliance: {
  level: number;
  /** Rolling average of last 4 event rankings (1 = best). Lower is better. */
  avgEventRank: number;
  /** Number of brackets in recent events (for normalizing rank). */
  avgBracketSize: number;
  totalProjectsCompleted: number;
  /** Ratio of members who synced in last 48 hours (0-1). */
  activityRate: number;
  totalNetWorth: number;
}): number {
  // Level component: level 30 = max (2,500 of 10,000)
  const levelScore = Math.min(2500, (alliance.level / 30) * 2500);

  // Event performance component: based on rank within bracket (3,000 of 10,000)
  // rank 1 out of 16 = 3000, rank 16/16 = 0
  let eventScore = 0;
  if (alliance.avgBracketSize > 0 && alliance.avgEventRank > 0) {
    const rankRatio = 1 - ((alliance.avgEventRank - 1) / Math.max(1, alliance.avgBracketSize - 1));
    eventScore = Math.round(rankRatio * 3000);
  }

  // Projects component: each completed project is worth up to 400 points (2,000 of 10,000)
  const projectScore = Math.min(2000, alliance.totalProjectsCompleted * 400);

  // Activity component: 100% activity = 1,500 (1,500 of 10,000)
  const activityScore = Math.round(alliance.activityRate * 1500);

  // Net worth component: logarithmic scale, $1T = max (1,000 of 10,000)
  // log10(1T) = 12, log10(100M) = 8, range 8-12 maps to 0-1000
  const logNW = alliance.totalNetWorth > 0 ? Math.log10(alliance.totalNetWorth) : 0;
  const netWorthScore = Math.min(1000, Math.max(0, Math.round(((logNW - 8) / 4) * 1000)));

  return Math.round(
    Math.max(0, Math.min(10000, levelScore + eventScore + projectScore + activityScore + netWorthScore))
  );
}

// ─── Alliance Tier Computation ───────────────────────────────────────────────

export interface AllianceTierInfo {
  tier: number;
  name: string;
  icon: string;
  minScore: number;
  maxScore: number;
  perks: {
    revenueBonus: number;
    miningBonus: number;
    researchBonus: number;
    buildSpeedBonus: number;
  };
}

export const ALLIANCE_TIERS: AllianceTierInfo[] = [
  {
    tier: 1, name: 'Frontier Startup', icon: 'bronze_rocket',
    minScore: 0, maxScore: 500,
    perks: { revenueBonus: 0, miningBonus: 0, researchBonus: 0, buildSpeedBonus: 0 },
  },
  {
    tier: 2, name: 'Orbital Enterprise', icon: 'silver_rocket',
    minScore: 501, maxScore: 1500,
    perks: { revenueBonus: 0.02, miningBonus: 0, researchBonus: 0, buildSpeedBonus: 0 },
  },
  {
    tier: 3, name: 'Interplanetary Corp', icon: 'gold_rocket',
    minScore: 1501, maxScore: 3500,
    perks: { revenueBonus: 0.05, miningBonus: 0.03, researchBonus: 0, buildSpeedBonus: 0 },
  },
  {
    tier: 4, name: 'Solar Conglomerate', icon: 'platinum_rocket',
    minScore: 3501, maxScore: 6000,
    perks: { revenueBonus: 0.08, miningBonus: 0.05, researchBonus: 0.03, buildSpeedBonus: 0 },
  },
  {
    tier: 5, name: 'Galactic Dominion', icon: 'diamond_rocket',
    minScore: 6001, maxScore: 10000,
    perks: { revenueBonus: 0.12, miningBonus: 0.08, researchBonus: 0.05, buildSpeedBonus: 0.03 },
  },
];

export function getAllianceTier(powerScore: number): AllianceTierInfo {
  for (let i = ALLIANCE_TIERS.length - 1; i >= 0; i--) {
    if (powerScore >= ALLIANCE_TIERS[i].minScore) {
      return ALLIANCE_TIERS[i];
    }
  }
  return ALLIANCE_TIERS[0];
}

// ─── Alliance XP / Level Formulas ────────────────────────────────────────────
// Level N requires N * 100 XP to go from level N-1 to level N.
// Total XP to reach level N = sum(1..N) * 100 = N*(N+1)/2 * 100

/**
 * XP required to advance FROM level `currentLevel` TO level `currentLevel + 1`.
 */
export function xpRequiredForNextLevel(currentLevel: number): number {
  return (currentLevel + 1) * 100;
}

/**
 * Total cumulative XP required to reach a given level (from level 0).
 */
export function totalXPForLevel(level: number): number {
  return (level * (level + 1)) / 2 * 100;
}

/**
 * Given current XP, compute the level and progress toward next level.
 */
export function computeLevelFromXP(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPct: number;
} {
  // Binary search for level
  let level = 0;
  while (totalXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  const currentLevelXP = totalXP - totalXPForLevel(level);
  const xpToNextLevel = xpRequiredForNextLevel(level);
  const progressPct = Math.min(100, Math.round((currentLevelXP / xpToNextLevel) * 100));
  return { level, currentLevelXP, xpToNextLevel, progressPct };
}

// ─── Event Reward XP ─────────────────────────────────────────────────────────

export function getEventRewardXP(bracketRank: number, totalInBracket: number): number {
  if (totalInBracket <= 0) return 25;
  if (bracketRank === 1) return 500;
  if (bracketRank === 2) return 350;
  if (bracketRank === 3) return 250;
  // Top half
  if (bracketRank <= Math.ceil(totalInBracket / 2)) return 150;
  // Bottom half but participated
  return 75;
}

/**
 * Revenue bonus duration (in days) based on event rank.
 */
export function getEventRewardBonus(bracketRank: number): {
  revenueBonusPct: number;
  durationDays: number;
} {
  if (bracketRank === 1) return { revenueBonusPct: 15, durationDays: 7 };
  if (bracketRank === 2) return { revenueBonusPct: 10, durationDays: 7 };
  if (bracketRank === 3) return { revenueBonusPct: 7, durationDays: 7 };
  if (bracketRank <= 8) return { revenueBonusPct: 3, durationDays: 5 };
  return { revenueBonusPct: 1, durationDays: 3 };
}

// ─── Daily Task Definitions ──────────────────────────────────────────────────

export interface DailyTaskDefinition {
  id: string;
  description: string;
  metric: string;
  target: number;
  xpReward: number;
}

export const DAILY_TASK_POOL: DailyTaskDefinition[] = [
  { id: 'mine_50_any', description: 'Mine 50 units of any resource', metric: 'units_mined', target: 50, xpReward: 5 },
  { id: 'complete_1_research', description: 'Complete 1 research project', metric: 'research_completed', target: 1, xpReward: 10 },
  { id: 'earn_100m_revenue', description: 'Earn $100M in revenue', metric: 'revenue_earned', target: 100_000_000, xpReward: 5 },
  { id: 'fill_market_order', description: 'Fill a market order', metric: 'market_orders_filled', target: 1, xpReward: 5 },
  { id: 'complete_contract', description: 'Complete a contract', metric: 'contracts_completed', target: 1, xpReward: 10 },
  { id: 'build_1_building', description: 'Construct 1 building', metric: 'buildings_built', target: 1, xpReward: 5 },
  { id: 'launch_1_rocket', description: 'Launch 1 rocket payload', metric: 'rockets_launched', target: 1, xpReward: 5 },
  { id: 'mine_10_titanium', description: 'Mine 10 titanium', metric: 'titanium_mined', target: 10, xpReward: 8 },
  { id: 'earn_500m_revenue', description: 'Earn $500M in revenue', metric: 'revenue_earned', target: 500_000_000, xpReward: 10 },
  { id: 'trade_50m_volume', description: 'Trade $50M in market volume', metric: 'trade_volume', target: 50_000_000, xpReward: 5 },
  { id: 'mine_100_iron', description: 'Mine 100 iron ore', metric: 'iron_mined', target: 100, xpReward: 3 },
  { id: 'upgrade_building', description: 'Upgrade a building', metric: 'buildings_upgraded', target: 1, xpReward: 8 },
  { id: 'deploy_satellite', description: 'Deploy a satellite', metric: 'satellites_deployed', target: 1, xpReward: 5 },
  { id: 'deliver_cargo', description: 'Deliver cargo to a destination', metric: 'cargo_delivered', target: 1, xpReward: 5 },
  { id: 'complete_2_contracts', description: 'Complete 2 contracts', metric: 'contracts_completed', target: 2, xpReward: 15 },
  { id: 'mine_5_platinum', description: 'Mine 5 platinum group metals', metric: 'platinum_group_mined', target: 5, xpReward: 10 },
  { id: 'build_3_buildings', description: 'Build 3 buildings', metric: 'buildings_built', target: 3, xpReward: 10 },
  { id: 'start_research', description: 'Start a research project', metric: 'research_started', target: 1, xpReward: 3 },
  { id: 'earn_1b_revenue', description: 'Earn $1B in revenue', metric: 'revenue_earned', target: 1_000_000_000, xpReward: 15 },
  { id: 'mine_200_any', description: 'Mine 200 units of any resource', metric: 'units_mined', target: 200, xpReward: 10 },
];

/** Daily task bonus XP for completing all 3 tasks in one day. */
export const DAILY_TASK_COMPLETION_BONUS_XP = 15;

/**
 * Select 3 random daily tasks from the pool.
 * Uses a seeded approach based on allianceId + date for determinism.
 */
export function selectDailyTasks(allianceId: string, dateStr: string): DailyTaskDefinition[] {
  // Simple hash-based seed
  const seed = hashCode(`${allianceId}-${dateStr}`);
  const pool = [...DAILY_TASK_POOL];
  const selected: DailyTaskDefinition[] = [];

  let s = seed;
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const idx = s % pool.length;
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  return selected;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ─── Activity Streak Bonuses ─────────────────────────────────────────────────

export function getStreakBonus(streak: number): { revenueBonus: number; label: string | null } {
  if (streak >= 30) return { revenueBonus: 0.05, label: 'Dedicated (30-day streak)' };
  if (streak >= 14) return { revenueBonus: 0.05, label: '14-day streak' };
  if (streak >= 7) return { revenueBonus: 0.05, label: '7-day streak' };
  if (streak >= 3) return { revenueBonus: 0.02, label: '3-day streak' };
  return { revenueBonus: 0, label: null };
}
