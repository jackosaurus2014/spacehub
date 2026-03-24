import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  calculateInfluenceFromActivity,
  applyDiminishingReturns,
  decayInfluence,
  blendInfluence,
  getMultiZonePenalty,
  calculateInfluenceShares,
  determineGovernor,
  ZONE_DEFINITIONS,
} from '@/lib/game/zone-influence';
import type { BuildingInstance, ServiceInstance } from '@/lib/game/types';

/**
 * POST /api/space-tycoon/zones/update
 * Cron job to recalculate zone influences for all players.
 *
 * Steps:
 * 1. Read all active GameProfiles (synced in last 7 days)
 * 2. Calculate IP per zone per player
 * 3. Apply decay to stored IP
 * 4. Blend recalculated + stored IP
 * 5. Apply diminishing returns + multi-zone penalty
 * 6. Compute influence shares
 * 7. Resolve expired challenges
 * 8. Update governor assignments
 */
export async function POST(request: Request) {
  try {
    // Optional: verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow calls without secret in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ─── Step 1: Fetch all recently active profiles ────────────────────────
    const profiles = await prisma.gameProfile.findMany({
      where: {
        lastSyncAt: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        companyName: true,
        buildingsData: true,
        activeServicesData: true,
        completedResearchList: true,
        lastSyncAt: true,
        unlockedLocationsList: true,
      },
    });

    // ─── Step 2: Ensure zones exist in DB ──────────────────────────────────
    const existingZones = await prisma.zone.findMany({
      select: { id: true, slug: true, governorId: true },
    });
    const zoneIdMap = new Map(existingZones.map(z => [z.slug, z.id]));
    const zoneGovernorMap = new Map(existingZones.map(z => [z.slug, z.governorId]));

    // If zones are missing, skip (need to run seed script first)
    if (existingZones.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No zones found in database. Run seed-zones.ts first.',
      }, { status: 400 });
    }

    // ─── Step 3: Calculate IP for each player in each zone ─────────────────
    // Track per-zone influence data
    const zonePlayerData: Map<string, {
      profileId: string;
      companyName: string;
      buildingIp: number;
      serviceIp: number;
      miningIp: number;
      researchIp: number;
      contractIp: number;
      totalRawIp: number;
    }[]> = new Map();

    for (const zone of ZONE_DEFINITIONS) {
      zonePlayerData.set(zone.slug, []);
    }

    for (const profile of profiles) {
      const buildings = (profile.buildingsData as unknown as BuildingInstance[]) || [];
      const services = (profile.activeServicesData as unknown as ServiceInstance[]) || [];
      const research = profile.completedResearchList || [];
      // completedContracts is not stored in GameProfile; approximate from activity
      const contracts: string[] = [];

      for (const zone of ZONE_DEFINITIONS) {
        const breakdown = calculateInfluenceFromActivity(
          buildings, services, research, contracts, zone.slug
        );

        if (breakdown.totalRawIp > 0) {
          zonePlayerData.get(zone.slug)!.push({
            profileId: profile.id,
            companyName: profile.companyName,
            ...breakdown,
          });
        }
      }
    }

    // ─── Step 4: Count zones governed per player for penalty calc ───────────
    const governedZonesCount = new Map<string, number>();
    zoneGovernorMap.forEach((governorId) => {
      if (governorId) {
        governedZonesCount.set(governorId, (governedZonesCount.get(governorId) || 0) + 1);
      }
    });

    // ─── Step 5: Process each zone ─────────────────────────────────────────
    let totalUpdated = 0;
    let governorsChanged = 0;
    let challengesResolved = 0;

    for (const zoneDef of ZONE_DEFINITIONS) {
      const zoneDbId = zoneIdMap.get(zoneDef.slug);
      if (!zoneDbId) continue;

      const players = zonePlayerData.get(zoneDef.slug) || [];
      const currentGovernorId = zoneGovernorMap.get(zoneDef.slug) || null;

      // Fetch existing influence records for decay calculation
      const existingInfluences = await prisma.zoneInfluence.findMany({
        where: { zoneId: zoneDbId },
        select: {
          id: true,
          profileId: true,
          influencePoints: true,
          lastDecayAt: true,
        },
      });
      const storedIpMap = new Map(
        existingInfluences.map(e => [e.profileId, { ip: e.influencePoints, lastDecay: e.lastDecayAt }])
      );

      // Calculate effective IP for each player
      const effectiveIpData: { profileId: string; effectiveIp: number; rawData: (typeof players)[0] }[] = [];

      for (const player of players) {
        const stored = storedIpMap.get(player.profileId);
        const storedIp = stored?.ip || 0;
        const lastDecay = stored?.lastDecay || now;

        // Days since last decay
        const daysSinceDecay = Math.max(0, (now.getTime() - lastDecay.getTime()) / (1000 * 60 * 60 * 24));

        // Days since last sync (for inactivity)
        const profileData = profiles.find(p => p.id === player.profileId);
        const daysSinceActive = profileData
          ? (now.getTime() - profileData.lastSyncAt.getTime()) / (1000 * 60 * 60 * 24)
          : 7;

        const isGovernor = currentGovernorId === player.profileId;

        // Apply decay to stored IP
        const decayedStoredIp = decayInfluence(storedIp, daysSinceDecay, daysSinceActive, isGovernor);

        // Blend recalculated and stored
        const blendedIp = blendInfluence(player.totalRawIp, decayedStoredIp);

        // Apply diminishing returns
        let effectiveIp = applyDiminishingReturns(blendedIp);

        // Apply multi-zone governance penalty
        if (isGovernor) {
          const zonesGov = governedZonesCount.get(player.profileId) || 0;
          const penalty = getMultiZonePenalty(zonesGov);
          effectiveIp *= penalty;
        }

        effectiveIpData.push({
          profileId: player.profileId,
          effectiveIp: Math.max(0, effectiveIp),
          rawData: player,
        });
      }

      // Calculate influence shares
      const shares = calculateInfluenceShares(
        effectiveIpData.map(p => ({ profileId: p.profileId, effectiveIp: p.effectiveIp }))
      );
      const shareMap = new Map(shares.map(s => [s.profileId, s.sharePct]));

      // ─── Upsert zone influence records ─────────────────────────────────
      for (const player of effectiveIpData) {
        const sharePct = shareMap.get(player.profileId) || 0;

        await prisma.zoneInfluence.upsert({
          where: {
            zoneId_profileId: {
              zoneId: zoneDbId,
              profileId: player.profileId,
            },
          },
          create: {
            zoneId: zoneDbId,
            profileId: player.profileId,
            influencePoints: player.effectiveIp,
            sharePercent: sharePct,
            lastDecayAt: now,
          },
          update: {
            influencePoints: player.effectiveIp,
            sharePercent: sharePct,
            lastDecayAt: now,
          },
        });
        totalUpdated++;
      }

      // ─── Resolve expired challenges ────────────────────────────────────
      const activeChallenges = await prisma.governanceChallenge.findMany({
        where: {
          zoneId: zoneDbId,
          status: 'active',
        },
      });

      for (const challenge of activeChallenges) {
        const challengerShare = shareMap.get(challenge.challengerId) || 0;
        const governorShare = currentGovernorId ? (shareMap.get(currentGovernorId) || 0) : 0;

        if (now >= challenge.endsAt) {
          // Challenge period ended
          if (challengerShare > governorShare) {
            // Challenger wins!
            await prisma.governanceChallenge.update({
              where: { id: challenge.id },
              data: { status: 'challenger_won' },
            });

            // Transfer governance
            const challengerProfile = await prisma.gameProfile.findUnique({
              where: { id: challenge.challengerId },
              select: { companyName: true },
            });

            await prisma.zone.update({
              where: { id: zoneDbId },
              data: {
                governorId: challenge.challengerId,
                governorName: challengerProfile?.companyName || 'Unknown',
                customName: null, // Reset custom name on transfer
              },
            });

            // Update governed zone counts
            if (currentGovernorId) {
              governedZonesCount.set(
                currentGovernorId,
                Math.max(0, (governedZonesCount.get(currentGovernorId) || 1) - 1)
              );
            }
            governedZonesCount.set(
              challenge.challengerId,
              (governedZonesCount.get(challenge.challengerId) || 0) + 1
            );

            governorsChanged++;
          } else {
            // Governor defended
            await prisma.governanceChallenge.update({
              where: { id: challenge.id },
              data: { status: 'governor_held' },
            });
          }
          challengesResolved++;
        } else {
          // Challenge still active: check if governor regained lead (reset timer)
          if (governorShare > challengerShare) {
            await prisma.governanceChallenge.update({
              where: { id: challenge.id },
              data: { status: 'governor_held' },
            });
            challengesResolved++;
          }
        }
      }

      // ─── Check for new governor (no challenge needed if seat is empty) ──
      const newGovernorId = determineGovernor(shares);
      if (newGovernorId && newGovernorId !== currentGovernorId && !currentGovernorId) {
        // Empty seat - assign directly
        const govProfile = await prisma.gameProfile.findUnique({
          where: { id: newGovernorId },
          select: { companyName: true },
        });

        await prisma.zone.update({
          where: { id: zoneDbId },
          data: {
            governorId: newGovernorId,
            governorName: govProfile?.companyName || 'Unknown',
          },
        });

        governedZonesCount.set(
          newGovernorId,
          (governedZonesCount.get(newGovernorId) || 0) + 1
        );
        governorsChanged++;
      }

      // ─── Check if current governor lost minimum threshold ───────────────
      if (currentGovernorId) {
        const govShare = shareMap.get(currentGovernorId) || 0;
        if (govShare < 15) {
          // Governor dropped below 15% — remove governance
          await prisma.zone.update({
            where: { id: zoneDbId },
            data: {
              governorId: null,
              governorName: null,
              customName: null,
            },
          });

          governedZonesCount.set(
            currentGovernorId,
            Math.max(0, (governedZonesCount.get(currentGovernorId) || 1) - 1)
          );
          governorsChanged++;
        }
      }
    }

    // ─── Clean up old influence records with 0 IP ──────────────────────────
    await prisma.zoneInfluence.deleteMany({
      where: {
        influencePoints: { lt: 0.01 },
        updatedAt: { lt: sevenDaysAgo },
      },
    });

    return NextResponse.json({
      success: true,
      profilesProcessed: profiles.length,
      influenceRecordsUpdated: totalUpdated,
      governorsChanged,
      challengesResolved,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('POST /api/space-tycoon/zones/update error:', error);
    return NextResponse.json(
      { error: 'Failed to update zone influences' },
      { status: 500 }
    );
  }
}
