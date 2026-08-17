/**
 * @jest-environment node
 *
 * Balance Pass 2 (docs/BALANCE.md "Pass 2") — regression guards for the two
 * harness realism switches added in this pass:
 *
 *   1. Crafting-queue sink (SimPlayer.craftPlan): mirrors game-engine.ts's
 *      single activeRefining slot — requiredBuilding-gated, time-budgeted
 *      via getCraftingSpeedMultiplier, inputs from existing stock only,
 *      NEVER past the output's storage cap (informed-player guard).
 *   2. Delivery-contract outlet (SimWorldOpts.contractOutlet): bounded,
 *      spot-priced no-fee sales after the NPC-capped dump.
 *
 * Both must be strictly opt-in: with defaults, the harness's behavior (and
 * therefore every legacy sim-strategies.ts table) is byte-identical to
 * Pass 1 — that invariance is asserted here so CI catches drift, not a
 * human re-diffing markdown tables.
 */

import {
  newPlayer, newWorld, runWorld, stepMonth, makeBuilding,
  npcAbsorptionPerMonth, CONTRACT_OUTLET_TYPICAL_QTY, GAME_MONTH_MS,
  type SimPlayer,
} from '../../../../scripts/sim-harness';
import { CHAIN_MAP } from '../production-chains';
import { storageCapacityUnits } from '../consumption';
import { RESOURCE_MAP } from '../resources';
import type { GameState } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A no-build player with a preloaded inventory and (optionally) preplaced
 *  buildings — lets each test isolate one mechanism. */
function staticPlayer(
  resources: Record<string, number>,
  buildingDefs: { definitionId: string; locationId: string }[] = [],
  opts: Parameters<typeof newPlayer>[3] = {},
): SimPlayer {
  const p = newPlayer('static', 1_000_000_000_000, () => [], { buysInputs: false, ...opts });
  p.resources = { ...resources };
  for (const b of buildingDefs) p.buildings.push(makeBuilding(b.definitionId, b.locationId));
  return p;
}

describe('Pass 2 — crafting-queue sink (craftPlan)', () => {
  it('runs a gated recipe from stock: inputs drained, outputs credited, flows recorded', () => {
    const recipe = CHAIN_MAP.get('forge_structural_beams')!; // steel 5 + alloy 3 → 4 beams @ fabrication_lunar
    const p = staticPlayer(
      { steel_ingots: 50, aluminum_alloy: 30 },
      [{ definitionId: 'fabrication_lunar', locationId: 'lunar_surface' }],
      { craftPlan: ['forge_structural_beams'], sellsLeftovers: false },
    );
    const world = newWorld([p]);
    stepMonth(world, 0);
    const f = p.history[0].flows!;
    // 10 full runs are input-bound (50/5 = 10, 30/3 = 10) and well inside
    // both the month's time budget and the beams storage cap.
    expect(f.craftedIn.steel_ingots).toBe(50);
    expect(f.craftedIn.aluminum_alloy).toBe(30);
    expect(f.craftedOut.structural_beams).toBe(40);
    expect(p.resources.structural_beams).toBeCloseTo(40, 5);
    expect(recipe.outputQuantity * 10).toBe(40); // derivation stays honest
  });

  it('requiredBuilding gates the recipe — no fab, no craft', () => {
    const p = staticPlayer(
      { steel_ingots: 50, aluminum_alloy: 30 },
      [], // no fabrication_lunar
      { craftPlan: ['forge_structural_beams'], sellsLeftovers: false },
    );
    stepMonth(newWorld([p]), 0);
    const f = p.history[0].flows!;
    expect(f.craftedIn).toEqual({});
    expect(f.craftedOut).toEqual({});
  });

  it('never crafts an output past its storage cap (informed-player guard)', () => {
    const p = staticPlayer(
      { steel_ingots: 10_000, aluminum_alloy: 6_000 },
      [{ definitionId: 'fabrication_lunar', locationId: 'lunar_surface' }],
      { craftPlan: ['forge_structural_beams'], sellsLeftovers: false },
    );
    const cap = storageCapacityUnits(
      p.buildings as unknown as GameState['buildings'], 'structural_beams');
    stepMonth(newWorld([p]), 0);
    // Output stock ends at or below cap; with outputQuantity 4 the guard
    // leaves at most one partial run of headroom unused.
    expect(p.resources.structural_beams).toBeLessThanOrEqual(cap);
    expect(p.resources.structural_beams).toBeGreaterThan(cap - 4 - 1e-9);
  });

  it('is bounded by the month time budget for slow recipes', () => {
    // make_habitat_pod: 1200s/run. One fab (speed ×1) ⇒ at most
    // floor(21600/1200) = 18 runs regardless of inputs.
    const p = staticPlayer(
      { station_module: 10_000, solar_panel_array: 10_000, structural_beams: 100_000, lunar_water: 500_000 },
      [{ definitionId: 'fabrication_lunar', locationId: 'lunar_surface' }],
      { craftPlan: ['make_habitat_pod'], sellsLeftovers: false },
    );
    stepMonth(newWorld([p]), 0);
    const made = p.history[0].flows!.craftedOut.habitat_pod || 0;
    expect(made).toBeGreaterThan(0);
    expect(made).toBeLessThanOrEqual(Math.floor((GAME_MONTH_MS / 1000) / 1200));
  });
});

describe('Pass 2 — delivery-contract outlet (world.opts.contractOutlet)', () => {
  it('sells surplus at spot ×1.0 after the NPC cap, highest value first, within the unit budget', () => {
    const capPerDay = 5;
    const p = staticPlayer({ gold: 500, iron: 5_000 }, [], {});
    const world = newWorld([p], 0, null, { npcSaleCaps: true, contractOutlet: { capPerDay } });
    stepMonth(world, 0);
    const h = p.history[0];
    const f = h.flows!;
    const unitBudget = capPerDay * (GAME_MONTH_MS / DAY_MS) * CONTRACT_OUTLET_TYPICAL_QTY;
    const contractUnits = Object.values(f.contractSold).reduce((a, b) => a + b, 0);
    expect(contractUnits).toBeGreaterThan(0);
    expect(contractUnits).toBeLessThanOrEqual(unitBudget + 1e-9);
    // Gold (higher price) is drained before iron gets any budget.
    const npcGold = npcAbsorptionPerMonth('gold');
    expect(f.contractSold.gold).toBeCloseTo(Math.min(500 - npcGold, unitBudget), 5);
    // Revenue = spot ×1.0, no broker fee.
    const goldPrice = RESOURCE_MAP.get('gold')!.baseMarketPrice;
    const ironPrice = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    const expected = (f.contractSold.gold || 0) * goldPrice + (f.contractSold.iron || 0) * ironPrice;
    expect(h.contractSales).toBeCloseTo(expected, 3);
  });

  it('does nothing when the option is off or the player hoards', () => {
    const seller = staticPlayer({ gold: 500 });
    stepMonth(newWorld([seller], 0, null, { npcSaleCaps: true }), 0);
    expect(seller.history[0].contractSales).toBe(0);
    expect(seller.history[0].flows!.contractSold).toEqual({});

    const hoarder = staticPlayer({ gold: 500 }, [], { sellsLeftovers: false });
    stepMonth(newWorld([hoarder], 0, null, { npcSaleCaps: true, contractOutlet: { capPerDay: 5 } }), 0);
    expect(hoarder.history[0].contractSales).toBe(0);
  });
});

describe('Pass 2 — defaults-off invariance & determinism', () => {
  const simplePlan: SimPlayer['plan'] = (p) =>
    p.buildings.length === 0
      ? [{ definitionId: 'ground_station', locationId: 'earth_surface' }]
      : [];

  it('a default world records no Pass-2 flows (legacy tables cannot shift)', () => {
    const p = newPlayer('legacy', 10_000_000_000, simplePlan);
    runWorld(newWorld([p]), 6);
    for (const row of p.history) {
      expect(row.contractSales).toBe(0);
      expect(row.flows!.craftedIn).toEqual({});
      expect(row.flows!.craftedOut).toEqual({});
      expect(row.flows!.contractSold).toEqual({});
    }
  });

  it('identical Pass-2 worlds produce identical histories (no wall-clock, no RNG)', () => {
    const build = () => {
      const p = newPlayer('det', 10_000_000_000, simplePlan, {
        craftPlan: ['forge_structural_beams'],
      });
      p.resources = { steel_ingots: 200, aluminum_alloy: 120, gold: 300 };
      p.buildings.push(makeBuilding('fabrication_lunar', 'lunar_surface'));
      return p;
    };
    const a = build();
    const b = build();
    runWorld(newWorld([a], 0, null, { npcSaleCaps: true, contractOutlet: { capPerDay: 5 } }), 8);
    runWorld(newWorld([b], 0, null, { npcSaleCaps: true, contractOutlet: { capPerDay: 5 } }), 8);
    // instanceIds differ (module-global counter) — compare economics, not ids.
    expect(a.history.map(r => ({ ...r }))).toEqual(b.history.map(r => ({ ...r })));
  });
});
