import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getGlobalGameDate, formatServerDate } from '@/lib/game/server-time';
import { getAllServicePriceMultipliers } from '@/lib/game/service-pricing';
import {
  calculateMetricScore,
  getMetricDefinition,
  getWeeklyMetric,
  getLeagueDefinition,
} from '@/lib/game/league-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';
import { reconcileBalance, applyResourceDeltas, clampPlausibleMoney, type LedgerEntryLite } from '@/lib/game/ledger-reconcile';
import { buildMarketSnapshot } from '@/lib/game/spot-price';
import { isLedgerAvailable } from '@/lib/game/server-ledger';
import { resolveMetricCurrentValue } from '@/lib/game/market-share';

/**
 * POST /api/space-tycoon/sync
 * Sync client game state to server for leaderboard ranking.
 * Returns: rank, netWorth, alliance bonuses, global milestones, active bounties count.
 *
 * One Wallet (audit Change #1): the client-reported money figure no longer
 * overwrites server history. Server-side debits/credits (order escrow/fills,
 * bid collateral, mega-project/alliance contributions, treasury deposits,
 * espionage costs, bounty payouts, league rewards) accumulate as signed
 * GameLedgerEntry deltas. This route reconciles:
 *
 *   reconciledMoney = clientMoney + Σ(entries with seq > client ack cursor)
 *
 * and stores THAT, returning the pending deltas so the client can apply them
 * into GameState and advance its ack cursor. Entries at/below the cursor are
 * already reflected in the client figure and are excluded — idempotent under
 * sync retries. Players with an empty ledger (solo play) see zero change.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      money = 0,
      totalEarned = 0,
      totalSpent = 0,
      buildingCount = 0,
      researchCount = 0,
      serviceCount = 0,
      locationsUnlocked = 0,
      resources = {},
      gameYear = 2026,
      companyName = 'Untitled Aerospace',
      minedThisTick = {},
      npcMarketFlows = {},
      // Wave E3 (docs/ECONOMY_PVP_2026-08.md §E3): building-recipe
      // consumption since last sync (aggregate demand telemetry) and
      // market-policy shortfall procurement requests (standing buy orders).
      consumedThisTick = {},
      procurementRequests = {},
      // Full state for multiplayer visibility
      buildings = [],
      activeServices = [],
      unlockedLocations = [],
      completedResearch = [],
      ships = [],
      workforce = null,
      commanderIds = [],
      ledgerAck = 0,
    } = body;

    // Audit Wave B (§1c commander marketPriceMultiplier): stash the hired
    // commander roster inside workforceData so market/trade can recompute
    // the Magnate broker-fee reduction server-side from definitions. JSON
    // column — no schema change. Same client-claimed trust level as the
    // rest of the sync payload; the fee reduction is clamped at read time.
    const safeCommanderIds = Array.isArray(commanderIds)
      ? commanderIds.filter((c: unknown) => typeof c === 'string').slice(0, 30)
      : [];
    const workforceData = workforce && typeof workforce === 'object'
      ? { ...(workforce as Record<string, unknown>), _commanders: safeCommanderIds }
      : (safeCommanderIds.length > 0 ? { _commanders: safeCommanderIds } : workforce);

    // ── One Wallet: reconcile client money against the server delta ledger ──
    // (see route header). Falls back to the raw client figure when the ledger
    // table is unavailable or the profile doesn't exist yet.
    const clientMoney = typeof money === 'number' && Number.isFinite(money) ? money : 0;
    const clientResources: Record<string, number> =
      typeof resources === 'object' && resources !== null ? (resources as Record<string, number>) : {};
    let reconciledMoney = clientMoney;
    let reconciledResources: Record<string, number> = clientResources;
    let ledgerInfo: {
      ackSeq: number;
      maxSeq: number;
      moneyDelta: number;
      resourceDeltas: Record<string, number>;
      entries: LedgerEntryLite[];
    } | null = null;

    try {
      const existingProfile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true, money: true, lastSyncAt: true },
      });

      // Wave E1 (§E1 exploit #5): clamp the client-claimed money figure
      // against how much it could plausibly have grown since this profile's
      // last sync, BEFORE it becomes the base of the ledger reconciliation
      // sum below. Only runs for existing profiles — a first-ever sync has
      // no prior baseline to compare against (new accounts start at a fixed
      // STARTING_MONEY, not exploitable via this path).
      let plausibilityClampedMoney = clientMoney;
      if (existingProfile) {
        const elapsedMs = Date.now() - existingProfile.lastSyncAt.getTime();
        const clamp = clampPlausibleMoney(clientMoney, existingProfile.money, elapsedMs);
        plausibilityClampedMoney = clamp.clampedMoney;
        if (clamp.wasClamped) {
          logger.warn('Client money claim exceeded plausibility ceiling — clamped', {
            userId: session.user.id, profileId: existingProfile.id,
            clientMoney, prevMoney: existingProfile.money, elapsedMs,
            ceiling: clamp.ceiling, rejectedExcess: clamp.rejectedExcess,
          });
          try {
            await prisma.marketAuditLog.create({
              data: {
                eventType: 'client_money_implausible_rejected',
                profileId: existingProfile.id,
                details: {
                  clientMoney, prevMoney: existingProfile.money, elapsedMs,
                  ceiling: clamp.ceiling, rejectedExcess: clamp.rejectedExcess,
                },
                severity: 'critical',
              },
            });
          } catch { /* audit log is best-effort */ }
        }
      }

      if (existingProfile && (await isLedgerAvailable())) {
        const safeAck = typeof ledgerAck === 'number' && Number.isFinite(ledgerAck) && ledgerAck > 0
          ? Math.floor(ledgerAck)
          : 0;

        // Mark acked entries as applied (cleanup marker; reconciliation keys
        // off the seq cursor, so this is not correctness-critical).
        await prisma.gameLedgerEntry.updateMany({
          where: { profileId: existingProfile.id, seq: { lte: safeAck }, appliedAt: null },
          data: { appliedAt: new Date() },
        });

        const pendingRows = await prisma.gameLedgerEntry.findMany({
          where: { profileId: existingProfile.id, seq: { gt: safeAck } },
          orderBy: { seq: 'asc' },
          take: 1000,
          select: { seq: true, moneyDelta: true, resourceSlug: true, resourceDelta: true, reason: true, refId: true },
        });

        const rec = reconcileBalance(plausibilityClampedMoney, pendingRows, safeAck);
        reconciledMoney = rec.reconciledMoney;
        reconciledResources = applyResourceDeltas(clientResources, rec.resourceDeltas);
        ledgerInfo = {
          ackSeq: safeAck,
          maxSeq: rec.maxSeq,
          moneyDelta: rec.moneyDelta,
          resourceDeltas: rec.resourceDeltas,
          // Cap the entry list returned for UI display purposes.
          entries: rec.pending.slice(-25),
        };
      } else if (existingProfile) {
        // Ledger table unavailable — still apply the plausibility clamp to
        // the figure that will be persisted below.
        reconciledMoney = plausibilityClampedMoney;
      }
    } catch (ledgerError) {
      // Reconciliation is best-effort; never block the sync.
      logger.error('Ledger reconciliation failed', { error: String(ledgerError) });
      reconciledMoney = clientMoney;
      reconciledResources = clientResources;
      ledgerInfo = null;
    }

    // Calculate net worth using live market prices (over reconciled holdings).
    // Wave E2 (§2.5 "one price truth"): the same single MarketResource read
    // also builds the band-clamped `marketSnapshot` delivered to the client
    // below — the spot price that now values delivery contracts, NPC
    // settlement, and mega-project contributions is the same live price shown
    // here in net worth.
    let resourceValue = 0;
    let marketSnapshot: { prices: Record<string, number>; base?: Record<string, number>; asOf: number } | null = null;
    try {
      const marketResources = await prisma.marketResource.findMany({
        select: { slug: true, currentPrice: true, basePrice: true, minPrice: true, maxPrice: true },
      });
      const priceMap = new Map(marketResources.map(r => [r.slug, r.currentPrice]));
      for (const [id, qty] of Object.entries(reconciledResources)) {
        if (typeof qty === 'number') {
          resourceValue += qty * (priceMap.get(id) || 50_000);
        }
      }
      marketSnapshot = buildMarketSnapshot(
        marketResources.map(r => ({
          slug: r.slug,
          currentPrice: r.currentPrice,
          basePrice: r.basePrice,
          minPrice: r.minPrice,
          maxPrice: r.maxPrice,
        })),
        Date.now(),
      );
    } catch {
      // Fallback to flat $50K/unit
      for (const qty of Object.values(reconciledResources)) {
        if (typeof qty === 'number') resourceValue += qty * 50_000;
      }
    }
    const netWorth = reconciledMoney + resourceValue;

    // Sanitize arrays for storage
    const safeBuildings = Array.isArray(buildings) ? buildings.slice(0, 200) : [];
    const safeServices = Array.isArray(activeServices) ? activeServices.slice(0, 100) : [];
    const safeLocations = Array.isArray(unlockedLocations) ? unlockedLocations.filter((l: unknown) => typeof l === 'string').slice(0, 30) : [];
    const safeResearch = Array.isArray(completedResearch) ? completedResearch.filter((r: unknown) => typeof r === 'string').slice(0, 500) : [];
    const safeShips = Array.isArray(ships) ? ships.slice(0, 50) : [];

    // Upsert game profile with full state
    const profile = await prisma.gameProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: String(companyName).slice(0, 50),
        money: reconciledMoney, totalEarned, totalSpent, netWorth,
        buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
        resources: reconciledResources as object,
        buildingsData: safeBuildings,
        activeServicesData: safeServices,
        unlockedLocationsList: safeLocations,
        completedResearchList: safeResearch,
        shipsData: safeShips,
        workforceData: workforceData as object,
        lastSyncAt: new Date(),
      },
      update: {
        companyName: String(companyName).slice(0, 50),
        money: reconciledMoney, totalEarned, totalSpent, netWorth,
        buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
        resources: reconciledResources as object,
        buildingsData: safeBuildings,
        activeServicesData: safeServices,
        unlockedLocationsList: safeLocations,
        completedResearchList: safeResearch,
        shipsData: safeShips,
        workforceData: workforceData as object,
        lastSyncAt: new Date(),
      },
    });

    // ── Ghost Rivals: Update peakNetWorth ──
    if (netWorth > (profile.peakNetWorth ?? 0)) {
      await prisma.gameProfile.update({
        where: { id: profile.id },
        data: { peakNetWorth: netWorth },
      });
    }

    // Apply mining pressure to global market (if resources were mined this tick)
    // Audit Wave E (A5-i): the client finally SENDS minedThisTick (audit
    // §1d-5 — "useGameSync.ts never sends it"), so "mass extraction
    // depresses prices" (CLAUDE.md) is live. Per-resource per-sync clamp:
    // the payload is client-claimed, so a forged burst is bounded
    // (POLICY.md simulation-integrity floor; the price impact itself is
    // also clamped inside calculatePriceAfterMining).
    const MINED_PER_SYNC_CAP = 2_000;
    if (minedThisTick && typeof minedThisTick === 'object') {
      try {
        const { calculatePriceAfterMining } = await import('@/lib/game/market-engine');
        for (const [slug, qty] of Object.entries(minedThisTick)) {
          if (typeof qty !== 'number' || qty <= 0) continue;
          const safeQty = Math.min(MINED_PER_SYNC_CAP, Math.floor(qty));
          const resource = await prisma.marketResource.findUnique({ where: { slug } });
          if (!resource) continue;
          const newPrice = calculatePriceAfterMining(
            resource.currentPrice, resource.basePrice, safeQty,
            resource.volatility, resource.minPrice, resource.maxPrice,
          );
          if (newPrice !== resource.currentPrice || safeQty > 0) {
            await prisma.marketResource.update({
              where: { id: resource.id },
              data: { currentPrice: newPrice, totalSupply: resource.totalSupply + safeQty },
            });
          }
        }
      } catch { /* mining pressure is non-critical */ }
    }

    // Audit Wave E (A5-iv / §1d-4): NPC trade flow becomes a real price
    // input. The client's NPC backdrop reports its net buy/sell volume
    // (positive = sell → supply in, price down; negative = buy → price up),
    // applied at the same gentle 1/3-of-trade impact. Tight per-sync clamp
    // (±300/resource) keeps forged payloads AND legitimate NPC activity in
    // "gentle nudges, not crashes" territory (NPC_BACKDROP.md).
    const NPC_FLOW_PER_SYNC_CAP = 300;
    if (npcMarketFlows && typeof npcMarketFlows === 'object') {
      try {
        const { calculatePriceAfterBackgroundFlow } = await import('@/lib/game/market-engine');
        for (const [slug, qty] of Object.entries(npcMarketFlows)) {
          if (typeof qty !== 'number' || !Number.isFinite(qty) || qty === 0) continue;
          const safeQty = Math.max(-NPC_FLOW_PER_SYNC_CAP, Math.min(NPC_FLOW_PER_SYNC_CAP, Math.round(qty)));
          const resource = await prisma.marketResource.findUnique({ where: { slug } });
          if (!resource) continue;
          const newPrice = calculatePriceAfterBackgroundFlow(
            resource.currentPrice, resource.basePrice, safeQty,
            resource.volatility, resource.minPrice, resource.maxPrice,
          );
          const newSupply = Math.max(0, resource.totalSupply + safeQty);
          if (newPrice !== resource.currentPrice || newSupply !== resource.totalSupply) {
            await prisma.marketResource.update({
              where: { id: resource.id },
              data: { currentPrice: newPrice, totalSupply: newSupply },
            });
          }
        }
      } catch { /* NPC flow pressure is non-critical */ }
    }

    // Wave E3 (§2.2 "aggregate demand telemetry"): building-recipe
    // consumption posts as background BUY flow — the mining-pressure pipe
    // sign-flipped (negative qty = demand, price up) — and accrues into
    // MarketResource.totalDemand, so widespread datacenter construction
    // genuinely raises electronics prices for everyone. Per-sync clamp keeps
    // forged payloads in "gentle nudges" territory (client data is
    // client-claimed; POLICY.md).
    const CONSUMED_PER_SYNC_CAP = 500;
    if (consumedThisTick && typeof consumedThisTick === 'object') {
      try {
        const { calculatePriceAfterBackgroundFlow } = await import('@/lib/game/market-engine');
        for (const [slug, qty] of Object.entries(consumedThisTick)) {
          if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) continue;
          const safeQty = Math.min(CONSUMED_PER_SYNC_CAP, Math.ceil(qty));
          const resource = await prisma.marketResource.findUnique({ where: { slug } });
          if (!resource) continue;
          const newPrice = calculatePriceAfterBackgroundFlow(
            resource.currentPrice, resource.basePrice, -safeQty, // negative = buy-side demand
            resource.volatility, resource.minPrice, resource.maxPrice,
          );
          await prisma.marketResource.update({
            where: { id: resource.id },
            data: {
              currentPrice: newPrice,
              // Consumed goods came out of the player's own stock, not the
              // market's — record demand only; totalSupply is untouched.
              totalDemand: resource.totalDemand + safeQty,
            },
          });
        }
      } catch { /* demand telemetry is non-critical */ }
    }

    // Wave E3 (§E3 auto-procurement): place/refresh this profile's standing
    // buy orders for market-policy building shortfalls. Real MarketLimitOrder
    // rows (source 'standing') on the shared book — visible demand other
    // players can see, front-run, and supply. Escrow flows through the same
    // One-Wallet ledger as every manual trade; the fills/refunds reconcile
    // back to the client on subsequent syncs. Bounded + band-limited +
    // cancel-on-insolvency inside the helper.
    if (procurementRequests && typeof procurementRequests === 'object' && Object.keys(procurementRequests).length > 0) {
      try {
        const { placeStandingProcurementOrders } = await import('@/lib/game/market-orderbook');
        await placeStandingProcurementOrders(profile.id, procurementRequests as Record<string, number>);
      } catch { /* standing procurement is non-critical (schema may lag) */ }
    }

    // ── League Metric Tracking ──────────────────────────────────────────────
    // Update the player's active LeagueBracketEntry with their latest metric value.
    let leagueInfo: {
      league: number;
      leagueName: string;
      leagueColor: string;
      leagueIcon: string;
      bracketRank: number | null;
      bracketSize: number;
      metricSlug: string;
      metricName: string;
      score: number;
      timeRemainingMs: number;
    } | null = null;

    try {
      const weekId = getCurrentWeekId();
      const weekMetric = getWeeklyMetric(weekId);

      // Find the player's active bracket entry
      const activeSeason = await prisma.leagueSeason.findFirst({
        where: { isActive: true },
      });

      if (activeSeason) {
        const bracketEntry = await prisma.leagueBracketEntry.findFirst({
          where: {
            profileId: profile.id,
            bracket: { seasonId: activeSeason.id },
          },
          include: { bracket: true },
        });

        if (bracketEntry) {
          // Determine current metric value. Wave E6: serverComputed metrics
          // (trade_volume, market_share_delta) resolve from real MarketFill
          // telemetry instead of a client-synced profile scalar — see
          // resolveMetricCurrentValue (market-share.ts).
          const metricDef = getMetricDefinition(activeSeason.metricSlug);
          const currentMetricValue = await resolveMetricCurrentValue(metricDef, {
            profileId: profile.id,
            netWorth, totalEarned, buildingCount, researchCount, serviceCount, locationsUnlocked,
          });

          const score = metricDef
            ? calculateMetricScore(metricDef, bracketEntry.startValue, currentMetricValue)
            : 0;

          await prisma.leagueBracketEntry.update({
            where: { id: bracketEntry.id },
            data: {
              currentValue: currentMetricValue,
              score: Math.max(0, score),
            },
          });

          // Get bracket rank
          const higherScoreCount = await prisma.leagueBracketEntry.count({
            where: {
              bracketId: bracketEntry.bracketId,
              score: { gt: Math.max(0, score) },
            },
          });
          const bracketPlayerCount = await prisma.leagueBracketEntry.count({
            where: { bracketId: bracketEntry.bracketId },
          });

          const leagueDef = getLeagueDefinition(bracketEntry.bracket.league);
          leagueInfo = {
            league: bracketEntry.bracket.league,
            leagueName: leagueDef.name,
            leagueColor: leagueDef.color,
            leagueIcon: leagueDef.icon,
            bracketRank: higherScoreCount + 1,
            bracketSize: bracketPlayerCount,
            metricSlug: activeSeason.metricSlug,
            metricName: weekMetric.name,
            score: Math.max(0, score),
            timeRemainingMs: activeSeason.endsAt.getTime() - Date.now(),
          };
        }
      }
    } catch { /* league tracking is non-critical */ }

    // Get player's rank
    const rank = await prisma.gameProfile.count({
      where: { netWorth: { gt: netWorth } },
    }) + 1;

    const totalPlayers = await prisma.gameProfile.count();

    // Get alliance bonus if member — deep alliance system aggregation
    let allianceBonus = 0;
    let allianceName: string | null = null;
    let allianceTag: string | null = null;
    let allianceBonuses: { revenueBonus: number; miningBonus: number; researchBonus: number; buildSpeedBonus: number; tradeBonus?: number } | null = null;
    try {
      const membership = await prisma.allianceMember.findUnique({
        where: { profileId: profile.id },
        include: { alliance: true },
      });
      if (membership?.alliance) {
        const ally = membership.alliance;
        allianceName = ally.name;
        allianceTag = ally.tag;

        // 1. Member count bonus (existing — legacy field)
        allianceBonus = ally.bonusRevenue;

        // 2. Tier bonus (from alliance-events.ts)
        const { getAllianceTier } = await import('@/lib/game/alliance-events');
        const tierInfo = getAllianceTier(ally.powerScore);

        // 3. Research bonuses (from completed AllianceResearch)
        const { getAllianceResearchBonuses } = await import('@/lib/game/alliance-research');
        const completedResearch = await prisma.allianceResearch.findMany({
          where: { allianceId: ally.id, status: 'completed' },
          select: { bonusType: true, bonusValue: true },
        });
        const researchBonuses = getAllianceResearchBonuses(completedResearch);

        // 4. Perk bonuses (from active AlliancePerk)
        const { getActivePerks, getPerkBonuses } = await import('@/lib/game/alliance-treasury');
        const activePerks = await getActivePerks(prisma, ally.id);
        const perkBonuses = getPerkBonuses(activePerks);

        // 5. Project bonuses (from completed AllianceProject)
        const completedProjects = await prisma.allianceProject.findMany({
          where: { allianceId: ally.id, status: 'completed' },
          select: { bonuses: true },
        });
        let projectRevenueBonus = 0;
        let projectMiningBonus = 0;
        let projectResearchBonus = 0;
        let projectBuildSpeedBonus = 0;
        for (const proj of completedProjects) {
          const b = proj.bonuses as Record<string, number> | null;
          if (b) {
            projectRevenueBonus += b.revenueBonus ?? 0;
            projectMiningBonus += b.miningBonus ?? 0;
            projectResearchBonus += b.researchBonus ?? 0;
            projectBuildSpeedBonus += b.buildSpeedBonus ?? 0;
          }
        }

        // 6. Diplomacy bonuses (audit Wave B, A2: "Include
        // alliance-diplomacy.getDiplomacyBonuses in the sync aggregate").
        // tradeBonus is a broker-fee reduction fraction; it rides along in
        // the aggregate (informational client-side) and is also enforced
        // server-side in market/trade.
        let diplomacyTradeBonus = 0;
        try {
          const { getDiplomacyBonuses } = await import('@/lib/game/alliance-diplomacy');
          const activeTreaties = await prisma.allianceDiplomacy.findMany({
            where: {
              status: 'active',
              OR: [{ senderId: ally.id }, { receiverId: ally.id }],
            },
            select: { type: true, tradeBonus: true },
            take: 25,
          });
          diplomacyTradeBonus = getDiplomacyBonuses(activeTreaties).tradeBonus;
        } catch { /* diplomacy non-critical */ }

        // Aggregate all bonus sources
        allianceBonuses = {
          tradeBonus: diplomacyTradeBonus,
          revenueBonus:
            allianceBonus +
            tierInfo.perks.revenueBonus +
            researchBonuses.revenueBonus +
            perkBonuses.revenueBonus +
            projectRevenueBonus,
          miningBonus:
            tierInfo.perks.miningBonus +
            researchBonuses.miningBonus +
            perkBonuses.miningBonus +
            projectMiningBonus,
          researchBonus:
            tierInfo.perks.researchBonus +
            researchBonuses.researchBonus +
            perkBonuses.researchBonus +
            projectResearchBonus,
          buildSpeedBonus:
            tierInfo.perks.buildSpeedBonus +
            researchBonuses.buildSpeedBonus +
            perkBonuses.buildSpeedBonus +
            projectBuildSpeedBonus,
        };

        // Update member's lastActiveAt
        await prisma.allianceMember.update({
          where: { profileId: profile.id },
          data: { lastActiveAt: new Date(), status: 'active' },
        });

        // Update alliance total net worth
        const members = await prisma.allianceMember.findMany({
          where: { allianceId: membership.allianceId },
          include: { profile: { select: { netWorth: true } } },
        });
        const totalAllianceNetWorth = members.reduce((sum, m) => sum + m.profile.netWorth, 0);
        await prisma.alliance.update({
          where: { id: membership.allianceId },
          data: { totalNetWorth: totalAllianceNetWorth },
        });
      }
    } catch { /* alliance lookup non-critical */ }

    // Live-Service Wave LS2 (§LS2 mechanic 3): mentorship bonuses — the same
    // "compute server-side, deliver via server-effects" shape as the
    // alliance block above. A profile is either a mentor (revenueBonus only,
    // capped at MENTOR_REVENUE_BONUS_CAP total across all active mentees —
    // NOT per-mentee, so taking on more mentees never compounds past the
    // authored +5%) or a mentee (all three fields, capped at
    // MENTEE_BOOST_CAP) — never both. See mentorship/route.ts's doc comment
    // for why "newness" here is mentorship tenure, not raw account age.
    let mentorshipBonuses: { revenueBonus: number; miningBonus: number; researchBonus: number } | null = null;
    try {
      const { calculateMentorshipRewards } = await import('@/lib/game/catchup-mechanics');
      const { MENTOR_REVENUE_BONUS_CAP, MENTEE_BOOST_CAP } = await import('@/lib/game/constants');

      const menteePairing = await prisma.gameMentorship.findFirst({
        where: { menteeProfileId: profile.id, status: 'active' },
      });
      if (menteePairing) {
        const tenureDays = Math.max(0, (Date.now() - menteePairing.startedAt.getTime()) / 86_400_000);
        const { menteeBoost } = calculateMentorshipRewards(tenureDays, 0);
        const boost = Math.min(MENTEE_BOOST_CAP, menteeBoost);
        mentorshipBonuses = { revenueBonus: boost, miningBonus: boost, researchBonus: boost };
      } else {
        const mentorPairings = await prisma.gameMentorship.findMany({
          where: { mentorProfileId: profile.id, status: 'active' },
        });
        if (mentorPairings.length > 0) {
          const total = mentorPairings.reduce((sum, p) => {
            const tenureDays = Math.max(0, (Date.now() - p.startedAt.getTime()) / 86_400_000);
            return sum + calculateMentorshipRewards(tenureDays, 0).mentorRevenueBonus;
          }, 0);
          mentorshipBonuses = { revenueBonus: Math.min(MENTOR_REVENUE_BONUS_CAP, total), miningBonus: 0, researchBonus: 0 };
        }
      }
    } catch { /* mentorship non-critical */ }

    // Get count of open bounties
    let openBounties = 0;
    try {
      openBounties = await prisma.resourceBounty.count({
        where: { status: { in: ['open', 'partial'] }, expiresAt: { gt: new Date() } },
      });
    } catch { /* non-critical */ }

    // Get claimed global milestones
    let globalMilestones: Record<string, string> = {};
    try {
      const claimed = await prisma.globalMilestone.findMany({
        select: { milestoneId: true, companyName: true },
      });
      globalMilestones = Object.fromEntries(claimed.map(m => [m.milestoneId, m.companyName]));
    } catch { /* non-critical */ }

    // Include canonical server game date so clients stay in sync
    const serverGameDate = getGlobalGameDate();

    // Compute global service counts for dynamic pricing
    // Count how many instances of each service exist across ALL players.
    // Audit Wave B (A7): the same pass also accumulates per-ZONE monthly
    // service base revenue — the governor tax base returned in zoneStandings.
    let servicePriceMultipliers: Record<string, number> = {};
    const zoneServiceRevenueBase: Record<string, number> = {};
    try {
      const { SERVICE_MAP } = await import('@/lib/game/services');
      const { LOCATION_TO_ZONE } = await import('@/lib/game/zone-influence');
      const allProfiles = await prisma.gameProfile.findMany({
        select: { activeServicesData: true },
        where: { lastSyncAt: { gt: new Date(Date.now() - 7 * 24 * 3600_000) } }, // Active in last 7 days
      });
      const globalServiceCounts: Record<string, number> = {};
      for (const p of allProfiles) {
        const services = (p.activeServicesData as { definitionId: string; locationId?: string }[] | null) || [];
        for (const svc of services) {
          if (svc.definitionId) {
            globalServiceCounts[svc.definitionId] = (globalServiceCounts[svc.definitionId] || 0) + 1;
          }
          // Governor tax base (audit A7): zone-wide service activity
          if (svc.definitionId && svc.locationId) {
            const zoneSlug = LOCATION_TO_ZONE.get(svc.locationId);
            const def = SERVICE_MAP.get(svc.definitionId);
            if (zoneSlug && def) {
              zoneServiceRevenueBase[zoneSlug] = (zoneServiceRevenueBase[zoneSlug] || 0) + def.revenuePerMonth;
            }
          }
        }
      }
      servicePriceMultipliers = getAllServicePriceMultipliers(globalServiceCounts);
    } catch { /* non-critical — fall back to no adjustment */ }

    // ── Audit Wave B (A7): the player's zone standings for the tick ─────────
    // Governor benefits and stakeholder service bonuses were "defined, never
    // called anywhere" (audit §1b Territory). The client engine applies them
    // from this snapshot via server-effects.ts.
    let zoneStandings: { zoneSlug: string; sharePct: number; isGovernor: boolean; taxBaseMonthly: number }[] = [];
    try {
      const influences = await prisma.zoneInfluence.findMany({
        where: { profileId: profile.id },
        include: { zone: { select: { slug: true, governorId: true } } },
      });
      zoneStandings = influences
        .filter(inf => inf.sharePercent > 0 || inf.zone.governorId === profile.id)
        .map(inf => ({
          zoneSlug: inf.zone.slug,
          sharePct: inf.sharePercent,
          isGovernor: inf.zone.governorId === profile.id,
          taxBaseMonthly: Math.round(zoneServiceRevenueBase[inf.zone.slug] || 0),
        }));
    } catch { /* zone standings non-critical */ }

    // ── Audit Wave B (A8): active espionage reward perks ────────────────────
    // EspionageMission.reward was "persisted and never consumed" (audit §1b).
    // Return unexpired trade_route_intel / employee_headhunt rewards so the
    // engine can store them as activeIntelPerks (headhunt hire discount is
    // client-side via getHireCost; the market-fee discount is ALSO enforced
    // server-side in market/trade from the same mission rows).
    const espionagePerks: { type: string; discount: number; expiresAtMs: number; resources?: string[] }[] = [];
    try {
      const recentMissions = await prisma.espionageMission.findMany({
        where: {
          attackerId: profile.id,
          succeeded: true,
          actionType: { in: ['trade_route_intel', 'employee_headhunt'] },
          createdAt: { gte: new Date(Date.now() - 72 * 3600_000) },
        },
        select: { actionType: true, reward: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      const nowMs = Date.now();
      for (const m of recentMissions) {
        const r = m.reward as { type?: string; discount?: number; durationHours?: number; resources?: string[] } | null;
        if (!r?.type) continue;
        const expiresAtMs = m.createdAt.getTime() + (r.durationHours || 24) * 3600_000;
        if (expiresAtMs <= nowMs) continue;
        espionagePerks.push({
          type: r.type,
          discount: Math.min(0.9, Math.max(0, r.discount ?? 0.1)),
          expiresAtMs,
          resources: Array.isArray(r.resources) ? r.resources.slice(0, 10) : undefined,
        });
      }
    } catch { /* espionage perks non-critical */ }

    // ── Audit Wave B (§1b Leagues): last finalized promotion boost ──────────
    // league-system.ts defines boostType/boostMultiplier/boostDurationSeconds
    // for top-10 finishers, but process-week "never create[d] an ActiveBoost".
    // Return the player's most recent finalized top-10 result; the engine
    // grants it once per season (claimedLeagueBoostSeasonIds dedupe).
    let leagueBoost: { seasonId: string; rank: number; league: number; boostType: string; boostMultiplier: number; boostDurationSeconds: number } | null = null;
    try {
      const finalized = await prisma.leagueBracketEntry.findFirst({
        where: {
          profileId: profile.id,
          rank: { gte: 1, lte: 10 },
          bracket: { season: { isActive: false, endsAt: { gte: new Date(Date.now() - 14 * 24 * 3600_000) } } },
        },
        include: { bracket: { select: { league: true, seasonId: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      if (finalized) {
        const { getLeagueRewards } = await import('@/lib/game/league-system');
        const rewards = getLeagueRewards(finalized.rank, finalized.bracket.league);
        if (rewards.boostType && rewards.boostMultiplier > 1) {
          leagueBoost = {
            seasonId: finalized.bracket.seasonId,
            rank: finalized.rank,
            league: finalized.bracket.league,
            boostType: rewards.boostType,
            boostMultiplier: rewards.boostMultiplier,
            boostDurationSeconds: rewards.boostDurationSeconds,
          };
        }
      }
    } catch { /* league boost non-critical */ }

    // ── Ghost Rivals: Lightweight summary for dashboard widget ──
    let rivalsSummary: { activeCount: number; topRivalScore: number | null; topRivalName: string | null; hasNewEvents: boolean } = {
      activeCount: 0,
      topRivalScore: null,
      topRivalName: null,
      hasNewEvents: false,
    };
    try {
      const activeRivals = await prisma.rivalAssignment.findMany({
        where: { playerId: profile.id, isActive: true },
        include: {
          rival: { select: { companyName: true } },
          events: { where: { notified: false }, select: { id: true }, take: 1 },
        },
        orderBy: { rivalryScore: 'desc' },
      });
      if (activeRivals.length > 0) {
        const top = activeRivals[0];
        rivalsSummary = {
          activeCount: activeRivals.length,
          topRivalScore: Math.round(top.rivalryScore),
          topRivalName: top.rival.companyName,
          hasNewEvents: activeRivals.some((r) => r.events.length > 0),
        };
      }
    } catch { /* rivals summary non-critical */ }

    return NextResponse.json({
      success: true,
      profileId: profile.id,
      netWorth,
      // One Wallet: reconciled balance + pending deltas for client adoption.
      reconciledMoney,
      ledger: ledgerInfo,
      rank,
      totalPlayers,
      allianceBonus,
      allianceName,
      allianceTag,
      allianceBonuses,
      mentorshipBonuses,
      openBounties,
      globalMilestones,
      servicePriceMultipliers,
      // Wave E2 (§2.5 "one price truth"): band-clamped live spot per resource,
      // the single price the client tick now uses to value delivery contracts
      // (spot-at-acceptance) and settle the NPC backdrop. Additive field —
      // absent on older clients simply means base-price fallback.
      marketSnapshot,
      rivals: rivalsSummary,
      leagueInfo,
      // Audit Wave B: server-computed effects consumed by the client tick
      // via useGameSync → server-effects.ts → game-engine.
      zoneStandings,
      espionagePerks,
      leagueBoost,
      // Global game date — all players must use this
      serverGameDate: {
        year: serverGameDate.year,
        month: serverGameDate.month,
        formatted: formatServerDate(serverGameDate),
      },
    });
  } catch (error) {
    logger.error('Game sync error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
