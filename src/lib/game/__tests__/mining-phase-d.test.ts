/**
 * @jest-environment node
 */
// ─── Mining Phase D — fittings through the mining loop ──────────────────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §8 row D.
//
// The claim Phase D has to earn: a fitted rig genuinely out-mines an unfitted
// one THROUGH THE SAME CODE PATH the engine already uses. There is no second
// yield formula — `planMiningOrder` takes a FittingProfile, derives the
// effective hull from it once, and every downstream number (fill, extraction
// seconds, batch size, propellant, transit, shakedown odds, product manifest)
// falls out of the formulas that were already there.
//
// It also has to be SAFE: the terms the settlement needs are frozen on the
// order at quote time, so a later refit cannot retroactively change what is in
// a hold or what odds a run was flown at.

import {
  ASTEROID_FIELD_MAP,
  LOCAL_INTEL_SALT,
  generateFieldRocks,
  rollAsteroidIntel,
  type AsteroidRock,
} from '../asteroids';
import { planMiningOrder, quoteLeg, type MiningPlan } from '../mining-orders';
import {
  FITTING_MAX_REFINERY_RECOVERY,
  fittingProfile,
  NEUTRAL_FITTING_PROFILE,
} from '../ship-fittings';
import { MOBILE_REFINERY_RECOVERY, refinedUnitTotal } from '../ore-refining';
import { FITTING_HARDENING_FLOOR, shakedownOdds, settleShakedown } from '../npc-shakedown';
import { SHIP_MAP } from '../ships';

const barge = SHIP_MAP.get('prospector_barge')!;
const refinery = SHIP_MAP.get('refinery_barge')!;
const cruiser = SHIP_MAP.get('survey_cruiser')!;

const nearEarth = ASTEROID_FIELD_MAP.get('field_near_earth')!;
const innerBelt = ASTEROID_FIELD_MAP.get('field_inner_belt')!;
const rocksNE = generateFieldRocks(nearEarth, 2);
const rocksIB = generateFieldRocks(innerBelt, 2);
const rockC: AsteroidRock = rocksNE.find(r => r.class === 'C')!;
const rockM: AsteroidRock = rocksIB.find(r => r.class === 'M')!;
const intelC = rollAsteroidIntel(rockC, LOCAL_INTEL_SALT);
const intelM = rollAsteroidIntel(rockM, LOCAL_INTEL_SALT);
const NOW = 1_800_000_000_000;

function plan(over: Partial<Parameters<typeof planMiningOrder>[0]> = {}): MiningPlan {
  const r = planMiningOrder({
    def: barge, cargoCapacity: barge.cargoCapacity, mode: 'mine',
    rock: rockC, intel: intelC, originId: 'leo', thenAction: 'return_store', nowMs: NOW,
    ...over,
  });
  if (!r.ok) throw new Error(`plan failed: ${r.error}`);
  return r;
}

describe('a fitted rig out-mines an unfitted one — same planner, same formulas', () => {
  it('a cutting head raises the rate and shortens the extraction, nothing else', () => {
    const bare = plan();
    const fitted = plan({ fitting: fittingProfile(['fit_laser_cluster']) });
    expect(fitted.order.ratePerHour).toBeGreaterThan(bare.order.ratePerHour);
    expect(fitted.order.ratePerHour).toBeCloseTo(bare.order.ratePerHour * 1.25, 1);
    // Same fill (the hold did not change), reached sooner.
    expect(fitted.order.fillUnits).toBe(bare.order.fillUnits);
    expect(fitted.extractionSeconds).toBeLessThan(bare.extractionSeconds);
  });

  it('a bigger hold raises the fill, which is the units that land', () => {
    const bare = plan();
    const fitted = plan({ fitting: fittingProfile(['fit_ore_compactor']) });
    expect(fitted.order.fillUnits).toBeGreaterThan(bare.order.fillUnits);
    expect(fitted.order.fillUnits).toBe(Math.floor(barge.cargoCapacity * 1.70));
    expect(fitted.expectedUnits).toBeGreaterThan(bare.expectedUnits);
    expect(fitted.expectedValue).toBeGreaterThan(bare.expectedValue);
  });

  it('the fill is never bigger than the FITTED hold — the client cannot over-promise', () => {
    // The old client preview used getShipCargoCapacity (freight capacity,
    // including client-owned modules.ts bays) while the server used the bare
    // hull. Phase D makes both sides scale the same bare number by the same
    // registered fit, so the quoted fill is the one the server will honour.
    const fit = fittingProfile(['fit_ore_hold']);
    const p = plan({ fitting: fit, fillUnits: 100_000 });
    expect(p.order.fillUnits).toBe(Math.floor(barge.cargoCapacity * fit.cargoMult));
  });

  it('the trade-off is real: the ore hold costs rate, the bore array costs hold', () => {
    const hold = plan({ fitting: fittingProfile(['fit_ore_hold']) });
    const bore = plan({ fitting: fittingProfile(['fit_bore_array']) });
    const bare = plan();
    expect(hold.order.fillUnits).toBeGreaterThan(bare.order.fillUnits);
    expect(hold.order.ratePerHour).toBeLessThan(bare.order.ratePerHour);
    expect(bore.order.ratePerHour).toBeGreaterThan(bare.order.ratePerHour);
    expect(bore.order.fillUnits).toBeLessThan(bare.order.fillUnits);
  });

  it('the per-class heads make the FIELD a decision, through the same rate term', () => {
    const iceOnC = plan({ fitting: fittingProfile(['fit_ice_extractor'], { rockClass: 'C' }) });
    const rakeOnC = plan({ fitting: fittingProfile(['fit_magnetic_rake'], { rockClass: 'C' }) });
    expect(iceOnC.order.ratePerHour).toBeGreaterThan(rakeOnC.order.ratePerHour);

    const onM = (ids: string[]) => plan({
      fitting: fittingProfile(ids, { rockClass: 'M' }),
      rock: rockM, intel: intelM, originId: 'asteroid_belt',
    });
    expect(onM(['fit_magnetic_rake']).order.ratePerHour).toBeGreaterThan(onM(['fit_ice_extractor']).order.ratePerHour);
  });
});

describe('the leg terms — propellant and time', () => {
  it('slot mass alone makes every leg thirstier', () => {
    const bare = plan();
    // The laser has no fuel term at all: the whole difference is its mass.
    const fitted = plan({ fitting: fittingProfile(['fit_laser_cluster']) });
    expect(fitted.order.fuelCost).toBeGreaterThan(bare.order.fuelCost);
  });

  it('an ion bank buys propellant with time; a Hall cluster buys time with propellant', () => {
    const bare = plan();
    const ion = plan({ fitting: fittingProfile(['fit_ion_drive']) });
    const hall = plan({ fitting: fittingProfile(['fit_hall_cluster']) });
    expect(ion.order.fuelCost).toBeLessThan(bare.order.fuelCost);
    expect(ion.transitOutSeconds).toBeGreaterThan(bare.transitOutSeconds);
    expect(hall.transitOutSeconds).toBeLessThan(bare.transitOutSeconds);
    expect(hall.order.fuelCost).toBeGreaterThan(bare.order.fuelCost);
  });

  it('quoteLeg clamps a malformed fitting term — no free legs', () => {
    const wild = quoteLeg('leo', 'lunar_orbit', 500, 2, 0, 1, { fittingFuelMult: -99, fittingTransitMult: 0 });
    const sane = quoteLeg('leo', 'lunar_orbit', 500, 2, 0, 1, { fittingFuelMult: 0.6, fittingTransitMult: 0.7 });
    expect(wild.fuel).toBe(sane.fuel);
    expect(wild.seconds).toBe(sane.seconds);
  });
});

describe('armour and the lane home', () => {
  const beltPlan = (ids: string[]) => plan({
    rock: rockM, intel: intelM, originId: 'asteroid_belt',
    fitting: ids.length > 0 ? fittingProfile(ids) : NEUTRAL_FITTING_PROFILE,
  });

  it('a Whipple belt lowers the odds and the expected toll', () => {
    const bare = beltPlan([]);
    const armoured = beltPlan(['fit_whipple_belt']);
    expect(bare.shakedownOdds).toBeGreaterThan(0);
    expect(armoured.shakedownOdds).toBeLessThan(bare.shakedownOdds);
    expect(armoured.expectedShakedownLoss).toBeLessThan(bare.expectedShakedownLoss);
  });

  it('a point-defence turret halves them, and hardening stacks under the escort term', () => {
    const none = shakedownOdds('asteroid_belt', 'none', false, 1);
    const pd = shakedownOdds('asteroid_belt', 'none', false, fittingProfile(['fit_pd_turret']).shakedownMult);
    const pdEscorted = shakedownOdds('asteroid_belt', 'assigned', false, fittingProfile(['fit_pd_turret']).shakedownMult);
    expect(pd).toBeCloseTo(none * 0.5, 4);
    expect(pdEscorted).toBeLessThan(pd);
  });

  it('no fit can drive the odds to zero — the hardening floor holds', () => {
    const floored = shakedownOdds('outer_system', 'none', false, 0);
    expect(floored).toBeCloseTo(shakedownOdds('outer_system', 'none', false, FITTING_HARDENING_FLOOR), 6);
    expect(floored).toBeGreaterThan(0);
  });

  it('a repelled raid still reads as repelled when it was the ARMOUR that turned it', () => {
    // Search the order-id space for a roll that lands between the hardened
    // odds and the bare odds: that is exactly the "the fit saved you" case.
    let sawRepel = false;
    for (let i = 0; i < 400 && !sawRepel; i++) {
      const o = settleShakedown(`ord-${i}`, 'outer_system', 'none', false, 100, 0.5);
      if (o.repelled) sawRepel = true;
    }
    expect(sawRepel).toBe(true);
  });
});

describe('the plant', () => {
  const refinePlan = (ids: string[]) => {
    const r = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'refine',
      rock: rockM, intel: intelM, originId: 'asteroid_belt', thenAction: 'return_store',
      fitting: ids.length > 0 ? fittingProfile(ids) : NEUTRAL_FITTING_PROFILE, nowMs: NOW,
    });
    if (!r.ok) throw new Error(`plan failed: ${r.error}`);
    return r;
  };

  it('a refinery pod lands more product from the same rock, and never beats a fixed refinery', () => {
    const bare = refinePlan([]);
    const podded = refinePlan(['fit_refinery_pod']);
    expect(podded.order.refineRecovery!).toBeGreaterThan(MOBILE_REFINERY_RECOVERY);
    expect(podded.order.refineRecovery!).toBeLessThanOrEqual(FITTING_MAX_REFINERY_RECOVERY);
    expect(refinedUnitTotal(podded.outputs)).toBeGreaterThan(0);
    expect(podded.expectedValue).toBeGreaterThan(0);
    expect(bare.order.refineRecovery).toBeUndefined();
  });

  it('a slag recycler trades plant throughput for recovery', () => {
    const bare = refinePlan([]);
    const recycled = refinePlan(['fit_slag_recycler']);
    expect(recycled.order.refineRecovery!).toBeGreaterThan(MOBILE_REFINERY_RECOVERY);
    expect(recycled.refiningSeconds / Math.max(1, recycled.order.fillUnits))
      .toBeGreaterThan(bare.refiningSeconds / Math.max(1, bare.order.fillUnits));
  });
});

describe('the sensor', () => {
  it('a survey array widens the sweep, and the pass takes proportionally longer', () => {
    const quote = (ids: string[]) => {
      const r = planMiningOrder({
        def: cruiser, cargoCapacity: cruiser.cargoCapacity, mode: 'survey',
        rock: rockM, intel: null, originId: 'asteroid_belt', nowMs: NOW,
        sweepTargets: rocksIB.filter(x => x.id !== rockM.id).slice(0, 12).map(x => x.id),
        fitting: ids.length > 0 ? fittingProfile(ids) : NEUTRAL_FITTING_PROFILE,
      });
      if (!r.ok) throw new Error(`plan failed: ${r.error}`);
      return r;
    };
    const bare = quote([]);
    const wide = quote(['fit_gravimetric_boom']);
    expect(wide.order.sweepAsteroidIds!.length).toBe(bare.order.sweepAsteroidIds!.length + 4);
    expect(wide.extractionSeconds).toBeGreaterThan(bare.extractionSeconds);
  });
});

describe('the frozen terms — a later refit cannot rewrite a flown order', () => {
  it('a fitted order carries its hardening and fit list', () => {
    const p = plan({ fitting: fittingProfile(['fit_whipple_belt']) });
    expect(p.order.fittingHardening).toBeCloseTo(0.75, 3);
    expect(p.order.fittingIds).toEqual(['fit_whipple_belt']);
  });

  it('only a REFINED order stamps a recovery — a mine order has no parcel to describe', () => {
    const mineOrder = plan({ fitting: fittingProfile(['fit_whipple_belt', 'fit_refinery_pod']) });
    expect(mineOrder.order.refineRecovery).toBeUndefined();

    const refineOrder = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'refine',
      rock: rockM, intel: intelM, originId: 'asteroid_belt', thenAction: 'return_store',
      fitting: fittingProfile(['fit_refinery_pod']), nowMs: NOW,
    });
    expect(refineOrder.ok).toBe(true);
    if (!refineOrder.ok) return;
    expect(refineOrder.order.refineRecovery).toBeCloseTo(MOBILE_REFINERY_RECOVERY + 0.05, 3);
  });

  it('a RETURN order carries the parcel\'s OWN recovery, not today\'s fit', () => {
    // The hull has been stripped of its pod since the parcel was made; the
    // return leg must still describe the concentrate that is actually aboard.
    const r = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'return',
      heldOre: { oreId: 'ore_metallic', units: 500, asteroidId: rockM.id, fieldId: rockM.fieldId, refined: true },
      originId: 'asteroid_belt', destinationId: 'earth_surface', thenAction: 'return_store',
      refineRecovery: 0.87, fitting: NEUTRAL_FITTING_PROFILE, nowMs: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.refineRecovery).toBeCloseTo(0.87, 6);
  });

  it('a bare hull stamps nothing, so a pre-Phase-D order is byte-identical', () => {
    const p = plan();
    expect(p.order.fittingHardening).toBeUndefined();
    expect(p.order.refineRecovery).toBeUndefined();
    expect(p.order.fittingIds).toBeUndefined();
    const explicitNeutral = plan({ fitting: NEUTRAL_FITTING_PROFILE });
    expect(explicitNeutral.order).toEqual(p.order);
  });

  it('the settlement rolls the odds the QUOTE recorded, not today\'s fit', () => {
    const quoted = 0.5;
    const settled = settleShakedown('ord-frozen', 'asteroid_belt', 'none', false, 100, quoted);
    expect(settled.odds).toBeCloseTo(shakedownOdds('asteroid_belt', 'none', false, quoted), 6);
    // A hull stripped after the order flew would settle at hardening 1 if the
    // settlement re-read the fit; it must not.
    expect(settled.odds).toBeLessThan(shakedownOdds('asteroid_belt', 'none', false, 1));
  });
});
