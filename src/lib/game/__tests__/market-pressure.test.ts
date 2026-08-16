// ─── Wave E5 additions to market-pressure.ts (minedByLocation / shock) ──────
// docs/ECONOMY_PVP_2026-08.md §2.4/§E5. The pre-existing mined/npc channels
// are covered by market-integrity.test.ts; this file focuses on the two new
// channels this wave adds to the same hand-off.

import {
  accumulateMinedFlows,
  accumulateShockFlows,
  subtractTransmittedFlows,
  queueMarketFlowFlush,
  consumeMarketFlowFlush,
  __clearMarketFlowQueue,
  MINED_BY_LOCATION_CAP,
  SHOCK_FLOW_CAP,
  type MarketFlows,
} from '../market-pressure';

describe('accumulateMinedFlows — per-location attribution (Wave E5)', () => {
  it('tracks the same units broken out by producing location', () => {
    const out = accumulateMinedFlows(undefined, { iron: 100 }, { asteroid_belt: { iron: 100 } });
    expect(out.mined.iron).toBe(100);
    expect(out.minedByLocation?.asteroid_belt.iron).toBe(100);
  });

  it('merges across multiple calls (different locations, same resource)', () => {
    let out = accumulateMinedFlows(undefined, { iron: 100 }, { asteroid_belt: { iron: 100 } });
    out = accumulateMinedFlows(out, { iron: 50 }, { mars_surface: { iron: 50 } });
    expect(out.mined.iron).toBe(150);
    expect(out.minedByLocation?.asteroid_belt.iron).toBe(100);
    expect(out.minedByLocation?.mars_surface.iron).toBe(50);
  });

  it('caps per-(location, resource) accumulation', () => {
    const out = accumulateMinedFlows(undefined, {}, { asteroid_belt: { iron: MINED_BY_LOCATION_CAP + 5_000 } });
    expect(out.minedByLocation?.asteroid_belt.iron).toBe(MINED_BY_LOCATION_CAP);
  });

  it('is a no-op when minedByLocation is omitted (back-compat call sites)', () => {
    const out = accumulateMinedFlows(undefined, { iron: 10 });
    expect(out.mined.iron).toBe(10);
    expect(out.minedByLocation).toEqual({});
  });
});

describe('accumulateShockFlows — hazard supply shocks (Wave E5)', () => {
  it('stores lost units as a NEGATIVE flow', () => {
    const out = accumulateShockFlows(undefined, { iron: 50 });
    expect(out.shock?.iron).toBe(-50);
  });

  it('accumulates multiple shocks additively (more negative)', () => {
    let out = accumulateShockFlows(undefined, { iron: 20 });
    out = accumulateShockFlows(out, { iron: 30 });
    expect(out.shock?.iron).toBe(-50);
  });

  it('caps the magnitude at SHOCK_FLOW_CAP', () => {
    const out = accumulateShockFlows(undefined, { iron: SHOCK_FLOW_CAP + 500 });
    expect(out.shock?.iron).toBe(-SHOCK_FLOW_CAP);
  });

  it('ignores non-positive/garbage input', () => {
    const out = accumulateShockFlows(undefined, { iron: -5, gold: 0 });
    expect(out.shock).toEqual({});
  });
});

describe('subtractTransmittedFlows — round-trip for the new channels', () => {
  it('subtracts minedByLocation exactly what was sent', () => {
    const pending: MarketFlows = {
      mined: {}, npc: {},
      minedByLocation: { asteroid_belt: { iron: 100 } },
      shock: {},
    };
    const sent: MarketFlows = { mined: {}, npc: {}, minedByLocation: { asteroid_belt: { iron: 60 } }, shock: {} };
    const remaining = subtractTransmittedFlows(pending, sent);
    expect(remaining.minedByLocation?.asteroid_belt.iron).toBe(40);
  });

  it('drops a location entirely once fully transmitted', () => {
    const pending: MarketFlows = { mined: {}, npc: {}, minedByLocation: { asteroid_belt: { iron: 60 } }, shock: {} };
    const sent: MarketFlows = { mined: {}, npc: {}, minedByLocation: { asteroid_belt: { iron: 60 } }, shock: {} };
    const remaining = subtractTransmittedFlows(pending, sent);
    expect(remaining.minedByLocation?.asteroid_belt).toBeUndefined();
  });

  it('subtracts shock toward zero (both values negative)', () => {
    const pending: MarketFlows = { mined: {}, npc: {}, minedByLocation: {}, shock: { iron: -80 } };
    const sent: MarketFlows = { mined: {}, npc: {}, minedByLocation: {}, shock: { iron: -30 } };
    const remaining = subtractTransmittedFlows(pending, sent);
    expect(remaining.shock?.iron).toBe(-50);
  });

  it('is idempotent-safe: amounts accrued mid-flight (not in sent) survive', () => {
    let pending: MarketFlows = accumulateShockFlows(undefined, { iron: 50 });
    // A fresh shock arrives WHILE the sync request for the first is in flight.
    pending = accumulateShockFlows(pending, { iron: 10 });
    const sent: MarketFlows = { mined: {}, npc: {}, minedByLocation: {}, shock: { iron: -50 } };
    const remaining = subtractTransmittedFlows(pending, sent);
    expect(remaining.shock?.iron).toBe(-10);
  });
});

describe('queueMarketFlowFlush / consumeMarketFlowFlush — hand-off round-trip', () => {
  beforeEach(() => __clearMarketFlowQueue());

  it('round-trips minedByLocation and shock through the single-slot queue', () => {
    expect(consumeMarketFlowFlush()).toBeNull();
    queueMarketFlowFlush({ mined: {}, npc: {}, minedByLocation: { asteroid_belt: { iron: 40 } }, shock: { iron: -10 } });
    queueMarketFlowFlush({ mined: {}, npc: {}, minedByLocation: { asteroid_belt: { iron: 10 } }, shock: { iron: -5 } });
    const flushed = consumeMarketFlowFlush();
    expect(flushed?.minedByLocation?.asteroid_belt.iron).toBe(50);
    expect(flushed?.shock?.iron).toBe(-15);
    expect(consumeMarketFlowFlush()).toBeNull();
  });
});
