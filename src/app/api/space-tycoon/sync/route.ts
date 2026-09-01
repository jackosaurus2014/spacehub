import { NextResponse } from 'next/server';
import { attachReferral, REFERRAL_COOKIE } from '@/lib/game/referrals';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getGlobalGameDate, formatServerDate } from '@/lib/game/server-time';
// Wave E4 (Finite Demand Pools): the global log-decay multipliers are
// retired — the sync now delivers per-(location, category) demand pools
// built from the hourly LocationDemandPool aggregates.
import { buildDemandPoolSnapshot } from '@/lib/game/service-pricing';
import type { DemandPoolSnapshot } from '@/lib/game/demand-pools';
import { getCurrentSeasonNumber } from '@/lib/game/seasonal-events';
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
import { getMegaProjectBonuses } from '@/lib/game/mega-projects';
import { BOOK_VALUE_DEPRECIATION_FACTOR } from '@/lib/game/frontier';
import { BUILDING_MAP } from '@/lib/game/buildings';
import { SHIP_MAP } from '@/lib/game/ships';

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
      // Wave E5 (docs/ECONOMY_PVP_2026-08.md §2.4/§2.8/§E5): per-location
      // mined attribution (deposit depletion), hazard-driven inventory-loss
      // supply shock, and per-lane dispatch usage (trade lanes).
      minedByLocationThisTick = {},
      hazardShockThisTick = {},
      laneDispatchesThisTick = {},
      // Wave M5 (docs/MEANINGFUL_2026-08.md §3.2 O6): freight tolls debited
      // client-side at dispatch, settled to zone governors here (ledgered,
      // capped).
      tollPaymentsThisTick = {},
      // Full state for multiplayer visibility
      buildings = [],
      activeServices = [],
      unlockedLocations = [],
      completedResearch = [],
      ships = [],
      workforce = null,
      commanderIds = [],
      ledgerAck = 0,
      // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 7): faction
      // standing isn't persisted server-side anywhere (client-only
      // GameState.factionReputation) — market/trade needs it to finally
      // wire STANDING_BROKER_MODIFIER. Same stash-in-workforceData pattern
      // as _commanders below.
      factionReputation = null,
      // AAA Round 1 E3.6: owned faction-licence ids, so market/trade can
      // apply the Syndicate Gray-Market broker discount server-side. Same
      // stash-in-workforceData pattern (and same client-claimed trust level,
      // clamped at read time) as factionReputation above.
      factionLicenses = null,
    } = body;

    // Audit Wave B (§1c commander marketPriceMultiplier): stash the hired
    // commander roster inside workforceData so market/trade can recompute
    // the Magnate broker-fee reduction server-side from definitions. JSON
    // column — no schema change. Same client-claimed trust level as the
    // rest of the sync payload; the fee reduction is clamped at read time.
    const safeCommanderIds = Array.isArray(commanderIds)
      ? commanderIds.filter((c: unknown) => typeof c === 'string').slice(0, 30)
      : [];
    // E7: sanitize to a flat string->finite-number map, capped at 6 entries
    // (one per faction) — defense in depth against a hostile payload.
    const safeFactionRep: Record<string, number> = {};
    if (factionReputation && typeof factionReputation === 'object') {
      for (const [k, v] of Object.entries(factionReputation as Record<string, unknown>).slice(0, 6)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          safeFactionRep[k] = Math.max(-100, Math.min(100, v));
        }
      }
    }
    // E3.6: at most six licences exist; cap and type-filter defensively.
    const safeFactionLicenses = Array.isArray(factionLicenses)
      ? (factionLicenses as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 12)
      : [];
    const extras: Record<string, unknown> = { _commanders: safeCommanderIds };
    if (Object.keys(safeFactionRep).length > 0) extras._factionRep = safeFactionRep;
    if (safeFactionLicenses.length > 0) extras._factionLicenses = safeFactionLicenses;
    const workforceData = workforce && typeof workforce === 'object'
      ? { ...(workforce as Record<string, unknown>), ...extras }
      : (safeCommanderIds.length > 0 || Object.keys(safeFactionRep).length > 0 || safeFactionLicenses.length > 0 ? extras : workforce);

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
    // M1/F4: book value of completed capital assets (buildings + ships),
    // depreciated to BOOK_VALUE_DEPRECIATION_FACTOR of baseCost — same
    // methodology as frontier.ts's computeBookNetWorth. Pre-M1 this figure
    // was cash + inventory ONLY, so an asset-heavy corp read as no richer
    // than one holding the same cash in an empty account — invisible to the
    // league/espionage/leaderboard brackets this value feeds. Buildings/ships
    // are client-reported (same trust level as buildingCount/serviceCount
    // elsewhere in this route) and capped defensively before iterating.
    let assetBookValue = 0;
    if (Array.isArray(buildings)) {
      for (const b of buildings.slice(0, 200)) {
        if (!b || !b.isComplete) continue;
        const def = BUILDING_MAP.get(b.definitionId);
        if (def) assetBookValue += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
      }
    }
    if (Array.isArray(ships)) {
      for (const s of ships.slice(0, 50)) {
        if (!s || !s.isBuilt) continue;
        const def = SHIP_MAP.get(s.definitionId);
        if (def) assetBookValue += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
      }
    }
    const netWorth = Math.round(reconciledMoney + resourceValue + assetBookValue);

    // Wave E7 (docs/ECONOMY_PVP_2026-08.md §E7 / §5 item 5): server-
    // aggregated orbital-slot occupancy (finishes the computeOrbitalSlotReport
    // TODO). Cache table populated by orbital-slots/resolve's cron — cheap
    // read here, no aggregation on the request path.
    let orbitalSlotOccupancy: Record<string, { occupiedCount: number; bucket: string }> | null = null;
    try {
      const occRows = await prisma.orbitalSlotOccupancy.findMany();
      if (occRows.length > 0) {
        orbitalSlotOccupancy = {};
        for (const row of occRows) {
          orbitalSlotOccupancy[row.locationId] = { occupiedCount: row.occupiedCount, bucket: row.bucket };
        }
      }
    } catch {
      // Table may not exist yet (pre-migration) — client falls back to 'low'.
    }

    // Wave E7 (§E7 / §5 item 6, audit §1d): cooperative mega-project
    // permanentBonus, finally applied. World-shared (one MegaProject row per
    // type — see mega-projects.ts header), so this is a cheap, bounded query
    // (at most a handful of rows ever) rather than a per-player aggregate.
    let megaProjectBonuses: { revenueBonus: number; miningBonus: number; researchBonus: number; launchCostReduction: number } | null = null;
    try {
      const completed = await prisma.megaProject.findMany({
        where: { status: 'completed' },
        select: { projectType: true },
      });
      if (completed.length > 0) {
        megaProjectBonuses = getMegaProjectBonuses(completed.map(p => p.projectType));
      }
    } catch {
      // MegaProject table/rows may not exist yet — no bonus, matches pre-E7.
    }

    // Sanitize arrays for storage
    const safeBuildings = Array.isArray(buildings) ? buildings.slice(0, 200) : [];
    const safeServices = Array.isArray(activeServices) ? activeServices.slice(0, 100) : [];
    const safeLocations = Array.isArray(unlockedLocations) ? unlockedLocations.filter((l: unknown) => typeof l === 'string').slice(0, 30) : [];
    const safeResearch = Array.isArray(completedResearch) ? completedResearch.filter((r: unknown) => typeof r === 'string').slice(0, 500) : [];
    const safeShips = Array.isArray(ships) ? ships.slice(0, 50) : [];

    // Referral (2026-08-28): remember whether this sync is creating the
    // profile so an invite cookie can be attributed exactly once.
    const existedBefore = await prisma.gameProfile.findUnique({ where: { userId: session.user.id }, select: { id: true, companyName: true } });

    // P10 (docs/SECURITY_AUDIT_2026-08.md, 2026-09-01 hardening): this upsert
    // is the ONE legitimate writer of a profile's own companyName (there is
    // no separate rename route — the in-game settings panel renames by
    // syncing). Every public-feed write elsewhere (chat, colonies,
    // milestones, competitive-contracts) now reads profile.companyName
    // instead of trusting its own body, so this is the only place a name
    // enters the system. Sanitize it here: strip tags, trim, cap, and never
    // let an empty/garbage value blank out an existing name.
    const rawCompanyName = typeof companyName === 'string'
      ? companyName.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 50)
      : '';
    const safeCompanyName = rawCompanyName || existedBefore?.companyName || 'Untitled Aerospace';

    // Upsert game profile with full state
    const profile = await prisma.gameProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: safeCompanyName,
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
        companyName: safeCompanyName,
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

    if (!existedBefore) {
      const cookieHeader = request.headers.get('cookie') || '';
      const ref = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(REFERRAL_COOKIE + '='))?.slice(REFERRAL_COOKIE.length + 1);
      if (ref) await attachReferral(profile.id, ref);
    }

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

    // Wave E5 (§2.4 hazard coupling): hazard-driven inventory-loss supply
    // shock — same background-flow price path as NPC flow, just a separately
    // attributed channel (market-pressure.ts's `shock`, always ≤ 0 units).
    const SHOCK_PER_SYNC_CAP = 1_000;
    if (hazardShockThisTick && typeof hazardShockThisTick === 'object') {
      try {
        const { calculatePriceAfterBackgroundFlow } = await import('@/lib/game/market-engine');
        for (const [slug, qty] of Object.entries(hazardShockThisTick)) {
          if (typeof qty !== 'number' || !Number.isFinite(qty) || qty >= 0) continue;
          const safeQty = Math.max(-SHOCK_PER_SYNC_CAP, Math.round(qty));
          const resource = await prisma.marketResource.findUnique({ where: { slug } });
          if (!resource) continue;
          const newPrice = calculatePriceAfterBackgroundFlow(
            resource.currentPrice, resource.basePrice, safeQty,
            resource.volatility, resource.minPrice, resource.maxPrice,
          );
          if (newPrice !== resource.currentPrice) {
            await prisma.marketResource.update({
              where: { id: resource.id },
              data: { currentPrice: newPrice },
            });
          }
        }
      } catch { /* hazard shock pressure is non-critical */ }
    }

    // Wave E5 (§2.4): per-location mined attribution feeds the
    // LocationExtraction depletion accumulator — deposits everyone
    // strip-mines thin server-wide (extraction-pressure.ts). Decay is
    // applied lazily against `updatedAt` at each write (no cron drift).
    const MINED_BY_LOCATION_PER_SYNC_CAP = 2_000;
    if (minedByLocationThisTick && typeof minedByLocationThisTick === 'object') {
      try {
        const { applyExtractionEvent } = await import('@/lib/game/extraction-pressure');
        const nowMs = Date.now();
        for (const [locationId, byRes] of Object.entries(minedByLocationThisTick as Record<string, unknown>)) {
          if (!byRes || typeof byRes !== 'object') continue;
          for (const [resourceId, qty] of Object.entries(byRes as Record<string, unknown>)) {
            if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) continue;
            const safeQty = Math.min(MINED_BY_LOCATION_PER_SYNC_CAP, Math.floor(qty));
            const existing = await prisma.locationExtraction.findUnique({
              where: { locationId_resourceId: { locationId, resourceId } },
            });
            const { accumulated, updatedAtMs } = applyExtractionEvent(
              existing?.accumulated || 0,
              existing?.updatedAt.getTime() || nowMs,
              safeQty,
              resourceId,
              nowMs,
            );
            await prisma.locationExtraction.upsert({
              where: { locationId_resourceId: { locationId, resourceId } },
              create: { locationId, resourceId, accumulated },
              update: { accumulated },
            });
            void updatedAtMs; // updatedAt is server-managed (@updatedAt)
          }
        }
      } catch { /* extraction pressure is non-critical */ }
    }

    // Wave E5 (§2.8): per-lane dispatch usage feeds LaneUsage — repeated
    // routes earn a fuel discount, decaying when the lane goes quiet
    // (trade-lanes.ts). Same lazy-decay-on-write posture as extraction above.
    const LANE_DISPATCH_PER_SYNC_CAP = 500;
    if (laneDispatchesThisTick && typeof laneDispatchesThisTick === 'object') {
      try {
        const { applyLaneUsageEvent } = await import('@/lib/game/trade-lanes');
        const nowMs = Date.now();
        for (const [key, dispatches] of Object.entries(laneDispatchesThisTick as Record<string, unknown>)) {
          if (typeof dispatches !== 'number' || !Number.isFinite(dispatches) || dispatches <= 0) continue;
          if (!key.includes('|')) continue; // malformed key — ignore
          const safeDispatches = Math.min(LANE_DISPATCH_PER_SYNC_CAP, Math.floor(dispatches));
          const existing = await prisma.laneUsage.findUnique({ where: { laneKey: key } });
          const { usage } = applyLaneUsageEvent(
            existing?.usage || 0,
            existing?.updatedAt.getTime() || nowMs,
            safeDispatches,
            nowMs,
          );
          await prisma.laneUsage.upsert({
            where: { laneKey: key },
            create: { laneKey: key, usage },
            update: { usage },
          });
        }
      } catch { /* lane usage is non-critical */ }
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

    // Audit Wave B (A7): accumulate per-ZONE monthly service base revenue —
    // the governor tax base returned in zoneStandings. (This pass used to
    // also feed the global log-decay servicePriceMultipliers; Wave E4
    // retired that decay — finite demand pools below replace it.)
    const zoneServiceRevenueBase: Record<string, number> = {};
    try {
      const { SERVICE_MAP } = await import('@/lib/game/services');
      const { LOCATION_TO_ZONE } = await import('@/lib/game/zone-influence');
      const allProfiles = await prisma.gameProfile.findMany({
        select: { activeServicesData: true },
        where: { lastSyncAt: { gt: new Date(Date.now() - 7 * 24 * 3600_000) } }, // Active in last 7 days
      });
      for (const p of allProfiles) {
        const services = (p.activeServicesData as { definitionId: string; locationId?: string }[] | null) || [];
        for (const svc of services) {
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
    } catch { /* non-critical — fall back to no adjustment */ }

    // ── Wave E4 (§2.1/§E4): finite demand pools ─────────────────────────────
    // Read the hourly-cron-maintained LocationDemandPool aggregates and build
    // this player's bounded snapshot: pool multiplier per (location,
    // category), pool size, THEIR capacity share, anonymized top-supplier
    // shares. The season super-cycle modifier is applied at read time inside
    // buildDemandPoolSnapshot, and every multiplier is clamped to
    // [0.35, 1.25] before send (a hostile client can neither be fed nor
    // forge an absurd pool). Delivered via server-effects like zone
    // standings; absent (schema lag / cron never ran) = client falls back to
    // its deterministic local pool.
    let demandPools: DemandPoolSnapshot | null = null;
    try {
      const poolRows = await prisma.locationDemandPool.findMany({
        select: { locationId: true, category: true, dNpc: true, dDerived: true, cSupply: true, topShares: true, supplierCount: true },
      });
      if (poolRows.length > 0) {
        // Wave M2 (docs/MEANINGFUL_2026-08.md §M2 — finding F5): a
        // mothballed/reactivating/decommissioning building's service claims
        // no capacity — it exited the market. Cross-reference against the
        // client-claimed building status (client-claimed like the rest of
        // this sync payload, per POLICY.md's trust boundary) before
        // computing this player's own capacity share.
        const nonOperationalBuildingIds = new Set(
          (safeBuildings as { instanceId?: string; status?: string }[])
            .filter(b => typeof b?.instanceId === 'string' && !!b?.status && b.status !== 'active')
            .map(b => b.instanceId as string)
        );
        const ownServices = (safeServices as { definitionId?: string; locationId?: string; linkedBuildingIds?: unknown }[])
          .filter(s => typeof s?.definitionId === 'string' && typeof s?.locationId === 'string')
          .filter(s => {
            const ids = Array.isArray(s.linkedBuildingIds)
              ? s.linkedBuildingIds.filter((x): x is string => typeof x === 'string')
              : [];
            return ids.length === 0 || ids.every(id => !nonOperationalBuildingIds.has(id));
          })
          .map(s => ({ definitionId: s.definitionId as string, locationId: s.locationId as string }));
        demandPools = buildDemandPoolSnapshot(
          poolRows.map(r => ({ ...r, topShares: r.topShares as unknown })),
          ownServices,
          getCurrentSeasonNumber(),
          Date.now(),
        );
      }
    } catch { /* demand pools non-critical (schema may lag deploy) */ }

    // ── Wave E5 (§2.4/§E5): deposit extraction-pressure snapshot ───────────
    // Read every LocationExtraction row (small table — a few hundred rows at
    // most across all locations × raw resources), decay each to "now" at
    // read time (no cron drift — extraction-pressure.ts's readAccumulated),
    // and deliver the resulting mining-output multiplier per (location,
    // resource). Absent/empty table = client falls back to neutral 1.0.
    let extractionPressureSnapshot: { entries: Record<string, { locationId: string; resourceId: string; pressure: number }>; asOf: number } | null = null;
    try {
      const { readAccumulated, computeExtractionPressure, extractionKey } = await import('@/lib/game/extraction-pressure');
      const rows = await prisma.locationExtraction.findMany({
        select: { locationId: true, resourceId: true, accumulated: true, updatedAt: true },
      });
      if (rows.length > 0) {
        const nowMs = Date.now();
        const entries: Record<string, { locationId: string; resourceId: string; pressure: number }> = {};
        for (const r of rows) {
          const decayed = readAccumulated(r.accumulated, r.updatedAt.getTime(), nowMs);
          entries[extractionKey(r.locationId, r.resourceId)] = {
            locationId: r.locationId,
            resourceId: r.resourceId,
            pressure: computeExtractionPressure(decayed),
          };
        }
        extractionPressureSnapshot = { entries, asOf: nowMs };
      }
    } catch { /* extraction pressure non-critical (schema may lag deploy) */ }

    // ── Wave E5 (§2.6/§E5): server-wide labor wage-index snapshot ──────────
    // Read the weekly labor cron's LaborIndex rows verbatim — no per-sync
    // computation (the aggregation is intentionally a WEEKLY loop item, not
    // recomputed on every sync).
    let laborMarketSnapshot: { index: Record<string, number>; asOf: number } | null = null;
    try {
      const rows = await prisma.laborIndex.findMany({ select: { crewType: true, wageIndex: true, updatedAt: true } });
      if (rows.length > 0) {
        const index: Record<string, number> = {};
        let latest = 0;
        for (const r of rows) {
          index[r.crewType] = r.wageIndex;
          latest = Math.max(latest, r.updatedAt.getTime());
        }
        laborMarketSnapshot = { index, asOf: latest || Date.now() };
      }
    } catch { /* labor market non-critical (schema may lag deploy) */ }

    // ── Wave E5 (§2.8/§E5): per-lane fuel-discount snapshot ────────────────
    let laneBonusesSnapshot: { bonuses: Record<string, number>; asOf: number } | null = null;
    try {
      const { readLaneUsage, computeLaneBonus } = await import('@/lib/game/trade-lanes');
      const rows = await prisma.laneUsage.findMany({ select: { laneKey: true, usage: true, updatedAt: true } });
      if (rows.length > 0) {
        const nowMs = Date.now();
        const bonuses: Record<string, number> = {};
        for (const r of rows) {
          const decayed = readLaneUsage(r.usage, r.updatedAt.getTime(), nowMs);
          const bonus = computeLaneBonus(decayed);
          if (bonus > 0) bonuses[r.laneKey] = bonus;
        }
        laneBonusesSnapshot = { bonuses, asOf: nowMs };
      }
    } catch { /* lane bonuses non-critical (schema may lag deploy) */ }

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

    // ── Wave M5 (docs/MEANINGFUL_2026-08.md §M5 / §3.2 O6): settle freight
    // tolls to zone governors. The client debited itself at dispatch time
    // (cargo-logistics.ts) from the PUBLIC toll snapshot; here the credit
    // side lands via the One-Wallet ledger. Client-claimed like the rest of
    // the payload, so defense in depth: only zones with a real toll > 0 and
    // a governor get credited, the per-zone amount is capped per sync, and
    // the governor never pays themselves. ──────────────────────────────────
    if (tollPaymentsThisTick && typeof tollPaymentsThisTick === 'object') {
      try {
        const { FREIGHT_TOLL_SERVER_CREDIT_CAP_PER_SYNC } = await import('@/lib/game/offense');
        const { recordLedger, isLedgerAvailable: ledgerAvail } = await import('@/lib/game/server-ledger');
        // Balance Pass 9: the per-sync credit cap scales by the quarterly
        // fee-index factor — server-recomputed here (never trusted from the
        // client payload), matching the client-side per-dispatch cap scaling
        // in offense.ts computeFreightTolls. Factor 1 at relaunch by design.
        const { getServerFeeIndexFactor } = await import('@/lib/game/fee-index-server');
        const tollFeeFactor = await getServerFeeIndexFactor().catch(() => 1);
        const tollLedgerOn = await ledgerAvail();
        if (tollLedgerOn) {
          for (const [zoneSlug, amount] of Object.entries(tollPaymentsThisTick as Record<string, unknown>).slice(0, 10)) {
            if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) continue;
            const safeAmount = Math.min(Math.round(FREIGHT_TOLL_SERVER_CREDIT_CAP_PER_SYNC * tollFeeFactor), Math.round(amount));
            const zone = await prisma.zone.findUnique({
              where: { slug: zoneSlug },
              select: { governorId: true, freightTollPct: true },
            });
            if (!zone || !zone.governorId || zone.freightTollPct <= 0) continue;
            if (zone.governorId === profile.id) continue;
            await prisma.$transaction(async (tx) => {
              await tx.gameProfile.update({
                where: { id: zone.governorId! },
                data: { money: { increment: safeAmount }, totalEarned: { increment: safeAmount } },
              });
              await recordLedger(tx, {
                profileId: zone.governorId!, moneyDelta: safeAmount,
                reason: 'lane_toll_income', refId: `${zoneSlug}:${profile.id}`,
              });
            });
          }
        }
      } catch { /* toll settlement non-critical (schema may lag deploy) */ }
    }

    // ── Balance Pass 9: quarterly offense-fee-index snapshot ───────────────
    // (fee-index-server.ts — per-quarter cached median-monthly-net factor).
    // Additive field; older clients ignore it (factor 1 behavior).
    let feeIndex = null;
    try {
      const { getServerFeeIndexSnapshot } = await import('@/lib/game/fee-index-server');
      feeIndex = await getServerFeeIndexSnapshot();
    } catch { /* fee index non-critical — client falls back to factor 1 */ }

    // ── Wave M5 (§M5): offense snapshot — active price campaigns (public),
    // this player's poach inbox + outcomes, zone freight tolls (public),
    // cornering alerts. Built server-side (offense-server.ts), re-clamped
    // client-side (offense.ts). Also lazy-resolves expired poach offers —
    // no cron dependency. ──────────────────────────────────────────────────
    let offense = null;
    try {
      const { buildOffenseSnapshot } = await import('@/lib/game/offense-server');
      offense = await buildOffenseSnapshot(profile.id, safeResearch);
    } catch { /* offense snapshot non-critical (schema may lag deploy) */ }

    // ── Wave M6 (docs/MEANINGFUL_2026-08.md §M6): equity snapshot ──────────
    // Share registry / tender offers / holdings for THIS profile, gated on
    // the server-side population check (share-registry.ts). Read-only on
    // this hot path (registries are created lazily by the equity GET /
    // resolve cron, never here); null until the schema is pushed AND the
    // gate opens — the client treats null as "no equity system" (pre-M6).
    let equity = null;
    try {
      const { buildEquitySnapshot } = await import('@/lib/game/server-equity');
      equity = await buildEquitySnapshot(
        { id: profile.id, companyName: profile.companyName, netWorth },
      );
    } catch { /* equity snapshot non-critical (schema may lag deploy) */ }

    // ── AAA Round 1 wave E1: the Accord Chair snapshot ────────────────────
    // Election phase, live tally, the seated Chair's agenda writs, and this
    // profile's fracture status. Read-only on this hot path (the resolve
    // cron owns every mutation); null until the schema is pushed — the
    // client treats null as "no Chair system" (pre-E1 behaviour), and both
    // consumers (accord-senate's writ lookup + fracture exemption,
    // factions.ts's effective standing) already default that way.
    let chair = null;
    try {
      const { buildChairSnapshot } = await import('@/lib/game/server-chair');
      chair = await buildChairSnapshot({ id: profile.id, companyName: profile.companyName });
    } catch { /* chair snapshot non-critical (schema may lag deploy) */ }

    // ── AAA Round 2: the systemic-crisis snapshot ─────────────────────────
    // The published world index for this cycle, the assessment target and
    // pool, this corporation's own pledge, and the seated Chair's relief
    // directive. Read-only on this hot path (the resolve cron owns sealing;
    // the crisis route owns pledges); null until the schema is pushed — the
    // client treats null as "no crisis system", which is exactly pre-Round-2
    // behaviour: no situation ever opens and the insurance premium loading
    // is exactly 1.
    let crisis = null;
    try {
      const { buildCrisisSnapshot } = await import('@/lib/game/server-crises');
      crisis = await buildCrisisSnapshot(
        { id: profile.id, companyName: profile.companyName },
        { isSeatedChair: chair?.seat?.isMe === true },
      );
    } catch { /* crisis snapshot non-critical (schema may lag deploy) */ }

    // ── Balance Pass 4 (docs/BALANCE.md "Pass 4"): this player's ACTIVE
    // orbital-slot leases — the client-side slot-gate (spatial-strategy.ts
    // checkOrbitalSlotGate) needs them to allow builds at saturated pools.
    // Same cheap-read posture as orbitalSlotOccupancy above. ────────────────
    let orbitalSlotLeases: { locationId: string; expiresAtMs: number }[] | null = null;
    try {
      const leaseRows = await prisma.orbitalSlotLease.findMany({
        where: { holderId: profile.id, status: 'active', expiresAt: { gt: new Date() } },
        select: { locationId: true, expiresAt: true },
        take: 50,
      });
      orbitalSlotLeases = leaseRows.map(l => ({
        locationId: l.locationId,
        expiresAtMs: l.expiresAt.getTime(),
      }));
    } catch { /* lease table may not exist yet (pre-migration) — gate falls back open only where occupancy is also absent */ }

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
      // Wave E4 (§2.1/§E4): finite demand pools — replaces the retired
      // log-decay servicePriceMultipliers. Additive field; older clients
      // simply fall back to their deterministic local pools.
      demandPools,
      // Wave E5 (§2.4/§2.6/§2.8/§E5): deposit extraction pressure, labor wage
      // index, and per-lane fuel discounts — additive fields; older clients
      // simply fall back to their pre-E5 neutral behavior.
      extractionPressure: extractionPressureSnapshot,
      laborMarket: laborMarketSnapshot,
      laneBonuses: laneBonusesSnapshot,
      // Balance Pass 9: quarterly offense-fee-index — additive field; older
      // clients simply fall back to factor 1.
      feeIndex,
      // Wave E2 (§2.5 "one price truth"): band-clamped live spot per resource,
      // the single price the client tick now uses to value delivery contracts
      // (spot-at-acceptance) and settle the NPC backdrop. Additive field —
      // absent on older clients simply means base-price fallback.
      marketSnapshot,
      // Wave E7 (§E7 / §5 item 5): server-aggregated orbital-slot occupancy
      // — spatial-strategy.ts's computeOrbitalSlotReport uses this to report
      // the REAL saturation bucket instead of the old hardcoded 'low'.
      // Additive; absent = pre-E7 fallback behavior.
      orbitalSlotOccupancy,
      // Balance Pass 4: this player's active slot leases — lets the client
      // slot-gate (checkOrbitalSlotGate) permit builds at saturated pools.
      orbitalSlotLeases,
      // Wave E7 (§E7 / §5 item 6, audit §1d): world-shared cooperative
      // mega-project bonuses — see server-effects.ts's MegaProjectBonusSnapshot.
      megaProjectBonuses,
      // Wave M5 (§M5): offense snapshot — campaigns / poach inbox+outcomes /
      // freight tolls / cornering alerts. Additive field; older clients
      // simply ignore it (pre-M5 behavior).
      offense,
      // Wave M6 (§M6): share-registry/takeover snapshot — additive field;
      // older clients simply ignore it (pre-M6 behavior).
      equity,
      // AAA E1: Accord Chair snapshot — additive field; older clients simply
      // ignore it (pre-E1 behavior: no election, no writs, never fractured).
      chair,
      // AAA Round 2: systemic-crisis snapshot — additive field; older clients
      // simply ignore it (pre-Round-2 behavior: no crisis, no situation, no
      // premium loading).
      crisis,
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
