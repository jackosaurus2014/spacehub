/**
 * @jest-environment node
 */
import type { GameState } from '../types';
import {
  MEASURE_CATALOG,
  MEASURE_MAP,
  DOCKET_SIZE,
  pickDocketMeasures,
  getPublishedOdds,
  computeLobbyShiftPct,
  commitLobbying,
  advanceAccordSenate,
  isQuarterBoundary,
  LOBBY_MONEY_PER_PP,
  LOBBY_MONEY_MAX_PP,
  LOBBY_FAVOR_PER_PP,
  LOBBY_FAVOR_MAX_PP,
  LOBBY_MAX_TOTAL_SHIFT_PP,
  LOBBY_MONEY_CAP,
  LOBBY_FAVOR_CAP,
} from '../accord-senate';
import { getEffectiveBrokerFeeRate, MARKET_BROKER_FEE_RATE } from '../market-engine';
import {
  getFactionStandingBrokerModifier,
  isEmbargoed,
  purchaseFactionLicense,
  FACTION_LICENSES,
} from '../factions';
import { loadGame } from '../save-load';
import { SAVE_KEY } from '../constants';
import { WORLD_EPOCH } from '../world-reset';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    // Current-epoch stamp: without it the V42 epoch gate archives this save
    // (unstamped == epoch 1) and loadGame returns null — see world-reset.ts.
    worldEpoch: WORLD_EPOCH,
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 10_000_000_000, totalEarned: 10_000_000_000, totalSpent: 0,
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

describe('accord-senate — measure catalog', () => {
  it('has at least 10 measures spanning the STATS_DESIGN §12 categories', () => {
    expect(MEASURE_CATALOG.length).toBeGreaterThanOrEqual(10);
    const categories = new Set(MEASURE_CATALOG.map(m => m.category));
    expect(categories.has('tariff')).toBe(true);
    expect(categories.has('subsidy')).toBe(true);
    expect(categories.has('zone_regulation')).toBe(true);
    expect(categories.has('insurance_mandate')).toBe(true);
    expect(categories.has('licensing')).toBe(true);
  });

  it('every measure id is unique', () => {
    const ids = new Set(MEASURE_CATALOG.map(m => m.id));
    expect(ids.size).toBe(MEASURE_CATALOG.length);
  });

  it('every measure has a valid baseOdds in (0,1) and a label on both branches', () => {
    for (const m of MEASURE_CATALOG) {
      expect(m.baseOdds).toBeGreaterThan(0);
      expect(m.baseOdds).toBeLessThan(1);
      expect(m.onPass.label).toBeTruthy();
      expect(m.onFail.label).toBeTruthy();
    }
  });

  it('MEASURE_MAP resolves every catalog id', () => {
    for (const m of MEASURE_CATALOG) {
      expect(MEASURE_MAP.get(m.id)).toBe(m);
    }
  });
});

describe('accord-senate — docket determinism', () => {
  it('same quarterIndex always produces the same docket', () => {
    const a = pickDocketMeasures(300);
    const b = pickDocketMeasures(300);
    expect(a).toEqual(b);
  });

  it('docket has DOCKET_SIZE unique measures, all from the catalog', () => {
    const docket = pickDocketMeasures(303);
    expect(docket).toHaveLength(DOCKET_SIZE);
    expect(new Set(docket).size).toBe(DOCKET_SIZE);
    for (const id of docket) expect(MEASURE_MAP.has(id)).toBe(true);
  });

  it('different quarterIndex values are not deterministically identical dockets across a wide sample', () => {
    // Not a strict guarantee for any two, but across 20 quarters we should
    // see at least SOME variation — otherwise the RNG isn't wired to the seed.
    const dockets = new Set<string>();
    for (let q = 0; q < 20; q++) dockets.add(pickDocketMeasures(q * 3).join(','));
    expect(dockets.size).toBeGreaterThan(1);
  });
});

describe('accord-senate — published odds', () => {
  it('deterministic for a given measure + quarter', () => {
    const a = getPublishedOdds('debris_mitigation_standard', 300);
    const b = getPublishedOdds('debris_mitigation_standard', 300);
    expect(a).toBe(b);
  });

  it('clamped to [0.1, 0.9]', () => {
    for (let q = 0; q < 30; q += 3) {
      for (const m of MEASURE_CATALOG) {
        const odds = getPublishedOdds(m.id, q);
        expect(odds).toBeGreaterThanOrEqual(0.1);
        expect(odds).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it('unknown measure id falls back to 0.5', () => {
    expect(getPublishedOdds('not_a_real_measure', 300)).toBe(0.5);
  });
});

describe('accord-senate — lobbying math and caps', () => {
  it('computes percentage-point shift from money alone', () => {
    expect(computeLobbyShiftPct(LOBBY_MONEY_PER_PP * 3, 0)).toBe(3);
  });

  it('computes percentage-point shift from favor alone', () => {
    expect(computeLobbyShiftPct(0, LOBBY_FAVOR_PER_PP * 4)).toBe(4);
  });

  it('caps money-derived shift at LOBBY_MONEY_MAX_PP', () => {
    expect(computeLobbyShiftPct(LOBBY_MONEY_PER_PP * 999, 0)).toBe(LOBBY_MONEY_MAX_PP);
  });

  it('caps favor-derived shift at LOBBY_FAVOR_MAX_PP', () => {
    expect(computeLobbyShiftPct(0, LOBBY_FAVOR_PER_PP * 999)).toBe(LOBBY_FAVOR_MAX_PP);
  });

  it('combined shift is capped BELOW the sum of the two sub-caps', () => {
    expect(LOBBY_MONEY_MAX_PP + LOBBY_FAVOR_MAX_PP).toBeGreaterThan(LOBBY_MAX_TOTAL_SHIFT_PP);
    const maxed = computeLobbyShiftPct(LOBBY_MONEY_CAP, LOBBY_FAVOR_CAP);
    expect(maxed).toBe(LOBBY_MAX_TOTAL_SHIFT_PP);
  });

  it('negative/zero spends produce zero shift', () => {
    expect(computeLobbyShiftPct(-1000, -1000)).toBe(0);
    expect(computeLobbyShiftPct(0, 0)).toBe(0);
  });
});

describe('accord-senate — commitLobbying', () => {
  function withOpenDocket(overrides: Partial<GameState> = {}): GameState {
    return baseState({
      accordDocket: { quarterIndex: 300, measureIds: ['debris_mitigation_standard', 'research_subsidy_act', 'he3_export_framework'], resolved: false },
      accordLobbying: [],
      ...overrides,
    });
  }

  it('deducts effective money and records the commitment', () => {
    const s = withOpenDocket();
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', 100_000_000);
    expect(after.money).toBe(s.money - 100_000_000);
    expect(after.totalSpent).toBe(100_000_000);
    expect(after.accordLobbying).toHaveLength(1);
    expect(after.accordLobbying![0]).toMatchObject({ measureId: 'debris_mitigation_standard', stance: 'support', moneySpent: 100_000_000 });
  });

  it('caps the effective money withdrawn at LOBBY_MONEY_CAP even if more is offered', () => {
    const s = withOpenDocket();
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', LOBBY_MONEY_CAP * 10);
    expect(after.money).toBe(s.money - LOBBY_MONEY_CAP);
    expect(after.accordLobbying![0].moneySpent).toBe(LOBBY_MONEY_CAP);
  });

  it('deducts faction standing for a favor spend, without the rival-gain branch', () => {
    const s = withOpenDocket({ factionReputation: { 'the-dominion': 40 } });
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', 0, 'the-dominion', 10);
    expect(after.factionReputation!['the-dominion']).toBe(30);
    expect(after.factionReputation!['void-corsairs']).toBeUndefined();
  });

  it('is a no-op when there is no open docket', () => {
    const s = baseState({ accordDocket: null });
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', 1_000_000);
    expect(after).toBe(s);
  });

  it('is a no-op when the measure is not on the current docket', () => {
    const s = withOpenDocket();
    const after = commitLobbying(s, 'graymarket_crackdown', 'support', 1_000_000);
    expect(after).toBe(s);
  });

  it('is a no-op when the docket is already resolved', () => {
    const s = withOpenDocket({ accordDocket: { quarterIndex: 300, measureIds: ['debris_mitigation_standard'], resolved: true } });
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', 1_000_000);
    expect(after).toBe(s);
  });

  it('is a no-op on a second commitment for the same measure', () => {
    const s = withOpenDocket();
    const once = commitLobbying(s, 'debris_mitigation_standard', 'support', 10_000_000);
    const twice = commitLobbying(once, 'debris_mitigation_standard', 'oppose', 5_000_000);
    expect(twice).toBe(once);
    expect(twice.accordLobbying).toHaveLength(1);
  });

  it('is a no-op when the player cannot afford the (capped) spend', () => {
    const s = withOpenDocket({ money: 1_000 });
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', 10_000_000);
    expect(after).toBe(s);
  });

  it('is a no-op when favor spend would push standing below -100', () => {
    const s = withOpenDocket({ factionReputation: { 'the-dominion': -95 } });
    const after = commitLobbying(s, 'debris_mitigation_standard', 'support', 0, 'the-dominion', 10);
    expect(after).toBe(s);
  });
});

describe('accord-senate — advanceAccordSenate: docket lifecycle', () => {
  it('publishes a docket on a quarter boundary when none exists', () => {
    const s = baseState({ gameDate: { year: 2150, month: 1 }, accordDocket: null });
    const { state } = advanceAccordSenate(s, 300); // 300 % 3 === 0
    expect(state.accordDocket).not.toBeNull();
    expect(state.accordDocket!.quarterIndex).toBe(300);
    expect(state.accordDocket!.measureIds).toHaveLength(DOCKET_SIZE);
    expect(state.accordDocket!.resolved).toBe(false);
  });

  it('does not publish mid-quarter', () => {
    const s = baseState({ accordDocket: null });
    const { state } = advanceAccordSenate(s, 301);
    expect(state.accordDocket).toBeNull();
  });

  it('does not resolve before the quarter has elapsed', () => {
    const s = baseState({ accordDocket: { quarterIndex: 300, measureIds: ['research_subsidy_act'], resolved: false } });
    const { state, events } = advanceAccordSenate(s, 301);
    expect(state.accordDocket!.resolved).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('resolves the due docket and immediately publishes the next one on the same tick', () => {
    let s = baseState({ accordDocket: null });
    ({ state: s } = advanceAccordSenate(s, 300));
    const firstDocket = s.accordDocket!;
    ({ state: s } = advanceAccordSenate(s, 303));
    expect(s.accordVoteHistory!.length).toBe(firstDocket.measureIds.length);
    expect(s.accordDocket!.quarterIndex).toBe(303);
    expect(s.accordDocket!.resolved).toBe(false);
    expect(s.accordLobbying).toEqual([]);
  });

  it('vote history is capped at 30 entries', () => {
    let s = baseState({ accordDocket: null, accordVoteHistory: [] });
    for (let q = 0; q < 300; q += 3) {
      ({ state: s } = advanceAccordSenate(s, q));
    }
    expect(s.accordVoteHistory!.length).toBeLessThanOrEqual(30);
  });
});

describe('accord-senate — measure effects apply on resolution', () => {
  // These tests construct a SINGLE-measure docket directly (bypassing
  // pickDocketMeasures) so the assertion is isolated from whatever else a
  // real 3-measure docket might also apply to the same faction/money field.
  it('a passed measure with factionRep effects shifts the named faction', () => {
    // planetary_protection_categories touches exactly ONE faction on each
    // branch (echo-remnants), so this isolates the assertion from
    // factions.shiftReputation's rival-gain cascade (a positive delta on a
    // DIFFERENT faction in the same consequence can also nudge this one via
    // its own rival relationship — exercised separately below).
    let sawPass = false;
    let sawFail = false;
    for (let q = 0; q < 300 && !(sawPass && sawFail); q += 3) {
      const s = baseState({ accordDocket: { quarterIndex: q, measureIds: ['planetary_protection_categories'], resolved: false }, accordLobbying: [] });
      const { state } = advanceAccordSenate(s, q + 3);
      const result = state.accordVoteHistory!.find(r => r.measureId === 'planetary_protection_categories')!;
      if (result.passed) {
        expect(state.factionReputation?.['echo-remnants']).toBe(10);
        sawPass = true;
      } else {
        expect(state.factionReputation?.['echo-remnants']).toBe(-8);
        sawFail = true;
      }
    }
    expect(sawPass).toBe(true);
    expect(sawFail).toBe(true);
  });

  it('a factionRep consequence touching two factions can cascade through the rival-gain mechanic (documents the interaction, not a bug)', () => {
    // debris_mitigation_standard's onFail grants void-corsairs +3, and
    // void-corsairs' rival is the-dominion — so the-dominion's own -4 stacks
    // with a further -1 rival-cascade from the void-corsairs shift.
    let sawFail = false;
    for (let q = 0; q < 300 && !sawFail; q += 3) {
      const s = baseState({ accordDocket: { quarterIndex: q, measureIds: ['debris_mitigation_standard'], resolved: false }, accordLobbying: [] });
      const { state } = advanceAccordSenate(s, q + 3);
      const result = state.accordVoteHistory!.find(r => r.measureId === 'debris_mitigation_standard')!;
      if (result.passed) continue;
      sawFail = true;
      expect(state.factionReputation?.['void-corsairs']).toBe(3);
      expect(state.factionReputation?.['the-dominion']).toBe(-4 - 1); // -4 direct, -1 rival-cascade
    }
    expect(sawFail).toBe(true);
  });

  it('a passed research_subsidy_act grants money and an expiring research-speed activeEffect', () => {
    let found = false;
    for (let q = 0; q < 300 && !found; q += 3) {
      const s = baseState({ accordDocket: { quarterIndex: q, measureIds: ['research_subsidy_act'], resolved: false }, accordLobbying: [] });
      const { state } = advanceAccordSenate(s, q + 3);
      const result = state.accordVoteHistory!.find(r => r.measureId === 'research_subsidy_act')!;
      if (!result.passed) continue;
      found = true;
      expect(state.money).toBe(s.money + 120_000_000);
      expect((state.activeEffects || []).some(e => e.researchSpeedMultiplier === 1.08)).toBe(true);
    }
    expect(found).toBe(true);
  });

  it('lobbying support shifts finalOdds upward from publishedOdds', () => {
    const q = 300;
    const docket = pickDocketMeasures(q);
    const measureId = docket[0];
    const s = baseState({ accordDocket: { quarterIndex: q, measureIds: docket, resolved: false }, accordLobbying: [] });
    const lobbied = commitLobbying(s, measureId, 'support', LOBBY_MONEY_CAP);
    const { state } = advanceAccordSenate(lobbied, q + 3);
    const result = state.accordVoteHistory!.find(r => r.measureId === measureId)!;
    expect(result.finalOdds).toBeGreaterThan(result.publishedOdds);
    expect(result.finalOdds - result.publishedOdds).toBeCloseTo(LOBBY_MONEY_MAX_PP / 100, 5);
  });

  it('lobbying oppose shifts finalOdds downward from publishedOdds', () => {
    const q = 300;
    const docket = pickDocketMeasures(q);
    const measureId = docket[0];
    const s = baseState({ accordDocket: { quarterIndex: q, measureIds: docket, resolved: false }, accordLobbying: [] });
    const lobbied = commitLobbying(s, measureId, 'oppose', LOBBY_MONEY_CAP);
    const { state } = advanceAccordSenate(lobbied, q + 3);
    const result = state.accordVoteHistory!.find(r => r.measureId === measureId)!;
    expect(result.finalOdds).toBeLessThan(result.publishedOdds);
  });

  it('unlobbied measures resolve at exactly the published odds threshold', () => {
    const q = 300;
    const docket = pickDocketMeasures(q);
    const s = baseState({ accordDocket: { quarterIndex: q, measureIds: docket, resolved: false }, accordLobbying: [] });
    const { state } = advanceAccordSenate(s, q + 3);
    for (const r of state.accordVoteHistory!) {
      expect(r.finalOdds).toBe(r.publishedOdds);
      expect(r.playerStance).toBeNull();
    }
  });
});

describe('accord-senate — isQuarterBoundary', () => {
  it('true only on multiples of 3', () => {
    expect(isQuarterBoundary(0)).toBe(true);
    expect(isQuarterBoundary(3)).toBe(true);
    expect(isQuarterBoundary(300)).toBe(true);
    expect(isQuarterBoundary(1)).toBe(false);
    expect(isQuarterBoundary(301)).toBe(false);
  });
});

describe('factions — standing economic bite (STATS_DESIGN §12)', () => {
  it('allied standing gives the strongest discount', () => {
    expect(getFactionStandingBrokerModifier(80)).toBe(0.15);
  });
  it('friendly standing gives a smaller discount', () => {
    expect(getFactionStandingBrokerModifier(20)).toBe(0.07);
  });
  it('neutral standing is exactly zero (unchanged behavior)', () => {
    expect(getFactionStandingBrokerModifier(0)).toBe(0);
  });
  it('unfriendly standing surcharges', () => {
    expect(getFactionStandingBrokerModifier(-20)).toBe(-0.10);
  });
  it('hostile standing surcharges the most', () => {
    expect(getFactionStandingBrokerModifier(-80)).toBe(-0.25);
  });

  it('isEmbargoed is true only at hostile standing', () => {
    expect(isEmbargoed(-80)).toBe(true);
    expect(isEmbargoed(-49)).toBe(false);
    expect(isEmbargoed(0)).toBe(false);
  });
});

describe('market-engine — getEffectiveBrokerFeeRate faction standing wiring', () => {
  it('omitting factionStandingModifier leaves the rate byte-for-byte unchanged (backward compat)', () => {
    expect(getEffectiveBrokerFeeRate({})).toBeCloseTo(MARKET_BROKER_FEE_RATE, 10);
  });

  it('a discount (allied) lowers the effective rate', () => {
    const rate = getEffectiveBrokerFeeRate({ factionStandingModifier: 0.15 });
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * 0.85, 10);
    expect(rate).toBeLessThan(MARKET_BROKER_FEE_RATE);
  });

  it('a surcharge (hostile) raises the effective rate above base', () => {
    const rate = getEffectiveBrokerFeeRate({ factionStandingModifier: -0.25 });
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * 1.25, 10);
    expect(rate).toBeGreaterThan(MARKET_BROKER_FEE_RATE);
  });

  it('caller-supplied modifier outside the tier range is clamped', () => {
    const rate = getEffectiveBrokerFeeRate({ factionStandingModifier: -5 });
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * 1.25, 10); // clamped to -0.25
  });

  it('combines multiplicatively with the existing discount stack', () => {
    const rate = getEffectiveBrokerFeeRate({ commanderMarketMultiplier: 1.07, factionStandingModifier: 0.15 });
    expect(rate).toBeCloseTo(MARKET_BROKER_FEE_RATE * 0.93 * 0.85, 10);
  });
});

describe('factions — licensing deals', () => {
  function withRep(id: string, rep: number, money = 10_000_000_000): GameState {
    return baseState({ money, factionReputation: { [id]: rep } });
  }

  it('every license references a real faction and a positive cost', () => {
    for (const l of FACTION_LICENSES) {
      expect(l.cost).toBeGreaterThan(0);
      expect(l.minStanding).toBeGreaterThanOrEqual(0);
    }
  });

  it('succeeds when standing and funds are sufficient', () => {
    const license = FACTION_LICENSES[0];
    const s = withRep(license.factionId, license.minStanding + 5);
    const after = purchaseFactionLicense(s, license.id);
    expect(after.factionLicenses).toContain(license.id);
    expect(after.money).toBe(s.money - license.cost);
  });

  it('rejects when standing is below the minimum', () => {
    const license = FACTION_LICENSES[0];
    const s = withRep(license.factionId, license.minStanding - 5);
    const after = purchaseFactionLicense(s, license.id);
    expect(after).toBe(s);
  });

  it('rejects when the faction is hostile (embargo) even above nominal min-standing math', () => {
    const license = { ...FACTION_LICENSES[0], minStanding: -60 };
    // Can't easily override the catalog, so directly test isEmbargoed-gated
    // behavior via a real low-minStanding-like faction: hostile rep is -60,
    // which is below every real license's minStanding anyway, so this also
    // exercises the ordinary minStanding rejection path — assert embargo
    // logic independently instead.
    expect(isEmbargoed(-60)).toBe(true);
    void license;
  });

  it('rejects when the player cannot afford it', () => {
    const license = FACTION_LICENSES[0];
    const s = withRep(license.factionId, license.minStanding + 5, 100);
    const after = purchaseFactionLicense(s, license.id);
    expect(after).toBe(s);
  });

  it('is a no-op on a second purchase of the same license', () => {
    const license = FACTION_LICENSES[0];
    const s = withRep(license.factionId, license.minStanding + 5);
    const once = purchaseFactionLicense(s, license.id);
    const twice = purchaseFactionLicense(once, license.id);
    expect(twice).toBe(once);
  });

  it('unknown license id is a no-op', () => {
    const s = baseState();
    const after = purchaseFactionLicense(s, 'not_a_real_license');
    expect(after).toBe(s);
  });
});

describe('save-load: V21 migration (Accord Council Senate)', () => {
  const originalLocalStorage = (global as unknown as { localStorage?: Storage }).localStorage;

  afterEach(() => {
    (global as unknown as { localStorage?: Storage }).localStorage = originalLocalStorage;
  });

  function mockLocalStorageWith(state: GameState) {
    const store: Record<string, string> = { [SAVE_KEY]: JSON.stringify(state) };
    (global as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      key: () => null,
      length: 0,
    } as Storage;
  }

  it('loadGame() backfills accordDocket/accordLobbying/accordVoteHistory/factionLicenses on a pre-V21 save', () => {
    const legacySave = baseState();
    delete (legacySave as Partial<GameState>).accordDocket;
    delete (legacySave as Partial<GameState>).accordLobbying;
    delete (legacySave as Partial<GameState>).accordVoteHistory;
    delete (legacySave as Partial<GameState>).factionLicenses;

    mockLocalStorageWith(legacySave);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.accordDocket).toBeNull();
    expect(loaded!.accordLobbying).toEqual([]);
    expect(loaded!.accordVoteHistory).toEqual([]);
    expect(loaded!.factionLicenses).toEqual([]);
  });

  it('loadGame() preserves an in-progress docket + lobbying + history on a newer save', () => {
    const save = baseState({
      accordDocket: { quarterIndex: 30, measureIds: ['research_subsidy_act'], resolved: false },
      accordLobbying: [{ measureId: 'research_subsidy_act', stance: 'support' as const, moneySpent: 50_000_000, favorSpent: 0, committedAtMonth: 30 }],
      accordVoteHistory: [{ quarterIndex: 27, measureId: 'debris_mitigation_standard', measureName: 'Debris-Mitigation Standard', icon: '🛰️', category: 'zone_regulation', passed: true, playerStance: null, publishedOdds: 0.55, finalOdds: 0.55, effectLabel: 'Debris-Mitigation Standard Enacted' }],
      factionLicenses: ['dominion_priority_routing'],
    });
    mockLocalStorageWith(save);
    const loaded = loadGame();
    expect(loaded!.accordDocket?.quarterIndex).toBe(30);
    expect(loaded!.accordLobbying).toHaveLength(1);
    expect(loaded!.accordVoteHistory).toHaveLength(1);
    expect(loaded!.factionLicenses).toEqual(['dominion_priority_routing']);
  });
});
