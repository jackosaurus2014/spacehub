// ─── Mining Phase C — refining, propellant depots, survey reports ───────────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §8 row C, docs/BALANCE.md Pass 15.
// Pure-module tests: the refinery ratios and the loss factor, the depot's
// capacity and refuel maths, survey-report ownership/purchase, and the
// server-authority boundary (a forged client claim gains nothing).

import {
  ASTEROID_FIELD_MAP,
  LOCAL_INTEL_SALT,
  generateFieldRocks,
  oreForRock,
  rollAsteroidIntel,
  type AsteroidRock,
} from '../asteroids';
import {
  FIXED_REFINERY_RECOVERY,
  MOBILE_REFINERY_RECOVERY,
  REFINERY_RECIPES,
  REFINE_MAX_BATCH_HOURS,
  REFINE_OPEX_SHARE,
  applyProductLoss,
  getRefineryRecipe,
  isRefinableOre,
  maxOreBatchForHold,
  maxOreBatchForTime,
  productValue,
  recipeValueRatio,
  refineOpex,
  refineOutputs,
  refineSeconds,
  refinedMassPerOreUnit,
  refinedUnitTotal,
} from '../ore-refining';
import {
  DEPOT_COVER_SHARE,
  DEPOT_FUEL_VALUE_PER_UNIT,
  DEPOT_SLOTS_FRONTIER_FIELD,
  DEPOT_SLOTS_PER_FIELD,
  checkDeployDepot,
  depotCashMargin,
  depotCoverage,
  depotRestockPricePerUnit,
  depotSlotsForFieldId,
  feedstockForPropellant,
  feedstockPropellant,
  firstFreeSlot,
} from '../propellant-depots';
import {
  REPORT_BROKER_FEE,
  REPORT_PRICE_MIN,
  checkBuyReport,
  checkListReport,
  listingFromRow,
  reportPriceBounds,
  reportSellerProceeds,
} from '../survey-reports';
import { advanceMiningOrders, planMiningOrder, type MiningPlan } from '../mining-orders';
import { RESOURCE_MAP, type ResourceId } from '../resources';
import { SHIP_MAP, type MiningOrder } from '../ships';
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';

const refinery = SHIP_MAP.get('refinery_barge')!;
const prospector = SHIP_MAP.get('prospector_barge')!;
const cruiser = SHIP_MAP.get('survey_cruiser')!;
const depotShip = SHIP_MAP.get('propellant_depot_ship')!;
const innerBelt = ASTEROID_FIELD_MAP.get('field_inner_belt')!;
const rocksIB = generateFieldRocks(innerBelt, 2);
const rockM: AsteroidRock = rocksIB.find(r => r.class === 'M')!;
const intelM = rollAsteroidIntel(rockM, LOCAL_INTEL_SALT);
const NOW = 1_800_000_000_000;

// ─── Recipes, ratios, loss ──────────────────────────────────────────────────

describe('refinery recipes', () => {
  it('covers all four ore classes and nothing else', () => {
    expect(REFINERY_RECIPES).toHaveLength(4);
    expect(REFINERY_RECIPES.map(r => r.oreId).sort()).toEqual(['ore_carbonaceous', 'ore_exotic', 'ore_metallic', 'ore_silicate']);
    expect(isRefinableOre('ore_metallic')).toBe(true);
    expect(isRefinableOre('iron')).toBe(false);
    expect(isRefinableOre(null)).toBe(false);
  });

  it('only produces resources the market already trades', () => {
    for (const recipe of REFINERY_RECIPES) {
      for (const out of recipe.outputs) {
        expect(RESOURCE_MAP.get(out.resourceId)).toBeDefined();
      }
    }
  });

  it('yields the authored ratio at full recovery', () => {
    // Metallic: 15 steel + 1.6 platinum-group + 1 gold per 100 ore.
    expect(refineOutputs('ore_metallic', 1000, 1)).toEqual({ steel_ingots: 150, platinum_group: 16, gold: 10 });
    expect(refineOutputs('ore_carbonaceous', 1000, 1)).toEqual({ lunar_water: 120, ammonia: 200, organic_compounds: 20 });
    expect(refineOutputs('ore_silicate', 1000, 1)).toEqual({ steel_ingots: 180, aluminum_alloy: 50 });
    expect(refineOutputs('ore_exotic', 1000, 1)).toEqual({ exotic_materials: 55, rare_earth: 80, refined_rare_earth: 6 });
  });

  it('applies the mobile plant loss factor of 18%', () => {
    const full = refineOutputs('ore_metallic', 10_000, 1);
    const mobile = refineOutputs('ore_metallic', 10_000, MOBILE_REFINERY_RECOVERY);
    expect(MOBILE_REFINERY_RECOVERY).toBeCloseTo(0.82, 5);
    expect(mobile.steel_ingots).toBe(Math.round(full.steel_ingots * MOBILE_REFINERY_RECOVERY));
    expect(refinedUnitTotal(mobile)).toBeLessThan(refinedUnitTotal(full));
    // A fixed plant recovers more — the design's "mobile refining at a lower
    // ratio than a fixed refinery".
    expect(FIXED_REFINERY_RECOVERY).toBeGreaterThan(MOBILE_REFINERY_RECOVERY);
    expect(refinedUnitTotal(refineOutputs('ore_metallic', 10_000, FIXED_REFINERY_RECOVERY))).toBeGreaterThan(refinedUnitTotal(mobile));
  });

  it('is worth more refined than raw, for every class, at base prices', () => {
    for (const recipe of REFINERY_RECIPES) {
      const full = recipeValueRatio(recipe.oreId, 1);
      const mobile = recipeValueRatio(recipe.oreId, MOBILE_REFINERY_RECOVERY);
      expect(full).toBeGreaterThan(1.5);
      expect(full).toBeLessThan(2.2);      // no class is a dominant refine
      expect(mobile).toBeGreaterThan(1.2); // still worth doing after the loss
      expect(mobile).toBeLessThan(full);   // ...but the loss is real
    }
  });

  it('prices the opex as a share of the ore processed, never of what it sells for', () => {
    const ore = RESOURCE_MAP.get('ore_metallic' as ResourceId)!.baseMarketPrice;
    expect(refineOpex('ore_metallic', 1_000)).toBe(Math.round(ore * REFINE_OPEX_SHARE * 1_000));
    expect(refineOpex('ore_metallic', 0)).toBe(0);
  });

  it('makes the hold carry the concentrate, not the rock', () => {
    const mass = refinedMassPerOreUnit('ore_metallic');
    expect(mass).toBeGreaterThan(0);
    expect(mass).toBeLessThan(0.25);
    const batch = maxOreBatchForHold('ore_metallic', refinery.cargoCapacity);
    expect(batch).toBeGreaterThan(refinery.cargoCapacity * 5);
    // What comes out fits in the hold.
    expect(refinedUnitTotal(refineOutputs('ore_metallic', batch))).toBeLessThanOrEqual(refinery.cargoCapacity);
  });

  it('caps a single order at REFINE_MAX_BATCH_HOURS of hull time', () => {
    const cap = maxOreBatchForTime(140, 1_200);
    const hours = cap / 140 + cap / 1_200;
    expect(hours).toBeLessThanOrEqual(REFINE_MAX_BATCH_HOURS + 0.01);
    expect(refineSeconds(1_200, 1_200)).toBe(3_600);
  });

  it('takes a proportional toll off the top of a product manifest', () => {
    const products = refineOutputs('ore_metallic', 10_000);
    const total = refinedUnitTotal(products);
    const { outputs, unitsLost } = applyProductLoss(products, 0.25);
    expect(unitsLost).toBe(Math.round(total * 0.25));
    expect(refinedUnitTotal(outputs)).toBe(total - unitsLost);
    // Nothing is lost when the toll is zero.
    expect(applyProductLoss(products, 0).unitsLost).toBe(0);
    // A total loss cannot take more than is there.
    expect(applyProductLoss(products, 1).unitsLost).toBe(total);
  });
});

// ─── The refine order ───────────────────────────────────────────────────────

function refinePlan(over: Partial<Parameters<typeof planMiningOrder>[0]> = {}): MiningPlan {
  const r = planMiningOrder({
    def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'refine', rock: rockM, intel: intelM,
    originId: 'ceres_surface', thenAction: 'return_store', nowMs: NOW, ...over,
  });
  if (!r.ok) throw new Error(`plan failed: ${r.error}`);
  return r;
}

describe('refine orders', () => {
  it('runs the plant after extraction and before the leg home', () => {
    const plan = refinePlan();
    expect(plan.order.mode).toBe('refine');
    expect(plan.order.refined).toBe(true);
    expect(plan.refiningSeconds).toBeGreaterThan(0);
    expect(plan.order.refineEndsAtMs!).toBeGreaterThan(plan.order.miningEndsAtMs);
    expect(plan.order.completesAtMs).toBeGreaterThanOrEqual(plan.order.refineEndsAtMs!);
    expect(plan.order.refineOpex).toBe(refineOpex('ore_metallic', plan.order.fillUnits));
  });

  it('lands product, not ore, and charges the recovery loss', () => {
    const plan = refinePlan({ thenAction: 'hold' });
    expect(plan.outputs).toEqual(refineOutputs('ore_metallic', plan.order.fillUnits, MOBILE_REFINERY_RECOVERY));
    expect(refinedUnitTotal(plan.outputs)).toBeLessThanOrEqual(refinery.cargoCapacity);
    expect(plan.expectedValue).toBe(productValue(plan.outputs));
  });

  it('is worth more per trip than hauling the same rock raw', () => {
    const refined = refinePlan({ thenAction: 'return_sell' });
    const raw = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'mine', rock: rockM, intel: intelM,
      originId: 'ceres_surface', thenAction: 'return_sell', nowMs: NOW,
    });
    if (!raw.ok) throw new Error('raw plan failed');
    expect(refined.expectedValue).toBeGreaterThan(raw.expectedValue);
    // ...and it works far more ore per trip home.
    expect(refined.order.fillUnits).toBeGreaterThan(raw.order.fillUnits * 2);
  });

  it('refuses a hull with no plant, and ore with no recipe', () => {
    const noPlant = planMiningOrder({
      def: prospector, cargoCapacity: prospector.cargoCapacity, mode: 'refine', rock: rockM, intel: intelM,
      originId: 'ceres_surface', nowMs: NOW,
    });
    expect(noPlant.ok).toBe(false);
    if (!noPlant.ok) expect(noPlant.error).toBe('ship_cannot_refine');
  });

  it('processes a held parcel in place with no extraction leg', () => {
    const r = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'refine',
      originId: 'asteroid_belt', thenAction: 'hold', nowMs: NOW,
      heldOre: { oreId: 'ore_metallic', units: 400, asteroidId: rockM.id, fieldId: innerBelt.id },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extractionSeconds).toBe(0);
    expect(r.refiningSeconds).toBe(refineSeconds(400, refinery.refineOrePerHour!));
    expect(r.order.refined).toBe(true);
    // Refining an already-refined parcel is refused.
    const again = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'refine',
      originId: 'asteroid_belt', nowMs: NOW,
      heldOre: { oreId: 'ore_metallic', units: 400, asteroidId: rockM.id, fieldId: innerBelt.id, refined: true },
    });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe('nothing_to_refine');
  });

  it('flies a refined parcel home as product on a return order', () => {
    const r = planMiningOrder({
      def: refinery, cargoCapacity: refinery.cargoCapacity, mode: 'return',
      originId: 'asteroid_belt', destinationId: 'earth_surface', thenAction: 'return_store', nowMs: NOW,
      heldOre: { oreId: 'ore_metallic', units: 2_000, asteroidId: rockM.id, fieldId: innerBelt.id, refined: true },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.order.refined).toBe(true);
    expect(refinedUnitTotal(r.outputs)).toBeGreaterThan(0);
    expect(r.expectedValue).toBe(productValue(r.outputs));
  });
});

// ─── Survey sweeps ──────────────────────────────────────────────────────────

describe('survey sweeps', () => {
  it('reveals one rock per pass on a plain survey hull and six on the cruiser', () => {
    const single = planMiningOrder({
      def: prospector, cargoCapacity: prospector.cargoCapacity, mode: 'survey', rock: rockM, originId: 'asteroid_belt', nowMs: NOW,
    });
    expect(single.ok).toBe(true);
    if (single.ok) {
      expect(single.order.sweepAsteroidIds).toBeUndefined();
      expect(single.order.completesAtMs).toBe(single.order.arrivesAtMs);
    }
    const extra = rocksIB.filter(r => r.id !== rockM.id).slice(0, 8).map(r => r.id);
    const sweep = planMiningOrder({
      def: cruiser, cargoCapacity: 0, mode: 'survey', rock: rockM, originId: 'asteroid_belt', nowMs: NOW, sweepTargets: extra,
    });
    expect(sweep.ok).toBe(true);
    if (!sweep.ok) return;
    expect(sweep.order.sweepAsteroidIds).toHaveLength(cruiser.surveySweep!);
    expect(sweep.order.sweepAsteroidIds![0]).toBe(rockM.id);
    // A sweep takes real hull time and only reveals when the pass ENDS.
    expect(sweep.order.completesAtMs).toBeGreaterThan(sweep.order.arrivesAtMs);
  });
});

// ─── Propellant depots ──────────────────────────────────────────────────────

describe('propellant depots', () => {
  it('gives every field two slots and the Frontier field three', () => {
    expect(depotSlotsForFieldId('field_inner_belt')).toBe(DEPOT_SLOTS_PER_FIELD);
    expect(depotSlotsForFieldId('field_near_earth')).toBe(DEPOT_SLOTS_FRONTIER_FIELD);
    expect(firstFreeSlot('field_inner_belt', [])).toBe(0);
    expect(firstFreeSlot('field_inner_belt', [0])).toBe(1);
    expect(firstFreeSlot('field_inner_belt', [0, 1])).toBeNull();
    expect(firstFreeSlot('field_near_earth', [0, 1])).toBe(2);
  });

  it('covers at most DEPOT_COVER_SHARE of a bill, and never more than the tank holds', () => {
    const bill = 10_000_000;
    const plenty = depotCoverage(bill, 5_000);
    expect(plenty.covered).toBe(Math.floor(bill * DEPOT_COVER_SHARE));
    expect(plenty.cashFuel).toBe(bill - plenty.covered);
    expect(plenty.unitsDrawn).toBeCloseTo(plenty.covered / DEPOT_FUEL_VALUE_PER_UNIT, 3);
    // A nearly empty tank covers only what it has.
    const thin = depotCoverage(bill, 2);
    expect(thin.covered).toBe(2 * DEPOT_FUEL_VALUE_PER_UNIT);
    expect(thin.cashFuel).toBe(bill - thin.covered);
    // Nothing in the tank, nothing covered.
    expect(depotCoverage(bill, 0)).toEqual({ covered: 0, unitsDrawn: 0, cashFuel: bill });
  });

  it('is cheap to stock in cislunar space and a loss past Neptune', () => {
    expect(depotCashMargin('field_near_earth')).toBeGreaterThan(0);
    expect(depotCashMargin('field_inner_belt')).toBeGreaterThan(0);
    expect(depotCashMargin('field_kuiper')).toBeLessThan(0);
    expect(depotRestockPricePerUnit('field_kuiper')).toBeGreaterThan(depotRestockPricePerUnit('field_inner_belt'));
  });

  it('cracks locally refined volatiles into propellant', () => {
    expect(feedstockPropellant('rocket_fuel', 100)).toBe(100);
    expect(feedstockPropellant('lunar_water', 100)).toBe(80);
    expect(feedstockPropellant('ammonia', 100)).toBe(50);
    expect(feedstockPropellant('iron', 100)).toBe(0);
    expect(feedstockForPropellant('lunar_water', 80)).toBe(100);
  });

  it('refuses a deployment that is not a depot ship, not on station, or on a full field', () => {
    const base = { fieldId: 'field_inner_belt', depotCapacity: depotShip.depotCapacity!, shipLocationId: 'asteroid_belt', shipBusy: false, shipAlreadyDeployed: false, takenSlots: [] as number[] };
    expect(checkDeployDepot(base)).toEqual({ ok: true, slotIndex: 0, capacity: depotShip.depotCapacity });
    expect(checkDeployDepot({ ...base, depotCapacity: 0 })).toEqual({ ok: false, error: 'not_depot_ship' });
    expect(checkDeployDepot({ ...base, shipLocationId: 'leo' })).toEqual({ ok: false, error: 'ship_not_at_field' });
    expect(checkDeployDepot({ ...base, shipBusy: true })).toEqual({ ok: false, error: 'ship_busy' });
    expect(checkDeployDepot({ ...base, shipAlreadyDeployed: true })).toEqual({ ok: false, error: 'already_deployed' });
    expect(checkDeployDepot({ ...base, takenSlots: [0, 1] })).toEqual({ ok: false, error: 'field_full' });
    expect(checkDeployDepot({ ...base, fieldId: 'nope' })).toEqual({ ok: false, error: 'unknown_field' });
  });

  it('discounts the fuel bill of a mining order when the depot is stocked', () => {
    const plain = refinePlan();
    const supplied = refinePlan({ depotStockUnits: 5_000 });
    expect(supplied.depotCovered).toBeGreaterThan(0);
    expect(supplied.order.fuelCost).toBeLessThan(plain.order.fuelCost);
    expect(supplied.fuelBeforeDepot).toBe(plain.order.fuelCost);
    expect(supplied.order.fuelCost + supplied.depotCovered).toBe(supplied.fuelBeforeDepot);
  });
});

// ─── Survey reports ─────────────────────────────────────────────────────────

describe('survey reports', () => {
  it('prices a listing inside a band that scales with the rock', () => {
    const bounds = reportPriceBounds(rockM, intelM);
    expect(bounds.min).toBe(REPORT_PRICE_MIN);
    expect(bounds.suggested).toBeGreaterThanOrEqual(bounds.min);
    expect(bounds.suggested).toBeLessThanOrEqual(bounds.max);
    // A richer rock is worth more to know about.
    const richer = reportPriceBounds(rockM, { grade: intelM.grade * 2, reserve: intelM.reserve * 2 });
    expect(richer.suggested).toBeGreaterThan(bounds.suggested);
  });

  it('pays the seller the price minus a burned broker cut', () => {
    const price = 4_000_000;
    expect(reportSellerProceeds(price)).toBe(Math.round(price * (1 - REPORT_BROKER_FEE)));
    expect(price - reportSellerProceeds(price)).toBeGreaterThan(0);
  });

  it('only lists a survey the corporation actually holds, of the current generation', () => {
    const bounds = reportPriceBounds(rockM, intelM);
    expect(checkListReport({ rock: rockM, intel: intelM, surveyEffective: true, exhausted: false, price: bounds.suggested }))
      .toMatchObject({ ok: true, price: bounds.suggested });
    expect(checkListReport({ rock: rockM, intel: null, surveyEffective: false, exhausted: false, price: bounds.suggested }))
      .toMatchObject({ ok: false, error: 'not_surveyed' });
    expect(checkListReport({ rock: rockM, intel: intelM, surveyEffective: false, exhausted: false, price: bounds.suggested }))
      .toMatchObject({ ok: false, error: 'stale_survey' });
    expect(checkListReport({ rock: rockM, intel: intelM, surveyEffective: true, exhausted: true, price: bounds.suggested }))
      .toMatchObject({ ok: false, error: 'rock_exhausted' });
    expect(checkListReport({ rock: rockM, intel: intelM, surveyEffective: true, exhausted: false, price: 1 }))
      .toMatchObject({ ok: false, error: 'price_out_of_band' });
    expect(checkListReport({ rock: rockM, intel: intelM, surveyEffective: true, exhausted: false, price: bounds.max + 1 }))
      .toMatchObject({ ok: false, error: 'price_out_of_band' });
  });

  it('refuses to sell you your own report, or one you already have the survey for', () => {
    const base = { rock: rockM, listed: true, price: 2_000_000, sellerIsMe: false, buyerAlreadySurveyed: false, money: 1e12 };
    expect(checkBuyReport(base)).toMatchObject({ ok: true, price: 2_000_000, sellerProceeds: reportSellerProceeds(2_000_000) });
    expect(checkBuyReport({ ...base, sellerIsMe: true })).toMatchObject({ ok: false, error: 'own_report' });
    expect(checkBuyReport({ ...base, buyerAlreadySurveyed: true })).toMatchObject({ ok: false, error: 'already_surveyed' });
    expect(checkBuyReport({ ...base, listed: false })).toMatchObject({ ok: false, error: 'not_listed' });
    expect(checkBuyReport({ ...base, money: 1_000 })).toMatchObject({ ok: false, error: 'insufficient_funds' });
  });

  it('publishes the catalogue facts and the price — never the intel', () => {
    const listing = listingFromRow({
      id: 'sv1', asteroidId: rockM.id, fieldId: innerBelt.id, listedPrice: 3_000_000,
      listedAt: NOW, surveyedAt: NOW - 1000, soldCount: 2, sellerName: 'Helios Extraction',
    });
    expect(listing).toMatchObject({ asteroidId: rockM.id, rockName: rockM.name, rockClass: 'M', price: 3_000_000, sellerName: 'Helios Extraction', soldCount: 2 });
    const keys = Object.keys(listing);
    expect(keys).not.toContain('grade');
    expect(keys).not.toContain('reserve');
    expect(keys).not.toContain('risk');
  });
});

// ─── Server authority ───────────────────────────────────────────────────────

function shipWithOrder(order: MiningOrder) {
  return {
    instanceId: 'ship-1', definitionId: 'refinery_barge', name: 'SN-Plant-1', status: 'idle' as const,
    currentLocation: 'asteroid_belt', isBuilt: true, miningOrder: order,
  };
}

function stateWithOrder(order: MiningOrder): GameState {
  const s = getNewGameState();
  return { ...s, money: 1_000_000_000, ships: [shipWithOrder(order)] };
}

describe('server authority on refined product', () => {
  const plan = refinePlan({ thenAction: 'return_store', nowMs: NOW });

  it('credits nothing for a server-authoritative order — the ledger does', () => {
    const order: MiningOrder = { ...plan.order, id: 'ord-1', serverAuthoritative: true };
    const state = stateWithOrder(order);
    const after = advanceMiningOrders(state, order.completesAtMs + 1);
    const ship = after.ships![0];
    expect(ship.miningOrder).toBeUndefined();
    expect(ship.status).toBe('idle');
    // Not one unit of product, not one dollar, from the client tick.
    for (const slug of Object.keys(plan.outputs)) {
      expect((after.resources as Record<string, number>)[slug] || 0).toBe((state.resources as Record<string, number>)[slug] || 0);
    }
    expect(after.money).toBe(state.money);
  });

  it('a forged fill or manifest on a server order still credits nothing', () => {
    const forged: MiningOrder = {
      ...plan.order, id: 'ord-2', serverAuthoritative: true,
      fillUnits: 9_999_999,
      outputs: { platinum_group: 100_000 },
    };
    const state = stateWithOrder(forged);
    const after = advanceMiningOrders(state, forged.completesAtMs + 1);
    expect((after.resources as Record<string, number>).platinum_group || 0).toBe((state.resources as Record<string, number>).platinum_group || 0);
    expect(after.money).toBe(state.money);
  });

  it('local-only play settles the manifest itself, from the pure recipe', () => {
    const order: MiningOrder = { ...plan.order, id: 'ord-3', serverAuthoritative: false };
    const state = stateWithOrder(order);
    const after = advanceMiningOrders(state, order.completesAtMs + 1);
    const expected = refineOutputs(order.oreId, order.fillUnits, MOBILE_REFINERY_RECOVERY);
    // The cargo lands where it was sent: a remote destination stockpiles it
    // locally (cargo-logistics creditArrivalCargo), home goes to the pool.
    const landedAt = (slug: string) => ((after.locationInventories || {})[order.destinationId]?.[slug] || 0)
      + ((after.resources as Record<string, number>)[slug] || 0)
      - ((state.resources as Record<string, number>)[slug] || 0);
    let anyLanded = 0;
    // The shakedown may take a slice; what lands is never MORE than the recipe.
    for (const [slug, qty] of Object.entries(expected)) {
      expect(landedAt(slug)).toBeLessThanOrEqual(qty);
      anyLanded += landedAt(slug);
    }
    expect(anyLanded).toBeGreaterThan(0);
    // Ore itself never reaches inventory on a refine run.
    expect(landedAt(oreForRock(rockM))).toBe(0);
    // The opex was paid.
    expect(after.money).toBe(state.money - (order.refineOpex || 0));
  });

  it('holds refined product aboard and brings it home on a later return order', () => {
    const holdPlan = refinePlan({ thenAction: 'hold' });
    const order: MiningOrder = { ...holdPlan.order, id: 'ord-4', serverAuthoritative: false };
    const after = advanceMiningOrders(stateWithOrder(order), order.completesAtMs + 1);
    const held = after.ships![0].heldOre;
    expect(held).toBeDefined();
    expect(held!.refined).toBe(true);
    expect(held!.oreId).toBe('ore_metallic');
    expect(held!.units).toBe(order.fillUnits);
  });
});

describe('recipe lookup helpers', () => {
  it('maps a rock class to its recipe', () => {
    expect(getRefineryRecipe(oreForRock(rockM))!.class).toBe('M');
    expect(getRefineryRecipe('iron')).toBeUndefined();
  });
});
