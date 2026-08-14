// ─── Space Tycoon: Public Leaderboard / Corporation Profile Data ─────────────
// Server-only data access for the SEO-indexable, no-login leaderboard and
// corporation profile pages (viral-loop build, 2026-08-14). Deliberately
// selects only fields that are ALREADY publicly exposed today via the
// unauthenticated /api/space-tycoon/leaderboard and /api/space-tycoon/game-state
// endpoints (companyName, netWorth, buildingCount, researchCount, alliance tag —
// every one of these is already served with zero auth check). This module adds
// no new surface area beyond what any anonymous script could already scrape;
// it just makes it crawlable and shareable. Never selects userId, User, email,
// or the raw state JSON blobs (resources/buildingsData/shipsData/workforceData)
// — those stay internal even though the row itself is public.

import prisma from '@/lib/db';
import { CORPORATION_TIERS } from './corporation-tiers';

export interface PublicLeaderboardEntry {
  id: string;
  rank: number;
  companyName: string;
  title: string | null;
  netWorth: number;
  tier: number;
  allianceTag: string | null;
  allianceName: string | null;
}

export interface PublicMilestone {
  milestoneId: string;
  claimedAt: Date;
}

export interface PublicCorp {
  id: string;
  companyName: string;
  title: string | null;
  netWorth: number;
  rank: number;
  tier: number;
  buildingCount: number;
  researchCount: number;
  serviceCount: number;
  locationsUnlocked: number;
  achievements: string[];
  globalMilestones: PublicMilestone[];
  allianceTag: string | null;
  allianceName: string | null;
  allianceRole: string | null;
  foundedAt: Date;
}

/**
 * Approximates a corporation's tier from `totalEarned` alone. The real
 * `checkCorporationTier()` (corporation-tiers.ts) also gates on builtShips,
 * completedContracts, legacyPower, and completedMegastructures, none of which
 * are safe/cheap to expose publicly. totalEarned is the binding constraint on
 * every tier definition, so this is "at most" the player's real tier — it can
 * undercount (rare: a wealthy player who hasn't built ships yet) but never
 * overstates achievements the player hasn't actually reached in every case.
 * Good enough for a cosmetic public badge; not used for any gameplay decision.
 */
export function estimateTierFromEarnings(totalEarned: number): number {
  for (let i = CORPORATION_TIERS.length - 1; i >= 0; i--) {
    const req = CORPORATION_TIERS[i].requirements;
    if (req.totalEarned === undefined || totalEarned >= req.totalEarned) {
      return CORPORATION_TIERS[i].tier;
    }
  }
  return 1;
}

export async function getPublicLeaderboard(limit = 50): Promise<PublicLeaderboardEntry[]> {
  const profiles = await prisma.gameProfile.findMany({
    orderBy: { netWorth: 'desc' },
    take: limit,
    select: {
      id: true,
      companyName: true,
      title: true,
      netWorth: true,
      totalEarned: true,
      allianceMembership: {
        select: { alliance: { select: { tag: true, name: true } } },
      },
    },
  });

  return profiles.map((p, i) => ({
    id: p.id,
    rank: i + 1,
    companyName: p.companyName,
    title: p.title,
    netWorth: p.netWorth,
    tier: estimateTierFromEarnings(p.totalEarned),
    allianceTag: p.allianceMembership?.alliance?.tag ?? null,
    allianceName: p.allianceMembership?.alliance?.name ?? null,
  }));
}

export async function getPublicCorporationCount(): Promise<number> {
  return prisma.gameProfile.count();
}

export async function getPublicCorp(id: string): Promise<PublicCorp | null> {
  const profile = await prisma.gameProfile.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      title: true,
      netWorth: true,
      totalEarned: true,
      buildingCount: true,
      researchCount: true,
      serviceCount: true,
      locationsUnlocked: true,
      achievements: true,
      createdAt: true,
      allianceMembership: {
        select: { role: true, alliance: { select: { tag: true, name: true } } },
      },
      globalMilestones: {
        select: { milestoneId: true, claimedAt: true },
        orderBy: { claimedAt: 'asc' },
      },
    },
  });

  if (!profile) return null;

  const rankAbove = await prisma.gameProfile.count({
    where: { netWorth: { gt: profile.netWorth } },
  });

  return {
    id: profile.id,
    companyName: profile.companyName,
    title: profile.title,
    netWorth: profile.netWorth,
    rank: rankAbove + 1,
    tier: estimateTierFromEarnings(profile.totalEarned),
    buildingCount: profile.buildingCount,
    researchCount: profile.researchCount,
    serviceCount: profile.serviceCount,
    locationsUnlocked: profile.locationsUnlocked,
    achievements: profile.achievements,
    globalMilestones: profile.globalMilestones,
    allianceTag: profile.allianceMembership?.alliance?.tag ?? null,
    allianceName: profile.allianceMembership?.alliance?.name ?? null,
    allianceRole: profile.allianceMembership?.role ?? null,
    foundedAt: profile.createdAt,
  };
}
