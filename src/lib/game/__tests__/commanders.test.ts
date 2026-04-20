/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  COMMANDER_DEFS,
  COMMANDER_MAP,
  RARITY_HIRE_COST,
  RARITY_MAGNITUDE,
  getPortraitUrl,
  getFullbodyUrl,
  getHireCap,
  computeCommanderBonuses,
  rollRecruitmentPool,
  ensureFreshPool,
  canHire,
  hireCommander,
  dismissCommander,
  getClassBonusText,
} from '../commanders';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1,
    createdAt: 0,
    lastTickAt: 0,
    money: 1_000_000_000_000,  // $1T default so most hires are affordable
    totalEarned: 1_000_000_000_000,
    totalSpent: 0,
    gameDate: { year: 2150, month: 1 },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    corporationTier: 3,
    hiredCommanders: [],
    ...overrides,
  };
}

describe('commanders — roster shape', () => {
  it('exactly 60 commanders in the roster', () => {
    expect(COMMANDER_DEFS).toHaveLength(60);
  });

  it('exactly 10 legendary commanders with full-body art', () => {
    const legendaries = COMMANDER_DEFS.filter(c => c.rarity === 'legendary');
    expect(legendaries).toHaveLength(10);
    for (const l of legendaries) {
      expect(l.hasFullbody).toBe(true);
      expect(getFullbodyUrl(l)).toBeTruthy();
    }
  });

  it('non-legendaries never have full-body art', () => {
    for (const c of COMMANDER_DEFS) {
      if (c.rarity !== 'legendary') {
        expect(c.hasFullbody).toBe(false);
        expect(getFullbodyUrl(c)).toBeNull();
      }
    }
  });

  it('all commander IDs are unique', () => {
    const ids = new Set(COMMANDER_DEFS.map(c => c.id));
    expect(ids.size).toBe(COMMANDER_DEFS.length);
  });

  it('portrait URL maps to /game/commander-{id}.webp', () => {
    expect(getPortraitUrl(COMMANDER_DEFS[0])).toBe(`/game/commander-${COMMANDER_DEFS[0].id}.webp`);
  });

  it('rarity distribution matches design: 15 / 15 / 12 / 8 / 10', () => {
    const counts: Record<string, number> = {};
    for (const c of COMMANDER_DEFS) counts[c.rarity] = (counts[c.rarity] || 0) + 1;
    expect(counts.common).toBe(15);
    expect(counts.uncommon).toBe(15);
    expect(counts.rare).toBe(12);
    expect(counts.epic).toBe(8);
    expect(counts.legendary).toBe(10);
  });
});

describe('commanders — hire cap', () => {
  it('scales as 2 + corporationTier', () => {
    expect(getHireCap(baseState({ corporationTier: 1 }))).toBe(3);
    expect(getHireCap(baseState({ corporationTier: 3 }))).toBe(5);
    expect(getHireCap(baseState({ corporationTier: 7 }))).toBe(9);
  });

  it('defaults to tier 1 when corporationTier is missing', () => {
    const s = baseState();
    delete s.corporationTier;
    expect(getHireCap(s)).toBe(3);
  });
});

describe('commanders — canHire eligibility', () => {
  it('allows hire when all conditions met', () => {
    const s = baseState();
    const common = COMMANDER_DEFS.find(c => c.rarity === 'common')!;
    expect(canHire(s, common.id).ok).toBe(true);
  });

  it('rejects unknown commander IDs', () => {
    const result = canHire(baseState(), 'not-a-real-commander');
    expect(result.ok).toBe(false);
  });

  it('rejects already-hired commanders', () => {
    const common = COMMANDER_DEFS.find(c => c.rarity === 'common')!;
    const s = baseState({ hiredCommanders: [{ definitionId: common.id, hiredAtMs: 0 }] });
    const result = canHire(s, common.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already/i);
  });

  it('rejects when roster is at cap', () => {
    const commons = COMMANDER_DEFS.filter(c => c.rarity === 'common').slice(0, 5);
    const s = baseState({
      corporationTier: 3,  // cap = 5
      hiredCommanders: commons.map(c => ({ definitionId: c.id, hiredAtMs: 0 })),
    });
    const next = COMMANDER_DEFS.find(c => c.rarity === 'common' && !commons.includes(c))!;
    const result = canHire(s, next.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/cap/i);
  });

  it('rejects when player cannot afford hire cost', () => {
    const epic = COMMANDER_DEFS.find(c => c.rarity === 'epic')!;
    const s = baseState({ money: 100 });
    const result = canHire(s, epic.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/funds/i);
  });

  it('gates rare behind 2+ unlocked locations', () => {
    const rare = COMMANDER_DEFS.find(c => c.rarity === 'rare')!;
    const s = baseState({ unlockedLocations: ['earth_surface'] });
    const result = canHire(s, rare.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('gates epic behind 4+ unlocked locations', () => {
    const epic = COMMANDER_DEFS.find(c => c.rarity === 'epic')!;
    const s = baseState({ unlockedLocations: ['earth_surface', 'leo', 'geo'] });
    const result = canHire(s, epic.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/location/i);
  });

  it('gates legendary behind 5+ locations and $10B net worth', () => {
    const legendary = COMMANDER_DEFS.find(c => c.rarity === 'legendary')!;
    const sLowLocations = baseState({ unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit'] });
    expect(canHire(sLowLocations, legendary.id).ok).toBe(false);

    const sLowNetWorth = baseState({ money: 100_000_000, totalEarned: 100_000_000, totalSpent: 0 });
    expect(canHire(sLowNetWorth, legendary.id).ok).toBe(false);
  });
});

describe('commanders — hire / dismiss flow', () => {
  it('hire deducts the correct amount and adds the commander', () => {
    const common = COMMANDER_DEFS.find(c => c.rarity === 'common')!;
    const s = baseState({ money: 1_000_000_000 });
    const after = hireCommander(s, common.id, 12345);
    expect(after.money).toBe(1_000_000_000 - RARITY_HIRE_COST.common);
    expect(after.totalSpent).toBe(RARITY_HIRE_COST.common);
    expect(after.hiredCommanders).toHaveLength(1);
    expect(after.hiredCommanders![0].definitionId).toBe(common.id);
    expect(after.hiredCommanders![0].hiredAtMs).toBe(12345);
  });

  it('hire is no-op when ineligible', () => {
    const common = COMMANDER_DEFS.find(c => c.rarity === 'common')!;
    const s = baseState({ money: 0 });
    const after = hireCommander(s, common.id);
    expect(after).toBe(s);
  });

  it('dismiss removes the commander without refund', () => {
    const common = COMMANDER_DEFS.find(c => c.rarity === 'common')!;
    const s = baseState({
      money: 100,
      hiredCommanders: [{ definitionId: common.id, hiredAtMs: 0 }],
    });
    const after = dismissCommander(s, common.id);
    expect(after.hiredCommanders).toHaveLength(0);
    expect(after.money).toBe(100);  // no refund
  });
});

describe('commanders — bonus computation', () => {
  it('returns 1.0 multipliers for empty roster', () => {
    const b = computeCommanderBonuses([]);
    expect(b.revenueMultiplier).toBe(1);
    expect(b.buildSpeedMultiplier).toBe(1);
    expect(b.researchSpeedMultiplier).toBe(1);
    expect(b.miningMultiplier).toBe(1);
    expect(b.marketPriceMultiplier).toBe(1);
  });

  it('diplomat bonus goes to revenue', () => {
    const diplomat = COMMANDER_DEFS.find(c => c.class === 'diplomat')!;
    const b = computeCommanderBonuses([{ definitionId: diplomat.id, hiredAtMs: 0 }]);
    expect(b.revenueMultiplier).toBeCloseTo(1 + RARITY_MAGNITUDE[diplomat.rarity]);
    expect(b.buildSpeedMultiplier).toBe(1);
  });

  it('engineer bonus goes to build speed', () => {
    const engineer = COMMANDER_DEFS.find(c => c.class === 'engineer')!;
    const b = computeCommanderBonuses([{ definitionId: engineer.id, hiredAtMs: 0 }]);
    expect(b.buildSpeedMultiplier).toBeCloseTo(1 + RARITY_MAGNITUDE[engineer.rarity]);
  });

  it('multiple commanders stack additively', () => {
    const a = COMMANDER_DEFS.find(c => c.class === 'diplomat' && c.rarity === 'rare')!;
    const b = COMMANDER_DEFS.find(c => c.class === 'commander' && c.rarity === 'common')!;
    const bonuses = computeCommanderBonuses([
      { definitionId: a.id, hiredAtMs: 0 },
      { definitionId: b.id, hiredAtMs: 0 },
    ]);
    const expected = 1 + RARITY_MAGNITUDE.rare + RARITY_MAGNITUDE.common;
    expect(bonuses.revenueMultiplier).toBeCloseTo(expected);
  });

  it('magnate contributes to both revenue and market price', () => {
    const magnate = COMMANDER_DEFS.find(c => c.class === 'magnate')!;
    const b = computeCommanderBonuses([{ definitionId: magnate.id, hiredAtMs: 0 }]);
    const m = RARITY_MAGNITUDE[magnate.rarity];
    expect(b.revenueMultiplier).toBeCloseTo(1 + m);
    expect(b.marketPriceMultiplier).toBeCloseTo(1 + m);
  });

  it('ignores unknown commander IDs without throwing', () => {
    const b = computeCommanderBonuses([{ definitionId: 'ghost', hiredAtMs: 0 }]);
    expect(b.revenueMultiplier).toBe(1);
  });

  // ─── Wave 5 balance: diminishing-returns stacking in same class ──────
  it('same-class commanders stack with diminishing returns', () => {
    const sameClass = COMMANDER_DEFS.filter(c => c.class === 'commander');
    // Pick 2 legendaries of 'commander' class
    const legendaries = sameClass.filter(c => c.rarity === 'legendary').slice(0, 2);
    expect(legendaries.length).toBeGreaterThanOrEqual(2);
    const single = computeCommanderBonuses([{ definitionId: legendaries[0].id, hiredAtMs: 0 }]);
    const pair = computeCommanderBonuses([
      { definitionId: legendaries[0].id, hiredAtMs: 0 },
      { definitionId: legendaries[1].id, hiredAtMs: 0 },
    ]);
    const singleBonus = single.revenueMultiplier - 1;
    const pairBonus = pair.revenueMultiplier - 1;
    // Pair should be more than a single bonus, but less than 2× single
    expect(pairBonus).toBeGreaterThan(singleBonus);
    expect(pairBonus).toBeLessThan(singleBonus * 2);
    // Specifically the second should contribute 88% of the first
    expect(pairBonus).toBeCloseTo(singleBonus * (1 + 0.88), 2);
  });

  it('highest-rarity commander in a class gets the full bonus', () => {
    // If we hire a common + a legendary of the same class, the legendary
    // should be at position 0 (full) and common at position 1 (diminished).
    const commonCmdr = COMMANDER_DEFS.find(c => c.class === 'commander' && c.rarity === 'common')!;
    const legendCmdr = COMMANDER_DEFS.find(c => c.class === 'commander' && c.rarity === 'legendary')!;
    const b = computeCommanderBonuses([
      { definitionId: commonCmdr.id, hiredAtMs: 0 },
      { definitionId: legendCmdr.id, hiredAtMs: 0 },
    ]);
    // Legendary at full (0.20), common at 88% (0.02 × 0.88 = 0.0176)
    const expectedBonus = 0.20 + 0.02 * 0.88;
    expect(b.revenueMultiplier - 1).toBeCloseTo(expectedBonus, 3);
  });

  it('cross-class commanders stack independently (no diminishing returns)', () => {
    const diplomat = COMMANDER_DEFS.find(c => c.class === 'diplomat' && c.rarity === 'rare')!;
    const engineer = COMMANDER_DEFS.find(c => c.class === 'engineer' && c.rarity === 'uncommon')!;
    const b = computeCommanderBonuses([
      { definitionId: diplomat.id, hiredAtMs: 0 },
      { definitionId: engineer.id, hiredAtMs: 0 },
    ]);
    // Each is position 0 in its own class — full bonus each
    expect(b.revenueMultiplier).toBeCloseTo(1 + RARITY_MAGNITUDE.rare);
    expect(b.buildSpeedMultiplier).toBeCloseTo(1 + RARITY_MAGNITUDE.uncommon);
  });
});

describe('commanders — recruitment pool', () => {
  it('rollRecruitmentPool returns exactly 5 unique IDs', () => {
    const ids = rollRecruitmentPool(42);
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    for (const id of ids) {
      expect(COMMANDER_MAP.has(id)).toBe(true);
    }
  });

  it('same seed returns same pool (deterministic)', () => {
    const a = rollRecruitmentPool(12345);
    const b = rollRecruitmentPool(12345);
    expect(a).toEqual(b);
  });

  it('different seeds return different pools', () => {
    const a = rollRecruitmentPool(1);
    const b = rollRecruitmentPool(2);
    expect(a).not.toEqual(b);
  });

  it('ensureFreshPool returns existing pool if within window', () => {
    const now = 1_000_000;
    const POOL_REFRESH_MS = 8 * 60 * 60 * 1000;
    const s = baseState({
      commanderPool: { definitionIds: ['x', 'y'], refreshedAtMs: now - 1000 },
    });
    const result = ensureFreshPool(s, now);
    expect(result.definitionIds).toEqual(['x', 'y']);
    expect(result.refreshedAtMs).toBe(now - 1000);
  });

  it('ensureFreshPool rolls new pool when stale', () => {
    const now = 1_000_000;
    const POOL_REFRESH_MS = 8 * 60 * 60 * 1000;
    const s = baseState({
      commanderPool: { definitionIds: ['x', 'y'], refreshedAtMs: now - POOL_REFRESH_MS - 1 },
    });
    const result = ensureFreshPool(s, now);
    expect(result.definitionIds).toHaveLength(5);
    expect(result.refreshedAtMs).toBe(now);
  });
});

describe('commanders — class bonus text', () => {
  it('returns a percentage string for each class', () => {
    for (const cls of ['diplomat', 'engineer', 'scientist', 'logistician', 'magnate', 'commander'] as const) {
      const text = getClassBonusText(cls, 'rare');
      expect(text).toMatch(/\+\d+%/);
    }
  });

  it('magnitude matches rarity', () => {
    expect(getClassBonusText('diplomat', 'common')).toMatch(/\+2%/);
    expect(getClassBonusText('diplomat', 'legendary')).toMatch(/\+20%/);
  });
});
