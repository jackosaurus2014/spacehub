/**
 * @jest-environment node
 *
 * First-session funnel latches (2026-09-04). The GA4 call itself is a
 * one-liner over trackGA4Event; what can go wrong is the once-per-save
 * bookkeeping — double-firing on every render, never firing after a new
 * game, or crediting an archetype's starting buildings as the player's
 * first build. Those are what is pinned here.
 */
import {
  FUNNEL_LATCH_PREFIX,
  TYCOON_EVENTS,
  fireOnce,
  hasPlayerBuilt,
  startFunnelForNewGame,
  type LatchStore,
} from '../funnel-events';

function memStore(seed: Record<string, string> = {}): LatchStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
    keys: () => [...data.keys()],
  };
}

describe('fireOnce', () => {
  it('fires the first time and latches', () => {
    const store = memStore();
    const fire = jest.fn();
    expect(fireOnce('first_map', fire, store)).toBe(true);
    expect(fireOnce('first_map', fire, store)).toBe(false);
    expect(fireOnce('first_map', fire, store)).toBe(false);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(store.getItem(`${FUNNEL_LATCH_PREFIX}first_map`)).toBe('1');
  });

  it('keeps separate latches per key', () => {
    const store = memStore();
    const a = jest.fn(); const b = jest.fn();
    fireOnce('first_map', a, store);
    fireOnce('first_sync', b, store);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('fires every time rather than never when storage is unusable', () => {
    const fire = jest.fn();
    expect(fireOnce('first_map', fire, null)).toBe(true);
    expect(fireOnce('first_map', fire, null)).toBe(true);
    expect(fire).toHaveBeenCalledTimes(2);
  });
});

describe('a new game', () => {
  it('clears only funnel latches and records the founding building count', () => {
    const store = memStore({
      [`${FUNNEL_LATCH_PREFIX}first_map`]: '1',
      [`${FUNNEL_LATCH_PREFIX}first_sync`]: '1',
      spacetycoon_tutorial_step: '4', // someone else's key — must survive
    });
    startFunnelForNewGame(2, store);
    expect(store.getItem(`${FUNNEL_LATCH_PREFIX}first_map`)).toBeNull();
    expect(store.getItem(`${FUNNEL_LATCH_PREFIX}first_sync`)).toBeNull();
    expect(store.getItem('spacetycoon_tutorial_step')).toBe('4');
    expect(store.getItem(`${FUNNEL_LATCH_PREFIX}base_buildings`)).toBe('2');
    // and the latch can fire again for the new save
    const fire = jest.fn();
    expect(fireOnce('first_map', fire, store)).toBe(true);
  });
});

describe('hasPlayerBuilt', () => {
  it("does not credit an archetype's starting buildings", () => {
    const store = memStore();
    startFunnelForNewGame(3, store); // Tracking Consortium starts with 3
    expect(hasPlayerBuilt(3, store)).toBe(false);
    expect(hasPlayerBuilt(4, store)).toBe(true);
  });

  it('infers nothing for a save that predates the baseline', () => {
    const store = memStore();
    expect(hasPlayerBuilt(40, store)).toBe(false);
  });

  it('treats a corrupt baseline as no baseline', () => {
    const store = memStore({ [`${FUNNEL_LATCH_PREFIX}base_buildings`]: 'lots' });
    expect(hasPlayerBuilt(5, store)).toBe(false);
  });
});

describe('event names', () => {
  it('are namespaced so GA4 reports can filter on the prefix', () => {
    for (const name of Object.values(TYCOON_EVENTS)) expect(name.startsWith('tycoon_')).toBe(true);
    expect(new Set(Object.values(TYCOON_EVENTS)).size).toBe(Object.keys(TYCOON_EVENTS).length);
  });
});
