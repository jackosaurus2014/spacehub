/**
 * @jest-environment jsdom
 */

/**
 * Regression: the game never reached the server (2026-09-03).
 *
 * `useGameSync`'s scheduling effect depends on `doSync`. While `doSync` was a
 * `useCallback` over `state`, the engine's 2-second tick produced a new state
 * object, `doSync` was rebuilt, the effect's cleanup cleared its 5-second
 * initial timer and 60-second interval, and fresh timers started — so neither
 * deadline was ever reached. A signed-in player could play indefinitely and no
 * GameProfile was ever created; the save lived only in localStorage.
 *
 * These tests tick state faster than both deadlines and assert a sync still
 * happens, which fails if `doSync` regains a `state` dependency.
 */
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { useGameSync } from '@/hooks/useGameSync';
import type { GameState } from '@/lib/game/types';

jest.mock('@/lib/game/ledger-reconcile', () => ({
  queueServerReconciliation: jest.fn(),
  CLIENT_APPLIED_LEDGER_REASONS: new Set<string>(),
  PENDING_EXCLUDED_LEDGER_REASONS: new Set<string>(),
}));
jest.mock('@/lib/game/server-effects', () => ({ queueServerEffects: jest.fn() }));

function fakeState(money: number): GameState {
  return {
    money,
    totalEarned: money,
    totalSpent: 0,
    buildings: [],
    completedResearch: [],
    activeServices: [],
    unlockedLocations: ['earth_surface'],
    resources: {},
    gameDate: { year: 2081, month: 3 },
    ships: [],
    companyName: 'QA Corp',
  } as unknown as GameState;
}

describe('useGameSync scheduling survives the engine tick', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    })) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('fires the initial sync even while state changes every 2 seconds', async () => {
    let money = 1_000;
    const { rerender } = renderHook(({ s }: { s: GameState }) => useGameSync(s, 60_000), {
      initialProps: { s: fakeState(money) },
    });

    // Six 2-second ticks: past the 5s initial deadline, each one replacing state.
    for (let i = 0; i < 6; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2_000);
      });
      money += 10;
      rerender({ s: fakeState(money) });
    }
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    const calls = (global.fetch as jest.Mock).mock.calls.filter(c => String(c[0]).includes('/api/space-tycoon/sync'));
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps syncing on the interval across many ticks', async () => {
    let money = 1_000;
    const { rerender } = renderHook(({ s }: { s: GameState }) => useGameSync(s, 60_000), {
      initialProps: { s: fakeState(money) },
    });

    // ~3 minutes of 2-second ticks.
    for (let i = 0; i < 90; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2_000);
      });
      money += 10;
      rerender({ s: fakeState(money) });
    }

    const calls = (global.fetch as jest.Mock).mock.calls.filter(c => String(c[0]).includes('/api/space-tycoon/sync'));
    // Initial sync plus at least two interval syncs, minus the 30s self-guard.
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
