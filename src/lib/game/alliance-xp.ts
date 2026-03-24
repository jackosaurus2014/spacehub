// ─── Space Tycoon: Alliance XP Engine ──────────────────────────────────────
// Handles XP awards, level-up detection, level unlock definitions,
// activity streak tracking, and streak bonuses.

import { PrismaClient } from '@prisma/client';
import { computeLevelFromXP, totalXPForLevel } from './alliance-events';

// ─── XP Source Ranges ──────────────────────────────────────────────────────
// daily_task: 5-15, event: 25-500, project: 100-5000,
// research: 50-250, member_milestone: 10-50

export type XPSource =
  | 'daily_task'
  | 'event'
  | 'project'
  | 'research'
  | 'member_milestone'
  | 'war_victory'
  | 'treasury_deposit'
  | 'system';

// ─── Level Unlock Definitions ──────────────────────────────────────────────

export interface LevelUnlock {
  level: number;
  label: string;
  description: string;
  feature: string;
}

const LEVEL_UNLOCKS: LevelUnlock[] = [
  { level: 3,  label: 'Shared Projects',      description: 'Propose and fund cooperative alliance projects.',       feature: 'projects' },
  { level: 5,  label: 'Research T1',           description: 'Unlock Tier 1 alliance research tree.',                 feature: 'research_t1' },
  { level: 8,  label: 'Alliance Perks',        description: 'Activate temporary perk buffs from treasury.',          feature: 'perks' },
  { level: 10, label: 'Research T2',           description: 'Unlock Tier 2 alliance research tree.',                 feature: 'research_t2' },
  { level: 15, label: 'Research T3',           description: 'Unlock Tier 3 alliance research tree.',                 feature: 'research_t3' },
  { level: 20, label: 'Premium Projects',      description: 'Propose mega-tier cooperative projects.',               feature: 'premium_projects' },
  { level: 25, label: 'Research T4 & T5',      description: 'Unlock Tier 4 and Tier 5 alliance research.',           feature: 'research_t4_t5' },
  { level: 30, label: 'Diplomacy & Dyson Swarm', description: 'Access diplomacy system and Dyson Swarm project.', feature: 'diplomacy' },
];

/**
 * Get all unlocks for a specific level.
 */
export function getLevelUnlocks(level: number): LevelUnlock[] {
  return LEVEL_UNLOCKS.filter(u => u.level === level);
}

/**
 * Get all unlocks achieved up to and including a given level.
 */
export function getUnlocksUpToLevel(level: number): LevelUnlock[] {
  return LEVEL_UNLOCKS.filter(u => u.level <= level);
}

/**
 * Check if a specific feature is unlocked at the given level.
 */
export function isFeatureUnlocked(level: number, feature: string): boolean {
  return LEVEL_UNLOCKS.some(u => u.feature === feature && u.level <= level);
}

/**
 * Get the minimum research tier available at a given alliance level.
 * Returns 0 if no research is unlocked yet.
 */
export function getMaxResearchTier(level: number): number {
  if (level >= 25) return 5;
  if (level >= 15) return 3;
  if (level >= 10) return 2;
  if (level >= 5) return 1;
  return 0;
}

// ─── Check Level Up ────────────────────────────────────────────────────────

/**
 * Given current total XP, check what level the alliance should be.
 * Level N requires cumulative N*(N+1)/2 * 100 XP.
 */
export function checkLevelUp(currentXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPct: number;
} {
  return computeLevelFromXP(currentXP);
}

// ─── Award Alliance XP ────────────────────────────────────────────────────

export interface AwardXPResult {
  newXP: number;
  newLevel: number;
  previousLevel: number;
  leveledUp: boolean;
  unlocks: LevelUnlock[];
}

/**
 * Award XP to an alliance. Handles level-up detection and creates AllianceLog.
 */
export async function awardAllianceXP(
  prisma: PrismaClient,
  allianceId: string,
  amount: number,
  source: XPSource,
  actorId?: string,
  actorName?: string,
): Promise<AwardXPResult> {
  if (amount <= 0) {
    const alliance = await prisma.alliance.findUniqueOrThrow({ where: { id: allianceId }, select: { xp: true, level: true } });
    return { newXP: alliance.xp, newLevel: alliance.level, previousLevel: alliance.level, leveledUp: false, unlocks: [] };
  }

  // Atomically increment XP
  const updated = await prisma.alliance.update({
    where: { id: allianceId },
    data: { xp: { increment: amount } },
    select: { xp: true, level: true },
  });

  const previousLevel = updated.level;
  const { level: newLevel } = checkLevelUp(updated.xp);
  const leveledUp = newLevel > previousLevel;

  // Update level if changed
  if (leveledUp) {
    await prisma.alliance.update({
      where: { id: allianceId },
      data: { level: newLevel },
    });
  }

  // Create XP log entry
  await prisma.allianceLog.create({
    data: {
      allianceId,
      type: 'xp_earned',
      actorId: actorId ?? null,
      actorName: actorName ?? null,
      title: `+${amount} XP from ${source.replace(/_/g, ' ')}`,
      description: leveledUp
        ? `Alliance leveled up from ${previousLevel} to ${newLevel}!`
        : null,
      xpEarned: amount,
      metadata: { source, amount, newTotal: updated.xp },
    },
  });

  // If leveled up, log the level-up and any unlocks
  const unlocks: LevelUnlock[] = [];
  if (leveledUp) {
    // Collect all unlocks between previousLevel+1 and newLevel
    for (let l = previousLevel + 1; l <= newLevel; l++) {
      unlocks.push(...getLevelUnlocks(l));
    }

    await prisma.allianceLog.create({
      data: {
        allianceId,
        type: 'level_up',
        actorId: null,
        actorName: null,
        title: `Alliance reached level ${newLevel}!`,
        description: unlocks.length > 0
          ? `Unlocked: ${unlocks.map(u => u.label).join(', ')}`
          : null,
        metadata: { previousLevel, newLevel, unlocks: unlocks.map(u => u.feature) },
      },
    });
  }

  return {
    newXP: updated.xp,
    newLevel: leveledUp ? newLevel : previousLevel,
    previousLevel,
    leveledUp,
    unlocks,
  };
}

// ─── Activity Streak ───────────────────────────────────────────────────────

/**
 * Update a member's activity streak. Call once per day when the member is active.
 * Increments streak if last active was yesterday, resets to 1 if gap > 1 day.
 */
export async function updateActivityStreak(
  prisma: PrismaClient,
  memberId: string,
): Promise<{ streak: number; bonus: StreakBonus }> {
  const member = await prisma.allianceMember.findUniqueOrThrow({
    where: { id: memberId },
    select: { lastActiveAt: true, activityStreak: true },
  });

  const now = new Date();
  const lastActive = member.lastActiveAt;
  const daysSinceActive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000)
  );

  let newStreak: number;
  if (daysSinceActive <= 1) {
    // Same day or next day — increment streak
    newStreak = member.activityStreak + 1;
  } else {
    // Gap > 1 day — reset streak
    newStreak = 1;
  }

  await prisma.allianceMember.update({
    where: { id: memberId },
    data: {
      activityStreak: newStreak,
      lastActiveAt: now,
      status: 'active',
    },
  });

  return { streak: newStreak, bonus: getStreakBonusDetails(newStreak) };
}

// ─── Streak Bonus Details ──────────────────────────────────────────────────

export interface StreakBonus {
  revenueBonus: number;
  label: string | null;
  xpBoost: boolean;
  badge: string | null;
}

/**
 * Get detailed streak bonus information.
 * 3d: +2% revenue, 7d: +5% revenue, 14d: +5% + XP boost, 30d: +5% + badge
 */
export function getStreakBonusDetails(streak: number): StreakBonus {
  if (streak >= 30) {
    return { revenueBonus: 0.05, label: 'Dedicated (30-day streak)', xpBoost: true, badge: 'streak_30' };
  }
  if (streak >= 14) {
    return { revenueBonus: 0.05, label: '14-day streak', xpBoost: true, badge: null };
  }
  if (streak >= 7) {
    return { revenueBonus: 0.05, label: '7-day streak', xpBoost: false, badge: null };
  }
  if (streak >= 3) {
    return { revenueBonus: 0.02, label: '3-day streak', xpBoost: false, badge: null };
  }
  return { revenueBonus: 0, label: null, xpBoost: false, badge: null };
}

// ─── XP Amount Validators ──────────────────────────────────────────────────

/** XP source range validation (prevents abuse / bugs) */
export const XP_SOURCE_RANGES: Record<XPSource, { min: number; max: number }> = {
  daily_task: { min: 5, max: 15 },
  event: { min: 25, max: 500 },
  project: { min: 100, max: 5000 },
  research: { min: 50, max: 250 },
  member_milestone: { min: 10, max: 50 },
  war_victory: { min: 250, max: 500 },
  treasury_deposit: { min: 5, max: 50 },
  system: { min: 0, max: 10000 },
};

/**
 * Clamp an XP amount to valid range for its source.
 */
export function clampXP(amount: number, source: XPSource): number {
  const range = XP_SOURCE_RANGES[source];
  return Math.max(range.min, Math.min(range.max, Math.round(amount)));
}

/**
 * Get a human-readable XP level summary.
 */
export function getXPSummary(totalXP: number): {
  level: number;
  currentLevelXP: number;
  xpToNextLevel: number;
  progressPct: number;
  totalXPForCurrentLevel: number;
  totalXPForNextLevel: number;
} {
  const info = checkLevelUp(totalXP);
  return {
    ...info,
    totalXPForCurrentLevel: totalXPForLevel(info.level),
    totalXPForNextLevel: totalXPForLevel(info.level + 1),
  };
}
