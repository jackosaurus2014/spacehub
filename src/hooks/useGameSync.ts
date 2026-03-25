'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '@/lib/game/types';

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
  onServerData?: (data: { servicePriceMultipliers?: Record<string, number>; globalMilestones?: Record<string, string> }) => void,
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
        setStatus({
          lastSyncAt: Date.now(),
          syncing: false,
          error: null,
          rank: data.rank || null,
          netWorth: data.netWorth || null,
        });
        // Pass server-side pricing and milestone data back to the game
        if (onServerData) {
          onServerData({
            servicePriceMultipliers: data.servicePriceMultipliers || undefined,
            globalMilestones: data.globalMilestones || undefined,
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
