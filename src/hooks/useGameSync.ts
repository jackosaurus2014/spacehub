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
 */
export function useGameSync(state: GameState | null, intervalMs: number = 60_000): SyncStatus {
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
