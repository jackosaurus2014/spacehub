/**
 * @jest-environment node
 *
 * Audit Wave E (Change #5 / A5) — markets move for real.
 * Proofs: mean reversion converges, volatility is tamed (helium-3 no longer
 * insta-floors), background flows (mining/NPC) move prices gently in the
 * right direction, the global market-event schedule is deterministic and
 * time-bounded, and mined/NPC flows accumulate in state and drain on sync.
 */
import {
  calculateIdleDecay,
  calculatePriceAfterTrade,
  calculatePriceAfterMining,
  calculatePriceAfterBackgroundFlow,
  MAX_TRADE_IMPACT,
  MAX_BACKGROUND_IMPACT,
} from '../market-engine';
import {
  getGlobalActiveMarketEvents,
  getMarketEventMultiplier,
  MARKET_EVENT_WINDOW_MS,
  MARKET_EVENT_SPAWN_CHANCE,
  MARKET_EVENTS,
} from '../market-events';
import { SERVER_EPOCH_MS } from '../server-time';
import { mulberry32, hashStringToSeed } from '../formulas';
import {
  accumulateMinedFlows,
  accumulateNpcFlows,
  subtractTransmittedFlows,
  queueMarketFlowFlush,
  consumeMarketFlowFlush,
  applyMarketFlowFlush,
  __clearMarketFlowQueue,
  MINED_FLOW_CAP,
  NPC_FLOW_CAP,
} from '../market-pressure';
import { processTick } from '../game-engine';
import type { GameState } from '../types';

describe('mean reversion (A5-ii — calculateIdleDecay finally has a caller)', () => {
  it('converges toward base price under the hourly cron cadence', () => {
    let price = 5_000; // crashed from a 50K base
    const base = 50_000;
    for (let hour = 0; hour < 50; hour++) {
      price = calculateIdleDecay(price, base, 60, 1_000, 500_000);
    }
    // 10%-of-gap per call → half-life ~6.6 calls; 50 calls ≈ fully healed.
    expect(Math.abs(price - base) / base).toBeLessThan(0.01);
  });

  it('reverts from above base too', () => {
    let price = 400_000;
    for (let hour = 0; hour < 90; hour++) {
      price = calculateIdleDecay(price, 50_000, 60, 1_000, 500_000);
    }
    expect(Math.abs(price - 50_000) / 50_000).toBeLessThan(0.01);
  });

  it('does not fight active trading (no decay within 5 minutes of a trade)', () => {
    expect(calculateIdleDecay(5_000, 50_000, 4, 1_000, 500_000)).toBe(5_000);
  });
});

describe('volatility taming (A5-v — qty×vol×k with per-trade clamp)', () => {
  it('100 helium-3 moves the price ≤25% (was 144% → instant floor)', () => {
    // helium3: base $5M, volatility 0.12
    const newPrice = calculatePriceAfterTrade(5_000_000, 5_000_000, 100, false, 0.12, 1_000_000, 50_000_000);
    const move = Math.abs(newPrice - 5_000_000) / 5_000_000;
    expect(move).toBeLessThanOrEqual(MAX_TRADE_IMPACT + 1e-9);
    expect(move).toBeCloseTo(0.24, 2); // 100 × 0.12 × 0.02
  });

  it('common metals keep their old gentle impact (iron unchanged at k=vol)', () => {
    // iron: vol 0.02 → new impact 100×0.02×0.02 = 4% ≡ old qty×vol² formula
    const newPrice = calculatePriceAfterTrade(5_000, 5_000, 100, true, 0.02, 1_000, 50_000);
    expect(newPrice).toBe(5_200);
  });

  it('absurd volumes are clamped at the per-trade cap', () => {
    const newPrice = calculatePriceAfterTrade(5_000, 5_000, 100_000, true, 0.02, 1_000, 50_000);
    expect(newPrice).toBe(Math.round(5_000 * (1 + MAX_TRADE_IMPACT)));
  });

  it('mining pressure is at 1/2 of trade impact (Wave E5 §2.4 — raised from 1/3 now that extraction pressure is the physical brake)', () => {
    const afterMining = calculatePriceAfterMining(5_000, 5_000, 100, 0.02, 1_000, 50_000);
    // 4% × 0.5 = 2% downward
    expect(afterMining).toBe(Math.round(5_000 * (1 - 0.04 * 0.5)));
  });
});

describe('background flows (A5-iv — NPC pressure becomes a real price input)', () => {
  it('NPC sells (positive flow) push prices down; buys push up', () => {
    const down = calculatePriceAfterBackgroundFlow(10_000, 10_000, 200, 0.03, 1_000, 100_000);
    const up = calculatePriceAfterBackgroundFlow(10_000, 10_000, -200, 0.03, 1_000, 100_000);
    expect(down).toBeLessThan(10_000);
    expect(up).toBeGreaterThan(10_000);
  });

  it('is clamped per call and no-ops on zero', () => {
    const extreme = calculatePriceAfterBackgroundFlow(10_000, 10_000, 1_000_000, 0.15, 1_000, 100_000);
    expect(extreme).toBeGreaterThanOrEqual(Math.round(10_000 * (1 - MAX_BACKGROUND_IMPACT)));
    expect(calculatePriceAfterBackgroundFlow(10_000, 10_000, 0, 0.15, 1_000, 100_000)).toBe(10_000);
  });
});

describe('global market event schedule (A5-iii — events price for their stated duration)', () => {
  function findSpawnWindow(): number {
    for (let w = 1; w < 1_000; w++) {
      const rng = mulberry32(hashStringToSeed(`stw-market-event:${w}`));
      if (rng() < MARKET_EVENT_SPAWN_CHANCE) return w;
    }
    throw new Error('no spawn window found in 1000 windows (statistically impossible at 40%)');
  }

  it('is deterministic — same instant, same schedule, for every caller', () => {
    const t = SERVER_EPOCH_MS + 1_000 * MARKET_EVENT_WINDOW_MS + 60_000;
    expect(getGlobalActiveMarketEvents(t)).toEqual(getGlobalActiveMarketEvents(t));
  });

  it('an event is live during its stated duration and gone after it', () => {
    const w = findSpawnWindow();
    const start = SERVER_EPOCH_MS + w * MARKET_EVENT_WINDOW_MS;
    const during = getGlobalActiveMarketEvents(start + 60_000);
    const evt = during.find(e => e.startedAtMs === start);
    expect(evt).toBeDefined();
    const def = MARKET_EVENTS.find(d => d.id === evt!.eventId)!;
    expect(evt!.expiresAtMs - evt!.startedAtMs).toBe(def.durationHours * 3600_000);

    const after = getGlobalActiveMarketEvents(evt!.expiresAtMs + 1);
    expect(after.find(e => e.startedAtMs === start)).toBeUndefined();
  });

  it('the multiplier applies to affected resources while live, and only then', () => {
    const w = findSpawnWindow();
    const start = SERVER_EPOCH_MS + w * MARKET_EVENT_WINDOW_MS;
    const during = getGlobalActiveMarketEvents(start + 60_000);
    const evt = during.find(e => e.startedAtMs === start)!;
    const res = evt.affectedResources[0];
    expect(getMarketEventMultiplier(res, [evt], start + 60_000)).toBeCloseTo(evt.priceMultiplier);
    expect(getMarketEventMultiplier(res, [evt], evt.expiresAtMs + 1)).toBe(1.0);
    expect(getMarketEventMultiplier('__unaffected__', [evt], start + 60_000)).toBe(1.0);
  });
});

describe('market flows accumulate in state and drain on sync (A5-i)', () => {
  const fixedNow = Date.UTC(2026, 2, 25, 12, 0, 0);

  afterEach(() => {
    __clearMarketFlowQueue();
    jest.restoreAllMocks();
  });

  it('accumulateMinedFlows adds and caps; NPC flows respect sign and cap', () => {
    const flows1 = accumulateMinedFlows(undefined, { iron: 50 });
    expect(flows1.mined.iron).toBe(50);
    const capped = accumulateMinedFlows(flows1, { iron: MINED_FLOW_CAP * 2 });
    expect(capped.mined.iron).toBe(MINED_FLOW_CAP);

    const npc = accumulateNpcFlows(undefined, [
      { resourceId: 'iron', quantity: 40 },
      { resourceId: 'iron', quantity: -10 },
      { resourceId: 'lunar_water', quantity: -(NPC_FLOW_CAP * 3) },
    ]);
    expect(npc.npc.iron).toBe(30);
    expect(npc.npc.lunar_water).toBe(-NPC_FLOW_CAP);
  });

  it('subtractTransmittedFlows removes exactly what was sent', () => {
    const pending = { mined: { iron: 100, titanium: 5 }, npc: { iron: 40, lunar_water: -20 } };
    const sent = { mined: { iron: 80 }, npc: { iron: 40, lunar_water: -5 } };
    const remaining = subtractTransmittedFlows(pending, sent);
    expect(remaining.mined).toEqual({ iron: 20, titanium: 5 });
    expect(remaining.npc).toEqual({ lunar_water: -15 });
  });

  it('queue hand-off: queued flush applies into state', () => {
    queueMarketFlowFlush({ mined: { iron: 30 }, npc: {} });
    const flush = consumeMarketFlowFlush()!;
    expect(flush.mined.iron).toBe(30);
    expect(consumeMarketFlowFlush()).toBeNull(); // consumed once

    const state = { pendingMarketFlows: { mined: { iron: 50 }, npc: {} } } as unknown as GameState;
    const applied = applyMarketFlowFlush(state, flush);
    expect(applied.pendingMarketFlows!.mined.iron).toBe(20);
  });

  it('processTick records building-mining output into pendingMarketFlows (the minedThisTick payload source)', () => {
    const originalDateNow = Date.now;
    Date.now = () => fixedNow;
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-03-25T12:00:00.000Z');
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      const state = {
        version: 1,
        createdAt: fixedNow - 86_400_000,
        lastTickAt: fixedNow - 1_000,
        money: 100_000_000,
        totalEarned: 0,
        totalSpent: 0,
        gameDate: { year: 2026, month: 3 },
        tickSpeed: 1,
        buildings: [],
        completedResearch: [],
        activeResearch: null,
        activeServices: [{
          definitionId: 'svc_mining_lunar', locationId: 'lunar_surface',
          linkedBuildingIds: [], startDate: { year: 2026, month: 2 }, revenueMultiplier: 1,
        }],
        unlockedLocations: ['earth_surface', 'leo', 'lunar_surface'],
        resources: {},
        eventLog: [],
        stats: {
          rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
          researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
        },
        npcCompanies: [],
        ships: [],
        workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0 },
        frontierStatus: 'graduated',
        insuranceActive: false,
      } as unknown as GameState;

      // Clock unification: svc_mining_lunar yields 100 lunar_water per
      // 10,800-tick game-month, so a 400-tick burst lands ≈ 3-4 whole units
      // (fractional carry); helium3 (2/mo) stays in the carry for now.
      let result = state;
      for (let i = 0; i < 400; i++) result = processTick(result);
      expect(result.pendingMarketFlows).toBeDefined();
      expect(result.pendingMarketFlows!.mined.lunar_water).toBeGreaterThanOrEqual(3);
      expect(result.fractionalCarry?.['lunar_surface:helium3'] || 0).toBeGreaterThan(0);
      // Flows mirror what entered the inventory (month-end volatile decay
      // — C5 §3 — takes its 1-unit minimum bite after mining lands)
      expect(result.resources.lunar_water).toBeGreaterThanOrEqual(2);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
