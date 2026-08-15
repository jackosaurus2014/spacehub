'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';
import { queueServerReconciliation, type LedgerReconciliation } from '@/lib/game/ledger-reconcile';
import {
  queueServerEffects,
  type AllianceBonusSnapshot,
  type ZoneStandingSnapshot,
  type IntelPerkSnapshot,
  type LeagueBoostSnapshot,
  type MentorshipBonusSnapshot,
} from '@/lib/game/server-effects';
import type { MarketSnapshot } from '@/lib/game/spot-price';
import { queueMarketFlowFlush } from '@/lib/game/market-pressure';
// Wave E3 (docs/ECONOMY_PVP_2026-08.md §E3): consumption demand telemetry +
// standing-order procurement requests ride the sync like the market flows —
// snapshot, send, flush-on-200 (amounts accrued mid-flight survive).
import { queueConsumptionFlush, PROCUREMENT_RESOURCE_CAP } from '@/lib/game/consumption';

interface SyncStatus {
  lastSyncAt: number | null;
  syncing: boolean;
  error: string | null;
  rank: number | null;
  netWorth: number | null;
}

/**
 * Hook that periodically syncs game state to the server for leaderboard ranking.
 * Fails gracefully if user is not logged in or API is unavailable.
 * Does not block or interfere with the game loop.
 *
 * @param state Current game state (null if no game loaded)
 * @param intervalMs Sync interval in milliseconds (default 60s)
 * @param onServerData Optional callback to receive server data (pricing, milestones, etc.)
 */
export function useGameSync(
  state: GameState | null,
  intervalMs: number = 60_000,
  onServerData?: (data: {
    servicePriceMultipliers?: Record<string, number>;
    globalMilestones?: Record<string, string>;
    /** One Wallet (audit A1): pending server-side deltas + new ack cursor. */
    ledger?: LedgerReconciliation;
    /** Server-reconciled money figure at sync time (informational). */
    reconciledMoney?: number;
    /** Audit Wave B (Change #6 / A2): server-aggregated alliance bonuses. */
    allianceBonuses?: AllianceBonusSnapshot | null;
    /** Audit Wave B (A7): per-zone governor/stakeholder standings. */
    zoneStandings?: ZoneStandingSnapshot[];
    /** Audit Wave B (A8): active espionage reward perks. */
    espionagePerks?: IntelPerkSnapshot[];
    /** Audit Wave B (§1b Leagues): last finalized league promotion boost. */
    leagueBoost?: LeagueBoostSnapshot | null;
    /** Live-Service Wave LS2 (§LS2 mechanic 3): mentor/mentee bonus. */
    mentorshipBonuses?: MentorshipBonusSnapshot | null;
    /** Wave E2 (§2.5 "one price truth"): band-clamped live spot snapshot. */
    marketSnapshot?: MarketSnapshot | null;
  }) => void,
): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncAt: null,
    syncing: false,
    error: null,
    rank: null,
    netWorth: null,
  });

  const lastSyncRef = useRef(0);
  const retryCount = useRef(0);

  const doSync = useCallback(async () => {
    if (!state) return;

    // Rate limit: don't sync more than once per 30 seconds
    if (Date.now() - lastSyncRef.current < 30_000) return;

    setStatus(prev => ({ ...prev, syncing: true, error: null }));

    try {
      // Audit Wave E (A5-i / §1d-5 "Mining never moves prices" + A5-iv NPC
      // pressure): snapshot the pending flows so we can flush exactly what
      // was transmitted after a 200 (amounts accrued mid-flight survive).
      const minedFlows = { ...(state.pendingMarketFlows?.mined || {}) };
      const npcFlows = { ...(state.pendingMarketFlows?.npc || {}) };
      // Wave E3: snapshot the consumption accumulators the same way.
      const demandFlows = { ...(state.consumptionState?.pendingDemandFlows || {}) };
      const procurement: Record<string, number> = {};
      for (const [res, qty] of Object.entries(state.consumptionState?.pendingProcurement || {})) {
        if (qty >= 1 && Object.keys(procurement).length < PROCUREMENT_RESOURCE_CAP) {
          procurement[res] = Math.floor(qty);
        }
      }

      const payload = {
        money: state.money,
        totalEarned: state.totalEarned,
        totalSpent: state.totalSpent,
        buildingCount: state.buildings.filter(b => b.isComplete).length,
        researchCount: state.completedResearch.length,
        serviceCount: state.activeServices.length,
        locationsUnlocked: state.unlockedLocations.length,
        resources: state.resources || {},
        gameYear: state.gameDate.year,
        gameMonth: state.gameDate.month,
        companyName: state.companyName || 'Untitled Aerospace',
        // Full state for multiplayer visibility
        buildings: state.buildings.map(b => ({
          definitionId: b.definitionId,
          locationId: b.locationId,
          isComplete: b.isComplete,
          upgradeLevel: b.upgradeLevel || 0,
        })),
        activeServices: state.activeServices.map(s => ({
          definitionId: s.definitionId,
          locationId: s.locationId,
        })),
        unlockedLocations: state.unlockedLocations,
        completedResearch: state.completedResearch,
        ships: (state.ships || []).map(s => ({
          definitionId: s.definitionId,
          status: s.status,
          currentLocation: s.currentLocation,
        })),
        workforce: state.workforce || null,
        // Audit Wave B (§1c commander marketPriceMultiplier): the hired
        // commander roster, so the server-side broker-fee reduction in
        // market/trade can recompute the Magnate bonus from definitions.
        // (Stored inside GameProfile.workforceData under `_commanders` —
        // no schema change; same client-claimed trust level as the rest
        // of the sync payload.)
        commanderIds: (state.hiredCommanders || []).map(c => c.definitionId).slice(0, 30),
        // One Wallet (audit A1): ack cursor — highest server ledger seq this
        // state has already applied. The server only reconciles/returns
        // entries beyond it (idempotent under retries).
        ledgerAck: state.serverLedgerAck ?? 0,
        // Audit Wave E (A5-i): "send minedThisTick in the sync payload (one
        // line…— server code already applies it)". Mining supply pressure
        // depresses the shared price at 1/3 trade impact.
        minedThisTick: minedFlows,
        // Audit Wave E (A5-iv): NPC trade flow — the formerly write-only
        // npcMarketPressure accumulator, now a real price input server-side.
        npcMarketFlows: npcFlows,
        // Wave E3 (§2.2): building-recipe consumption → background buy flow +
        // MarketResource.totalDemand (derived demand is what makes supply
        // chains PvP).
        consumedThisTick: demandFlows,
        // Wave E3 (§E3): market-policy shortfalls → server-side standing buy
        // orders on the shared book (source 'standing').
        procurementRequests: procurement,
      };

      const res = await fetch('/api/space-tycoon/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        lastSyncRef.current = Date.now();
        retryCount.current = 0;
        // Audit Wave E (A5-i/iv): the flows were delivered — queue the flush
        // so the engine subtracts exactly what was sent on the next tick.
        if (Object.keys(minedFlows).length > 0 || Object.keys(npcFlows).length > 0) {
          queueMarketFlowFlush({ mined: minedFlows, npc: npcFlows });
        }
        // Wave E3: the consumption payload was delivered — queue its flush so
        // the engine subtracts exactly what was sent on the next tick.
        if (Object.keys(demandFlows).length > 0 || Object.keys(procurement).length > 0) {
          queueConsumptionFlush({ demand: demandFlows, procurement });
        }
        setStatus({
          lastSyncAt: Date.now(),
          syncing: false,
          error: null,
          rank: data.rank || null,
          netWorth: data.netWorth || null,
        });
        // One Wallet (audit A1): queue pending server-side deltas for the
        // game engine to apply on the next tick (money + resources + ack
        // cursor move atomically inside processFullTick). The queue is
        // consumed at most once per reconciliation and the engine re-checks
        // the ack cursor, so a duplicate response cannot double-apply.
        if (data.ledger && typeof data.ledger.maxSeq === 'number') {
          const ack = state.serverLedgerAck ?? 0;
          if (data.ledger.maxSeq > ack) {
            queueServerReconciliation(data.ledger as LedgerReconciliation);
          }
        }

        // Audit Wave B (Change #6 / A2, A7, A8, league boosts): queue the
        // server-computed bonus snapshot for the engine to fold into
        // GameState on the next tick. Before this wave, sync received
        // `allianceBonuses` and dropped them on the floor — "the entire
        // alliance bonus pipeline is severed one hop before the player's
        // tick" (audit §4).
        if (data.allianceBonuses || data.zoneStandings || data.espionagePerks || data.leagueBoost || data.mentorshipBonuses) {
          queueServerEffects({
            allianceBonuses: data.allianceBonuses || null,
            zoneStandings: Array.isArray(data.zoneStandings) ? data.zoneStandings : undefined,
            espionagePerks: Array.isArray(data.espionagePerks) ? data.espionagePerks : undefined,
            leagueBoost: data.leagueBoost || null,
            mentorshipBonuses: data.mentorshipBonuses || null,
            fetchedAtMs: Date.now(),
          });
        }

        // Pass server-side pricing and milestone data back to the game
        if (onServerData) {
          onServerData({
            servicePriceMultipliers: data.servicePriceMultipliers || undefined,
            globalMilestones: data.globalMilestones || undefined,
            ledger: data.ledger || undefined,
            reconciledMoney: typeof data.reconciledMoney === 'number' ? data.reconciledMoney : undefined,
            allianceBonuses: data.allianceBonuses || undefined,
            zoneStandings: Array.isArray(data.zoneStandings) ? data.zoneStandings : undefined,
            espionagePerks: Array.isArray(data.espionagePerks) ? data.espionagePerks : undefined,
            leagueBoost: data.leagueBoost || undefined,
            mentorshipBonuses: data.mentorshipBonuses || undefined,
            marketSnapshot: data.marketSnapshot || undefined,
          });
        }

        // Report daily task metrics to corporation events (fire and forget)
        if (state.dailyMetrics) {
          fetch('/api/space-tycoon/alliance-events/daily-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics: state.dailyMetrics }),
          }).catch(() => { /* non-critical */ });
        }
      } else if (res.status === 401) {
        // Not logged in — silently skip, don't retry
        setStatus(prev => ({ ...prev, syncing: false, error: null }));
      } else {
        throw new Error(`Sync failed: ${res.status}`);
      }
    } catch (err) {
      retryCount.current++;
      setStatus(prev => ({
        ...prev,
        syncing: false,
        error: retryCount.current > 3 ? 'Sync unavailable' : null,
      }));
    }
  }, [state]);

  // Periodic sync
  useEffect(() => {
    if (!state) return;

    // Initial sync after a short delay
    const initialTimer = setTimeout(doSync, 5_000);

    // Periodic sync
    const interval = setInterval(doSync, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [doSync, intervalMs, !!state]);

  return status;
}
