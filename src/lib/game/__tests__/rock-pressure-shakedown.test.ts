// ─── Mining Phase B — shared-rock pressure + NPC shakedowns + escorts ───────
// rock-pressure.ts, npc-shakedown.ts, the planner's Phase B inputs
// (mining-orders.ts) and the Escort Cutter (ships.ts). Founder ruling 4:
// the cutter only reduces NPC odds and never targets players.

import {
  ROCK_PRESSURE_EXPONENT,
  ROCK_PRESSURE_MIN_SHARE,
  applyRockPressure,
  countConcurrentMiners,
  rockPressureShare,
} from '../rock-pressure';
import {
  ESCORT_ASSIGNED_ODDS_MULT,
  ESCORT_STATIONED_ODDS_MULT,
  SHAKEDOWN_LANE_RISK,
  SHAKEDOWN_TAKE_SHARE,
  expectedShakedownLoss,
  laneShakedownRisk,
  orderHasReturnLeg,
  settleShakedown,
  shakedownOdds,
} from '../npc-shakedown';
import { ASTEROID_FIELDS, ASTEROID_FIELD_MAP, LOCAL_INTEL_SALT, generateFieldRocks, rollAsteroidIntel } from '../asteroids';
import { canEscort, escortCandidates, hasStationedEscort, planMiningOrder, resolveEscortCover } from '../mining-orders';
import { SHIPS, SHIP_MAP, SHIP_CREW_PILOT_SHARE, getShipDerivedStats } from '../ships';
import { hullClassOf } from '../ship-traffic';
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';

const NOW = 1_800_000_000_000;
const belt = ASTEROID_FIELD_MAP.get('field_inner_belt')!;
const rockM = generateFieldRocks(belt, 2).find(r => r.class === 'M')!;
const intelM = rollAsteroidIntel(rockM, LOCAL_INTEL_SALT);
const miner = SHIP_MAP.get('asteroid_miner')!;

describe('rock pressure', () => {
  it('share(n) = n^-0.5, floored, 1 when claimed', () => {
    expect(ROCK_PRESSURE_EXPONENT).toBe(0.5);
    expect(rockPressureShare(1)).toBe(1);
    expect(rockPressureShare(2)).toBeCloseTo(0.707, 3);
    expect(rockPressureShare(3)).toBeCloseTo(0.577, 3);
    expect(rockPressureShare(4)).toBe(0.5);
    expect(rockPressureShare(100)).toBe(ROCK_PRESSURE_MIN_SHARE);
    expect(rockPressureShare(4, true)).toBe(1);
    expect(rockPressureShare(0)).toBe(1);
    expect(rockPressureShare(Number.NaN)).toBe(1);
  });

  it('total extraction grows sub-linearly with miners', () => {
    for (const n of [2, 3, 4, 9]) expect(n * rockPressureShare(n)).toBeCloseTo(Math.sqrt(n), 1);
  });

  it('applies to a fill with bounds', () => {
    expect(applyRockPressure(200, 1)).toBe(200);
    expect(applyRockPressure(200, 0.707)).toBe(141);
    expect(applyRockPressure(0, 0.5)).toBe(0);
    expect(applyRockPressure(1, 0.25)).toBe(1);
    expect(applyRockPressure(200, 2)).toBe(200);
  });

  it('counts distinct corporations whose mine orders overlap the window', () => {
    const orders = [
      { profileId: 'me', asteroidId: 'r1', mode: 'mine', arrivesAtMs: 0, miningEndsAtMs: 100 },
      { profileId: 'a', asteroidId: 'r1', mode: 'mine', arrivesAtMs: 50, miningEndsAtMs: 150 },
      { profileId: 'a', asteroidId: 'r1', mode: 'mine', arrivesAtMs: 60, miningEndsAtMs: 160 },
      { profileId: 'b', asteroidId: 'r1', mode: 'mine', arrivesAtMs: 100, miningEndsAtMs: 200 }, // touches, no overlap
      { profileId: 'c', asteroidId: 'r2', mode: 'mine', arrivesAtMs: 0, miningEndsAtMs: 100 },
      { profileId: 'd', asteroidId: 'r1', mode: 'survey', arrivesAtMs: 0, miningEndsAtMs: 100 },
    ];
    expect(countConcurrentMiners(orders, 'r1', 0, 100, 'me')).toBe(2);
    expect(countConcurrentMiners([], 'r1', 0, 100, 'me')).toBe(1);
  });
});

describe('NPC shakedown odds', () => {
  it('lane risk is the NPC piracy geography; the Frontier field has none', () => {
    expect(laneShakedownRisk('lunar_orbit')).toBe(0);
    expect(laneShakedownRisk('asteroid_belt')).toBe(SHAKEDOWN_LANE_RISK.asteroid_belt);
    expect(laneShakedownRisk('nowhere')).toBe(0);
    for (const f of ASTEROID_FIELDS) {
      if (f.frontier) expect(laneShakedownRisk(f.parentLocationId)).toBe(0);
      else expect(laneShakedownRisk(f.parentLocationId)).toBeGreaterThan(0);
    }
  });

  it('escort cover multiplies the odds; the Frontier shield zeroes them', () => {
    const base = shakedownOdds('asteroid_belt', 'none', false);
    expect(base).toBe(0.12);
    expect(shakedownOdds('asteroid_belt', 'assigned', false)).toBeCloseTo(base * ESCORT_ASSIGNED_ODDS_MULT, 6);
    expect(shakedownOdds('asteroid_belt', 'stationed', false)).toBeCloseTo(base * ESCORT_STATIONED_ODDS_MULT, 6);
    expect(ESCORT_ASSIGNED_ODDS_MULT).toBe(0.25);
    expect(ESCORT_STATIONED_ODDS_MULT).toBe(0.5);
    expect(shakedownOdds('asteroid_belt', 'none', true)).toBe(0);
    expect(shakedownOdds('asteroid_belt', 'assigned', true)).toBe(0);
    expect(shakedownOdds('lunar_orbit', 'none', false)).toBe(0);
  });

  it('expected loss and the return-leg test', () => {
    expect(expectedShakedownLoss('asteroid_belt', 'none', false, 200)).toBeCloseTo(0.12 * SHAKEDOWN_TAKE_SHARE * 200, 2);
    expect(expectedShakedownLoss('asteroid_belt', 'assigned', false, 200)).toBeCloseTo(0.03 * SHAKEDOWN_TAKE_SHARE * 200, 2);
    expect(orderHasReturnLeg('mine', 'return_store')).toBe(true);
    expect(orderHasReturnLeg('mine', 'return_sell')).toBe(true);
    expect(orderHasReturnLeg('mine', 'hold')).toBe(false);
    expect(orderHasReturnLeg('return', 'return_store')).toBe(true);
    expect(orderHasReturnLeg('survey', 'hold')).toBe(false);
  });
});

describe('settleShakedown', () => {
  it('is deterministic in the seed and takes SHAKEDOWN_TAKE_SHARE on a hit', () => {
    const a = settleShakedown('order-1', 'asteroid_belt', 'none', false, 200);
    const b = settleShakedown('order-1', 'asteroid_belt', 'none', false, 200);
    expect(a).toEqual(b);
    expect(a.roll).toBeGreaterThanOrEqual(0);
    expect(a.roll).toBeLessThan(1);
    if (a.hit) {
      expect(a.unitsLost).toBe(Math.round(200 * SHAKEDOWN_TAKE_SHARE));
      expect(a.unitsLanded).toBe(200 - a.unitsLost);
    } else {
      expect(a.unitsLost).toBe(0);
      expect(a.unitsLanded).toBe(200);
    }
  });

  it('hits at the lane rate over many orders and escorts cut it by the documented factor', () => {
    let none = 0;
    let assigned = 0;
    let repelled = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const u = settleShakedown(`o-${i}`, 'asteroid_belt', 'none', false, 100);
      const e = settleShakedown(`o-${i}`, 'asteroid_belt', 'assigned', false, 100);
      if (u.hit) none++;
      if (e.hit) assigned++;
      if (e.repelled) repelled++;
      // The same roll: the escort can only turn a hit into a miss.
      if (e.hit) expect(u.hit).toBe(true);
    }
    expect(none / N).toBeGreaterThan(0.09);
    expect(none / N).toBeLessThan(0.15);
    expect(assigned / N).toBeGreaterThan(0.015);
    expect(assigned / N).toBeLessThan(0.045);
    expect(repelled).toBe(none - assigned);
  });

  it('never shakes down an empty hold, a Frontier profile, or the Frontier lane', () => {
    for (let i = 0; i < 200; i++) {
      expect(settleShakedown(`z-${i}`, 'asteroid_belt', 'none', false, 0).hit).toBe(false);
      expect(settleShakedown(`z-${i}`, 'asteroid_belt', 'none', true, 500).hit).toBe(false);
      expect(settleShakedown(`z-${i}`, 'lunar_orbit', 'none', false, 500).hit).toBe(false);
    }
  });
});

describe('planner Phase B inputs', () => {
  const base = { def: miner, cargoCapacity: miner.cargoCapacity, mode: 'mine' as const, rock: rockM, intel: intelM, originId: 'ceres_surface', thenAction: 'return_sell' as const, nowMs: NOW };

  it('refuses a rock claimed by someone else and a rock the player stood off', () => {
    expect(planMiningOrder({ ...base, claimedByOther: true })).toEqual({ ok: false, error: 'rock_claimed' });
    expect(planMiningOrder({ ...base, standOffUntilMs: NOW + 1 })).toEqual({ ok: false, error: 'standing_off' });
    const past = planMiningOrder({ ...base, standOffUntilMs: NOW - 1 });
    expect(past.ok).toBe(true);
  });

  it('quotes the pressure share and the expected units honestly', () => {
    const alone = planMiningOrder({ ...base });
    const shared = planMiningOrder({ ...base, sharedMiners: 2 });
    const claimed = planMiningOrder({ ...base, sharedMiners: 4, claimed: true });
    if (!alone.ok || !shared.ok || !claimed.ok) throw new Error('plan failed');
    expect(alone.pressureShare).toBe(1);
    expect(shared.pressureShare).toBeCloseTo(0.707, 3);
    expect(shared.order.sharedMiners).toBe(2);
    expect(shared.expectedUnits).toBeLessThan(alone.expectedUnits);
    expect(claimed.pressureShare).toBe(1);
    expect(claimed.order.claimed).toBe(true);
    expect(claimed.order.sharedMiners).toBe(1);
    // Schedule and fuel are the same: pressure costs units, not time.
    expect(shared.order.completesAtMs).toBe(alone.order.completesAtMs);
    expect(shared.order.fuelCost).toBe(alone.order.fuelCost);
    expect(shared.expectedValue).toBeLessThan(alone.expectedValue);
  });

  it('quotes shakedown odds by cover and none on a hold or in the Frontier', () => {
    const none = planMiningOrder({ ...base });
    const esc = planMiningOrder({ ...base, escortCover: 'assigned', escortInstanceId: 'cutter-1' });
    const hold = planMiningOrder({ ...base, thenAction: 'hold', escortCover: 'assigned', escortInstanceId: 'cutter-1' });
    const fr = planMiningOrder({ ...base, frontier: true });
    if (!none.ok || !esc.ok || !hold.ok || !fr.ok) throw new Error('plan failed');
    expect(none.shakedownOdds).toBe(0.12);
    expect(esc.shakedownOdds).toBeCloseTo(0.03, 6);
    expect(esc.order.escortInstanceId).toBe('cutter-1');
    expect(esc.expectedUnits).toBeGreaterThan(none.expectedUnits);
    expect(hold.shakedownOdds).toBe(0);
    expect(hold.order.escortInstanceId).toBeUndefined();
    expect(fr.shakedownOdds).toBe(0);
    expect(fr.expectedUnits).toBe(fr.order.fillUnits);
  });

  it('a return order quotes the toll too', () => {
    const r = planMiningOrder({ def: miner, cargoCapacity: 200, mode: 'return', originId: 'asteroid_belt', destinationId: 'ceres_surface', heldOre: { oreId: 'ore_metallic', units: 200, asteroidId: rockM.id, fieldId: rockM.fieldId }, nowMs: NOW, escortCover: 'stationed' });
    if (!r.ok) throw new Error('plan failed');
    expect(r.shakedownOdds).toBeCloseTo(0.06, 6);
    expect(r.expectedUnits).toBe(Math.round(200 - 0.06 * SHAKEDOWN_TAKE_SHARE * 200));
  });
});

describe('Escort Cutter', () => {
  const cutter = SHIP_MAP.get('escort_cutter')!;
  it('is a tier-3 security hull with no hold, no mining, no survey', () => {
    expect(cutter.role).toBe('security');
    expect(cutter.security).toBe(true);
    expect(cutter.tier).toBe(3);
    expect(cutter.cargoCapacity).toBe(0);
    expect(cutter.oreExtractionPerHour).toBeUndefined();
    expect(cutter.miningRate).toBeUndefined();
    expect(cutter.survey).toBeUndefined();
    expect(cutter.requiredResearch).toEqual(['spacecraft_armor', 'autonomous_docking']);
    const stats = getShipDerivedStats(cutter);
    expect(stats.pointDefenseRating).toBe(0.45);
    expect(stats.shieldingRating).toBe(0.30);
    expect(SHIP_CREW_PILOT_SHARE.security).toBeGreaterThan(0);
    expect(hullClassOf('escort_cutter')).toBe('servicer');
    expect(SHIPS.filter(s => s.security).map(s => s.id)).toEqual(['escort_cutter']);
  });

  it('has no field, target or op that could point it at another player', () => {
    // The only place a security hull is consumed is npc-shakedown.ts's
    // EscortCover, whose odds are a pure function of lane, cover and the
    // Frontier — no target profile appears anywhere in the signature.
    expect(shakedownOdds.length).toBe(3);
    expect(settleShakedown.length).toBe(5);
    expect(Object.keys(cutter)).not.toContain('target');
  });

  it('client escort resolution: candidates, stationed cover, invalid ids', () => {
    const s = getNewGameState();
    const ships: NonNullable<GameState['ships']> = [
      { instanceId: 'm1', definitionId: 'asteroid_miner', name: 'M1', status: 'idle', currentLocation: 'ceres_surface', isBuilt: true },
      { instanceId: 'c1', definitionId: 'escort_cutter', name: 'C1', status: 'idle', currentLocation: 'ceres_surface', isBuilt: true },
      { instanceId: 'c2', definitionId: 'escort_cutter', name: 'C2', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true },
      { instanceId: 'c3', definitionId: 'escort_cutter', name: 'C3', status: 'idle', currentLocation: 'leo', isBuilt: true },
      { instanceId: 'c4', definitionId: 'escort_cutter', name: 'C4', status: 'idle', currentLocation: 'asteroid_belt', isBuilt: true, escortingOrderId: 'o9' },
      { instanceId: 'c5', definitionId: 'escort_cutter', name: 'C5', status: 'in_transit', currentLocation: 'asteroid_belt', isBuilt: true },
    ];
    const state: GameState = { ...s, ships };
    expect(canEscort(ships[0])).toBe(false);
    expect(canEscort(ships[1])).toBe(true);
    expect(canEscort(ships[4])).toBe(false);
    expect(canEscort(ships[5])).toBe(false);
    expect(escortCandidates(state, 'ceres_surface', 'asteroid_belt').map(e => e.instanceId)).toEqual(['c1', 'c2']);
    expect(hasStationedEscort(state, 'asteroid_belt')).toBe(true);
    expect(hasStationedEscort(state, 'jupiter_system')).toBe(false);
    expect(resolveEscortCover(state, 'ceres_surface', 'asteroid_belt', 'c1')).toEqual({ cover: 'assigned', escortInstanceId: 'c1' });
    expect(resolveEscortCover(state, 'ceres_surface', 'asteroid_belt', 'c3')).toEqual({ cover: 'none', error: 'escort_invalid' });
    expect(resolveEscortCover(state, 'ceres_surface', 'asteroid_belt', 'c4')).toEqual({ cover: 'none', error: 'escort_invalid' });
    expect(resolveEscortCover(state, 'ceres_surface', 'asteroid_belt')).toEqual({ cover: 'stationed' });
    expect(resolveEscortCover(state, 'ceres_surface', 'jupiter_system')).toEqual({ cover: 'none' });
  });
});
