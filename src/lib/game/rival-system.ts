// ─── Space Tycoon: Ghost/Shadow Rivals — Core Game Logic ────────────────────
//
// Implements CPS matching, rivalry scoring, and event detection for the
// asynchronous ghost-rival system.

import prisma from '@/lib/db';
import { getCurrentWeekId } from './weekly-events';

// ─── Constants ──────────────────────────────────────────────────────────────

export const RIVAL_CONSTANTS = {
  // CPS weights (must sum to 1.0)
  CPS_WEIGHTS: {
    netWorth: 0.40,
    accountAge: 0.20,
    services: 0.15,
    buildings: 0.15,
    research: 0.10,
  },

  // Matching
  CPS_MATCH_BAND: 0.30,
  CPS_MATCH_BAND_WIDE: 0.50,
  RIVALS_PER_PLAYER: 3,
  NO_REMATCH_WEEKS: 4,

  // Scoring
  INITIAL_SCORE: 50,
  MAX_SCORE_MOVEMENT: 3,
  MAX_SCORE_MOVEMENT_LARGE_GAP: 2, // snapshot gap > 8h
  MAX_SCORE_MOVEMENT_HUGE_GAP: 1,  // snapshot gap > 24h
  WIN_THRESHOLD: 55,
  LOSS_THRESHOLD: 45,

  // Score movement metric weights (must sum to 1.0)
  SCORE_WEIGHTS: {
    netWorthGrowth: 0.35,
    buildings: 0.20,
    research: 0.15,
    services: 0.15,
    locations: 0.15,
  },
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileForCPS {
  netWorth: number;
  peakNetWorth: number;
  buildingCount: number;
  researchCount: number;
  serviceCount: number;
  locationsUnlocked: number;
  createdAt: Date;
}

interface SnapshotData {
  netWorth: number;
  buildings: number;
  research: number;
  services: number;
}

export interface RivalCandidate {
  id: string;
  companyName: string;
  cps: number;
  matchScore: number;
  lastSyncAt: Date;
}

export interface RivalEventOutput {
  type: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ─── Composite Power Score ──────────────────────────────────────────────────

/**
 * Calculate the Composite Power Score for a player profile.
 * Uses logarithmic normalization for net worth (spans $100M to $10T).
 * All component scores are normalized to 0-1000 then weighted.
 */
export function calculateCompositeScore(profile: ProfileForCPS): number {
  const W = RIVAL_CONSTANTS.CPS_WEIGHTS;

  // Net worth: logarithmic scale, $100M = 0, $10T = 1000
  // Use effective net worth (can't drop more than 15% below peak)
  const effectiveNetWorth = Math.max(
    profile.netWorth,
    profile.peakNetWorth * 0.85,
  );
  const logNw = effectiveNetWorth > 0 ? Math.log10(effectiveNetWorth) : 0;
  const S_nw = Math.min(1000, Math.max(0, ((logNw - 8) / 5) * 1000));

  // Account age: days since creation, cap at 365 days = 1000
  const ageDays = Math.max(
    1,
    (Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const S_age = Math.min(1000, (ageDays / 365) * 1000);

  // Service count: cap at 50 = 1000
  const S_svc = Math.min(1000, (profile.serviceCount / 50) * 1000);

  // Building count: cap at 100 = 1000
  const S_bld = Math.min(1000, (profile.buildingCount / 100) * 1000);

  // Research count: cap at 500 = 1000
  const S_res = Math.min(1000, (profile.researchCount / 500) * 1000);

  return (
    W.netWorth * S_nw +
    W.accountAge * S_age +
    W.services * S_svc +
    W.buildings * S_bld +
    W.research * S_res
  );
}

// ─── Rival Matching ─────────────────────────────────────────────────────────

/**
 * Find rival candidates for a player within the CPS band.
 * Excludes the player themselves and any IDs in `existingRivalIds`.
 * Returns candidates sorted by match score (descending).
 */
export async function findRivalCandidates(
  playerId: string,
  playerCPS: number,
  existingRivalIds: string[],
): Promise<RivalCandidate[]> {
  // Get all profiles (we need to compute CPS for each)
  // Filter recently active players (synced within 14 days)
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const profiles = await prisma.gameProfile.findMany({
    where: {
      id: { notIn: [playerId, ...existingRivalIds] },
      lastSyncAt: { gt: cutoff },
    },
    select: {
      id: true,
      companyName: true,
      netWorth: true,
      peakNetWorth: true,
      buildingCount: true,
      researchCount: true,
      serviceCount: true,
      locationsUnlocked: true,
      createdAt: true,
      lastSyncAt: true,
    },
  });

  // Calculate CPS for each candidate and filter to band
  const lowerBound = playerCPS * (1 - RIVAL_CONSTANTS.CPS_MATCH_BAND);
  const upperBound = playerCPS * (1 + RIVAL_CONSTANTS.CPS_MATCH_BAND);

  // Also compute a wider band as fallback
  const wideLower = playerCPS * (1 - RIVAL_CONSTANTS.CPS_MATCH_BAND_WIDE);
  const wideUpper = playerCPS * (1 + RIVAL_CONSTANTS.CPS_MATCH_BAND_WIDE);

  // Get recent rival history (last 4 weeks) to compute diversity scores
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const recentRivals = await prisma.rivalAssignment.findMany({
    where: {
      playerId,
      createdAt: { gt: fourWeeksAgo },
    },
    select: { rivalId: true, createdAt: true },
  });
  const recentRivalMap = new Map<string, Date>();
  for (const r of recentRivals) {
    const existing = recentRivalMap.get(r.rivalId);
    if (!existing || r.createdAt > existing) {
      recentRivalMap.set(r.rivalId, r.createdAt);
    }
  }

  const candidates: RivalCandidate[] = [];

  for (const p of profiles) {
    const cps = calculateCompositeScore({
      netWorth: p.netWorth,
      peakNetWorth: p.peakNetWorth,
      buildingCount: p.buildingCount,
      researchCount: p.researchCount,
      serviceCount: p.serviceCount,
      locationsUnlocked: p.locationsUnlocked,
      createdAt: p.createdAt,
    });

    // Check if within band (try narrow first, accept wide)
    const inNarrow = cps >= lowerBound && cps <= upperBound;
    const inWide = cps >= wideLower && cps <= wideUpper;
    if (!inNarrow && !inWide) continue;

    // Skip if matched within last 4 weeks
    const lastMatch = recentRivalMap.get(p.id);
    if (lastMatch) continue;

    // Compute match score components
    // Diversity: prefer opponents not recently faced
    const diversityScore = 1.0; // no recent match = max diversity

    // CPS proximity: closer is better
    const cpsDiff = Math.abs(playerCPS - cps);
    const maxDiff = playerCPS * RIVAL_CONSTANTS.CPS_MATCH_BAND;
    const proximityScore = 1.0 - Math.min(1.0, cpsDiff / Math.max(maxDiff, 1));

    // Activity recency: synced recently is better
    const hoursSinceSync =
      (Date.now() - p.lastSyncAt.getTime()) / (1000 * 60 * 60);
    const activityScore =
      hoursSinceSync < 48 ? 1.0 : hoursSinceSync < 168 ? 0.5 : 0.0;

    const matchScore =
      0.40 * diversityScore +
      0.30 * proximityScore +
      0.20 * activityScore +
      0.10 * 1.0; // alliance exclusion (simplified — always 1.0)

    candidates.push({
      id: p.id,
      companyName: p.companyName,
      cps,
      matchScore,
      lastSyncAt: p.lastSyncAt,
    });
  }

  // Sort by match score descending
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  return candidates;
}

// ─── Rivalry Score Update ───────────────────────────────────────────────────

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute the rivalry score movement based on player and rival snapshots.
 * Returns a value from -3 to +3 (positive = player advantage).
 */
export function computeScoreMovement(
  playerCurrent: SnapshotData,
  playerPrevious: SnapshotData,
  rivalCurrent: SnapshotData,
  rivalPrevious: SnapshotData,
  maxMovement: number = RIVAL_CONSTANTS.MAX_SCORE_MOVEMENT,
): number {
  const W = RIVAL_CONSTANTS.SCORE_WEIGHTS;

  // Compute deltas for each metric
  const metrics = [
    {
      weight: W.netWorthGrowth,
      playerDelta:
        (playerCurrent.netWorth - playerPrevious.netWorth) /
        Math.max(playerPrevious.netWorth, 1),
      rivalDelta:
        (rivalCurrent.netWorth - rivalPrevious.netWorth) /
        Math.max(rivalPrevious.netWorth, 1),
    },
    {
      weight: W.buildings,
      playerDelta: playerCurrent.buildings - playerPrevious.buildings,
      rivalDelta: rivalCurrent.buildings - rivalPrevious.buildings,
    },
    {
      weight: W.research,
      playerDelta: playerCurrent.research - playerPrevious.research,
      rivalDelta: rivalCurrent.research - rivalPrevious.research,
    },
    {
      weight: W.services,
      playerDelta: playerCurrent.services - playerPrevious.services,
      rivalDelta: rivalCurrent.services - rivalPrevious.services,
    },
    {
      weight: W.locations,
      playerDelta: 0, // Locations are tracked in snapshots but not currently stored separately
      rivalDelta: 0,  // So we use 0 for now — the other 4 metrics dominate
    },
  ];

  let totalAdvantage = 0;

  for (const m of metrics) {
    const diff = m.playerDelta - m.rivalDelta;
    const maxDelta = Math.max(
      Math.abs(m.playerDelta),
      Math.abs(m.rivalDelta),
      0.001,
    );
    const advantage = clamp(diff / maxDelta, -1.0, 1.0);
    totalAdvantage += m.weight * advantage;
  }

  return Math.round(clamp(totalAdvantage * maxMovement, -maxMovement, maxMovement));
}

/**
 * Update the rivalry score for an assignment based on new snapshot data.
 * Returns the new score and the movement amount.
 */
export function updateRivalryScore(
  currentScore: number,
  playerCurrent: SnapshotData,
  playerPrevious: SnapshotData,
  rivalCurrent: SnapshotData,
  rivalPrevious: SnapshotData,
  snapshotGapHours: number = 4,
): { newScore: number; movement: number } {
  // Determine max movement based on snapshot gap
  let maxMovement: number = RIVAL_CONSTANTS.MAX_SCORE_MOVEMENT;
  if (snapshotGapHours > 24) {
    maxMovement = RIVAL_CONSTANTS.MAX_SCORE_MOVEMENT_HUGE_GAP;
  } else if (snapshotGapHours > 8) {
    maxMovement = RIVAL_CONSTANTS.MAX_SCORE_MOVEMENT_LARGE_GAP;
  }

  const movement = computeScoreMovement(
    playerCurrent,
    playerPrevious,
    rivalCurrent,
    rivalPrevious,
    maxMovement,
  );

  const newScore = clamp(currentScore + movement, 0, 100);
  return { newScore, movement };
}

// ─── Rival Event Detection ──────────────────────────────────────────────────

/**
 * Check for rival events triggered by score changes and snapshot comparisons.
 * Returns an array of events to be created.
 */
export function checkRivalEvents(
  assignmentId: string,
  playerProfileId: string,
  rivalCompanyName: string,
  oldScore: number,
  newScore: number,
  playerNetWorth: number,
  rivalNetWorth: number,
  prevPlayerNetWorth: number,
  prevRivalNetWorth: number,
): RivalEventOutput[] {
  const events: RivalEventOutput[] = [];

  // 1. Overtake detection: player's net worth crossed above rival's
  const playerWasBelow = prevPlayerNetWorth <= prevRivalNetWorth;
  const playerNowAbove = playerNetWorth > rivalNetWorth;
  if (playerWasBelow && playerNowAbove) {
    events.push({
      type: 'rival_overtaken',
      title: 'You overtook a rival!',
      description: `You overtook ${rivalCompanyName}! Your net worth passed theirs.`,
      metadata: {
        playerNetWorth,
        rivalNetWorth,
      },
    });
  }

  // 2. Rival passed you: rival's net worth crossed above player's
  const rivalWasBelow = prevRivalNetWorth <= prevPlayerNetWorth;
  const rivalNowAbove = rivalNetWorth > playerNetWorth;
  if (rivalWasBelow && rivalNowAbove) {
    events.push({
      type: 'rival_passed_you',
      title: 'A rival passed you!',
      description: `${rivalCompanyName} just passed you! Time to push back.`,
      metadata: {
        playerNetWorth,
        rivalNetWorth,
      },
    });
  }

  // 3. Score critical thresholds
  if (newScore >= 75 && oldScore < 75) {
    events.push({
      type: 'rival_score_critical',
      title: 'Dominating!',
      description: `You're dominating ${rivalCompanyName}! Score: ${newScore}/100.`,
      metadata: { score: newScore },
    });
  }
  if (newScore <= 25 && oldScore > 25) {
    events.push({
      type: 'rival_score_critical',
      title: 'Rival pulling ahead!',
      description: `${rivalCompanyName} is pulling ahead. Score: ${newScore}/100.`,
      metadata: { score: newScore },
    });
  }

  return events;
}

// ─── Utility: Week Time Remaining ───────────────────────────────────────────

/**
 * Calculate milliseconds remaining in the current rivalry week.
 * Week resets every Monday 00:00 UTC.
 */
export function getWeekTimeRemainingMs(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  return nextMonday.getTime() - now.getTime();
}

/**
 * Get the label and color for a rivalry score.
 */
export function getScoreLabel(score: number): {
  label: string;
  color: string;
} {
  if (score >= 85) return { label: 'Player Dominating', color: 'green' };
  if (score >= 65) return { label: 'Player Leading', color: 'cyan' };
  if (score >= 51) return { label: 'Slight Player Lead', color: 'lightcyan' };
  if (score === 50) return { label: 'Dead Heat', color: 'white' };
  if (score >= 36) return { label: 'Slight Rival Lead', color: 'yellow' };
  if (score >= 16) return { label: 'Rival Leading', color: 'orange' };
  return { label: 'Rival Dominating', color: 'red' };
}

/**
 * Get the streak title for a given win streak count.
 */
export function getStreakTitle(streak: number): string | null {
  if (streak >= 12) return 'Unstoppable Force';
  if (streak >= 8) return 'Relentless';
  if (streak >= 5) return 'Competitive Edge';
  if (streak >= 3) return 'Rising Star';
  return null;
}

/**
 * Format a net worth comparison as a percentage difference.
 * Positive means player is ahead, negative means rival is ahead.
 */
export function compareMetric(
  playerValue: number,
  rivalValue: number,
): number {
  if (rivalValue === 0 && playerValue === 0) return 0;
  if (rivalValue === 0) return 100;
  return ((playerValue - rivalValue) / rivalValue) * 100;
}
