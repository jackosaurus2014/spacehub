// Wave V8 (docs/VISUAL_DEPTH_2026-08.md §V8) — density-mode persistence.
// Pure-helper coverage for the comfortable/compact toggle: default,
// localStorage round-trip, invalid-value fallback, and toggle direction.

import {
  getGameDensity,
  setGameDensity,
  toggleGameDensity,
  __resetGameDensityCacheForTests,
  type GameDensity,
} from '../density';

const STORAGE_KEY = 'spacetycoon_density';

describe('density.ts', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetGameDensityCacheForTests();
  });

  it('defaults to comfortable when nothing is stored', () => {
    expect(getGameDensity()).toBe('comfortable');
  });

  it('resolves a previously stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'compact');
    __resetGameDensityCacheForTests();
    expect(getGameDensity()).toBe('compact');
  });

  it('falls back to comfortable on a corrupt/unknown stored value', () => {
    localStorage.setItem(STORAGE_KEY, 'ultra-dense-nonsense');
    __resetGameDensityCacheForTests();
    expect(getGameDensity()).toBe('comfortable');
  });

  it('setGameDensity persists to localStorage and updates the in-memory cache', () => {
    setGameDensity('compact');
    expect(getGameDensity()).toBe('compact');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('compact');

    setGameDensity('comfortable');
    expect(getGameDensity()).toBe('comfortable');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('comfortable');
  });

  it('toggleGameDensity flips comfortable <-> compact and returns the new value', () => {
    expect(getGameDensity()).toBe('comfortable');
    const first = toggleGameDensity();
    expect(first).toBe('compact');
    expect(getGameDensity()).toBe('compact');

    const second = toggleGameDensity();
    expect(second).toBe('comfortable');
    expect(getGameDensity()).toBe('comfortable');
  });

  it('only ever resolves to one of the two valid density values', () => {
    const values: GameDensity[] = ['comfortable', 'compact', 'comfortable'];
    for (const v of values) {
      setGameDensity(v);
      expect(['comfortable', 'compact']).toContain(getGameDensity());
    }
  });
});
