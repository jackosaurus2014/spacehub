import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  checkMilestoneCompletion,
  calculateSuspicionScore,
  formatElapsedTime,
  getSpeedRunRewards,
  getPersonalBestReward,
  getRecordReward,
  getMilestoneById,
} from '@/lib/game/speed-runs';
import type { GameState } from '@/lib/game/types';
// AAA Round 1 E3.5: rewards are credited through the SAME server-authoritative
// path league payouts use (gameProfile.update + server ledger), so the client
// picks them up on its next sync reconciliation instead of the payload being
// discarded by the panel.
import { isLedgerAvailable, recordLedger } from '@/lib/game/server-ledger';
// Phase 3 slice 1: buildings come from the ServerAsset registry (server-assets.ts).
import { loadServerRegistry } from '@/lib/game/server-assets';

/**
 * POST /api/space-tycoon/speed-runs/check
 * Check if the player has completed the milestone during an active speed run.
 * Called during sync with the current game state.
 *
 * Body: { gameState?: ... } — ACCEPTED AND IGNORED since the 2026-09-01
 * hardening (docs/SECURITY_AUDIT_2026-08.md P4). The milestone is checked
 * against the player's server-synced GameProfile (money, buildingsData,
 * completedResearchList, activeServicesData, unlockedLocationsList), never
 * against a client-supplied state — a client could previously post
 * `{ gameState: { money: 1e12 } }` and collect the cash reward.
 *
 * Because the profile is refreshed by /sync, completion is detected on the
 * first check after the qualifying sync (bounded by the sync cadence).
 *
 * Records completedAtMs, calculates durationSeconds, updates rank.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The body is read only so a malformed payload yields a clean 400 instead
    // of an unhandled parse error; its contents are not used.
    const body = await request.json().catch(() => null);
    if (body !== null && typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Get player profile — the ONLY source of state for the milestone check.
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        companyName: true,
        money: true,
        totalEarned: true,
        totalSpent: true,
        gameYear: true,
        resources: true,
        buildingsData: true,
        completedResearchList: true,
        activeServicesData: true,
        unlockedLocationsList: true,
        shipsData: true,
        workforceData: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'No game profile found' }, { status: 404 });
    }

    // Find the player's active (incomplete) attempt
    const activeAttempt = await prisma.speedRunAttempt.findFirst({
      where: {
        profileId: profile.id,
        completedAtMs: null,
      },
      include: {
        challenge: {
          select: { milestoneId: true, milestoneName: true, weekId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeAttempt) {
      return NextResponse.json({
        success: false,
        message: 'No active speed run attempt found',
      });
    }

    // Construct a minimal GameState for milestone checking from the
    // server-side profile (the same fields /sync persists). Every milestone
    // predicate in speed-runs.ts reads only money / buildings /
    // completedResearch / activeServices / unlockedLocations.
    const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
    // Phase 3 slices 1-5 (docs/SECURITY_AUDIT_2026-09.md): buildings,
    // research, services and locations come from the ServerAsset registry
    // (union in shadow, server rows only in enforce).
    const registry = await loadServerRegistry(profile.id, profile, { workforceData: profile.workforceData });
    const state: GameState = {
      version: 1,
      createdAt: Date.now(),
      lastTickAt: Date.now(),
      money: Number.isFinite(profile.money) ? profile.money : 0,
      totalEarned: Number.isFinite(profile.totalEarned) ? profile.totalEarned : 0,
      totalSpent: Number.isFinite(profile.totalSpent) ? profile.totalSpent : 0,
      gameDate: { year: profile.gameYear || 2026, month: 1 },
      tickSpeed: 1,
      buildings: registry.buildings.buildings,
      completedResearch: registry.research.completed,
      activeResearch: null,
      activeServices: registry.services.services as GameState['activeServices'],
      unlockedLocations: registry.locations.unlocked,
      resources: profile.resources && typeof profile.resources === 'object'
        ? (profile.resources as Record<string, number>)
        : {},
      eventLog: [],
      stats: {
        rocketsLaunched: 0,
        satellitesDeployed: 0,
        stationsBuilt: 0,
        researchCompleted: 0,
        missionsToMoon: 0,
        missionsToMars: 0,
        missionsToOuterPlanets: 0,
      },
    };

    const milestoneId = activeAttempt.challenge.milestoneId;
    const isComplete = checkMilestoneCompletion(state, milestoneId);

    if (!isComplete) {
      // Return current progress info
      const elapsedMs = Date.now() - activeAttempt.startedAtMs;
      return NextResponse.json({
        success: true,
        milestoneId,
        milestoneName: activeAttempt.challenge.milestoneName,
        isComplete: false,
        elapsedMs,
        elapsedFormatted: formatElapsedTime(elapsedMs),
      });
    }

    // Milestone completed -- record it
    const now = Date.now();
    const elapsedMs = now - activeAttempt.startedAtMs;
    const durationSeconds = elapsedMs / 1000;

    // Reject times under 1 second
    if (durationSeconds < 1) {
      return NextResponse.json(
        { error: 'Completion time too short, rejected' },
        { status: 400 },
      );
    }

    // Check minimum time floor
    const milestone = getMilestoneById(milestoneId);
    if (milestone && durationSeconds < milestone.minimumSeconds * 0.5) {
      return NextResponse.json(
        { error: 'Completion time below physical minimum, rejected' },
        { status: 400 },
      );
    }

    // Calculate suspicion score
    const suspicionScore = calculateSuspicionScore(milestoneId, elapsedMs);

    // Update the attempt
    await prisma.speedRunAttempt.update({
      where: { id: activeAttempt.id },
      data: {
        completedAtMs: now,
        durationSeconds,
        isVerified: suspicionScore < 100,
        suspicionScore,
      },
    });

    // Calculate rank within bracket
    const bracket = activeAttempt.bracket as 'rookie' | 'veteran' | 'elite' | 'grandmaster';
    const fasterCount = await prisma.speedRunAttempt.count({
      where: {
        challengeId: activeAttempt.challengeId,
        bracket: activeAttempt.bracket,
        completedAtMs: { not: null },
        durationSeconds: { lt: durationSeconds },
        isVerified: true,
      },
    });

    const totalInBracket = await prisma.speedRunAttempt.count({
      where: {
        challengeId: activeAttempt.challengeId,
        bracket: activeAttempt.bracket,
        completedAtMs: { not: null },
        isVerified: true,
      },
    });

    const rank = fasterCount + 1;

    // Update rank on attempt
    await prisma.speedRunAttempt.update({
      where: { id: activeAttempt.id },
      data: { rank },
    });

    // Check if this is a personal best
    const previousBest = await prisma.speedRunAttempt.findFirst({
      where: {
        profileId: profile.id,
        id: { not: activeAttempt.id },
        completedAtMs: { not: null },
        isVerified: true,
        challenge: { milestoneId },
      },
      orderBy: { durationSeconds: 'asc' },
      select: { durationSeconds: true },
    });

    const isPersonalBest = !previousBest || durationSeconds < (previousBest.durationSeconds ?? Infinity);

    // Check if this is a new bracket record
    const currentRecord = await prisma.speedRunAttempt.findFirst({
      where: {
        id: { not: activeAttempt.id },
        bracket: activeAttempt.bracket,
        completedAtMs: { not: null },
        isVerified: true,
        challenge: { milestoneId },
      },
      orderBy: { durationSeconds: 'asc' },
      select: { durationSeconds: true },
    });

    const isNewRecord = !currentRecord || durationSeconds < (currentRecord.durationSeconds ?? Infinity);

    // ─── Rewards (E3.5) ────────────────────────────────────────────────
    // Before this wave the block below computed `rewards` and returned it,
    // and SpeedRunPanel threw the body away — a completed speed run paid
    // nothing at all despite the panel advertising a rank-reward table.
    // Both halves are fixed: the cash is credited here (authoritative, with
    // a ledger row the client reconciles) and the title is written to the
    // profile, which the leaderboard already renders.
    const rewards = getSpeedRunRewards(rank, totalInBracket, bracket);
    if (isPersonalBest) {
      rewards.cash += getPersonalBestReward().cash;
    }
    // A new bracket record supersedes the rank title and pays the record
    // bonus — `getRecordReward` was authored and had zero callers.
    if (isNewRecord) {
      const rec = getRecordReward();
      rewards.cash += rec.cash;
      rewards.title = rec.title;
      rewards.badge = rec.badge || rewards.badge;
    }
    // Unverified (suspicion >= 100) runs are recorded but never paid — the
    // anti-cheat floor already refuses sub-minimum times above; this is the
    // softer tier.
    const paid = suspicionScore < 100;
    let rewardCredited = 0;
    let titleAwarded: string | null = null;
    if (paid) {
      try {
        const ledgerOn = await isLedgerAvailable();
        await prisma.$transaction(async (tx) => {
          await tx.gameProfile.update({
            where: { id: profile.id },
            data: {
              money: { increment: rewards.cash },
              totalEarned: { increment: rewards.cash },
              ...(rewards.title ? { title: rewards.title } : {}),
            },
          });
          if (ledgerOn) {
            await recordLedger(tx, {
              profileId: profile.id,
              moneyDelta: rewards.cash,
              reason: 'speed_run_reward',
              refId: activeAttempt.id,
            });
          }
        });
        rewardCredited = rewards.cash;
        titleAwarded = rewards.title ?? null;
      } catch (err) {
        console.error('Speed run reward credit failed (attempt still recorded):', err);
      }
    }

    return NextResponse.json({
      success: true,
      milestoneId,
      milestoneName: activeAttempt.challenge.milestoneName,
      isComplete: true,
      elapsedMs,
      elapsedFormatted: formatElapsedTime(elapsedMs),
      durationSeconds,
      rank,
      totalInBracket,
      isPersonalBest,
      previousBest: previousBest?.durationSeconds
        ? previousBest.durationSeconds * 1000
        : null,
      improvement: previousBest?.durationSeconds
        ? (previousBest.durationSeconds - durationSeconds) * 1000
        : null,
      isNewRecord,
      currentRecord: currentRecord?.durationSeconds
        ? currentRecord.durationSeconds * 1000
        : null,
      suspicionScore,
      rewards,
      /** Cash actually credited to the profile (0 when the run was not
       *  verified). The panel reads this to show an honest confirmation. */
      rewardCredited,
      /** Title written to GameProfile.title, or null. */
      titleAwarded,
    });
  } catch (error) {
    console.error('Speed run check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
