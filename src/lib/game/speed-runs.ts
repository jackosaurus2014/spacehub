// ─── Space Tycoon: Prestige Speed Runs ──────────────────────────────────────
// Weekly competitive challenges where players race to reach milestones
// as fast as possible after prestiging. All times are server-validated.

import type { GameState } from './types';
import { getCurrentWeekId } from './weekly-events';

// ─── Types ──────────────────────────────────────────────────────────────────

export type SpeedRunBracket = 'rookie' | 'veteran' | 'elite' | 'grandmaster';

export type MilestoneTier = 'Starter' | 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Master';

export interface SpeedRunMilestone {
  id: string;
  name: string;
  description: string;
  tier: MilestoneTier;
  /** Check whether the game state satisfies this milestone */
  check: (state: GameState) => boolean;
  /** Expected completion range in minutes [min, max] at P0 */
  expectedRangeMinutes: [number, number];
  /** Minimum seconds physically possible (anti-cheat floor) */
  minimumSeconds: number;
}

export interface CompositeMilestone {
  id: string;
  name: string;
  description: string;
  componentIds: string[];
  /** All component milestones must be met simultaneously */
  check: (state: GameState) => boolean;
}

export interface WeeklyChallenge {
  weekId: number;
  primaryMilestone: SpeedRunMilestone;
  compositeMilestone: CompositeMilestone;
  startsAt: number;
  endsAt: number;
}

export interface SpeedRunReward {
  cash: number;
  legacyPoints: number;
  title?: string;
  badge?: string;
}

// ─── 15 Speed Run Milestones ────────────────────────────────────────────────

export const SPEED_RUN_MILESTONES: SpeedRunMilestone[] = [
  {
    id: 'sr_first_building',
    name: 'First Foundation',
    description: 'Complete 1 building',
    tier: 'Starter',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 1,
    expectedRangeMinutes: [5, 10],
    minimumSeconds: 50,
  },
  {
    id: 'sr_first_service',
    name: 'Revenue Online',
    description: 'Activate 1 service',
    tier: 'Starter',
    check: (s) => s.activeServices.length >= 1,
    expectedRangeMinutes: [8, 15],
    minimumSeconds: 50,
  },
  {
    id: 'sr_500m_cash',
    name: 'Half Billionaire',
    description: 'Reach $500M cash',
    tier: 'Easy',
    check: (s) => s.money >= 500_000_000,
    expectedRangeMinutes: [20, 45],
    minimumSeconds: 60,
  },
  {
    id: 'sr_1b_cash',
    name: 'Billionaire',
    description: 'Reach $1B cash',
    tier: 'Easy',
    check: (s) => s.money >= 1_000_000_000,
    expectedRangeMinutes: [60, 180],
    minimumSeconds: 180,
  },
  {
    id: 'sr_5_buildings',
    name: 'Industrialist',
    description: 'Complete 5 buildings',
    tier: 'Medium',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 5,
    expectedRangeMinutes: [60, 120],
    minimumSeconds: 180,
  },
  {
    id: 'sr_10_buildings',
    name: 'Developer',
    description: 'Complete 10 buildings',
    tier: 'Medium',
    check: (s) => s.buildings.filter(b => b.isComplete).length >= 10,
    expectedRangeMinutes: [180, 480],
    minimumSeconds: 420,
  },
  {
    id: 'sr_5_research',
    name: 'Researcher',
    description: 'Complete 5 research projects',
    tier: 'Medium',
    check: (s) => s.completedResearch.length >= 5,
    expectedRangeMinutes: [120, 300],
    minimumSeconds: 300,
  },
  {
    id: 'sr_geo_unlock',
    name: 'GEO Access',
    description: 'Unlock Geostationary Orbit',
    tier: 'Medium',
    check: (s) => s.unlockedLocations.includes('geo'),
    expectedRangeMinutes: [30, 60],
    minimumSeconds: 120,
  },
  {
    id: 'sr_lunar_access',
    name: 'Lunar Pioneer',
    description: 'Unlock Lunar Surface',
    tier: 'Hard',
    check: (s) => s.unlockedLocations.includes('lunar_surface'),
    expectedRangeMinutes: [240, 720],
    minimumSeconds: 600,
  },
  {
    id: 'sr_10_services',
    name: 'Service Empire',
    description: 'Run 10 active services',
    tier: 'Hard',
    check: (s) => s.activeServices.length >= 10,
    expectedRangeMinutes: [360, 1080],
    minimumSeconds: 900,
  },
  {
    id: 'sr_10b_cash',
    name: 'Ten Billionaire',
    description: 'Reach $10B cash',
    tier: 'Hard',
    check: (s) => s.money >= 10_000_000_000,
    expectedRangeMinutes: [720, 2160],
    minimumSeconds: 1800,
  },
  {
    id: 'sr_mars_access',
    name: 'Mars Pioneer',
    description: 'Unlock Mars Orbit',
    tier: 'Expert',
    check: (s) => s.unlockedLocations.includes('mars_orbit'),
    expectedRangeMinutes: [1440, 4320],
    minimumSeconds: 3600,
  },
  {
    id: 'sr_asteroid_mine',
    name: 'Asteroid Miner',
    description: 'Complete an asteroid belt mining building',
    tier: 'Expert',
    check: (s) => s.buildings.some(b => b.isComplete && b.definitionId === 'mining_asteroid'),
    expectedRangeMinutes: [2160, 5760],
    minimumSeconds: 5400,
  },
  {
    id: 'sr_100b_cash',
    name: 'Hundred Billionaire',
    description: 'Reach $100B cash',
    tier: 'Master',
    check: (s) => s.money >= 100_000_000_000,
    expectedRangeMinutes: [4320, 10080],
    minimumSeconds: 10800,
  },
  {
    id: 'sr_jupiter_access',
    name: 'Jovian Pioneer',
    description: 'Unlock Jupiter System',
    tier: 'Master',
    check: (s) => s.unlockedLocations.includes('jupiter_system'),
    expectedRangeMinutes: [5760, 10080],
    minimumSeconds: 14400,
  },
];

// ─── Composite Milestones ───────────────────────────────────────────────────

export const COMPOSITE_MILESTONES: CompositeMilestone[] = [
  {
    id: 'sr_combo_early',
    name: 'Quick Start',
    description: 'Complete 1 building + 1 service + reach $500M',
    componentIds: ['sr_first_building', 'sr_first_service', 'sr_500m_cash'],
    check: (s) =>
      s.buildings.filter(b => b.isComplete).length >= 1 &&
      s.activeServices.length >= 1 &&
      s.money >= 500_000_000,
  },
  {
    id: 'sr_combo_expansion',
    name: 'Expansion Rush',
    description: '5 buildings + GEO unlock + 3 research',
    componentIds: ['sr_5_buildings', 'sr_geo_unlock', 'sr_5_research'],
    check: (s) =>
      s.buildings.filter(b => b.isComplete).length >= 5 &&
      s.unlockedLocations.includes('geo') &&
      s.completedResearch.length >= 3,
  },
  {
    id: 'sr_combo_midgame',
    name: 'Midgame Mastery',
    description: '10 buildings + Lunar access + $10B',
    componentIds: ['sr_10_buildings', 'sr_lunar_access', 'sr_10b_cash'],
    check: (s) =>
      s.buildings.filter(b => b.isComplete).length >= 10 &&
      s.unlockedLocations.includes('lunar_surface') &&
      s.money >= 10_000_000_000,
  },
  {
    id: 'sr_combo_lategame',
    name: 'Endgame Sprint',
    description: 'Mars access + 10 services + $100B',
    componentIds: ['sr_mars_access', 'sr_10_services', 'sr_100b_cash'],
    check: (s) =>
      s.unlockedLocations.includes('mars_orbit') &&
      s.activeServices.length >= 10 &&
      s.money >= 100_000_000_000,
  },
];

// ─── Milestone Lookup Maps ──────────────────────────────────────────────────

const MILESTONE_MAP = new Map(SPEED_RUN_MILESTONES.map(m => [m.id, m]));
const COMPOSITE_MAP = new Map(COMPOSITE_MILESTONES.map(m => [m.id, m]));

export function getMilestoneById(id: string): SpeedRunMilestone | undefined {
  return MILESTONE_MAP.get(id);
}

export function getCompositeById(id: string): CompositeMilestone | undefined {
  return COMPOSITE_MAP.get(id);
}

// ─── Bracket System ─────────────────────────────────────────────────────────

export const BRACKETS: { id: SpeedRunBracket; name: string; minLevel: number; maxLevel: number }[] = [
  { id: 'rookie', name: 'Rookie', minLevel: 1, maxLevel: 3 },
  { id: 'veteran', name: 'Veteran', minLevel: 4, maxLevel: 6 },
  { id: 'elite', name: 'Elite', minLevel: 7, maxLevel: 10 },
  { id: 'grandmaster', name: 'Grandmaster', minLevel: 11, maxLevel: Infinity },
];

/**
 * Determine prestige bracket from prestige level.
 * P0 cannot participate in speed runs (no prestige yet).
 */
export function getPrestigeBracket(prestigeLevel: number): SpeedRunBracket {
  if (prestigeLevel <= 3) return 'rookie';
  if (prestigeLevel <= 6) return 'veteran';
  if (prestigeLevel <= 10) return 'elite';
  return 'grandmaster';
}

export function getBracketDisplayName(bracket: SpeedRunBracket): string {
  const def = BRACKETS.find(b => b.id === bracket);
  if (!def) return bracket;
  if (bracket === 'grandmaster') return `Grandmaster (P11+)`;
  return `${def.name} (P${def.minLevel}-P${def.maxLevel})`;
}

// ─── Weekly Challenge Selection ─────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deterministic weekly challenge rotation.
 * Primary milestone cycles through the 15 milestones.
 * Composite milestone cycles through 4 composites, offset by 3 weeks.
 */
export function getCurrentChallenge(weekId?: number): WeeklyChallenge {
  const wid = weekId ?? getCurrentWeekId();

  const primaryIndex = wid % 15;
  const compositeIndex = (wid + 3) % 4;

  const startsAt = wid * WEEK_MS;
  const endsAt = startsAt + WEEK_MS;

  return {
    weekId: wid,
    primaryMilestone: SPEED_RUN_MILESTONES[primaryIndex],
    compositeMilestone: COMPOSITE_MILESTONES[compositeIndex],
    startsAt,
    endsAt,
  };
}

/** Preview next week's challenge */
export function getNextWeekChallenge(): WeeklyChallenge {
  return getCurrentChallenge(getCurrentWeekId() + 1);
}

// ─── Milestone Checking ─────────────────────────────────────────────────────

/**
 * Check a single milestone against game state.
 * Returns true if the milestone condition is met.
 */
export function checkMilestoneCompletion(state: GameState, milestoneId: string): boolean {
  const milestone = MILESTONE_MAP.get(milestoneId);
  if (milestone) return milestone.check(state);

  const composite = COMPOSITE_MAP.get(milestoneId);
  if (composite) return composite.check(state);

  return false;
}

/**
 * Check all milestones against current game state.
 * Returns array of milestone IDs that are now complete.
 */
export function checkAllMilestones(state: GameState): string[] {
  const completed: string[] = [];
  for (const m of SPEED_RUN_MILESTONES) {
    if (m.check(state)) completed.push(m.id);
  }
  return completed;
}

// ─── Time Formatting ────────────────────────────────────────────────────────

/**
 * Format elapsed milliseconds to a human-readable string.
 * Under 1 hour: "4m 32s"
 * Under 24 hours: "2h 15m"
 * Over 24 hours: "1d 6h 42m"
 */
export function formatElapsedTime(ms: number): string {
  if (ms < 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  if (totalHours >= 24) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (totalMinutes >= 60) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

// ─── Suspicion Score ────────────────────────────────────────────────────────

/**
 * Calculate anti-cheat suspicion score for a speed run completion.
 * 0-49 = normal, 50-99 = flagged for review, 100+ = hidden from leaderboard.
 */
export function calculateSuspicionScore(
  milestoneId: string,
  elapsedMs: number,
  bracketRecord?: number,
): number {
  const milestone = MILESTONE_MAP.get(milestoneId);
  if (!milestone) return 0;

  let score = 0;
  const floorMs = milestone.minimumSeconds * 1000;

  // Time below the physical minimum
  if (elapsedMs < floorMs * 0.8) score += 50;
  else if (elapsedMs < floorMs * 1.2) score += 10;

  // Time suspiciously faster than bracket record
  if (bracketRecord && elapsedMs < bracketRecord * 0.5) score += 30;

  // Less than 1 second is always suspicious
  if (elapsedMs < 1000) score += 100;

  return score;
}

// ─── Reward Calculation ─────────────────────────────────────────────────────

/**
 * Calculate rewards based on rank within bracket and total participants.
 */
export function getSpeedRunRewards(
  rank: number,
  totalParticipants: number,
  _bracket: SpeedRunBracket,
): SpeedRunReward {
  // Participation reward (everyone who completes)
  if (rank <= 0 || totalParticipants <= 0) {
    return { cash: 25_000_000, legacyPoints: 5 };
  }

  // Rank-based rewards
  if (rank === 1) {
    return {
      cash: 500_000_000,
      legacyPoints: 100,
      title: 'Speed Demon',
      badge: 'speed_demon_nameplate',
    };
  }
  if (rank === 2) {
    return {
      cash: 350_000_000,
      legacyPoints: 75,
      title: 'Velocity',
    };
  }
  if (rank === 3) {
    return {
      cash: 250_000_000,
      legacyPoints: 50,
      title: 'Swift',
    };
  }
  if (rank <= 10) {
    return {
      cash: 150_000_000,
      legacyPoints: 30,
      badge: 'speed_animated',
    };
  }
  if (rank <= 25) {
    return {
      cash: 100_000_000,
      legacyPoints: 20,
      badge: 'speed_badge',
    };
  }

  // Top 50%
  const percentile = rank / totalParticipants;
  if (percentile <= 0.5) {
    return { cash: 50_000_000, legacyPoints: 10 };
  }

  // Everyone else who completed
  return { cash: 25_000_000, legacyPoints: 5 };
}

/** Personal best improvement reward */
export function getPersonalBestReward(): SpeedRunReward {
  return {
    cash: 75_000_000,
    legacyPoints: 15,
  };
}

/** Record-breaking reward */
export function getRecordReward(): SpeedRunReward {
  return {
    cash: 250_000_000,
    legacyPoints: 250,
    title: 'Record Holder',
    badge: 'record_holder_nameplate',
  };
}

// ─── Server-Side Helpers (used by API routes) ───────────────────────────────

/**
 * Start a speed run for a player after prestige.
 * Called from the API route, not directly from client.
 */
export async function startSpeedRun(
  prisma: {
    speedRunAttempt: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    speedRunChallenge: {
      findUnique: (args: { where: Record<string, unknown> }) => Promise<{ id: string } | null>;
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
  },
  profileId: string,
  prestigeLevel: number,
): Promise<{ attemptId: string; challengeId: string; bracket: SpeedRunBracket }> {
  const bracket = getPrestigeBracket(prestigeLevel);
  const challenge = getCurrentChallenge();

  // Ensure the weekly challenge record exists
  let dbChallenge = await prisma.speedRunChallenge.findUnique({
    where: { weekId: challenge.weekId },
  });

  if (!dbChallenge) {
    dbChallenge = await prisma.speedRunChallenge.create({
      data: {
        weekId: challenge.weekId,
        milestoneId: challenge.primaryMilestone.id,
        milestoneName: challenge.primaryMilestone.name,
        milestoneTarget: challenge.primaryMilestone.description,
        startsAt: new Date(challenge.startsAt),
        endsAt: new Date(challenge.endsAt),
        status: 'active',
      },
    });
  }

  // Create the attempt
  const attempt = await prisma.speedRunAttempt.create({
    data: {
      challengeId: dbChallenge.id,
      profileId,
      prestigeLevel,
      bracket,
      startedAtMs: Date.now(),
    },
  });

  return {
    attemptId: attempt.id,
    challengeId: dbChallenge.id,
    bracket,
  };
}

/**
 * Complete a speed run attempt by recording the finish time and computing rank.
 */
export async function completeSpeedRun(
  prisma: {
    speedRunAttempt: {
      findUnique: (args: { where: Record<string, unknown> }) => Promise<{
        id: string;
        startedAtMs: number;
        challengeId: string;
        bracket: string;
        completedAtMs: number | null;
      } | null>;
      update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{
        id: string;
        durationSeconds: number | null;
      }>;
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    };
    speedRunChallenge: {
      findUnique: (args: { where: Record<string, unknown> }) => Promise<{
        id: string;
        milestoneId: string;
      } | null>;
    };
  },
  attemptId: string,
): Promise<{
  durationSeconds: number;
  rank: number;
  totalInBracket: number;
  suspicionScore: number;
} | null> {
  const attempt = await prisma.speedRunAttempt.findUnique({
    where: { id: attemptId },
  });

  if (!attempt || attempt.completedAtMs) return null;

  const now = Date.now();
  const elapsedMs = now - attempt.startedAtMs;
  const durationSeconds = elapsedMs / 1000;

  // Reject times under 1 second
  if (durationSeconds < 1) return null;

  // Look up the challenge record to get the actual milestone ID
  const challenge = await prisma.speedRunChallenge.findUnique({
    where: { id: attempt.challengeId },
  });

  // Calculate suspicion score using the milestone ID (not the challenge DB ID)
  const suspicionScore = calculateSuspicionScore(
    challenge?.milestoneId ?? attempt.challengeId,
    elapsedMs,
  );

  // Record completion
  await prisma.speedRunAttempt.update({
    where: { id: attemptId },
    data: {
      completedAtMs: now,
      durationSeconds,
      isVerified: suspicionScore < 100,
      suspicionScore,
    },
  });

  // Calculate rank within bracket for this challenge
  const fasterCount = await prisma.speedRunAttempt.count({
    where: {
      challengeId: attempt.challengeId,
      bracket: attempt.bracket,
      completedAtMs: { not: null },
      durationSeconds: { lt: durationSeconds },
      isVerified: true,
    },
  });

  const totalInBracket = await prisma.speedRunAttempt.count({
    where: {
      challengeId: attempt.challengeId,
      bracket: attempt.bracket,
      completedAtMs: { not: null },
      isVerified: true,
    },
  });

  const rank = fasterCount + 1;

  // Update rank
  await prisma.speedRunAttempt.update({
    where: { id: attemptId },
    data: { rank },
  });

  return { durationSeconds, rank, totalInBracket, suspicionScore };
}
