/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  FACTIONS,
  FACTION_MAP,
  getFactionRep,
  getStanding,
  getEnvoyCost,
  shiftReputation,
  sendEnvoy,
  STANDING_LABEL,
  type FactionId,
} from '../factions';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 1_000_000_000_000, totalEarned: 1_000_000_000_000, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  };
}

describe('factions — roster', () => {
  it('exactly 6 factions defined', () => {
    expect(FACTIONS).toHaveLength(6);
  });

  it('all faction IDs unique', () => {
    const ids = new Set(FACTIONS.map(f => f.id));
    expect(ids.size).toBe(6);
  });

  it('each faction has a rival that is also in the roster', () => {
    for (const f of FACTIONS) {
      expect(FACTION_MAP.has(f.rivalId)).toBe(true);
    }
  });

  it('rival relationships are not self-referential', () => {
    for (const f of FACTIONS) {
      expect(f.rivalId).not.toBe(f.id);
    }
  });
});

describe('factions — standing thresholds', () => {
  it('rep 50+ is allied', () => {
    expect(getStanding(50)).toBe('allied');
    expect(getStanding(100)).toBe('allied');
  });
  it('rep 10-49 is friendly', () => {
    expect(getStanding(10)).toBe('friendly');
    expect(getStanding(49)).toBe('friendly');
  });
  it('rep -9 to 9 is neutral', () => {
    expect(getStanding(0)).toBe('neutral');
    expect(getStanding(9)).toBe('neutral');
    expect(getStanding(-9)).toBe('neutral');
  });
  it('rep -10 to -49 is unfriendly', () => {
    expect(getStanding(-10)).toBe('unfriendly');
    expect(getStanding(-49)).toBe('unfriendly');
  });
  it('rep -50 and below is hostile', () => {
    expect(getStanding(-50)).toBe('hostile');
    expect(getStanding(-100)).toBe('hostile');
  });

  it('STANDING_LABEL has all five entries', () => {
    expect(Object.keys(STANDING_LABEL)).toHaveLength(5);
  });
});

describe('factions — envoy cost escalation', () => {
  it('escalates at the documented thresholds', () => {
    expect(getEnvoyCost(0)).toBe(50_000_000);
    expect(getEnvoyCost(19)).toBe(50_000_000);
    expect(getEnvoyCost(20)).toBe(150_000_000);
    expect(getEnvoyCost(49)).toBe(150_000_000);
    expect(getEnvoyCost(50)).toBe(500_000_000);
    expect(getEnvoyCost(79)).toBe(500_000_000);
    expect(getEnvoyCost(80)).toBe(2_000_000_000);
  });
});

describe('factions — reputation shift with rival mechanic', () => {
  it('positive delta increments rep, decrements rival by half', () => {
    const s = baseState();
    const after = shiftReputation(s, 'the-dominion', 10);
    expect(after.factionReputation!['the-dominion']).toBe(10);
    // The Dominion's rival is Void Corsairs (from factions.ts)
    expect(after.factionReputation!['void-corsairs']).toBe(-5);
  });

  it('negative delta does NOT shift the rival', () => {
    const s = baseState();
    const after = shiftReputation(s, 'the-dominion', -10);
    expect(after.factionReputation!['the-dominion']).toBe(-10);
    expect(after.factionReputation!['void-corsairs']).toBeUndefined();
  });

  it('clamps at +100 and -100', () => {
    const s = baseState({ factionReputation: { 'the-dominion': 95 } });
    const after = shiftReputation(s, 'the-dominion', 20);
    expect(after.factionReputation!['the-dominion']).toBe(100);
  });

  it('stacks with existing reputation', () => {
    const s = baseState({ factionReputation: { 'the-dominion': 30 } });
    const after = shiftReputation(s, 'the-dominion', 15);
    expect(after.factionReputation!['the-dominion']).toBe(45);
  });

  it('getFactionRep returns 0 for factions never encountered', () => {
    expect(getFactionRep(baseState(), 'echo-remnants')).toBe(0);
  });
});

describe('factions — sendEnvoy', () => {
  it('deducts money and raises reputation by +10', () => {
    const s = baseState({ money: 1_000_000_000 });
    const after = sendEnvoy(s, 'the-dominion');
    expect(after.money).toBe(1_000_000_000 - 50_000_000);
    expect(after.totalSpent).toBe(50_000_000);
    expect(after.factionReputation!['the-dominion']).toBe(10);
  });

  it('is no-op when player cannot afford', () => {
    const s = baseState({ money: 100 });
    const after = sendEnvoy(s, 'the-dominion');
    expect(after).toBe(s);
  });

  it('is no-op when rep already at 100', () => {
    const s = baseState({ money: 10_000_000_000, factionReputation: { 'the-dominion': 100 } });
    const after = sendEnvoy(s, 'the-dominion');
    expect(after).toBe(s);
  });

  it('chain of envoys raises rep cumulatively', () => {
    let s = baseState({ money: 1_000_000_000_000 });
    for (let i = 0; i < 4; i++) {
      s = sendEnvoy(s, 'echo-remnants');
    }
    expect(s.factionReputation!['echo-remnants']).toBe(40);
  });
});
