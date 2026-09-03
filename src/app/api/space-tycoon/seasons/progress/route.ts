import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  getEventPhase,
  isPlayablePhase,
  getTierFromSP,
  SP_PER_TIER,
  getDailyChallenges,
  type SeasonType,
  type BracketTier,
  type EventGameState,
} from '@/lib/game/seasonal-events';
import {
  deriveSeasonMetric,
  metricNeedsMarketFills,
  type SeasonMarketStats,
} from '@/lib/game/season-metrics-server';
import { RESOURCES } from '@/lib/game/resources';
import { validateBody, seasonProgressSchema } from '@/lib/validations';
import { validationError } from '@/lib/errors';
// Phase 3 slice 1: building metrics read the ServerAsset registry (server-assets.ts).
import { loadServerRegistry } from '@/lib/game/server-assets';

const ENERGY_RESOURCE_SLUGS = RESOURCES.filter(r => r.category === 'energy').map(r => r.id);

/**
 * POST /api/space-tycoon/seasons/progress
 * Update seasonal event progress.
 * Body: { challengeId: string, progress?: number }
 *
 * 2026-09-01 hardening (docs/SECURITY_AUDIT_2026-08.md P4): `progress` is no
 * longer trusted. The challenge's metric is derived SERVER-SIDE from the
 * player's GameProfile / MarketFill rows (see season-metrics-server.ts);
 * `progress` is accepted for backward compatibility and only consulted for
 * the handful of metrics the server cannot observe, where it is clamped to
 * be non-decreasing and <= a server-derived ceiling.
 *
 * Checks challenge completion, awards SP, advances tier.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = validateBody(seasonProgressSchema, await request.json().catch(() => null));
    if (!parsed.success) {
      const first = Object.values(parsed.errors)[0]?.[0] || 'Missing required field: challengeId (string)';
      return validationError(first, parsed.errors);
    }
    const { challengeId } = parsed.data;
    const clientProgress = typeof parsed.data.progress === 'number' ? parsed.data.progress : 0;

    // Find the player's profile — the source of truth for every metric.
    const profile = await prisma.gameProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        eventTokens: true,
        netWorth: true,
        totalEarned: true,
        totalBidsWon: true,
        buildingsData: true,
        activeServicesData: true,
        unlockedLocationsList: true,
        completedResearchList: true,
        shipsData: true,
        workforceData: true,
        resources: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Game profile not found' }, { status: 404 });
    }

    // Find active event
    const now = new Date();
    const activeEvents = await prisma.seasonalEvent.findMany({
      where: {
        OR: [{ status: 'active' }, { status: 'upcoming' }],
      },
      orderBy: { startsAt: 'asc' },
      take: 3,
    });

    let currentEvent = null;
    for (const event of activeEvents) {
      const phase = getEventPhase(new Date(event.startsAt), new Date(event.endsAt), now);
      if (isPlayablePhase(phase)) {
        currentEvent = event;
        break;
      }
    }

    if (!currentEvent) {
      return NextResponse.json({ error: 'No active seasonal event found' }, { status: 400 });
    }

    // Get player's participation
    const participation = await prisma.seasonParticipation.findUnique({
      where: {
        eventId_profileId: {
          eventId: currentEvent.id,
          profileId: profile.id,
        },
      },
    });

    if (!participation) {
      return NextResponse.json(
        { error: 'You are not participating in this event. Join first.' },
        { status: 403 }
      );
    }

    // Parse event state
    const eventState = participation.eventState as unknown as EventGameState;
    const challengeProgress = eventState.challengeProgress || {};
    const challengeBaselines = eventState.challengeBaselines || {};

    // Get current daily challenges to validate the challengeId
    const seasonType = currentEvent.seasonType as SeasonType;
    const bracketTiers: BracketTier[] = ['frontier', 'pioneer', 'commander', 'admiral', 'titan'];
    const bracketTier = bracketTiers[Math.max(0, Math.min(4, participation.bracket - 1))];
    const dailyChallenges = getDailyChallenges(seasonType, bracketTier, now);

    // Also check if this is a stored SeasonChallenge from the DB
    const dbChallenge = await prisma.seasonChallenge.findFirst({
      where: {
        eventId: currentEvent.id,
        id: challengeId,
      },
    });

    // Find matching daily challenge
    const dailyMatch = dailyChallenges.find(c => c.id === challengeId);

    if (!dailyMatch && !dbChallenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Determine challenge target and reward
    const challengeMetric = dailyMatch ? dailyMatch.metric : (dbChallenge?.metric || '');
    const challengeTarget = dailyMatch ? dailyMatch.target : (dbChallenge?.target || 0);
    const challengeSPReward = dailyMatch ? dailyMatch.spReward : (dbChallenge?.spReward || 0);

    // ── Server-side metric derivation (P4) ──────────────────────────────
    const metricsToResolve = new Set<string>([challengeMetric, ...dailyChallenges.map(c => c.metric)]);
    let marketStats: SeasonMarketStats | null = null;
    if (Array.from(metricsToResolve).some(metricNeedsMarketFills)) {
      marketStats = await loadMarketStats(profile.id, new Date(currentEvent.startsAt));
    }

    // Phase 3 slices 1-5 (docs/SECURITY_AUDIT_2026-09.md): buildings,
    // services, locations, research and ships come from the ServerAsset
    // registry (union in shadow, server rows only in enforce).
    const registry = await loadServerRegistry(profile.id, profile, { workforceData: profile.workforceData });
    const metricProfile = {
      totalEarned: profile.totalEarned,
      totalBidsWon: profile.totalBidsWon,
      buildingsData: registry.buildings.buildings,
      activeServicesData: registry.services.services,
      unlockedLocationsList: registry.locations.unlocked,
      completedResearchList: registry.research.completed,
      shipsData: registry.ships.ships,
      workforceData: profile.workforceData,
      resources: profile.resources,
    };

    // Prime baselines for every delta-type challenge visible today on ANY
    // touch, so one check-in at the start of the day anchors all three
    // daily challenges (a challenge first touched after the work is done
    // would otherwise report 0).
    const targets = [
      { id: challengeId, metric: challengeMetric },
      ...dailyChallenges.map(c => ({ id: c.id, metric: c.metric })),
    ];
    for (const t of targets) {
      if (challengeBaselines[t.id] !== undefined) continue;
      const d = deriveSeasonMetric(t.metric, metricProfile, marketStats);
      if (d.kind === 'delta') challengeBaselines[t.id] = d.value;
    }

    const derivation = deriveSeasonMetric(challengeMetric, metricProfile, marketStats);
    const previousProgress = challengeProgress[challengeMetric] || 0;
    let serverProgress: number;
    let progressSource: 'server' | 'client_capped';
    if (derivation.kind === 'delta') {
      const baseline = challengeBaselines[challengeId] ?? derivation.value;
      serverProgress = Math.max(0, derivation.value - baseline);
      progressSource = 'server';
    } else if (derivation.kind === 'absolute') {
      serverProgress = Math.max(0, derivation.value);
      progressSource = 'server';
    } else {
      // Not observable server-side: accept the client's figure, but never
      // above what the server can vouch for.
      serverProgress = Math.min(Math.max(0, clientProgress), derivation.ceiling);
      progressSource = 'client_capped';
    }
    const newProgress = Math.max(previousProgress, serverProgress);
    challengeProgress[challengeMetric] = newProgress;

    // Check if challenge was just completed
    const wasCompleted = previousProgress >= challengeTarget;
    const isNowCompleted = newProgress >= challengeTarget;
    let spAwarded = 0;
    let tierAdvanced = false;
    let newTier = participation.currentTier;
    let newSeasonPoints = participation.seasonPoints;

    if (!wasCompleted && isNowCompleted) {
      // Award SP
      spAwarded = challengeSPReward;

      // Check for Final Sprint multiplier (1.25x)
      const phase = getEventPhase(
        new Date(currentEvent.startsAt),
        new Date(currentEvent.endsAt),
        now
      );
      if (phase === 'FINAL_SPRINT') {
        spAwarded = Math.round(spAwarded * 1.25);
      }

      newSeasonPoints = participation.seasonPoints + spAwarded;
      newTier = getTierFromSP(newSeasonPoints);
      tierAdvanced = newTier > participation.currentTier;

      // Award Event Tokens for tier advancement
      let tokensToAward = 0;
      if (tierAdvanced) {
        // Award tokens for each tier passed
        for (let t = participation.currentTier + 1; t <= newTier; t++) {
          const bonusTiers = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
          tokensToAward += bonusTiers.includes(t) ? 150 : 50;
        }
      }

      // Update event state
      const updatedEventState: EventGameState = {
        ...eventState,
        challengeProgress,
        challengeBaselines,
        eventScore: eventState.eventScore + spAwarded,
      };

      // Update participation
      await prisma.seasonParticipation.update({
        where: { id: participation.id },
        data: {
          seasonPoints: newSeasonPoints,
          currentTier: newTier,
          totalScore: participation.totalScore + spAwarded,
          eventState: JSON.parse(JSON.stringify(updatedEventState)),
        },
      });

      // Award event tokens
      if (tokensToAward > 0) {
        await prisma.gameProfile.update({
          where: { id: profile.id },
          data: {
            eventTokens: { increment: tokensToAward },
          },
        });
      }

      return NextResponse.json({
        success: true,
        challengeCompleted: true,
        spAwarded,
        newSeasonPoints,
        newTier,
        tierAdvanced,
        tokensAwarded: tierAdvanced ? tokensToAward : 0,
        nextTierAt: (newTier + 1) * SP_PER_TIER,
        progress: newProgress,
        target: challengeTarget,
        progressSource,
      });
    }

    // Progress updated but not yet completed
    const updatedEventState: EventGameState = {
      ...eventState,
      challengeProgress,
      challengeBaselines,
    };

    await prisma.seasonParticipation.update({
      where: { id: participation.id },
      data: {
        eventState: JSON.parse(JSON.stringify(updatedEventState)),
      },
    });

    return NextResponse.json({
      success: true,
      challengeCompleted: false,
      spAwarded: 0,
      newSeasonPoints: participation.seasonPoints,
      newTier: participation.currentTier,
      tierAdvanced: false,
      tokensAwarded: 0,
      nextTierAt: (participation.currentTier + 1) * SP_PER_TIER,
      progress: newProgress,
      target: challengeTarget,
      progressSource,
    });
  } catch (error) {
    console.error('Season progress error:', error);
    return NextResponse.json({ error: 'Failed to update seasonal progress' }, { status: 500 });
  }
}

/**
 * MarketFill aggregates for the profile since the event began. MarketFill is
 * the only server-authoritative trade record (MarketOrder rows are the legacy
 * spot-trade log and carry no counterparty).
 */
async function loadMarketStats(profileId: string, since: Date): Promise<SeasonMarketStats> {
  const empty: SeasonMarketStats = { tradeVolume: 0, he3SoldQty: 0, he3SoldValue: 0, energySoldFills: 0 };
  try {
    const [asBuyer, asSeller, he3Sold, energySold] = await Promise.all([
      prisma.marketFill.aggregate({
        where: { buyerProfileId: profileId, createdAt: { gte: since } },
        _sum: { totalValue: true },
      }),
      prisma.marketFill.aggregate({
        where: { sellerProfileId: profileId, createdAt: { gte: since } },
        _sum: { totalValue: true },
      }),
      prisma.marketFill.aggregate({
        where: { sellerProfileId: profileId, resourceSlug: 'helium3', createdAt: { gte: since } },
        _sum: { quantity: true, totalValue: true },
      }),
      ENERGY_RESOURCE_SLUGS.length > 0
        ? prisma.marketFill.count({
            where: { sellerProfileId: profileId, resourceSlug: { in: ENERGY_RESOURCE_SLUGS }, createdAt: { gte: since } },
          })
        : Promise.resolve(0),
    ]);
    return {
      tradeVolume: (asBuyer._sum.totalValue || 0) + (asSeller._sum.totalValue || 0),
      he3SoldQty: he3Sold._sum.quantity || 0,
      he3SoldValue: he3Sold._sum.totalValue || 0,
      energySoldFills: energySold,
    };
  } catch {
    // MarketFill table missing in a fresh environment — fail closed (0).
    return empty;
  }
}
