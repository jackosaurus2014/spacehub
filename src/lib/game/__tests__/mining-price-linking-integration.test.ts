/**
 * @jest-environment node
 *
 * Meaningful Decisions Wave M3 — price-linked mining, live-tick + away
 * integration (docs/MEANINGFUL_2026-08.md §M3, finding F3). Proofs:
 *  - a live tick's mining_output revenue responds to the synced spot price
 *    (marketSnapshot), not just the flat authored rate
 *  - away catch-up applies the SAME price-linking (away-parity)
 *  - determinism: identical state -> identical revenue
 *  - grandfather blend: an existing (migrated) save damps the swing for the
 *    first 3 game-months, a fresh save gets full weight immediately
 *  - a non-mining service is completely unaffected (isolation)
 */
import type { GameState, BuildingInstance } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { calculateAwayOperations } from '../away-operations';
import { RESOURCE_MAP } from '../resources';

function makeBuilding(partial: Partial<BuildingInstance> & { instanceId: string; definitionId: string; locationId: string }): BuildingInstance {
  return {
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 1 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 0,
    ...partial,
  };
}

/** A state ticking at the CURRENT global game date (not month-end) so
 *  isMonthEnd stays false — avoids random-event/hazard month-boundary noise
 *  in a revenue-only assertion, same posture other game-engine tests use. */
function liveState(overrides: Partial<GameState> = {}): GameState {
  const now = Date.now();
  const globalDate = getGlobalGameDate(now);
  const s = getNewGameState();
  return {
    ...s,
    frontierStatus: 'graduated', // bypass the Frontier shield (never below neutral)
    npcCompanies: [],
    money: 10_000_000_000,
    createdAt: now,
    lastTickAt: now,
    gameDate: { year: globalDate.year, month: globalDate.month },
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface', 'mars_surface', 'asteroid_belt'],
    ...overrides,
  };
}

const MINING_SVC = { definitionId: 'svc_mining_asteroid', locationId: 'asteroid_belt', startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 };

function withMiningRig(overrides: Partial<GameState> = {}): GameState {
  return liveState({
    buildings: [
      makeBuilding({ instanceId: 'm1', definitionId: 'mining_asteroid', locationId: 'asteroid_belt' }),
      // mining_asteroid requires 12MW — unpowered would zero its powerRatio
      // (and hence ALL revenue) regardless of spot price, masking the very
      // thing these tests check. One reactor (35MW) fully covers it.
      makeBuilding({ instanceId: 'p1', definitionId: 'nuclear_reactor_asteroid', locationId: 'asteroid_belt' }),
    ],
    activeServices: [{ ...MINING_SVC, linkedBuildingIds: ['m1'] }],
    ...overrides,
  });
}

describe('game-engine.ts §1 — price-linked mining revenue (live tick)', () => {
  it('a price crash on the mined resource reduces the tick money delta vs. a neutral snapshot', () => {
    const before = withMiningRig().money;
    const neutralOut = processTick(withMiningRig());
    const crashSnapshot = {
      asOf: Date.now(),
      prices: {
        platinum_group: RESOURCE_MAP.get('platinum_group')!.baseMarketPrice * 0.3,
        gold: RESOURCE_MAP.get('gold')!.baseMarketPrice * 0.3,
        iron: RESOURCE_MAP.get('iron')!.baseMarketPrice * 0.3,
        rare_earth: RESOURCE_MAP.get('rare_earth')!.baseMarketPrice * 0.3,
        titanium: RESOURCE_MAP.get('titanium')!.baseMarketPrice * 0.3,
      },
    };
    const crashedOut = processTick(withMiningRig({ marketSnapshot: crashSnapshot }));
    expect(crashedOut.money - before).toBeLessThan(neutralOut.money - before);
  });

  it('a price spike raises the tick money delta symmetrically', () => {
    const before = withMiningRig().money;
    const neutralOut = processTick(withMiningRig());
    const spikeSnapshot = {
      asOf: Date.now(),
      prices: {
        platinum_group: RESOURCE_MAP.get('platinum_group')!.baseMarketPrice * 3,
        gold: RESOURCE_MAP.get('gold')!.baseMarketPrice * 3,
        iron: RESOURCE_MAP.get('iron')!.baseMarketPrice * 3,
        rare_earth: RESOURCE_MAP.get('rare_earth')!.baseMarketPrice * 3,
        titanium: RESOURCE_MAP.get('titanium')!.baseMarketPrice * 3,
      },
    };
    const spikedOut = processTick(withMiningRig({ marketSnapshot: spikeSnapshot }));
    expect(spikedOut.money - before).toBeGreaterThan(neutralOut.money - before);
  });

  it('is deterministic — identical state ticks to identical money (no Math.random dependence in the mining path)', () => {
    const s = withMiningRig();
    const out1 = processTick(s);
    const out2 = processTick(s);
    expect(out1.money).toBe(out2.money);
  });

  it('a non-mining service is unaffected by a mining-resource price crash (isolation)', () => {
    const stateWithTelecom = liveState({
      buildings: [makeBuilding({ instanceId: 't1', definitionId: 'sat_telecom', locationId: 'leo' })],
      activeServices: [{ definitionId: 'svc_telecom_leo', locationId: 'leo', linkedBuildingIds: ['t1'], startDate: { year: 2026, month: 1 }, revenueMultiplier: 1 }],
    });
    const neutralOut = processTick(stateWithTelecom);
    const crashSnapshot = { asOf: Date.now(), prices: { platinum_group: 1, gold: 1, iron: 1 } };
    const crashedOut = processTick({ ...stateWithTelecom, marketSnapshot: crashSnapshot });
    expect(crashedOut.money).toBe(neutralOut.money);
  });
});

describe('away-operations.ts — price-linked mining away-parity', () => {
  it('offline mining income also responds to a synced spot-price crash', () => {
    const now = Date.now();
    const twoHoursAway = now - 2 * 60 * 60 * 1000;
    const state = liveState({
      lastTickAt: twoHoursAway,
      buildings: [makeBuilding({ instanceId: 'm1', definitionId: 'mining_asteroid', locationId: 'asteroid_belt' })],
      activeServices: [{ ...MINING_SVC, linkedBuildingIds: ['m1'] }],
    });
    const neutral = calculateAwayOperations(state, now);
    const crashed = calculateAwayOperations({
      ...state,
      marketSnapshot: {
        asOf: now,
        prices: {
          platinum_group: RESOURCE_MAP.get('platinum_group')!.baseMarketPrice * 0.3,
          gold: RESOURCE_MAP.get('gold')!.baseMarketPrice * 0.3,
          iron: RESOURCE_MAP.get('iron')!.baseMarketPrice * 0.3,
          rare_earth: RESOURCE_MAP.get('rare_earth')!.baseMarketPrice * 0.3,
          titanium: RESOURCE_MAP.get('titanium')!.baseMarketPrice * 0.3,
        },
      },
    }, now);
    expect(neutral).not.toBeNull();
    expect(crashed).not.toBeNull();
    expect(crashed!.ledger.moneyDelta).toBeLessThan(neutral!.ledger.moneyDelta);
  });

  it('is deterministic for identical state + elapsed time', () => {
    const now = Date.now();
    const state = liveState({
      lastTickAt: now - 3 * 60 * 60 * 1000,
      buildings: [makeBuilding({ instanceId: 'm1', definitionId: 'mining_asteroid', locationId: 'asteroid_belt' })],
      activeServices: [{ ...MINING_SVC, linkedBuildingIds: ['m1'] }],
    });
    const a = calculateAwayOperations(state, now);
    const b = calculateAwayOperations(state, now);
    expect(a!.ledger.moneyDelta).toBe(b!.ledger.moneyDelta);
  });
});

describe('grandfather blend (§M3 [SAVE] V37)', () => {
  it('a migrated save (non-null phase-in anchor, within the window) is damped vs. a fresh save', () => {
    const now = Date.now();
    const globalDate = getGlobalGameDate(now);
    const crashPrices = {
      platinum_group: RESOURCE_MAP.get('platinum_group')!.baseMarketPrice * 0.3,
      gold: RESOURCE_MAP.get('gold')!.baseMarketPrice * 0.3,
      iron: RESOURCE_MAP.get('iron')!.baseMarketPrice * 0.3,
      rare_earth: RESOURCE_MAP.get('rare_earth')!.baseMarketPrice * 0.3,
      titanium: RESOURCE_MAP.get('titanium')!.baseMarketPrice * 0.3,
    };
    const freshState = withMiningRig({ miningPriceLinkPhaseInStartMonth: null, marketSnapshot: { asOf: now, prices: crashPrices } });
    const migratedState = withMiningRig({ miningPriceLinkPhaseInStartMonth: globalDate.totalMonths, marketSnapshot: { asOf: now, prices: crashPrices } });
    const before = freshState.money;

    const freshOut = processTick(freshState);
    const migratedOut = processTick(migratedState);
    // The migrated save is still mid-grandfather (50/50 blend toward the old
    // flat rate), so a price crash bites it LESS hard than a fresh save at
    // full new-formula weight — migratedOut's delta should be closer to
    // neutral (higher) than freshOut's.
    expect(migratedOut.money - before).toBeGreaterThan(freshOut.money - before);
  });
});
