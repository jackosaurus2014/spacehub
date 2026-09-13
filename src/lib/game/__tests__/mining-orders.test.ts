// ─── Mining Orders (Phase A) — planner + state machine ─────────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §4; founder rulings 2026-09-12.

import {
  ASTEROID_FIELD_MAP,
  LOCAL_INTEL_SALT,
  ORE_LOAD_WEIGHT,
  UNSURVEYED_YIELD_MULT,
  generateFieldRocks,
  getAsteroid,
  oreForRock,
  rollAsteroidIntel,
  type AsteroidRock,
} from '../asteroids';
import {
  MINING_HULL_FUEL_RATE,
  MINING_SALE_BROKER_FEE,
  advanceMiningOrders,
  computeExtractionRate,
  describeMiningOrder,
  materializeOrder,
  miningOrderPhase,
  planMiningOrder,
  quoteLeg,
  type MiningPlan,
} from '../mining-orders';
import { FREIGHT_MIN_FUEL_COST, getRouteDeltaV } from '../cargo-logistics';
import { SHIP_MAP, getTravelTime, type MiningOrder } from '../ships';
import { getNewGameState } from '../save-load';
import { RESOURCE_MAP } from '../resources';
import type { GameState } from '../types';

const barge = SHIP_MAP.get('prospector_barge')!;
const hauler = SHIP_MAP.get('hauler')!;
const nearEarth = ASTEROID_FIELD_MAP.get('field_near_earth')!;
const rocksNE = generateFieldRocks(nearEarth, 2);
const rockC: AsteroidRock = rocksNE.find(r => r.class === 'C')!;
const intelC = rollAsteroidIntel(rockC, LOCAL_INTEL_SALT);
const NOW = 1_800_000_000_000;

function shipWith(order: MiningOrder | undefined, extra: Partial<NonNullable<GameState['ships']>[number]> = {}) {
  return {
    instanceId: 'ship-1', definitionId: 'prospector_barge', name: 'SN-Test-1', status: 'idle' as const,
    currentLocation: 'leo', isBuilt: true, miningOrder: order, ...extra,
  };
}

function stateWith(order: MiningOrder | undefined, extra: Partial<GameState> = {}): GameState {
  const s = getNewGameState();
  return { ...s, money: 1_000_000_000, ships: [shipWith(order)], ...extra };
}

function mine(over: Partial<Parameters<typeof planMiningOrder>[0]> = {}): MiningPlan {
  const r = planMiningOrder({ def: barge, cargoCapacity: barge.cargoCapacity, mode: 'mine', rock: rockC, intel: intelC, originId: 'leo', thenAction: 'return_store', nowMs: NOW, ...over });
  if (!r.ok) throw new Error(`plan failed: ${r.error}`);
  return r;
}

describe('extraction rate', () => {
  it('is ship class × grade on a surveyed rock', () => {
    expect(computeExtractionRate(barge, nearEarth, { grade: 1 })).toBe(50);
    expect(computeExtractionRate(barge, nearEarth, { grade: 1.2 })).toBe(60);
  });
  it('unsurveyed rocks mine at UNSURVEYED_YIELD_MULT of the field mean, never the true grade (founder ruling)', () => {
    const blind = computeExtractionRate(barge, nearEarth, null);
    expect(blind).toBeCloseTo(50 * nearEarth.meanGrade * UNSURVEYED_YIELD_MULT, 5);
    expect(UNSURVEYED_YIELD_MULT).toBe(0.15);
    expect(blind).toBeLessThan(computeExtractionRate(barge, nearEarth, intelC) * 0.3);
  });
  it('hull damage penalises the rate on the legacy curve', () => {
    expect(computeExtractionRate(barge, nearEarth, { grade: 1 }, 0.4)).toBeCloseTo(50 * 0.7, 5);
    expect(computeExtractionRate(barge, nearEarth, { grade: 1 }, 1)).toBeCloseTo(50 * 0.25, 5);
  });
  it('a hull with no extraction gear has rate 0', () => {
    expect(computeExtractionRate(hauler, nearEarth, { grade: 1 })).toBe(0);
  });
});

describe('fuel and transit', () => {
  it('a leg prices lane Δv + the rock surcharge at the mining hull rate, ore at ORE_LOAD_WEIGHT', () => {
    const leg = quoteLeg('leo', 'lunar_orbit', 1000, 2, 200);
    const dv = getRouteDeltaV('leo', 'lunar_orbit') + 1000;
    expect(leg.deltaV).toBe(dv);
    expect(leg.fuel).toBe(Math.round(dv * (MINING_HULL_FUEL_RATE * 2 + 5 * ORE_LOAD_WEIGHT * 200)));
    expect(leg.seconds).toBe(getTravelTime('leo', 'lunar_orbit') + 100);
  });
  it('never quotes below the freight floor and honours the research fuel-efficiency cap', () => {
    expect(quoteLeg('leo', 'leo', 0, 1, 0).fuel).toBe(FREIGHT_MIN_FUEL_COST);
    const full = quoteLeg('leo', 'asteroid_belt', 500, 3, 0, 1).fuel;
    expect(quoteLeg('leo', 'asteroid_belt', 500, 3, 0, 0.1).fuel).toBe(Math.round(full * 0.5));
  });
  it('a hold order pays the outbound leg only; a return order the return leg only', () => {
    const hold = mine({ thenAction: 'hold' });
    const round = mine({ thenAction: 'return_store' });
    expect(hold.transitBackSeconds).toBe(0);
    expect(hold.order.fuelCost).toBeLessThan(round.order.fuelCost);
    expect(hold.order.destinationId).toBe('lunar_orbit');
    const ret = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'return', originId: 'lunar_orbit', destinationId: 'leo', heldOre: { oreId: 'ore_carbonaceous', units: 200, asteroidId: rockC.id, fieldId: 'field_near_earth' }, nowMs: NOW });
    expect(ret.ok && ret.order.fuelCost + hold.order.fuelCost).toBe(round.order.fuelCost);
  });
});

describe('planner', () => {
  it('fills to the hold, quotes a schedule from the real travel time and the extraction rate', () => {
    const p = mine();
    expect(p.order.fillUnits).toBe(200);
    expect(p.order.oreId).toBe(oreForRock(rockC));
    expect(p.transitOutSeconds).toBe(getTravelTime('leo', 'lunar_orbit') + Math.round(rockC.deltaVExtra * 0.1));
    expect(p.extractionSeconds).toBe(Math.ceil((200 / p.order.ratePerHour) * 3600));
    expect(p.order.arrivesAtMs).toBe(NOW + p.transitOutSeconds * 1000);
    expect(p.order.miningEndsAtMs).toBe(p.order.arrivesAtMs + p.extractionSeconds * 1000);
    expect(p.order.completesAtMs).toBe(p.order.miningEndsAtMs + p.transitBackSeconds * 1000);
    expect(p.order.surveyed).toBe(true);
  });
  it('cargo gating: fill is capped by the hold and by the surveyed reserve', () => {
    expect(mine({ fillUnits: 5_000 }).order.fillUnits).toBe(200);
    expect(mine({ fillUnits: 50 }).order.fillUnits).toBe(50);
    expect(mine({ intel: { ...intelC, reserve: 37 } }).order.fillUnits).toBe(37);
    expect(mine({ cargoCapacity: 260 }).order.fillUnits).toBe(260); // module-extended hold
  });
  it('a blind order takes 1/0.15 longer to fill', () => {
    const blind = mine({ intel: null });
    expect(blind.order.surveyed).toBe(false);
    expect(blind.extractionSeconds).toBeGreaterThan(mine().extractionSeconds * 3);
  });
  it('refuses the wrong hull, the wrong field and an exhausted rock', () => {
    expect(planMiningOrder({ def: hauler, cargoCapacity: 800, mode: 'mine', rock: rockC, intel: intelC, originId: 'leo', nowMs: NOW })).toMatchObject({ ok: false, error: 'ship_cannot_mine' });
    expect(planMiningOrder({ def: hauler, cargoCapacity: 800, mode: 'survey', rock: rockC, originId: 'leo', nowMs: NOW })).toMatchObject({ ok: false, error: 'ship_cannot_survey' });
    const kuiper = generateFieldRocks(ASTEROID_FIELD_MAP.get('field_kuiper')!, 2)[0];
    expect(planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'mine', rock: kuiper, originId: 'outer_system', nowMs: NOW })).toMatchObject({ ok: false, error: 'field_out_of_reach' });
    expect(planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'mine', rock: rockC, intel: { ...intelC, reserve: 0 }, originId: 'leo', nowMs: NOW })).toMatchObject({ ok: false, error: 'rock_exhausted' });
    expect(planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'return', originId: 'leo', nowMs: NOW })).toMatchObject({ ok: false, error: 'nothing_held' });
  });
  it('a survey order completes on arrival and parks at the field', () => {
    const p = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'survey', rock: rockC, originId: 'leo', nowMs: NOW });
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.order.completesAtMs).toBe(p.order.arrivesAtMs);
    expect(p.order.destinationId).toBe('lunar_orbit');
    expect(p.order.fillUnits).toBe(0);
  });
});

describe('state machine', () => {
  const plan = mine();
  const order = materializeOrder(plan, 'ord-1', false);
  it('phases follow the clock: transit_out → mining → returning → complete', () => {
    expect(miningOrderPhase(order, NOW)).toBe('transit_out');
    expect(miningOrderPhase(order, order.arrivesAtMs)).toBe('mining');
    expect(miningOrderPhase(order, order.miningEndsAtMs)).toBe('returning');
    expect(miningOrderPhase(order, order.completesAtMs)).toBe('complete');
    expect(describeMiningOrder(order, order.arrivesAtMs + (order.miningEndsAtMs - order.arrivesAtMs) / 2).unitsSoFar).toBe(100);
    expect(describeMiningOrder(order, NOW).pct).toBe(0);
    expect(describeMiningOrder(order, order.completesAtMs).pct).toBe(100);
  });
  it('the reducer drives status/route/location per phase without crediting anything', () => {
    const s0 = stateWith(order);
    const s1 = advanceMiningOrders(s0, NOW + 1);
    expect(s1.ships![0].status).toBe('in_transit');
    expect(s1.ships![0].route).toMatchObject({ from: 'leo', to: 'lunar_orbit', cargo: {} });
    const s2 = advanceMiningOrders(s1, order.arrivesAtMs);
    expect(s2.ships![0].status).toBe('mining');
    expect(s2.ships![0].currentLocation).toBe('lunar_orbit');
    expect(s2.resources[order.oreId] || 0).toBe(0);
    const s3 = advanceMiningOrders(s2, order.miningEndsAtMs);
    expect(s3.ships![0].status).toBe('in_transit');
    expect(s3.ships![0].route?.to).toBe('leo');
    expect(advanceMiningOrders(s3, order.miningEndsAtMs + 1)).toBe(s3); // idempotent within a phase
  });
  it('LOCAL play credits ore on return & store, cash on return & sell, and holds otherwise', () => {
    const store = advanceMiningOrders(stateWith(order), order.completesAtMs);
    expect(store.ships![0].miningOrder).toBeUndefined();
    expect(store.ships![0].status).toBe('idle');
    expect(store.ships![0].currentLocation).toBe('leo');
    expect(store.resources[order.oreId]).toBe(200);

    const sellOrder = materializeOrder(mine({ thenAction: 'return_sell' }), 'ord-2', false);
    const s0 = stateWith(sellOrder);
    const sold = advanceMiningOrders(s0, sellOrder.completesAtMs);
    const price = RESOURCE_MAP.get('ore_carbonaceous')!.baseMarketPrice;
    expect(sold.money - s0.money).toBe(Math.round(200 * price * (1 - MINING_SALE_BROKER_FEE)));
    expect(sold.resources[order.oreId] || 0).toBe(0);

    const holdOrder = materializeOrder(mine({ thenAction: 'hold' }), 'ord-3', false);
    const held = advanceMiningOrders(stateWith(holdOrder), holdOrder.completesAtMs);
    expect(held.ships![0].heldOre).toEqual({ oreId: 'ore_carbonaceous', units: 200, asteroidId: rockC.id, fieldId: 'field_near_earth' });
    expect(held.ships![0].currentLocation).toBe('lunar_orbit');
    expect(held.resources[order.oreId] || 0).toBe(0);
  });
  it('a SERVER-authoritative order credits nothing on the client (ore arrives through the ledger)', () => {
    const srv = materializeOrder(mine({ thenAction: 'return_store' }), 'ord-4', true);
    const s0 = stateWith(srv);
    const done = advanceMiningOrders(s0, srv.completesAtMs);
    expect(done.ships![0].miningOrder).toBeUndefined();
    expect(done.resources[srv.oreId] || 0).toBe(0);
    expect(done.money).toBe(s0.money);
    const srvSell = materializeOrder(mine({ thenAction: 'return_sell' }), 'ord-5', true);
    expect(advanceMiningOrders(stateWith(srvSell), srvSell.completesAtMs).money).toBe(s0.money);
  });
  it('a survey order reveals intel: locally by rolling, on a synced profile from the server reveal', () => {
    const p = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'survey', rock: rockC, originId: 'leo', nowMs: NOW });
    if (!p.ok) throw new Error('survey plan failed');
    const local = advanceMiningOrders(stateWith(materializeOrder(p, 'ord-6', false)), p.order.completesAtMs);
    expect(local.asteroidIntel![rockC.id]).toMatchObject({ ...intelC, via: 'ship' });
    const served = advanceMiningOrders(stateWith(materializeOrder(p, 'ord-7', true, { grade: 1.33, reserve: 4321, risk: 0.11 })), p.order.completesAtMs);
    expect(served.asteroidIntel![rockC.id]).toMatchObject({ grade: 1.33, reserve: 4321, risk: 0.11, via: 'ship' });
    expect(served.ships![0].currentLocation).toBe('lunar_orbit');
  });
  it('a return order lands the held ore and clears the hold', () => {
    const held = { oreId: 'ore_carbonaceous', units: 150, asteroidId: rockC.id, fieldId: 'field_near_earth' };
    const p = planMiningOrder({ def: barge, cargoCapacity: 200, mode: 'return', originId: 'lunar_orbit', destinationId: 'leo', heldOre: held, thenAction: 'return_store', nowMs: NOW });
    if (!p.ok) throw new Error('return plan failed');
    const s0 = stateWith(materializeOrder(p, 'ord-8', false), { ships: [shipWith(materializeOrder(p, 'ord-8', false), { currentLocation: 'lunar_orbit', heldOre: held })] });
    const done = advanceMiningOrders(s0, p.order.completesAtMs);
    expect(done.ships![0].heldOre).toBeUndefined();
    expect(done.resources.ore_carbonaceous).toBe(150);
    expect(done.ships![0].currentLocation).toBe('leo');
  });
  it('ignores ships without an order (legacy fleet byte-identical)', () => {
    const s = stateWith(undefined);
    expect(advanceMiningOrders(s, NOW)).toBe(s);
  });
});

describe('catalogue', () => {
  it('a rock resolves by id from the deterministic catalogue', () => {
    expect(getAsteroid(rockC.id)).toEqual(rockC);
  });
});
