import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { ZONE_DEFINITIONS, getInfluenceStatus } from '@/lib/game/zone-influence';

export const dynamic = 'force-dynamic';

/**
 * GET /api/space-tycoon/zones
 * Returns all zones with current governor, top 5 influence holders,
 * and the requesting player's influence share.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Get the player's profile ID if logged in
    let myProfileId: string | null = null;
    if (userId) {
      const profile = await prisma.gameProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      myProfileId = profile?.id || null;
    }

    // Fetch all zones from DB
    const dbZones = await prisma.zone.findMany({
      where: { parentZone: null }, // Only major zones
      include: {
        influences: {
          orderBy: { influencePoints: 'desc' },
          take: 5,
          include: {
            profile: {
              select: {
                id: true,
                companyName: true,
                allianceMembership: {
                  select: {
                    alliance: { select: { tag: true } },
                  },
                },
              },
            },
          },
        },
        challenges: {
          where: { status: 'active' },
          take: 1,
          include: {
            challenger: {
              select: { companyName: true },
            },
          },
        },
      },
    });

    // Build zone map from DB for quick lookup
    const dbZoneMap = new Map(dbZones.map(z => [z.slug, z]));

    // If player is logged in, fetch their influence across all zones
    const myInfluences: Map<string, { influencePoints: number; sharePercent: number }> = new Map();
    if (myProfileId) {
      const influences = await prisma.zoneInfluence.findMany({
        where: { profileId: myProfileId },
        select: { zoneId: true, influencePoints: true, sharePercent: true },
      });
      for (const inf of influences) {
        // Need to look up the zone slug from the zone ID
        const zone = dbZones.find(z => z.id === inf.zoneId);
        if (zone) {
          myInfluences.set(zone.slug, {
            influencePoints: inf.influencePoints,
            sharePercent: inf.sharePercent,
          });
        }
      }
    }

    // Build response using ZONE_DEFINITIONS as the source of truth for zone metadata
    const zones = ZONE_DEFINITIONS.map(zoneDef => {
      const dbZone = dbZoneMap.get(zoneDef.slug);
      const myInf = myInfluences.get(zoneDef.slug);

      // Count total participants (influences with > 0 IP)
      const totalParticipants = dbZone?.influences?.length || 0;
      const totalIp = dbZone?.influences?.reduce((sum, inf) => sum + inf.influencePoints, 0) || 0;

      // Top influencers
      const topInfluencers = (dbZone?.influences || []).map(inf => {
        const isGov = dbZone?.governorId === inf.profileId;
        return {
          profileId: inf.profileId,
          companyName: inf.profile?.companyName || 'Unknown',
          allianceTag: inf.profile?.allianceMembership?.alliance?.tag || null,
          sharePct: inf.sharePercent,
          status: getInfluenceStatus(inf.sharePercent, isGov),
        };
      });

      // Active challenge
      const activeChallenge = dbZone?.challenges?.[0];
      const challenge = activeChallenge ? {
        challengerName: activeChallenge.challenger?.companyName || 'Unknown',
        challengerIP: activeChallenge.challengerIP,
        governorIP: activeChallenge.governorIP,
        endsAt: activeChallenge.endsAt.toISOString(),
        hoursRemaining: Math.max(0,
          Math.round((activeChallenge.endsAt.getTime() - Date.now()) / (1000 * 60 * 60) * 10) / 10
        ),
      } : null;

      return {
        zoneId: zoneDef.slug,
        name: dbZone?.customName || zoneDef.name,
        defaultName: zoneDef.name,
        tier: zoneDef.tier,
        accentColor: zoneDef.accentColor,
        governor: dbZone?.governorId ? {
          profileId: dbZone.governorId,
          companyName: dbZone.governorName || 'Unknown',
          sharePct: topInfluencers.find(i => i.profileId === dbZone.governorId)?.sharePct || 0,
        } : null,
        challenge,
        topInfluencers,
        totalParticipants,
        totalIp: Math.round(totalIp),
        myInfluence: myInf ? {
          influencePoints: Math.round(myInf.influencePoints * 10) / 10,
          sharePct: Math.round(myInf.sharePercent * 10) / 10,
          status: getInfluenceStatus(
            myInf.sharePercent,
            dbZone?.governorId === myProfileId
          ),
        } : null,
        subZones: zoneDef.subZones.map(sz => ({
          subZoneId: sz.slug,
          name: sz.name,
          activityFocus: sz.activityFocus,
        })),
      };
    });

    return NextResponse.json({ zones });
  } catch (error) {
    console.error('GET /api/space-tycoon/zones error:', error);
    return NextResponse.json({ zones: [] });
  }
}
