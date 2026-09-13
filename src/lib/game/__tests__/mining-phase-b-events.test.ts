// ─── Mining Phase B — depletion, field ageing, rock event cards, reducer ────
// asteroids.ts (exhaustion / ageing / respawn / rubble / spin-up),
// random-events.ts (the two cards, never on the monthly dice),
// mining-orders.ts advanceMiningOrders (local settlement: pressure, toll,
// rubble wear, exhaustion, escort release, claim worked).

import {
  ASTEROID_FIELD_MAP,
  FIELD_AGEING_GRADE_DROP,
  LOCAL_INTEL_SALT,
  RESPAWN_RESERVE_MULT,
  RUBBLE_DURATION_GAME_MONTHS,
  RUBBLE_HULL_WEAR,
  RUBBLE_YIELD_MULT,
  SPIN_UP_DURATION_GAME_MONTHS,
  SPIN_UP_RATE_MULT,
  agedMeanGrade,
  generateFieldRocks,
  rockEventMults,
  rollAsteroidIntel,
  rollRespawnIntel,
  rollRockEvents,
} from '../asteroids';
import { RANDOM_EVENTS, applyEventEffect, rockEventCardKey, rollMiningEventCards, rollRandomEvent } from '../random-events';
import { advanceMiningOrders, computeExtractionRate, materializeOrder, planMiningOrder } from '../mining-orders';
import { settleShakedown } from '../npc-shakedown';
import { SHIP_MAP, type MiningOrder } from '../ships';
import { getNewGameState } from '../save-load';
import { REAL_MS_PER_GAME_MONTH } from '../server-time';
import type { GameState } from '../types';

const NOW = 1_800_000_000_000;
const nearEarth = ASTEROID_FIELD_MAP.get('field_near_earth')!;
const belt = ASTEROID_FIELD_MAP.get('field_inner_belt')!;
const rockC = generateFieldRocks(nearEarth, 2).find(r => r.class === 'C')!;
const rockM = generateFieldRocks(belt, 2).find(r => r.class === 'M')!;
const intelC = rollAsteroidIntel(rockC, LOCAL_INTEL_SALT);
const intelM = rollAsteroidIntel(rockM, LOCAL_INTEL_SALT);
const barge = SHIP_MAP.get('prospector_barge')!;
const miner = SHIP_MAP.get('asteroid_miner')!;

describe('rock events', () => {
  it('multipliers apply only while live', () => {
    expect(rockEventMults(null, NOW)).toEqual({ yieldMult: 1, rateMult: 1, rubble: false, spinUp: false });
    expect(rockEventMults({ rubbleUntilMs: NOW + 1 }, NOW)).toMatchObject({ yieldMult: RUBBLE_YIELD_MULT, rubble: true });
    expect(rockEventMults({ rubbleUntilMs: NOW }, NOW)).toMatchObject({ yieldMult: 1, rubble: false });
    expect(rockEventMults({ spinUpUntilMs: NOW + 1 }, NOW)).toMatchObject({ rateMult: SPIN_UP_RATE_MULT, spinUp: true });
  });

  it('rolls deterministically from risk, never re-rolls a live event, never fires at risk 0', () => {
    const a = rollRockEvents(0.6, 'o1', NOW, null, REAL_MS_PER_GAME_MONTH);
    expect(rollRockEvents(0.6, 'o1', NOW, null, REAL_MS_PER_GAME_MONTH)).toEqual(a);
    for (let i = 0; i < 200; i++) expect(rollRockEvents(0, `n-${i}`, NOW, null, REAL_MS_PER_GAME_MONTH)).toEqual({});
    let rubble = 0;
    let spin = 0;
    for (let i = 0; i < 2000; i++) {
      const r = rollRockEvents(1, `r-${i}`, NOW, null, REAL_MS_PER_GAME_MONTH);
      if (r.rubbleUntilMs) { rubble++; expect(r.rubbleUntilMs).toBe(NOW + RUBBLE_DURATION_GAME_MONTHS * REAL_MS_PER_GAME_MONTH); }
      if (r.spinUpUntilMs) { spin++; expect(r.spinUpUntilMs).toBe(NOW + SPIN_UP_DURATION_GAME_MONTHS * REAL_MS_PER_GAME_MONTH); }
    }
    expect(rubble / 2000).toBeGreaterThan(0.3);
    expect(rubble / 2000).toBeLessThan(0.4);
    expect(spin / 2000).toBeGreaterThan(0.2);
    expect(spin / 2000).toBeLessThan(0.3);
    const live = { rubbleUntilMs: NOW + 5, spinUpUntilMs: NOW + 5 };
    for (let i = 0; i < 100; i++) expect(rollRockEvents(1, `l-${i}`, NOW, live, REAL_MS_PER_GAME_MONTH)).toEqual(live);
  });

  it('the extraction rate carries the event terms only when asked with a clock', () => {
    const plain = computeExtractionRate(barge, nearEarth, intelC);
    expect(computeExtractionRate(barge, nearEarth, { ...intelC, rubbleUntilMs: NOW + 1 })).toBe(plain);
    expect(computeExtractionRate(barge, nearEarth, { ...intelC, rubbleUntilMs: NOW + 1 }, 0, NOW)).toBeCloseTo(plain * RUBBLE_YIELD_MULT, 1);
    expect(computeExtractionRate(barge, nearEarth, { ...intelC, spinUpUntilMs: NOW + 1 }, 0, NOW)).toBeCloseTo(plain * SPIN_UP_RATE_MULT, 1);
    const p = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'mine', rock: rockC, intel: { ...intelC, spinUpUntilMs: NOW + 1e9 }, originId: 'leo', nowMs: NOW });
    if (!p.ok) throw new Error(p.error);
    expect(p.rockEvents.spinUp).toBe(true);
    expect(p.order.ratePerHour).toBeCloseTo(plain * SPIN_UP_RATE_MULT, 1);
  });
});

describe('field ageing and respawn', () => {
  it('aged mean grade drifts down with consumption', () => {
    expect(agedMeanGrade(nearEarth, 0)).toBe(nearEarth.meanGrade);
    expect(agedMeanGrade(nearEarth, 1)).toBeCloseTo(nearEarth.meanGrade * (1 - FIELD_AGEING_GRADE_DROP), 2);
    expect(agedMeanGrade(nearEarth, 0.5)).toBeLessThan(nearEarth.meanGrade);
    expect(agedMeanGrade(nearEarth, 7)).toBe(agedMeanGrade(nearEarth, 1));
    expect(agedMeanGrade(nearEarth, Number.NaN)).toBe(nearEarth.meanGrade);
  });

  it('a re-charted slot rolls a smaller reserve at the aged grade, deterministic per generation', () => {
    const g1 = rollRespawnIntel(rockM, 'salt', 1, 0.5);
    expect(rollRespawnIntel(rockM, 'salt', 1, 0.5)).toEqual(g1);
    expect(rollRespawnIntel(rockM, 'salt', 2, 0.5)).not.toEqual(g1);
    expect(g1.reserve).toBeLessThanOrEqual(Math.round(belt.reserveRange[1] * RESPAWN_RESERVE_MULT));
    expect(g1.reserve).toBeGreaterThanOrEqual(Math.round(belt.reserveRange[0] * RESPAWN_RESERVE_MULT));
    expect(g1.grade).toBeGreaterThanOrEqual(0.3);
    expect(g1.grade).toBeLessThanOrEqual(1.5);
    // Averaged over many rocks the aged field is poorer than the fresh one.
    const rocks = generateFieldRocks(belt, 2);
    const fresh = rocks.reduce((s, r) => s + rollAsteroidIntel(r, 'salt').grade, 0) / rocks.length;
    const aged = rocks.reduce((s, r) => s + rollRespawnIntel(r, 'salt', 1, 1).grade, 0) / rocks.length;
    expect(aged).toBeLessThan(fresh - 0.15);
  });

  it('the planner refuses an exhausted rock', () => {
    expect(planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'mine', rock: rockC, intel: { ...intelC, reserve: 0 }, originId: 'leo', nowMs: NOW })).toEqual({ ok: false, error: 'rock_exhausted' });
  });
});

describe('event cards in random-events.ts', () => {
  it('both cards exist, carry no cash, and never roll on the monthly dice', () => {
    for (const id of ['rubble_field', 'spin_up']) {
      const def = RANDOM_EVENTS.find(e => e.id === id)!;
      expect(def).toBeDefined();
      expect(def.trigger).toBe('rock_event');
      expect(def.probability).toBe(0);
      expect(def.choices!.length).toBe(2);
      for (const c of def.choices!) {
        expect(c.effect.moneyDelta).toBeUndefined();
        expect(c.effect.moneyReward).toBeUndefined();
        expect(c.effect.resourceGrant).toBeUndefined();
      }
      expect(def.choices!.some(c => c.effect.standOffRock)).toBe(true);
    }
    const rnd = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const s = { ...getNewGameState(), unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit', 'mars_surface', 'asteroid_belt'] };
      for (let i = 0; i < 20; i++) {
        const ev = rollRandomEvent(s);
        expect(ev?.trigger).not.toBe('rock_event');
      }
    } finally {
      rnd.mockRestore();
    }
  });

  function workingState(intelExtra: Record<string, number>): GameState {
    const s = getNewGameState();
    const plan = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'mine', rock: rockC, intel: intelC, originId: 'leo', thenAction: 'return_store', nowMs: NOW });
    if (!plan.ok) throw new Error(plan.error);
    const order = materializeOrder(plan, 'ord-1', false);
    return {
      ...s,
      ships: [{ instanceId: 'b1', definitionId: 'prospector_barge', name: 'B1', status: 'idle', currentLocation: 'leo', isBuilt: true, miningOrder: order }],
      asteroidIntel: { [rockC.id]: { ...intelC, surveyedAtMs: NOW, via: 'probe', ...intelExtra } },
    };
  }

  it('raises ONE card for a rock the fleet is working, once per event window, only when the slot is free', () => {
    const until = NOW + 1e6;
    const s0 = workingState({ rubbleUntilMs: until });
    const s1 = rollMiningEventCards(s0, NOW);
    expect(s1.pendingChoice).toMatchObject({ eventId: 'rubble_field', asteroidId: rockC.id });
    expect(s1.pendingChoice!.eventName).toContain(rockC.name);
    expect(s1.miningNoticesSeen).toContain(rockEventCardKey('rubble_field', rockC.id, until));
    // Slot busy → wait; already seen → never again for this window.
    expect(rollMiningEventCards(s1, NOW)).toBe(s1);
    expect(rollMiningEventCards({ ...s1, pendingChoice: null }, NOW)).toEqual({ ...s1, pendingChoice: null });
    // A rock nobody is working raises nothing.
    const idle = { ...s0, ships: [] };
    expect(rollMiningEventCards(idle, NOW)).toBe(idle);
    // A claimed rock counts as worked.
    const claimed = { ...idle, asteroidClaims: { [rockC.id]: { id: 'c', asteroidId: rockC.id, fieldId: rockC.fieldId, stakedAtMs: NOW, lastWorkedAtMs: NOW, expiresAtMs: NOW + 1e9, fee: 1, upkeepPerMonth: 0 } } };
    expect(rollMiningEventCards(claimed, NOW).pendingChoice?.eventId).toBe('rubble_field');
    // Spin-up card.
    const spun = rollMiningEventCards(workingState({ spinUpUntilMs: until }), NOW);
    expect(spun.pendingChoice?.eventId).toBe('spin_up');
  });

  it('the stand-off choice records the rock until its event ends; the other choice changes nothing', () => {
    const until = Date.now() + 5 * 60_000;
    const s0 = rollMiningEventCards(workingState({ rubbleUntilMs: until }), Date.now());
    const def = RANDOM_EVENTS.find(e => e.id === 'rubble_field')!;
    const stand = applyEventEffect(s0, def.choices![1].effect, def.name);
    expect(stand.miningStandOff?.[rockC.id]).toBe(until);
    expect(stand.money).toBe(s0.money);
    const work = applyEventEffect(s0, def.choices![0].effect, def.name);
    expect(work.miningStandOff?.[rockC.id]).toBeUndefined();
    // Standing off refuses a new order on that rock, not on others.
    const refused = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'mine', rock: rockC, intel: intelC, originId: 'leo', standOffUntilMs: stand.miningStandOff![rockC.id], nowMs: Date.now() });
    expect(refused).toEqual({ ok: false, error: 'standing_off' });
  });
});

describe('advanceMiningOrders — Phase B local settlement', () => {
  function completedState(rock: typeof rockC, intel: typeof intelC, over: Partial<MiningOrder> = {}, extraShips: NonNullable<GameState['ships']> = [], intelExtra: Record<string, unknown> = {}): { state: GameState; order: MiningOrder } {
    const s = getNewGameState();
    const def = rock === rockC ? barge : miner;
    const origin = rock === rockC ? 'leo' : 'ceres_surface';
    const plan = planMiningOrder({ def, cargoCapacity: def.cargoCapacity, mode: 'mine', rock, intel, originId: origin, thenAction: 'return_store', nowMs: NOW, sharedMiners: over.sharedMiners, escortCover: over.escortInstanceId ? 'assigned' : 'none', escortInstanceId: over.escortInstanceId });
    if (!plan.ok) throw new Error(plan.error);
    const order: MiningOrder = { ...materializeOrder(plan, over.id || 'ord-1', false), ...over };
    return {
      order,
      state: {
        ...s, money: 1e9,
        ships: [{ instanceId: 'm1', definitionId: def.id, name: 'M1', status: 'idle', currentLocation: origin, isBuilt: true, miningOrder: order }, ...extraShips],
        asteroidIntel: { [rock.id]: { ...intel, surveyedAtMs: NOW, via: 'probe', ...intelExtra } },
        lastSyncAt: undefined,
      },
    };
  }

  it('exhausts the rock at reserve 0 and marks the survey exhausted', () => {
    const { state, order } = completedState(rockC, { ...intelC, reserve: 150 });
    expect(order.fillUnits).toBe(150);
    const done = advanceMiningOrders(state, order.completesAtMs + 1);
    const rec = done.asteroidIntel![rockC.id];
    expect(rec.reserve).toBe(0);
    expect(rec.exhausted).toBe(true);
    expect(done.eventLog.some(e => e.title.includes('exhausted'))).toBe(true);
    expect(done.resources.ore_carbonaceous).toBe(150);
  });

  it('a shared rock lands the pressure share, not the fill', () => {
    const { state, order } = completedState(rockC, intelC, { sharedMiners: 4, pressureShare: 0.5 });
    const done = advanceMiningOrders(state, order.completesAtMs + 1);
    expect(done.resources.ore_carbonaceous).toBe(Math.round(order.fillUnits * 0.5));
    expect(done.asteroidIntel![rockC.id].reserve).toBe(intelC.reserve - Math.round(order.fillUnits * 0.5));
  });

  it('a rubble rock wears the hull on completion (synced or not); a claim is worked; the escort is freed', () => {
    const cutter: NonNullable<GameState['ships']>[number] = { instanceId: 'c1', definitionId: 'escort_cutter', name: 'C1', status: 'idle', currentLocation: 'ceres_surface', isBuilt: true, escortingOrderId: 'ord-1' };
    const { state, order } = completedState(rockM, intelM, { escortInstanceId: 'c1', serverAuthoritative: true }, [cutter], { rubbleUntilMs: NOW + 1e12 });
    const claimed: GameState = { ...state, asteroidClaims: { [rockM.id]: { id: 'k', asteroidId: rockM.id, fieldId: rockM.fieldId, stakedAtMs: NOW - 10, lastWorkedAtMs: NOW - 10, expiresAtMs: NOW + 5, fee: 1, upkeepPerMonth: 0 } } };
    const done = advanceMiningOrders(claimed, order.completesAtMs + 1);
    const m1 = done.ships!.find(s => s.instanceId === 'm1')!;
    expect(m1.hullDamagePct).toBeCloseTo(RUBBLE_HULL_WEAR * (1 + intelM.risk), 2);
    expect(m1.miningOrder).toBeUndefined();
    expect(done.ships!.find(s => s.instanceId === 'c1')!.escortingOrderId).toBeUndefined();
    expect(done.asteroidClaims![rockM.id].lastWorkedAtMs).toBe(order.completesAtMs);
    // Synced: the server ledgers the ore; nothing is credited here.
    expect(done.resources.ore_metallic ?? 0).toBe(0);
  });

  it('a belt run home can be shaken down — deterministic in the order id, posted to the Situation Log', () => {
    // Find an order id whose roll hits without cover but is repelled with an escort.
    let hitId = '';
    for (let i = 0; i < 500 && !hitId; i++) {
      const t = settleShakedown(`ord-${i}`, 'asteroid_belt', 'none', false, 200);
      const e = settleShakedown(`ord-${i}`, 'asteroid_belt', 'assigned', false, 200);
      if (t.hit && e.repelled) hitId = `ord-${i}`;
    }
    expect(hitId).not.toBe('');
    const { state, order } = completedState(rockM, intelM, { id: hitId });
    const done = advanceMiningOrders(state, order.completesAtMs + 1);
    const toll = settleShakedown(hitId, 'asteroid_belt', 'none', false, order.fillUnits);
    // Ore lands at the destination (Ceres storage → the location inventory).
    const landed = (s: GameState) => (s.resources.ore_metallic ?? 0) + (s.locationInventories?.ceres_surface?.ore_metallic ?? 0);
    expect(landed(done)).toBe(order.fillUnits - toll.unitsLost);
    expect(done.recentHazards![0]).toMatchObject({ id: `shakedown-${hitId}`, type: 'pirate_raid', severity: 'major', locationId: 'asteroid_belt', affectedShipInstanceId: 'm1' });
    expect(done.eventLog.some(e => e.title.startsWith('🏴‍☠️ Shakedown'))).toBe(true);
    // The same run with an escort assigned: repelled, nothing lost.
    const cutter: NonNullable<GameState['ships']>[number] = { instanceId: 'c1', definitionId: 'escort_cutter', name: 'C1', status: 'idle', currentLocation: 'ceres_surface', isBuilt: true, escortingOrderId: hitId };
    const esc = completedState(rockM, intelM, { id: hitId, escortInstanceId: 'c1' }, [cutter]);
    const doneEsc = advanceMiningOrders(esc.state, esc.order.completesAtMs + 1);
    expect(landed(doneEsc)).toBe(esc.order.fillUnits);
    expect(doneEsc.recentHazards![0]).toMatchObject({ id: `shakedown-${hitId}`, severity: 'minor', mitigatedPct: 1 });
    // The Frontier field never is.
    const fr = completedState(rockC, intelC, { id: hitId });
    const doneFr = advanceMiningOrders(fr.state, fr.order.completesAtMs + 1);
    expect(doneFr.resources.ore_carbonaceous).toBe(fr.order.fillUnits);
    expect(doneFr.recentHazards ?? []).toEqual([]);
  });
});
