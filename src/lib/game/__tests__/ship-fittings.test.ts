// ─── Ship fittings (mining Phase D) — the registry and its arithmetic ───────
// docs/SPACE_MINING_DESIGN_2026-09-12.md §5 "Modules over new hulls", §8 row D.
//
// Three obligations, and they pull against each other the way the money
// ceiling's do:
//   1. A FIT MUST BE A TRADE-OFF. Slot points, one-per-group and the mass
//      penalty have to make "bolt everything on" impossible. `tradeoffs` below
//      is the proof.
//   2. THE REGISTRY MUST BE WELL FORMED. Every gate has to name research that
//      exists, every hardpoint has to exist on some hull, every fitting has to
//      change something. A dead entry in this table is a lie in the console.
//   3. THE LAYER BOUNDARY MUST HOLD. Fittings reach the Mining Order loop and
//      nothing else; modules.ts keeps the legacy trickle. If that ever stops
//      being true, resource-plausibility.ts MAX_SHIP_MODULE_MINING_MULT is
//      wrong and the resource clamp starts rejecting honest ore.

import {
  FITTINGS,
  FITTING_CLAMPS,
  FITTING_MAP,
  FITTING_MAX_REFINERY_RECOVERY,
  FITTING_SALVAGE_SHARE,
  FITTING_SECONDS_PER_SLOT,
  FITTING_SLOT_FUEL_PENALTY,
  FITTING_YARD_FEE,
  MAX_FITTING_CARGO_MULT,
  MAX_FITTING_ORE_RATE_MULT,
  NEUTRAL_FITTING_PROFILE,
  activeFittingProfile,
  bestFitFor,
  effectiveShipDefinition,
  fittingPrice,
  fittingProfile,
  fittingUpkeep,
  fleetFittingUpkeep,
  hullSlotBudget,
  quoteRefit,
  readFittingRecord,
  sanitizeFittingIds,
  slotsUsedBy,
  validateFit,
  type FittingGroup,
} from '../ship-fittings';
import { SHIP_MAP, SHIPS, getShipDerivedStats } from '../ships';
import { RESEARCH } from '../research-tree';
import { MODULES } from '../modules';
import { FIXED_REFINERY_RECOVERY, MOBILE_REFINERY_RECOVERY } from '../ore-refining';
import { getNewGameState, migrateLoadedState } from '../save-load';
import { CLIENT_APPLIED_LEDGER_REASONS } from '../ledger-reconcile';
import type { GameState } from '../types';

const barge = SHIP_MAP.get('prospector_barge')!;
const refinery = SHIP_MAP.get('refinery_barge')!;
const cruiser = SHIP_MAP.get('survey_cruiser')!;
const hauler = SHIP_MAP.get('hauler')!;
const ALL_RESEARCH = RESEARCH.map(r => r.id);

describe('registry integrity', () => {
  it('ids are unique and every entry is in the map', () => {
    const ids = FITTINGS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(FITTING_MAP.get(id)!.id).toBe(id);
  });

  it('every research gate names a real technology', () => {
    for (const f of FITTINGS) {
      for (const r of f.requiredResearch) {
        expect(ALL_RESEARCH).toContain(r);
      }
    }
  });

  it('every fitting is legal on at least one hull, and changes at least one quantity', () => {
    for (const f of FITTINGS) {
      const host = SHIPS.find(s => {
        if (f.roles && f.roles.length > 0 && !f.roles.includes(s.role)) return false;
        return getShipDerivedStats(s).hardpointTypes.includes(f.hardpoint) && hullSlotBudget(s) >= f.slotCost;
      });
      expect(host ? f.id : `${f.id} fits no hull in the roster`).toBe(f.id);
      const effectKeys = Object.keys(f.effects).filter(k => {
        const v = (f.effects as Record<string, unknown>)[k];
        return typeof v === 'number' ? v !== 0 : !!v;
      });
      expect(effectKeys.length > 0 ? f.id : `${f.id} has no effect`).toBe(f.id);
    }
  });

  it('covers all six groups, and every group offers a real choice', () => {
    const groups = new Set<FittingGroup>(FITTINGS.map(f => f.group));
    expect(Array.from(groups).sort()).toEqual(['armour', 'drive', 'extraction', 'hold', 'plant', 'sensor']);
    for (const g of groups) {
      expect(FITTINGS.filter(f => f.group === g).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('prices scale with the host hull, so one table is honest on a barge and on a flagship', () => {
    const laser = FITTING_MAP.get('fit_laser_cluster')!;
    const onBarge = fittingPrice(laser, barge);
    const onDeepSpace = fittingPrice(laser, SHIP_MAP.get('deep_space_miner')!);
    expect(onBarge).toBeGreaterThan(0);
    expect(onDeepSpace).toBeGreaterThan(onBarge * 3);
  });
});

describe('tradeoffs — a fit is never a strictly-additive upgrade', () => {
  it('a hull cannot carry two fittings from the same group', () => {
    const two = validateFit(barge, ['fit_laser_cluster', 'fit_bore_array'], ALL_RESEARCH);
    expect(two.ok).toBe(false);
    expect(two.error).toBe('group_conflict');
  });

  it('the slot budget is the hull\'s own derived moduleSlots, and it binds', () => {
    expect(hullSlotBudget(barge)).toBe(getShipDerivedStats(barge).moduleSlots);
    const budget = hullSlotBudget(barge);
    // Three two-slot fittings from three different groups is 6 points, all on
    // hardpoints the barge has; its budget is 5, so the refusal must be about
    // SLOTS, not about groups or hardpoints.
    const greedy = ['fit_bore_array', 'fit_ore_compactor', 'fit_refinery_pod'];
    expect(slotsUsedBy(greedy)).toBeGreaterThan(budget);
    const v = validateFit(barge, greedy, ALL_RESEARCH);
    expect(v.ok).toBe(false);
    expect(v.error).toBe('slots_exceeded');
  });

  it('every slot point consumed costs propellant on every leg, forever', () => {
    const one = fittingProfile(['fit_laser_cluster']);          // 1 point, no fuel term
    const two = fittingProfile(['fit_bore_array']);             // 2 points, no fuel term
    expect(one.fuelMult).toBeCloseTo(1 + FITTING_SLOT_FUEL_PENALTY, 5);
    expect(two.fuelMult).toBeCloseTo(1 + 2 * FITTING_SLOT_FUEL_PENALTY, 5);
    expect(two.fuelMult).toBeGreaterThan(one.fuelMult);
  });

  it('the strong fittings cost two slots and carry an explicit downside', () => {
    for (const f of FITTINGS.filter(x => x.slotCost === 2)) {
      const e = f.effects;
      const downside = (e.cargoPct ?? 0) < 0 || (e.oreRatePct ?? 0) < 0 || (e.fuelPct ?? 0) > 0
        || (e.transitPct ?? 0) > 0 || (e.hullWearPct ?? 0) > 0 || (e.refineRatePct ?? 0) < 0;
      expect(downside ? f.id : `${f.id} is a free win`).toBe(f.id);
    }
  });

  it('a fit bills upkeep every game-month for as long as it stays on', () => {
    const ids = ['fit_bore_array', 'fit_ore_hold'];
    expect(fittingUpkeep(ids, barge)).toBeGreaterThan(0);
    expect(fittingUpkeep([], barge)).toBe(0);
  });

  it('the per-class heads are a real geography decision, not a straight buff', () => {
    const iceOnC = fittingProfile(['fit_ice_extractor'], { rockClass: 'C' });
    const iceOnM = fittingProfile(['fit_ice_extractor'], { rockClass: 'M' });
    const rakeOnM = fittingProfile(['fit_magnetic_rake'], { rockClass: 'M' });
    const rakeOnC = fittingProfile(['fit_magnetic_rake'], { rockClass: 'C' });
    expect(iceOnC.oreRateMult).toBeGreaterThan(1);
    expect(iceOnM.oreRateMult).toBeLessThan(1);
    expect(rakeOnM.oreRateMult).toBeGreaterThan(1);
    expect(rakeOnC.oreRateMult).toBeLessThan(1);
    expect(iceOnC.oreRateMult).toBeGreaterThan(rakeOnC.oreRateMult);
    expect(rakeOnM.oreRateMult).toBeGreaterThan(iceOnM.oreRateMult);
  });
});

describe('validation', () => {
  it('refuses a hardpoint the hull does not have', () => {
    // The Hauler exposes cargo / engine only — no drone mount for a cutting head.
    expect(getShipDerivedStats(hauler).hardpointTypes).not.toContain('drone');
    const v = validateFit(hauler, ['fit_laser_cluster'], ALL_RESEARCH);
    expect(v.ok).toBe(false);
    expect(v.error).toBe('no_hardpoint');
  });

  it('refuses a role the fitting does not belong on', () => {
    // The gravimetric boom is a survey-hull fitting.
    const v = validateFit(barge, ['fit_gravimetric_boom'], ALL_RESEARCH);
    expect(v.ok).toBe(false);
    expect(['role_incompatible', 'no_hardpoint']).toContain(v.error);
    expect(validateFit(cruiser, ['fit_gravimetric_boom'], ALL_RESEARCH).ok).toBe(true);
  });

  it('refuses a fitting whose research is not complete', () => {
    const v = validateFit(barge, ['fit_bore_array'], []);
    expect(v.ok).toBe(false);
    expect(v.error).toBe('research_missing');
  });

  it('refuses a duplicate and an unknown id', () => {
    expect(validateFit(barge, ['fit_laser_cluster', 'fit_laser_cluster'], ALL_RESEARCH).error).toBe('duplicate_fitting');
    expect(validateFit(barge, ['fit_nonexistent'], ALL_RESEARCH).error).toBe('unknown_fitting');
  });

  it('sanitizeFittingIds drops anything not in the registry, de-duplicates and bounds', () => {
    expect(sanitizeFittingIds(['fit_laser_cluster', 'fit_laser_cluster', 'nope', 42, null]))
      .toEqual(['fit_laser_cluster']);
    expect(sanitizeFittingIds('fit_laser_cluster')).toEqual([]);
    expect(sanitizeFittingIds(null)).toEqual([]);
  });
});

describe('effect math', () => {
  it('the neutral profile changes nothing', () => {
    expect(NEUTRAL_FITTING_PROFILE.oreRateMult).toBe(1);
    expect(NEUTRAL_FITTING_PROFILE.cargoMult).toBe(1);
    expect(NEUTRAL_FITTING_PROFILE.refineRecovery).toBe(MOBILE_REFINERY_RECOVERY);
    expect(effectiveShipDefinition(barge, NEUTRAL_FITTING_PROFILE)).toBe(barge);
  });

  it('the effective hull is the bare hull scaled — no second formula', () => {
    const p = fittingProfile(['fit_bore_array', 'fit_ore_hold']);
    const eff = effectiveShipDefinition(barge, p);
    expect(eff.oreExtractionPerHour).toBeCloseTo(barge.oreExtractionPerHour! * p.oreRateMult, 1);
    expect(eff.cargoCapacity).toBe(Math.floor(barge.cargoCapacity * p.cargoMult));
    // Everything not touched by the fit is the hull's own value.
    expect(eff.baseCost).toBe(barge.baseCost);
    expect(eff.tier).toBe(barge.tier);
  });

  it('a refinery pod lifts recovery but never to the fixed refinery\'s', () => {
    const pod = fittingProfile(['fit_refinery_pod']);
    expect(pod.refineRecovery).toBeGreaterThan(MOBILE_REFINERY_RECOVERY);
    expect(pod.refineRecovery).toBeLessThanOrEqual(FITTING_MAX_REFINERY_RECOVERY);
    expect(FITTING_MAX_REFINERY_RECOVERY).toBeLessThan(FIXED_REFINERY_RECOVERY);
    const eff = effectiveShipDefinition(refinery, pod);
    expect(eff.refineOrePerHour!).toBeGreaterThan(refinery.refineOrePerHour!);
  });

  it('a survey array widens the sweep on a survey hull only', () => {
    const arr = fittingProfile(['fit_survey_array']);
    expect(effectiveShipDefinition(cruiser, arr).surveySweep).toBe((cruiser.surveySweep ?? 1) + 2);
    // A hull with no sensor keeps its single-rock pass.
    expect(effectiveShipDefinition(hauler, arr).surveySweep).toBeUndefined();
  });

  it('no legal fit can escape the clamps', () => {
    for (const hull of SHIPS) {
      for (const [key, range] of Object.entries(FITTING_CLAMPS) as Array<[keyof typeof FITTING_CLAMPS, readonly [number, number]]>) {
        const map = {
          oreRate: 'oreRateMult', cargo: 'cargoMult', refineRate: 'refineRateMult',
          fuel: 'fuelMult', transit: 'transitMult', shakedown: 'shakedownMult', hullWear: 'hullWearMult',
        } as const;
        const field = map[key];
        const hi = bestFitFor(hull, p => p[field] as number);
        const lo = -bestFitFor(hull, p => -(p[field] as number));
        expect(hi).toBeLessThanOrEqual(range[1] + 1e-9);
        expect(lo).toBeGreaterThanOrEqual(range[0] - 1e-9);
      }
    }
  });

  it('the derived MAX_FITTING_* bounds really are upper bounds over every legal fit', () => {
    for (const hull of SHIPS) {
      expect(bestFitFor(hull, p => p.oreRateMult)).toBeLessThanOrEqual(MAX_FITTING_ORE_RATE_MULT + 1e-9);
      expect(bestFitFor(hull, p => p.cargoMult)).toBeLessThanOrEqual(MAX_FITTING_CARGO_MULT + 1e-9);
    }
    expect(MAX_FITTING_ORE_RATE_MULT).toBeGreaterThan(1);
    expect(MAX_FITTING_CARGO_MULT).toBeGreaterThan(1);
  });
});

describe('the yard bill', () => {
  it('a first fit pays hardware, labour and the visit fee', () => {
    const q = quoteRefit(barge, [], ['fit_laser_cluster']);
    expect(q.added).toEqual(['fit_laser_cluster']);
    expect(q.removed).toEqual([]);
    expect(q.hardware).toBe(fittingPrice(FITTING_MAP.get('fit_laser_cluster')!, barge));
    expect(q.yardFee).toBe(FITTING_YARD_FEE);
    expect(q.cost).toBe(q.hardware + q.labour + q.yardFee);
    expect(q.refund).toBe(0);
    expect(q.seconds).toBeGreaterThanOrEqual(FITTING_SECONDS_PER_SLOT);
  });

  it('stripping recovers below book, and a strip-only visit can pay out', () => {
    const q = quoteRefit(barge, ['fit_bore_array'], []);
    expect(q.removed).toEqual(['fit_bore_array']);
    const book = fittingPrice(FITTING_MAP.get('fit_bore_array')!, barge);
    expect(q.salvage).toBe(Math.round(book * FITTING_SALVAGE_SHARE));
    expect(q.salvage).toBeLessThan(book);
    // Salvage on a 2-slot head exceeds the flat visit fee, so the yard pays.
    expect(q.refund).toBeGreaterThan(0);
    expect(q.cost).toBe(0);
  });

  it('swapping one head for another charges the difference, not the whole hull', () => {
    const swap = quoteRefit(barge, ['fit_laser_cluster'], ['fit_bore_array']);
    const fresh = quoteRefit(barge, [], ['fit_bore_array']);
    expect(swap.cost).toBeLessThan(fresh.cost);
    expect(swap.added).toEqual(['fit_bore_array']);
    expect(swap.removed).toEqual(['fit_laser_cluster']);
  });

  it('a no-op visit costs nothing and takes no time', () => {
    const q = quoteRefit(barge, ['fit_laser_cluster'], ['fit_laser_cluster']);
    expect(q.cost).toBe(0);
    expect(q.seconds).toBe(0);
    expect(q.yardFee).toBe(0);
  });
});

describe('readiness — a fit is inert until the yard finishes', () => {
  const rec = {
    shipInstanceId: 'ship-1', ids: ['fit_bore_array'], slotsUsed: 2,
    readyAtMs: 2_000, yardLocationId: 'earth_surface', upkeepPerMonth: 100_000,
  };

  it('contributes nothing before readyAt and everything after', () => {
    expect(activeFittingProfile(rec, 1_000).oreRateMult).toBe(1);
    expect(activeFittingProfile(rec, 2_000).oreRateMult).toBeGreaterThan(1);
  });

  it('fleet upkeep only bills fits the yard has finished', () => {
    expect(fleetFittingUpkeep({ 'ship-1': rec }, 1_000)).toBe(0);
    expect(fleetFittingUpkeep({ 'ship-1': rec }, 3_000)).toBe(100_000);
    expect(fleetFittingUpkeep(undefined, 3_000)).toBe(0);
  });

  it('readFittingRecord tolerates a missing or malformed map', () => {
    expect(readFittingRecord(undefined, 'ship-1')).toBeNull();
    expect(readFittingRecord({}, 'ship-1')).toBeNull();
    expect(readFittingRecord({ 'ship-1': rec }, 'ship-1')).toBe(rec);
  });
});

describe('the layer boundary with modules.ts', () => {
  it('shares no id with the legacy client module shop', () => {
    const legacy = new Set(MODULES.map(m => m.id));
    for (const f of FITTINGS) expect(legacy.has(f.id)).toBe(false);
  });

  it('fittings never reach the legacy parked-ship trickle', () => {
    // resource-plausibility.ts MAX_SHIP_MODULE_MINING_MULT bounds that path
    // from modules.ts alone. If a later wave wires fittings into it, this
    // assertion fails and that constant must learn about them in the same
    // commit — otherwise the resource clamp starts rejecting honest ore.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const modulesSrc = require('fs').readFileSync(require('path').join(__dirname, '..', 'modules.ts'), 'utf8') as string;
    expect(modulesSrc).not.toContain('ship-fittings');
    expect(modulesSrc).not.toContain('shipFittings');
  });

  it('the refit ledger reasons are NOT client-applied — the console never debits locally', () => {
    expect(CLIENT_APPLIED_LEDGER_REASONS).not.toContain('ship_fitting');
    expect(CLIENT_APPLIED_LEDGER_REASONS).not.toContain('ship_fitting_salvage');
  });

  it('the mining route builds the fit from the DB, never from the request body', () => {
    // The whole point of Phase D. A body-read here would make a fit forgeable.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path').join(__dirname, '..', '..', '..', 'app', 'api', 'space-tycoon', 'assets', 'mining', 'route.ts');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const src = require('fs').readFileSync(path, 'utf8') as string;
    expect(src).toContain('loadFittingProfileFor');
    expect(src).not.toMatch(/body\.(moduleIds|fitting|fittings)/);
  });
});

describe('save compatibility', () => {
  it('a pre-Phase-D save loads and reads as a bare fleet', () => {
    const old = { ...getNewGameState() } as Partial<GameState>;
    delete old.shipFittings;
    const loaded = migrateLoadedState(old as GameState)!;
    expect(loaded).toBeTruthy();
    expect(loaded.shipFittings).toEqual({});
    expect(activeFittingProfile(readFittingRecord(loaded.shipFittings, 'ship-1'), Date.now()).oreRateMult).toBe(1);
  });

  it('a malformed block is replaced, and a malformed entry is dropped', () => {
    const bad = { ...getNewGameState(), shipFittings: [] as unknown } as unknown as GameState;
    expect(migrateLoadedState(bad)!.shipFittings).toEqual({});

    const partial = {
      ...getNewGameState(),
      shipFittings: {
        good: { shipInstanceId: 'good', ids: ['fit_laser_cluster'], slotsUsed: 1, readyAtMs: 1, yardLocationId: 'earth_surface', upkeepPerMonth: 1 },
        bad: { shipInstanceId: 'bad', ids: 'nope', readyAtMs: 'soon' },
      } as unknown,
    } as unknown as GameState;
    const out = migrateLoadedState(partial)!;
    expect(Object.keys(out.shipFittings!)).toEqual(['good']);
  });
});
