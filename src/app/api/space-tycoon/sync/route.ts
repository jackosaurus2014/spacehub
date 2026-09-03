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
// GAME_DESIGN_REVIEW_2026-09 rows 11 + 14: NPC density governor snapshot and
// settled rivalry stakes ride the server-effects hop.
import { buildNpcGovernorSnapshot } from '@/lib/game/npc-companies';
import { RIVALRY_WIN_ACTIVITY, type RivalryStakeResult } from '@/lib/game/rivalry-stake';
import {
  calculateMetricScore,
  getMetricDefinition,
  getWeeklyMetric,
  getLeagueDefinition,
} from '@/lib/game/league-system';
import { getCurrentWeekId } from '@/lib/game/weekly-events';
import {
  reconcileBalance,
  applyResourceDeltas,
  clampPlausibleMoney,
  PENDING_EXCLUDED_LEDGER_REASONS,
  SERVER_RESOURCE_CORRECTION_REASON,
  SYNC_MIN_INTERVAL_MS,
  type LedgerEntryLite,
} from '@/lib/game/ledger-reconcile';
// Game exploit batch 2026-09-02 (docs/SECURITY_AUDIT_2026-09.md): payload
// validation (C-5 / M-8), stash-key hygiene (M-2), the server-derived
// first-sync kit (C-1), the per-profile cadence gate (C-2b) and the
// authoritative-inventory valuation (M-8).
import {
  validateSyncEconomics,
  stripStashKeys,
  sanitizeCommanderIds,
  sanitizeFactionLicenses,
  buildFirstSyncKit,
  SYNC_MAX_BUILDINGS,
  SYNC_MAX_SHIPS,
  type FirstSyncKit,
  type ValidatedSyncEconomics,
  type SyncService,
  type SyncShip,
} from '@/lib/game/sync-validation';
import { allow as throttleAllow, throttledBody } from '@/lib/game/route-throttle';
import { loadAuthoritativeInventory } from '@/lib/game/server-inventory';
import { buildMarketSnapshot } from '@/lib/game/spot-price';
import { isLedgerAvailable, recordSyncAuthoredLedger } from '@/lib/game/server-ledger';
import { resolveMetricCurrentValue } from '@/lib/game/market-share';
import { getMegaProjectBonuses } from '@/lib/game/mega-projects';
import { BOOK_VALUE_DEPRECIATION_FACTOR } from '@/lib/game/frontier';
import { BUILDING_MAP, markBookValue } from '@/lib/game/buildings';
import { SHIP_MAP } from '@/lib/game/ships';
import {
  computeResourceCeilings,
  buildServerFlowState,
  computeServerMonthlyGross,
  clampResources,
  getResourceClampMode,
  readResourceStash,
  selectCeilingsToStash,
  RESOURCE_BASELINE_KEY,
  RESOURCE_CEILINGS_KEY,
  type ResourceRejection,
  type ResourceCeilingReport,
  // Phase 2 (server-owned inventory) — see the block after the clamp.
  readServerResources,
  advanceServerResources,
  computeResourceDivergence,
  computeClientCorrections,
  computeCraftAttestationCaps,
  capCraftAttestation,
  capBuildAttestation,
  DIVERGENCE_AUDIT_THROTTLE_MS,
  RESOURCE_DIVERGENCE_LOGGED_KEY,
  type CappedGrowth,
  type ResourceDivergence,
  type AttestationRejection,
} from '@/lib/game/resource-plausibility';
import { takeEconomicSnapshotFromRow } from '@/lib/game/economic-snapshot';
// Phase 3 slice 1 (docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 —
// buildings"): the server-authoritative building registry.
import {
  ASSET_AUDIT_LOGGED_KEY,
  ASSET_AUDIT_THROTTLE_MS,
  ASSET_BASELINE_KEY,
  ASSET_BASELINE2_KEY,
  auditAsset,
  buildAdoptionRows,
  buildAdoptionRows2,
  completeDueAssets,
  diffClientAssets,
  diffClientAssets2,
  getAssetLedgerMode,
  loadServerRegistry,
  loadServerServicesForProfiles,
  mergeServerBuildings,
  mergeServerShips,
  readAssetAuditLoggedAt,
  readAssetBaseline,
  readAssetBaseline2,
  shipsAdoptable,
  type AssetLedgerMode,
} from '@/lib/game/server-assets';

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

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid sync payload', field: 'body' }, { status: 400 });
    }
    // C-5 / M-8: every economic number must be finite and capped, every asset
    // must reference a real definition / location. A bad payload is a 400
    // with the first problem — money is never silently coerced.
    const validated = validateSyncEconomics(body as Record<string, unknown>);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error, field: validated.field }, { status: 400 });
    }
    // `economics` is what the rest of the route reads. For a brand-new
    // profile it is REPLACED by the server-derived first-sync kit below.
    let economics: ValidatedSyncEconomics = validated.data;
    const {
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
      // Server-authoritative inventory phase 2 (docs/SECURITY_AUDIT_2026-09.md
      // "Phase 2"): the client's attestations of its own crafting outputs
      // (resources IN) and building / ship / research resource spend
      // (resources OUT) since the last sync. Capped server-side against the
      // engine's own recipe throughput / definition costs and ledgered as
      // client_craft_output / client_build_spend; craft outputs also widen
      // the growth the server map accepts this sync.
      craftedThisTick = {},
      builtThisTick = {},
      // Full state for multiplayer visibility (buildings / activeServices /
      // unlockedLocations / completedResearch / ships) now arrives through
      // `economics` above, validated.
      workforce = null,
      commanderIds = [],
      ledgerAck = 0,
      // C-1: the client's chosen starting archetype, validated against the
      // registry server-side and only ever read on the FIRST sync.
      startingArchetype = null,
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
    // M-2: commander ids must exist in the registry (roster-capped).
    const safeCommanderIds = sanitizeCommanderIds(commanderIds);
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
    // E3.6 / M-2: licence ids must exist in the registry (capped).
    const safeFactionLicenses = sanitizeFactionLicenses(factionLicenses);
    const extras: Record<string, unknown> = { _commanders: safeCommanderIds };
    if (Object.keys(safeFactionRep).length > 0) extras._factionRep = safeFactionRep;
    if (safeFactionLicenses.length > 0) extras._factionLicenses = safeFactionLicenses;
    // M-2: the client's own workforce object may NEVER carry a `_`-prefixed
    // key — those are server stash (`_resourceBaselineAt`, `_resourceCeilings`,
    // `_resourceDivergenceLoggedAt`) or server-validated claims (above). Strip
    // them before the merge so a forged `_resourceBaselineAt` cannot reset
    // the phase-1 ratchet or hand the profile forged ceilings.
    const clientWorkforce = stripStashKeys(workforce);
    const workforceData: Record<string, unknown> | null = clientWorkforce
      ? { ...clientWorkforce, ...extras }
      : (safeCommanderIds.length > 0 || Object.keys(safeFactionRep).length > 0 || safeFactionLicenses.length > 0 ? extras : null);

    // ── One Wallet: reconcile client money against the server delta ledger ──
    // (see route header). Falls back to the raw client figure when the ledger
    // table is unavailable or the profile doesn't exist yet.
    const clientMoney = economics.money;
    const clientResources: Record<string, number> = economics.resources;
    let reconciledMoney = clientMoney;
    let reconciledResources: Record<string, number> = clientResources;
    let ledgerInfo: {
      ackSeq: number;
      maxSeq: number;
      moneyDelta: number;
      resourceDeltas: Record<string, number>;
      entries: LedgerEntryLite[];
    } | null = null;

    // Server-authoritative inventory phase 1: the previous row's economic
    // columns feed the per-resource plausibility ceilings below (and the
    // 'pre-clamp' EconomicSnapshot in enforce mode), so select them once here.
    let existingProfile: {
      id: string; money: number; netWorth: number; totalEarned: number; lastSyncAt: Date;
      resources: unknown; buildingsData: unknown; shipsData: unknown;
      activeServicesData: unknown; completedResearchList: string[]; workforceData: unknown;
      serverResources: unknown;
    } | null = null;
    let elapsedSinceLastSyncMs = 0;

    try {
      existingProfile = await prisma.gameProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true, money: true, netWorth: true, totalEarned: true, lastSyncAt: true,
          resources: true, buildingsData: true, shipsData: true,
          activeServicesData: true, completedResearchList: true, workforceData: true,
          serverResources: true,
        },
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
        elapsedSinceLastSyncMs = elapsedMs;
        // Clock unification (2026-09-02): the ceiling is derived from what
        // THIS profile's persisted state can gross per 6 h game-month
        // (resource-plausibility.ts computeServerMonthlyGross — same partial
        // GameState builder the resource ceilings use), x2 headroom, bounded
        // by a $500K/s backstop. A malformed row degrades to gross 0 (only
        // ledger-mediated income passes), never to an unbounded ceiling.
        let serverMonthlyGross = 0;
        try {
          serverMonthlyGross = computeServerMonthlyGross(
            buildServerFlowState({
              prevResources: existingProfile.resources as Record<string, number> | null,
              prevBuildingsData: existingProfile.buildingsData,
              prevShipsData: existingProfile.shipsData,
              prevActiveServices: existingProfile.activeServicesData,
              prevResearch: existingProfile.completedResearchList,
            }),
            { workforceData: existingProfile.workforceData, totalEarned: existingProfile.totalEarned },
          );
        } catch (grossError) {
          logger.error('Server monthly gross computation failed — zero headroom this sync', { error: String(grossError) });
        }
        const clamp = clampPlausibleMoney(clientMoney, existingProfile.money, elapsedMs, serverMonthlyGross);
        plausibilityClampedMoney = clamp.clampedMoney;
        if (clamp.wasClamped) {
          logger.warn('Client money claim exceeded plausibility ceiling — clamped', {
            userId: session.user.id, profileId: existingProfile.id,
            clientMoney, prevMoney: existingProfile.money, elapsedMs, serverMonthlyGross,
            headroom: clamp.headroom, ceiling: clamp.ceiling, rejectedExcess: clamp.rejectedExcess,
          });
          try {
            await prisma.marketAuditLog.create({
              data: {
                eventType: 'client_money_implausible_rejected',
                profileId: existingProfile.id,
                details: {
                  clientMoney, prevMoney: existingProfile.money, elapsedMs, serverMonthlyGross,
                  headroom: clamp.headroom, ceiling: clamp.ceiling, rejectedExcess: clamp.rejectedExcess,
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

        // Phase 2: the sync's own client_craft_output / client_build_spend
        // rows are the client's OWN movements (already in its map) — never
        // hand them back as pending deltas (ledger-reconcile.ts header).
        const pendingRows = await prisma.gameLedgerEntry.findMany({
          where: {
            profileId: existingProfile.id,
            seq: { gt: safeAck },
            reason: { notIn: [...PENDING_EXCLUDED_LEDGER_REASONS] },
          },
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

    // ── C-2(b): server-enforced per-profile sync cadence ───────────────────
    // The plausibility ceilings are time-proportional now (no per-request
    // floor), but a tight loop would still spend DB writes and re-stamp
    // lastSyncAt. Truth = the row's lastSyncAt; fast path = an in-memory
    // per-profile window that also closes the concurrent-request race two
    // tabs could otherwise win. The client syncs every 60 s (30 s floor).
    if (existingProfile) {
      if (elapsedSinceLastSyncMs < SYNC_MIN_INTERVAL_MS) {
        return NextResponse.json(
          { error: 'sync_too_frequent', retryAfterMs: Math.max(1, SYNC_MIN_INTERVAL_MS - elapsedSinceLastSyncMs) },
          { status: 429 },
        );
      }
      const cadence = throttleAllow(existingProfile.id, 'sync', 1, SYNC_MIN_INTERVAL_MS);
      if (!cadence.allowed) {
        return NextResponse.json({ error: 'sync_too_frequent', retryAfterMs: cadence.retryAfterMs }, { status: 429 });
      }
    }

    // ── C-1: a brand-new profile ignores the body's economics ──────────────
    // The create path used to persist money / totalEarned / resources /
    // buildings / research verbatim from the first POST (rank #1 in one
    // request; phase-2 adoption later copied the forged map into
    // serverResources). The first row is now the server-derived kit:
    // STARTING_MONEY (or the validated archetype's startingMoney), the
    // archetype's starting resources / buildings / services, nothing else.
    // The phase-1 marker and ceilings are set from the kit in this same
    // request, and serverResources is adopted from the kit — so the NEXT
    // sync is already clamped against server defaults, never against the
    // client's first claim.
    let firstSyncKit: FirstSyncKit | null = null;
    if (!existingProfile) {
      firstSyncKit = buildFirstSyncKit(startingArchetype);
      economics = {
        ...economics,
        money: firstSyncKit.money,
        totalEarned: 0,
        totalSpent: 0,
        gameYear: firstSyncKit.gameYear,
        resources: { ...firstSyncKit.resources },
        buildings: firstSyncKit.buildings,
        ships: firstSyncKit.ships,
        activeServices: firstSyncKit.activeServices,
        unlockedLocations: firstSyncKit.unlockedLocations,
        completedResearch: firstSyncKit.completedResearch,
        buildingCount: firstSyncKit.buildings.filter(b => b.isComplete).length,
        researchCount: 0,
        serviceCount: firstSyncKit.activeServices.length,
        locationsUnlocked: firstSyncKit.unlockedLocations.length,
      };
      reconciledMoney = firstSyncKit.money;
      reconciledResources = { ...firstSyncKit.resources };
      ledgerInfo = null;
      if (Math.abs(clientMoney - firstSyncKit.money) > 0.01 * firstSyncKit.money) {
        logger.info('First sync: client economics ignored', {
          userId: session.user.id, clientMoney, serverStartingMoney: firstSyncKit.money,
          archetype: firstSyncKit.archetypeId,
        });
        try {
          await prisma.marketAuditLog.create({
            data: {
              eventType: 'first_sync_body_ignored',
              details: {
                userId: session.user.id,
                clientMoney,
                serverStartingMoney: firstSyncKit.money,
                archetype: firstSyncKit.archetypeId,
                clientResourceKeys: Object.keys(clientResources).length,
                clientBuildings: validated.data.buildings.length,
              },
              severity: 'info',
            },
          });
        } catch { /* audit log is best-effort */ }
      }
    }

    // ── Server-authoritative inventory, phase 1: per-resource plausibility ──
    // docs/SECURITY_AUDIT_2026-09.md "Server-authoritative inventory — phase
    // 1". Bounds each resource in the RECONCILED map against what this
    // profile could plausibly have accumulated since its last sync
    // (resource-plausibility.ts). RESOURCE_CLAMP_MODE:
    //   off     — nothing computed, nothing stashed (pre-phase-1 behaviour);
    //   shadow  — (default) compute, audit would-be rejections as
    //             `client_resources_implausible_shadow` (warning), persist
    //             the client values unchanged;
    //   enforce — persist the clamped map, audit as
    //             `client_resources_implausible_rejected` (critical), and
    //             take a 'pre-clamp' EconomicSnapshot first so it is
    //             reversible.
    // First-sync ratchet: the first sync that runs this block only stashes
    // `_resourceBaselineAt` and never clamps, so a save that predates the
    // feature is adopted as the baseline, then enforced from the next sync.
    const resourceClampMode = getResourceClampMode();
    const resourceExtras: Record<string, unknown> = {};
    let resourceClampInfo: {
      mode: 'shadow' | 'enforce';
      baselined: boolean;
      rejected: ResourceRejection[];
      enforced: boolean;
    } | null = null;
    // Shared with the phase-2 block below.
    let ceilingReport: ResourceCeilingReport | null = null;
    let baselinePredatesThisSync = false;
    if (resourceClampMode !== 'off' && existingProfile) {
      try {
        const stash = readResourceStash(existingProfile.workforceData);
        const nowIso = new Date().toISOString();
        const baselineAt = stash.baselineAt;
        baselinePredatesThisSync = !!baselineAt && Date.parse(baselineAt) < Date.now();
        resourceExtras[RESOURCE_BASELINE_KEY] = baselineAt ?? nowIso;

        const prevResources = existingProfile.resources && typeof existingProfile.resources === 'object'
          ? (existingProfile.resources as Record<string, number>)
          : {};
        ceilingReport = computeResourceCeilings({
          prevResources,
          prevBuildingsData: existingProfile.buildingsData,
          prevShipsData: existingProfile.shipsData,
          prevActiveServices: existingProfile.activeServicesData,
          prevResearch: existingProfile.completedResearchList,
          prevWorkforce: existingProfile.workforceData,
          ledgerDeltas: ledgerInfo?.resourceDeltas ?? null,
          elapsedMs: elapsedSinceLastSyncMs,
        });
        const { ceilings } = ceilingReport;
        resourceExtras[RESOURCE_CEILINGS_KEY] = selectCeilingsToStash(ceilings, reconciledResources);

        if (baselinePredatesThisSync) {
          const { clamped, rejected } = clampResources(reconciledResources, ceilings, ceilingReport.elapsedMonths);
          const enforce = resourceClampMode === 'enforce';
          resourceClampInfo = { mode: resourceClampMode, baselined: true, rejected, enforced: enforce && rejected.length > 0 };
          if (rejected.length > 0) {
            const auditDetails = {
              mode: resourceClampMode,
              elapsedMs: elapsedSinceLastSyncMs,
              baselineAt,
              rejected: rejected.slice(0, 35),
              rejectedCount: rejected.length,
            };
            logger.warn(
              enforce
                ? 'Client resource claims exceeded plausibility ceilings — clamped'
                : 'Client resource claims exceeded plausibility ceilings — shadow (not clamped)',
              { userId: session.user.id, profileId: existingProfile.id, ...auditDetails },
            );
            if (enforce) {
              // Reversibility first: snapshot the row as it stands BEFORE the
              // clamped map is persisted. Best-effort (table may lag deploy).
              await takeEconomicSnapshotFromRow(existingProfile, 'pre-clamp');
              reconciledResources = clamped;
            }
            try {
              await prisma.marketAuditLog.create({
                data: {
                  eventType: enforce ? 'client_resources_implausible_rejected' : 'client_resources_implausible_shadow',
                  profileId: existingProfile.id,
                  details: JSON.parse(JSON.stringify(auditDetails)),
                  severity: enforce ? 'critical' : 'warning',
                },
              });
            } catch { /* audit log is best-effort */ }
          }
        } else {
          resourceClampInfo = { mode: resourceClampMode, baselined: false, rejected: [], enforced: false };
        }
      } catch (clampError) {
        // Plausibility is best-effort; never block the sync.
        logger.error('Resource plausibility clamp failed', { error: String(clampError) });
      }
    } else if (resourceClampMode !== 'off' && firstSyncKit) {
      // C-1: baseline the brand-new row on the SERVER kit right now, so the
      // next sync is clamped against it (no "first sync after deploy" free
      // adoption for a new profile).
      try {
        resourceExtras[RESOURCE_BASELINE_KEY] = new Date().toISOString();
        ceilingReport = computeResourceCeilings({
          prevResources: firstSyncKit.resources,
          prevBuildingsData: firstSyncKit.buildings,
          prevShipsData: firstSyncKit.ships,
          prevActiveServices: firstSyncKit.activeServices,
          prevResearch: firstSyncKit.completedResearch,
          prevWorkforce: null,
          ledgerDeltas: null,
          elapsedMs: 0,
        });
        resourceExtras[RESOURCE_CEILINGS_KEY] = selectCeilingsToStash(ceilingReport.ceilings, firstSyncKit.resources);
        resourceClampInfo = { mode: resourceClampMode, baselined: true, rejected: [], enforced: false };
      } catch (kitError) {
        logger.error('First-sync baseline failed', { error: String(kitError) });
      }
    }

    // ── Server-authoritative inventory, phase 2: the server-owned map ──────
    // docs/SECURITY_AUDIT_2026-09.md "Phase 2". `GameProfile.serverResources`
    // is what the escrow-backed paths verify against (server-inventory.ts).
    // Rules (formula in resource-plausibility.ts's phase-2 header):
    //   - ADOPTION: null map + the phase-1 baseline marker predates this
    //     sync → serverResources = the client view written this sync (one
    //     time), and every ledger row up to the reconciled seq is stamped
    //     folded (the view already contains them).
    //   - ADVANCE: prev + Σ unfolded ledger rows + the client's own movement,
    //     where a decrease is accepted as-is and an increase only up to the
    //     phase-1 growth allowance for the SERVER stock plus the capped craft
    //     attestation. Never above the client view; never below zero.
    //   - DIVERGENCE: client view vs server truth > 5 % → MarketAuditLog
    //     `client_server_resource_divergence` (warning), 1/hour/profile.
    //   - CORRECTION (enforce only): a `server_resource_correction` ledger
    //     row per drifted resource (client − server > 5 %), applied to the
    //     persisted client view and returned to the client as a normal
    //     pending delta so it converges without a hard reset. Shadow only
    //     computes and logs. Never upward.
    //   - ATTESTATIONS: craftedThisTick / builtThisTick, capped
    //     (computeCraftAttestationCaps / capBuildAttestation), ledgered as
    //     client_craft_output / client_build_spend (audit trail; stamped
    //     folded + applied at birth).
    // Requires the ledger (ledgerInfo) — without it there is nothing to fold
    // and the map is left untouched. Best-effort: never blocks the sync.
    let serverResourcesToPersist: Record<string, number> | undefined;
    let foldRowIds: string[] = [];
    let foldAllUpToSeq: number | null = null;
    let correctionDeltas: Record<string, number> = {};
    let craftAccepted: Record<string, number> = {};
    let buildAccepted: Record<string, number> = {};
    let serverInventoryInfo: {
      mode: 'shadow' | 'enforce';
      adopted: boolean;
      capped: CappedGrowth[];
      divergence: ResourceDivergence[];
      corrections: Record<string, number>;
      corrected: boolean;
      craft: { accepted: Record<string, number>; rejected: AttestationRejection[] };
      build: { accepted: Record<string, number>; rejected: AttestationRejection[] };
    } | null = null;
    if (resourceClampMode !== 'off' && existingProfile && ledgerInfo && ceilingReport) {
      try {
        const enforce = resourceClampMode === 'enforce';
        const prevServer = readServerResources(existingProfile.serverResources);
        const wd = (existingProfile.workforceData && typeof existingProfile.workforceData === 'object')
          ? (existingProfile.workforceData as Record<string, unknown>)
          : {};
        // Carry the throttle marker forward (the client never echoes stash keys).
        const lastDivergenceLoggedAt = typeof wd[RESOURCE_DIVERGENCE_LOGGED_KEY] === 'string'
          ? (wd[RESOURCE_DIVERGENCE_LOGGED_KEY] as string)
          : null;
        if (lastDivergenceLoggedAt) resourceExtras[RESOURCE_DIVERGENCE_LOGGED_KEY] = lastDivergenceLoggedAt;

        if (!prevServer) {
          if (baselinePredatesThisSync) {
            const adopted: Record<string, number> = {};
            for (const [k, v] of Object.entries(reconciledResources)) {
              if (typeof v === 'number' && Number.isFinite(v) && v > 0) adopted[k] = v;
            }
            serverResourcesToPersist = adopted;
            foldAllUpToSeq = Math.max(ledgerInfo.maxSeq, ledgerInfo.ackSeq);
            serverInventoryInfo = {
              mode: resourceClampMode, adopted: true, capped: [], divergence: [], corrections: {}, corrected: false,
              craft: { accepted: {}, rejected: [] }, build: { accepted: {}, rejected: [] },
            };
          }
        } else {
          const unfoldedRows = await prisma.gameLedgerEntry.findMany({
            where: { profileId: existingProfile.id, foldedAt: null },
            select: { id: true, resourceSlug: true, resourceDelta: true },
            orderBy: { seq: 'asc' },
            take: 1000,
          });
          const folded: Record<string, number> = {};
          for (const r of unfoldedRows) {
            foldRowIds.push(r.id);
            if (!r.resourceSlug || typeof r.resourceDelta !== 'number' || !Number.isFinite(r.resourceDelta) || r.resourceDelta === 0) continue;
            folded[r.resourceSlug] = (folded[r.resourceSlug] || 0) + r.resourceDelta;
          }

          const craftCaps = computeCraftAttestationCaps({
            prevBuildingsData: existingProfile.buildingsData,
            prevResearch: existingProfile.completedResearchList,
            elapsedMs: elapsedSinceLastSyncMs,
          });
          const craft = capCraftAttestation(craftedThisTick, craftCaps);
          const build = capBuildAttestation(builtThisTick);
          craftAccepted = craft.accepted;
          buildAccepted = build.accepted;

          const adv = advanceServerResources({
            prevServer,
            prevClientRow: existingProfile.resources as Record<string, number> | null,
            clientView: reconciledResources,
            folded,
            prodPerMonth: ceilingReport.prodPerMonth,
            elapsedMonths: ceilingReport.elapsedMonths,
            craftAccepted: craft.accepted,
          });
          serverResourcesToPersist = adv.next;

          const divergence = computeResourceDivergence(reconciledResources, adv.next);
          const corrections = computeClientCorrections(reconciledResources, adv.next);
          const hasCorrections = Object.keys(corrections).length > 0;

          if (divergence.length > 0) {
            const nowMs = Date.now();
            const lastMs = lastDivergenceLoggedAt ? Date.parse(lastDivergenceLoggedAt) : NaN;
            const throttled = Number.isFinite(lastMs) && nowMs - lastMs < DIVERGENCE_AUDIT_THROTTLE_MS;
            if (!throttled) {
              const auditDetails = {
                mode: resourceClampMode,
                elapsedMs: elapsedSinceLastSyncMs,
                divergence: divergence.slice(0, 35),
                divergenceCount: divergence.length,
                capped: adv.capped.slice(0, 35),
                corrections,
                corrected: enforce && hasCorrections,
                craftRejected: craft.rejected.slice(0, 20),
                buildRejected: build.rejected.slice(0, 20),
              };
              logger.warn('Client resource view diverges from server-owned inventory', {
                userId: session.user.id, profileId: existingProfile.id, ...auditDetails,
              });
              try {
                await prisma.marketAuditLog.create({
                  data: {
                    eventType: 'client_server_resource_divergence',
                    profileId: existingProfile.id,
                    details: JSON.parse(JSON.stringify(auditDetails)),
                    severity: 'warning',
                  },
                });
                resourceExtras[RESOURCE_DIVERGENCE_LOGGED_KEY] = new Date(nowMs).toISOString();
              } catch { /* audit log is best-effort */ }
            }
          }

          if (enforce && hasCorrections) {
            // Persisted client view converges now; the ledger rows written
            // after the upsert carry the same deltas to the client.
            reconciledResources = applyResourceDeltas(reconciledResources, corrections);
            correctionDeltas = corrections;
          }

          serverInventoryInfo = {
            mode: resourceClampMode,
            adopted: false,
            capped: adv.capped.slice(0, 35),
            divergence: divergence.slice(0, 35),
            corrections,
            corrected: enforce && hasCorrections,
            craft: { accepted: craft.accepted, rejected: craft.rejected.slice(0, 20) },
            build: { accepted: build.accepted, rejected: build.rejected.slice(0, 20) },
          };
        }
      } catch (serverInvError) {
        // Best-effort; never block the sync. The map is left untouched.
        logger.error('Server-owned inventory advance failed', { error: String(serverInvError) });
        serverResourcesToPersist = undefined;
        foldRowIds = [];
        foldAllUpToSeq = null;
        correctionDeltas = {};
        craftAccepted = {};
        buildAccepted = {};
        serverInventoryInfo = null;
      }
    } else if (resourceClampMode !== 'off' && firstSyncKit) {
      // C-1: server truth for a new profile IS the kit. Adopting here means
      // the phase-2 "adopt the client view once the marker predates the
      // sync" path never runs for this profile.
      const adopted: Record<string, number> = {};
      for (const [k, v] of Object.entries(firstSyncKit.resources)) {
        if (typeof v === 'number' && Number.isFinite(v) && v > 0) adopted[k] = v;
      }
      serverResourcesToPersist = adopted;
      serverInventoryInfo = {
        mode: resourceClampMode, adopted: true, capped: [], divergence: [], corrections: {}, corrected: false,
        craft: { accepted: {}, rejected: [] }, build: { accepted: {}, rejected: [] },
      };
    }

    // Calculate net worth using live market prices (over reconciled holdings).
    // Wave E2 (§2.5 "one price truth"): the same single MarketResource read
    // also builds the band-clamped `marketSnapshot` delivered to the client
    // below — the spot price that now values delivery contracts, NPC
    // settlement, and mega-project contributions is the same live price shown
    // here in net worth.
    // M-8: value the AUTHORITATIVE inventory, never the raw client map — the
    // server map advanced this sync when phase 2 ran, else the stored server
    // map + unfolded ledger tail (loadAuthoritativeInventory), else (no
    // server map yet) the reconciled + clamped client view. Every term is
    // finite-guarded so no payload can push NaN / Infinity into netWorth.
    let valuationResources: Record<string, number> = reconciledResources;
    if (serverResourcesToPersist) {
      valuationResources = serverResourcesToPersist;
    } else if (existingProfile && resourceClampMode !== 'off') {
      try {
        const inv = await loadAuthoritativeInventory(existingProfile);
        if (inv.source === 'server') valuationResources = inv.resources;
      } catch { /* fall back to the clamped client view */ }
    }
    let resourceValue = 0;
    let marketSnapshot: { prices: Record<string, number>; base?: Record<string, number>; asOf: number } | null = null;
    try {
      const marketResources = await prisma.marketResource.findMany({
        select: { slug: true, currentPrice: true, basePrice: true, minPrice: true, maxPrice: true },
      });
      const priceMap = new Map(marketResources.map(r => [r.slug, r.currentPrice]));
      for (const [id, qty] of Object.entries(valuationResources)) {
        if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0) continue;
        const price = priceMap.get(id);
        const safePrice = typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : 50_000;
        resourceValue += qty * safePrice;
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
      for (const qty of Object.values(valuationResources)) {
        if (typeof qty === 'number' && Number.isFinite(qty) && qty > 0) resourceValue += qty * 50_000;
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
    //
    // ── Phase 3 slice 1: server-authoritative buildings ──────────────────
    // docs/SECURITY_AUDIT_2026-09.md "Phase 3 slice 1 — buildings". The
    // client's buildings[] is diffed against the profile's ServerAsset rows
    // (server-assets.ts header for the three ASSET_LEDGER_MODE levels):
    //   - ADOPTION (once, ratchet `_assetBaselineAt`): a save that predates
    //     the registry has its complete / pending / mothballed buildings
    //     inserted as rows (paidMoney 0, ledgerSeq null) this sync.
    //   - shadow: client buildings with no row → `client_asset_not_in_ledger`
    //     (warning, 1/hour/profile); persisted unchanged. Server rows the
    //     client no longer lists → `server_asset_not_in_client` (info).
    //   - enforce: those buildings are DROPPED from the persisted
    //     buildingsData (`client_asset_rejected`, critical) and returned as
    //     `assetLedger.rejectedInstanceIds` so the client removes them
    //     (asset-reconcile.ts). Nothing is refunded — never paid server-side.
    // Book value below reads the same merged view the other readers use.
    // ── Phase 3 slices 2-5 ("Phase 3 slices 2-5") ─────────────────────────
    // The same block now reconciles research (`completedResearch[]` vs
    // 'research' rows), ships (`ships[]` vs 'ship' rows), unlocked locations
    // (`unlockedLocations[]` vs STARTING ∪ ColonyClaim ∪ 'location' rows) and
    // services (the client's `activeServices[]` vs the set DERIVED from
    // complete buildings + complete research — never rows). Adoption of the
    // three new kinds ratchets on a second marker (`_assetBaselineAt2`) so a
    // profile slice 1 already stamped adopts them exactly once; ship
    // adoption is deferred (marker not stamped) until the client sends ship
    // instanceIds. Enforce drops unledgered research / ships / locations
    // (`rejectedResearchIds` / `rejectedShipIds` / `rejectedLocationIds`)
    // and persists the DERIVED service set + counts; shadow audits each gap
    // (same 1/hour/profile throttle) and persists the client's lists — the
    // research list as the UNION with complete rows, so a cron-appended
    // completion is never lost to a stale client list.
    const assetLedgerMode = getAssetLedgerMode();
    const assetExtras: Record<string, unknown> = {};
    type AssetLedgerInfo = {
      mode: AssetLedgerMode; adopted: boolean; adoptedCount: number;
      rejectedInstanceIds: string[]; rejectedResearchIds: string[]; rejectedShipIds: string[]; rejectedLocationIds: string[];
      notInLedger: number; unlistedServerRows: number;
      services: { derived: number; client: number; missingFromClient: number; extraInClient: number; source: string } | null;
    };
    const emptyAdoptInfo = (count: number): AssetLedgerInfo => ({
      mode: assetLedgerMode, adopted: true, adoptedCount: count,
      rejectedInstanceIds: [], rejectedResearchIds: [], rejectedShipIds: [], rejectedLocationIds: [],
      notInLedger: 0, unlistedServerRows: 0, services: null,
    });
    let assetLedgerInfo: AssetLedgerInfo | null = null;
    let buildingsToPersist = economics.buildings;
    let bookBuildings: Array<{ definitionId: string; isComplete: boolean; markLevel?: number }> = economics.buildings;
    let researchToPersist: string[] = economics.completedResearch;
    let shipsToPersist: SyncShip[] = economics.ships;
    let servicesToPersist: SyncService[] = economics.activeServices;
    let locationsToPersist: string[] = economics.unlockedLocations;
    let bookShips: Array<{ definitionId: string; isBuilt: boolean }> = economics.ships;
    let enforcedCounts: { researchCount: number; serviceCount: number; locationsUnlocked: number } | null = null;
    let adoptKitAfterCreate = false;
    if (assetLedgerMode !== 'off' && existingProfile) {
      try {
        const nowMs = Date.now();
        const baseline = readAssetBaseline(existingProfile.workforceData);
        const baseline2 = readAssetBaseline2(existingProfile.workforceData);
        const loggedAt = readAssetAuditLoggedAt(existingProfile.workforceData);
        if (loggedAt) assetExtras[ASSET_AUDIT_LOGGED_KEY] = loggedAt;
        let adoptedCount = 0;
        let adoptedAny = false;
        if (!baseline) {
          // Adoption: the validated list, enriched with the raw body's
          // wall-clock timing (sync-validation drops startedAtMs /
          // realDurationSeconds) so pending builds keep their completion time.
          const rawTiming = new Map<string, { startedAtMs?: number; realDurationSeconds?: number }>();
          const rawBuildings = (body as Record<string, unknown>).buildings;
          if (Array.isArray(rawBuildings)) {
            for (const rb of rawBuildings.slice(0, SYNC_MAX_BUILDINGS)) {
              if (!rb || typeof rb !== 'object') continue;
              const r = rb as Record<string, unknown>;
              if (typeof r.instanceId !== 'string') continue;
              rawTiming.set(r.instanceId, {
                startedAtMs: typeof r.startedAtMs === 'number' && Number.isFinite(r.startedAtMs) ? r.startedAtMs : undefined,
                realDurationSeconds: typeof r.realDurationSeconds === 'number' && Number.isFinite(r.realDurationSeconds) ? r.realDurationSeconds : undefined,
              });
            }
          }
          const adoptable = economics.buildings.map(b => ({ ...b, ...(b.instanceId ? rawTiming.get(b.instanceId) : {}) }));
          const rows = buildAdoptionRows(existingProfile.id, adoptable, nowMs);
          // Always issued (even for zero rows): it doubles as the availability
          // probe, so the marker is never stamped while the table is missing.
          await prisma.serverAsset.createMany({ data: rows, skipDuplicates: true });
          assetExtras[ASSET_BASELINE_KEY] = new Date(nowMs).toISOString();
          adoptedCount += rows.length;
          adoptedAny = true;
          logger.info('Asset registry: client buildings adopted', { profileId: existingProfile.id, count: rows.length, mode: assetLedgerMode });
        } else {
          assetExtras[ASSET_BASELINE_KEY] = baseline;
        }
        if (!baseline2) {
          // Slices 2-5 adoption: research / ships / unlocked locations. The
          // validated ship list drops the wall-clock build timing — enrich
          // it from the raw body like the buildings above. Ships need
          // instanceIds (the slice 3 payload): a pre-slice client sends
          // none, so ship adoption is DEFERRED (marker not stamped) until
          // it does — otherwise enforce would strike a real fleet.
          const rawShipTiming = new Map<string, { buildStartedAtMs?: number; buildDurationSeconds?: number }>();
          const rawShips = (body as Record<string, unknown>).ships;
          if (Array.isArray(rawShips)) {
            for (const rs of rawShips.slice(0, SYNC_MAX_SHIPS)) {
              if (!rs || typeof rs !== 'object') continue;
              const r = rs as Record<string, unknown>;
              if (typeof r.instanceId !== 'string') continue;
              rawShipTiming.set(r.instanceId, {
                buildStartedAtMs: typeof r.buildStartedAtMs === 'number' && Number.isFinite(r.buildStartedAtMs) ? r.buildStartedAtMs : undefined,
                buildDurationSeconds: typeof r.buildDurationSeconds === 'number' && Number.isFinite(r.buildDurationSeconds) ? r.buildDurationSeconds : undefined,
              });
            }
          }
          const shipsOk = shipsAdoptable(economics.ships);
          const adoptableShips = economics.ships.map(sh => ({ ...sh, ...(sh.instanceId ? rawShipTiming.get(sh.instanceId) : {}) }));
          const rows2 = buildAdoptionRows2(existingProfile.id, {
            completedResearch: economics.completedResearch,
            ships: shipsOk ? adoptableShips : [],
            unlockedLocations: economics.unlockedLocations,
          }, nowMs);
          await prisma.serverAsset.createMany({ data: rows2, skipDuplicates: true });
          if (shipsOk) assetExtras[ASSET_BASELINE2_KEY] = new Date(nowMs).toISOString();
          adoptedCount += rows2.length;
          adoptedAny = true;
          logger.info('Asset registry: client research / ships / locations adopted', {
            profileId: existingProfile.id, count: rows2.length, mode: assetLedgerMode, shipsDeferred: !shipsOk,
          });
        } else {
          assetExtras[ASSET_BASELINE2_KEY] = baseline2;
        }
        if (adoptedAny) {
          assetLedgerInfo = emptyAdoptInfo(adoptedCount);
        } else {
          await completeDueAssets(prisma, existingProfile.id, new Date(nowMs));
          const registry = await loadServerRegistry(existingProfile.id, {
            buildingsData: economics.buildings,
            shipsData: economics.ships,
            activeServicesData: economics.activeServices,
            completedResearchList: economics.completedResearch,
            unlockedLocationsList: economics.unlockedLocations,
            workforceData: existingProfile.workforceData,
          }, { mode: assetLedgerMode, now: nowMs });
          const rows = registry.rows;
          const diff = diffClientAssets(economics.buildings, rows);
          const diff2 = diffClientAssets2(
            { completedResearch: economics.completedResearch, ships: economics.ships, unlockedLocations: economics.unlockedLocations },
            rows, registry.colonyClaimLocationIds, nowMs,
          );
          const svc = registry.services;
          const enforce = assetLedgerMode === 'enforce';
          const notInLedger2 = diff2.researchNotInLedger.length + diff2.shipsNotInLedger.length + diff2.locationsNotInLedger.length;
          const unlisted2 = diff2.serverResearchNotInClient.length + diff2.serverShipsNotInClient.length + diff2.serverLocationsNotInClient.length;
          const servicesDiverge = svc.missingFromClient > 0 || svc.extraInClient > 0;
          if (diff.clientNotInLedger.length > 0 || diff.serverNotInClient.length > 0 || notInLedger2 > 0 || unlisted2 > 0 || servicesDiverge) {
            const throttled = !!loggedAt && nowMs - Date.parse(loggedAt) < ASSET_AUDIT_THROTTLE_MS;
            if (!throttled) {
              assetExtras[ASSET_AUDIT_LOGGED_KEY] = new Date(nowMs).toISOString();
              if (diff.clientNotInLedger.length > 0) {
                logger.warn(
                  enforce ? 'Client buildings with no registry row — rejected' : 'Client buildings with no registry row — shadow (persisted)',
                  { profileId: existingProfile.id, count: diff.clientNotInLedger.length, instanceIds: diff.clientNotInLedger.slice(0, 20) },
                );
                await auditAsset(prisma, {
                  eventType: enforce ? 'client_asset_rejected' : 'client_asset_not_in_ledger',
                  profileId: existingProfile.id,
                  severity: enforce ? 'critical' : 'warning',
                  details: { mode: assetLedgerMode, count: diff.clientNotInLedger.length, instanceIds: diff.clientNotInLedger.slice(0, 50) },
                });
              }
              if (diff.serverNotInClient.length > 0) {
                await auditAsset(prisma, {
                  eventType: 'server_asset_not_in_client',
                  profileId: existingProfile.id,
                  severity: 'info',
                  details: { mode: assetLedgerMode, count: diff.serverNotInClient.length, instanceIds: diff.serverNotInClient.slice(0, 50) },
                });
              }
              // Slices 2-5: one row per kind with a gap, same event types.
              const gaps2: Array<[string, string[]]> = [
                ['research', diff2.researchNotInLedger], ['ship', diff2.shipsNotInLedger], ['location', diff2.locationsNotInLedger],
              ];
              for (const [kind, ids] of gaps2) {
                if (ids.length === 0) continue;
                logger.warn(
                  enforce ? `Client ${kind} assets with no registry row — rejected` : `Client ${kind} assets with no registry row — shadow (persisted)`,
                  { profileId: existingProfile.id, count: ids.length, ids: ids.slice(0, 20) },
                );
                await auditAsset(prisma, {
                  eventType: enforce ? 'client_asset_rejected' : 'client_asset_not_in_ledger',
                  profileId: existingProfile.id,
                  severity: enforce ? 'critical' : 'warning',
                  details: { mode: assetLedgerMode, kind, count: ids.length, ids: ids.slice(0, 50) },
                });
              }
              if (unlisted2 > 0) {
                await auditAsset(prisma, {
                  eventType: 'server_asset_not_in_client',
                  profileId: existingProfile.id,
                  severity: 'info',
                  details: {
                    mode: assetLedgerMode, count: unlisted2,
                    research: diff2.serverResearchNotInClient.slice(0, 50), ships: diff2.serverShipsNotInClient.slice(0, 50), locations: diff2.serverLocationsNotInClient.slice(0, 50),
                  },
                });
              }
              if (servicesDiverge) {
                await auditAsset(prisma, {
                  eventType: 'client_services_divergent',
                  profileId: existingProfile.id,
                  severity: 'warning',
                  details: { mode: assetLedgerMode, derived: svc.derived.length, client: economics.activeServices.length, missingFromClient: svc.missingFromClient, extraInClient: svc.extraInClient },
                });
              }
            }
          }
          const rejected = enforce ? diff.clientNotInLedger.filter(id => id !== '?') : [];
          const rejectedResearch = enforce ? diff2.researchNotInLedger : [];
          const rejectedShips = enforce ? diff2.shipsNotInLedger.filter(id => id !== '?') : [];
          const rejectedLocations = enforce ? diff2.locationsNotInLedger : [];
          if (enforce) {
            if (diff.clientNotInLedger.length > 0) {
              const rejectedSet = new Set(diff.clientNotInLedger);
              buildingsToPersist = economics.buildings.filter(b => !!b.instanceId && !rejectedSet.has(b.instanceId));
            }
            if (diff2.researchNotInLedger.length > 0) {
              const set = new Set(diff2.researchNotInLedger);
              researchToPersist = economics.completedResearch.filter(id => !set.has(id));
            }
            if (diff2.shipsNotInLedger.length > 0) {
              const set = new Set(diff2.shipsNotInLedger);
              shipsToPersist = economics.ships.filter(sh => !!sh.instanceId && !set.has(sh.instanceId));
            }
            if (diff2.locationsNotInLedger.length > 0) {
              const set = new Set(diff2.locationsNotInLedger);
              locationsToPersist = economics.unlockedLocations.filter(l => !set.has(l));
            }
            // Slice 4: the persisted service set IS the derived set in enforce.
            servicesToPersist = svc.derived.map(d => ({ definitionId: d.definitionId, locationId: d.locationId, linkedBuildingIds: d.linkedBuildingIds }));
            enforcedCounts = {
              researchCount: researchToPersist.length,
              serviceCount: servicesToPersist.length,
              locationsUnlocked: registry.locations.unlocked.length,
            };
          } else {
            // Shadow: the persisted research list is the union with the
            // complete rows (a cron-appended completion survives a stale
            // client list); everything else is persisted as sent.
            researchToPersist = registry.research.completed;
          }
          bookBuildings = mergeServerBuildings(rows, buildingsToPersist, assetLedgerMode, nowMs).buildings;
          bookShips = mergeServerShips(rows, shipsToPersist, assetLedgerMode, nowMs).ships;
          assetLedgerInfo = {
            mode: assetLedgerMode, adopted: false, adoptedCount: 0,
            rejectedInstanceIds: rejected, rejectedResearchIds: rejectedResearch, rejectedShipIds: rejectedShips, rejectedLocationIds: rejectedLocations,
            notInLedger: diff.clientNotInLedger.length + notInLedger2,
            unlistedServerRows: diff.serverNotInClient.length + unlisted2,
            services: { derived: svc.derived.length, client: economics.activeServices.length, missingFromClient: svc.missingFromClient, extraInClient: svc.extraInClient, source: svc.source },
          };
        }
      } catch (assetError) {
        // Registry is best-effort (table may lag deploy); never block the sync.
        logger.error('Asset registry reconciliation failed', { error: String(assetError) });
      }
    } else if (assetLedgerMode !== 'off' && firstSyncKit) {
      // C-1: a brand-new profile's kit buildings / research / ships /
      // locations become its registry rows right after the row is created
      // (below), baselined (both markers) in this request.
      const kitIso = new Date().toISOString();
      assetExtras[ASSET_BASELINE_KEY] = kitIso;
      assetExtras[ASSET_BASELINE2_KEY] = kitIso;
      adoptKitAfterCreate = true;
    }

    let assetBookValue = 0;
    for (const b of bookBuildings) {
      if (!b.isComplete) continue;
      const def = BUILDING_MAP.get(b.definitionId);
      if (def && Number.isFinite(def.baseCost)) assetBookValue += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
      // D4: Mark refit capex is booked like the base build (mark-upgrades.ts
      // markSpendToDate at the validated 1..3 markLevel) — same line as
      // frontier.ts computeBookNetWorth.
      assetBookValue += markBookValue(b, BOOK_VALUE_DEPRECIATION_FACTOR);
    }
    // Slice 3: ships book through the registry view (isBuilt is server-owned
    // there — union in shadow, server rows the client still lists in enforce).
    for (const sh of bookShips) {
      if (!sh.isBuilt) continue;
      const def = SHIP_MAP.get(sh.definitionId);
      if (def && Number.isFinite(def.baseCost)) assetBookValue += def.baseCost * BOOK_VALUE_DEPRECIATION_FACTOR;
    }
    const netWorthRaw = reconciledMoney + resourceValue + assetBookValue;
    const netWorth = Number.isFinite(netWorthRaw) ? Math.round(netWorthRaw) : Math.round(reconciledMoney);
    const { totalEarned, totalSpent, buildingCount, gameYear } = economics;
    // Slices 2/4/5: in enforce the scalar counts corporation-tiers.ts
    // tierFromProfileScalars (daily bonus) and the contract `services_count`
    // check read are derived from the registry, not the client's counters.
    const researchCount = enforcedCounts ? enforcedCounts.researchCount : economics.researchCount;
    const serviceCount = enforcedCounts ? enforcedCounts.serviceCount : economics.serviceCount;
    const locationsUnlocked = enforcedCounts ? enforcedCounts.locationsUnlocked : economics.locationsUnlocked;

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

    // Validated (C-5) arrays for storage — or the first-sync kit (C-1).
    // Phase 3 slice 1: in enforce mode this is the client list MINUS the
    // buildings the registry never sold it (see the asset block above).
    // Phase 3 slices 2-5: research / ships / locations minus what enforce
    // rejected (research = the union with complete rows in shadow);
    // services = the derived set in enforce.
    const safeBuildings = buildingsToPersist;
    const safeServices = servicesToPersist;
    const safeLocations = locationsToPersist;
    const safeResearch = researchToPersist;
    const safeShips = shipsToPersist;

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

    // Carry the resource-plausibility stash (`_resourceBaselineAt`,
    // `_resourceCeilings`) forward on every sync — the client never echoes
    // these keys back, it only sends its own workforce object.
    // Phase 3 slice 1: + the asset registry stash (`_assetBaselineAt`,
    // `_assetAuditLoggedAt`) — same ratchet, same stripStashKeys protection.
    const stashExtras = { ...resourceExtras, ...assetExtras };
    const workforceDataToPersist = Object.keys(stashExtras).length > 0
      ? { ...((workforceData && typeof workforceData === 'object') ? (workforceData as Record<string, unknown>) : {}), ...stashExtras }
      : workforceData;

    // C-1: a read that found no row must not race a row that exists (a
    // transient read failure would otherwise overwrite a real profile with
    // the starter kit). New profiles are CREATED, never upserted.
    if (!existingProfile && existedBefore) {
      throw new Error('Profile read inconsistency: row exists but was not loaded');
    }

    const profileColumns = {
      companyName: safeCompanyName,
      money: reconciledMoney, totalEarned, totalSpent, netWorth,
      buildingCount, researchCount, serviceCount, locationsUnlocked, gameYear,
      resources: reconciledResources as object,
      buildingsData: safeBuildings as unknown as object,
      activeServicesData: safeServices as unknown as object,
      unlockedLocationsList: safeLocations,
      completedResearchList: safeResearch,
      shipsData: safeShips as unknown as object,
      workforceData: workforceDataToPersist as object,
      lastSyncAt: new Date(),
    };

    const profile = existingProfile
      ? await prisma.gameProfile.upsert({
          where: { userId: session.user.id },
          create: { userId: session.user.id, ...profileColumns },
          update: {
            ...profileColumns,
            // Phase 2: undefined = leave the server-owned map untouched.
            serverResources: serverResourcesToPersist as object | undefined,
          },
        })
      : await prisma.gameProfile.create({
          data: {
            userId: session.user.id,
            ...profileColumns,
            // C-1: server truth for a new profile is the kit (or {}); it is
            // never adopted from the client view.
            serverResources: (serverResourcesToPersist ?? {}) as object,
          },
        });

    // Phase 3 slice 1 (C-1): the starter kit's buildings are this new
    // profile's first registry rows — baselined in the same request, so the
    // next sync is already diffed against server rows.
    if (adoptKitAfterCreate && firstSyncKit) {
      try {
        const rows = [
          ...buildAdoptionRows(profile.id, firstSyncKit.buildings, Date.now()),
          ...buildAdoptionRows2(profile.id, {
            completedResearch: firstSyncKit.completedResearch, ships: firstSyncKit.ships, unlockedLocations: firstSyncKit.unlockedLocations,
          }, Date.now()),
        ];
        await prisma.serverAsset.createMany({ data: rows, skipDuplicates: true });
        assetLedgerInfo = emptyAdoptInfo(rows.length);
      } catch (kitAssetError) {
        logger.error('Asset registry: first-sync kit adoption failed', { error: String(kitAssetError) });
      }
    }

    // Phase 2 follow-through (best-effort, after the row is written): stamp
    // the folded ledger rows, then write the sync-authored rows — corrections
    // (returned to the client as pending deltas) and the capped craft / build
    // attestations (audit trail only; stamped folded + applied at birth).
    if (serverInventoryInfo && existingProfile) {
      try {
        const foldedAt = new Date();
        if (foldAllUpToSeq !== null) {
          await prisma.gameLedgerEntry.updateMany({
            where: { profileId: existingProfile.id, foldedAt: null, seq: { lte: foldAllUpToSeq } },
            data: { foldedAt },
          });
        }
        if (foldRowIds.length > 0) {
          await prisma.gameLedgerEntry.updateMany({
            where: { id: { in: foldRowIds } },
            data: { foldedAt },
          });
        }
        for (const [slug, delta] of Object.entries(correctionDeltas)) {
          if (!(delta < 0)) continue; // never upward
          const row = await recordSyncAuthoredLedger(prisma, {
            profileId: existingProfile.id, resourceSlug: slug, resourceDelta: delta,
            reason: SERVER_RESOURCE_CORRECTION_REASON, refId: 'sync',
          });
          if (row && ledgerInfo) {
            const entry: LedgerEntryLite = {
              seq: row.seq, moneyDelta: 0, resourceSlug: slug, resourceDelta: delta,
              reason: SERVER_RESOURCE_CORRECTION_REASON, refId: 'sync',
            };
            ledgerInfo.entries = [...ledgerInfo.entries, entry].slice(-25);
            ledgerInfo.resourceDeltas = {
              ...ledgerInfo.resourceDeltas,
              [slug]: (ledgerInfo.resourceDeltas[slug] || 0) + delta,
            };
            ledgerInfo.maxSeq = Math.max(ledgerInfo.maxSeq, row.seq);
          }
        }
        for (const [slug, qty] of Object.entries(craftAccepted)) {
          if (!(qty > 0)) continue;
          await recordSyncAuthoredLedger(prisma, {
            profileId: existingProfile.id, resourceSlug: slug, resourceDelta: qty,
            reason: 'client_craft_output', refId: 'sync',
          });
        }
        for (const [slug, qty] of Object.entries(buildAccepted)) {
          if (!(qty > 0)) continue;
          await recordSyncAuthoredLedger(prisma, {
            profileId: existingProfile.id, resourceSlug: slug, resourceDelta: -qty,
            reason: 'client_build_spend', refId: 'sync',
          });
        }
      } catch (foldError) {
        logger.error('Server-owned inventory ledger follow-through failed', { error: String(foldError) });
      }
    }

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
        select: { id: true, activeServicesData: true, buildingsData: true, completedResearchList: true, workforceData: true },
        where: { lastSyncAt: { gt: new Date(Date.now() - 7 * 24 * 3600_000) } }, // Active in last 7 days
      });
      // Phase 3 slice 4: the tax base reads the registry's service projection
      // (derived from complete buildings + research; union in shadow).
      const registryServices = await loadServerServicesForProfiles(allProfiles);
      for (const p of allProfiles) {
        const services = registryServices.get(p.id)?.services ?? [];
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

    // ── GAME_DESIGN_REVIEW_2026-09 row 14: settled rivalry-stake wins for
    // this profile (last 28 days). The client folds them into reputation
    // idempotently by activity id (server-effects.applyRivalryStakesToState).
    let rivalryStakes: RivalryStakeResult[] | null = null;
    try {
      const wins = await prisma.playerActivity.findMany({
        where: {
          profileId: profile.id,
          type: RIVALRY_WIN_ACTIVITY,
          createdAt: { gt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, metadata: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 24,
      });
      if (wins.length > 0) {
        rivalryStakes = wins.map((w) => {
          const m = (w.metadata as Record<string, unknown> | null) || {};
          return {
            id: w.id,
            weekId: typeof m.weekId === 'number' ? m.weekId : 0,
            opponent: typeof m.opponent === 'string' ? m.opponent : 'a rival',
            rep: typeof m.rep === 'number' ? m.rep : 0,
            atMs: w.createdAt.getTime(),
          };
        });
      }
    } catch { /* rivalry stakes non-critical (schema lag) */ }

    // ── Diplomacy (2026-09-02): directed contract offers / milestones due /
    // pact proposals (Situation Log) + the server-side reputation deltas
    // the client folds in idempotently (server-effects.applyDiplomacyRepToState).
    let diplomacy: import('@/lib/game/corp-diplomacy').DiplomacySnapshot | null = null;
    let diplomacyRep: import('@/lib/game/corp-diplomacy').DiplomacyRepEvent[] | null = null;
    try {
      const { buildDiplomacySnapshot, readRecentRepEvents } = await import('@/lib/game/corp-contracts-server');
      [diplomacy, diplomacyRep] = await Promise.all([
        buildDiplomacySnapshot(profile.id),
        readRecentRepEvents(profile.id),
      ]);
    } catch { /* diplomacy snapshot non-critical (schema may lag deploy) */ }

    // ── GAME_DESIGN_REVIEW_2026-09 row 11: NPC density governor — the same
    // 30-day-active count the demand-pool cron uses. Absent on failure →
    // the client ticks every NPC (pre-governor behaviour).
    let npcGovernor: ReturnType<typeof buildNpcGovernorSnapshot> | null = null;
    try {
      const active30d = await prisma.gameProfile.count({
        where: { lastSyncAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      });
      npcGovernor = buildNpcGovernorSnapshot(active30d);
    } catch { /* governor non-critical */ }

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
      // C-1: the first sync of a profile persists the server kit, not the
      // body — the client is told so it can reconcile against the server
      // figures if it wants to.
      firstSync: !!firstSyncKit,
      startingArchetype: firstSyncKit ? firstSyncKit.archetypeId : undefined,
      netWorth,
      // One Wallet: reconciled balance + pending deltas for client adoption.
      reconciledMoney,
      ledger: ledgerInfo,
      resourceClamp: resourceClampInfo,
      // Phase 3 slice 1: building-registry reconciliation (mode, adoption,
      // and — in enforce — the instanceIds the client must remove).
      assetLedger: assetLedgerInfo,
      // Phase 2: server-owned inventory telemetry (adoption, capped growth,
      // divergence, corrections, attestation caps). Additive field.
      serverInventory: serverInventoryInfo,
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
      // Diplomacy (2026-09-02): additive fields; older clients ignore them.
      diplomacy,
      diplomacyRep,
      rivals: rivalsSummary,
      // Row 14: settled rivalry-stake wins (additive; older clients ignore).
      rivalryStakes,
      // Row 11: NPC density governor (additive; older clients tick all NPCs).
      npcGovernor,
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
