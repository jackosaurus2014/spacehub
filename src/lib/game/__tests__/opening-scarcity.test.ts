// ─── Balance Pass 14 — opening scarcity ─────────────────────────────────────
// docs/BALANCE.md "Pass 14 — opening scarcity (2026-09-14)".
//
// Four things these tests exist to stop regressing:
//   1. The baseline/starting SPLIT. `startingSupply` used to be both the
//      opening stock and the pricing yardstick, which is why lowering it
//      produced no scarcity at all. Nothing may measure live supply against
//      the opening stock again.
//   2. Origin coverage. Every resource is classified, and its opening stock
//      is exactly what its origin implies — so adding a resource without
//      thinking about where it comes from fails here rather than silently
//      shipping an abundant Martian commodity.
//   3. The NPC arrival ramp: off-world restock starts at zero and grows.
//   4. Price decay: the windfall shrinks as supply rises, on the existing
//      curve, and the on-ramp feedstock never becomes scarce.

import {
  RESOURCES, RESOURCE_MAP, RESOURCE_ORIGINS, type ResourceOrigin,
  getPricingBaseline, getOpeningSupply, computeOpeningSupply,
  npcRestockRampFactor, effectiveNpcRestockPerHour, scarcityClockDays,
  scarcityClockStartMs, OPENING_SCARCITY_LIVE_AT, curvePricedResources,
} from '../resources';
import { getSupplyPriceMultiplier, getFundamentalPrice } from '../market-engine';
import { MANUFACTURED_RESOURCE_IDS, MINED_ONLY_RESOURCE_IDS } from '../economic-sinks';
import { EPOCH_BEGAN_AT } from '../world-reset';
import { PRODUCTION_CHAINS } from '../production-chains';
import { BUILDING_MAP } from '../buildings';
import { estimateRecipeUnitCost, chooseRecipes } from '../npc-industry';

const OFF_WORLD: ResourceOrigin[] = ['lunar', 'inner', 'martian', 'belt', 'outer'];

describe('Pass 14 — the baseline / starting split', () => {
  it('every resource carries BOTH numbers and they mean different things', () => {
    for (const r of RESOURCES) {
      expect(typeof r.baselineSupply).toBe('number');
      expect(typeof r.startingSupply).toBe('number');
      expect(r.baselineSupply).toBeGreaterThanOrEqual(0);
      expect(r.startingSupply).toBeGreaterThanOrEqual(0);
      // The opening stock can never exceed what a functioning market holds.
      expect(r.startingSupply).toBeLessThanOrEqual(r.baselineSupply);
    }
  });

  it('getPricingBaseline returns the BASELINE, never the opening stock', () => {
    // mars_water is the founder's named example and the widest gap in the
    // roster: reading the wrong field here is a 8× price error.
    expect(getPricingBaseline('mars_water')).toBe(RESOURCE_MAP.get('mars_water')!.baselineSupply);
    expect(getPricingBaseline('mars_water')).not.toBe(getOpeningSupply('mars_water'));
    for (const r of RESOURCES) {
      expect(getPricingBaseline(r.id)).toBe(r.baselineSupply);
      expect(getOpeningSupply(r.id)).toBe(r.startingSupply);
    }
  });

  it('an unknown slug falls back rather than throwing (MarketResource rows outlive definitions)', () => {
    expect(getPricingBaseline('not_a_resource')).toBe(1000);
    expect(getPricingBaseline('not_a_resource', 42)).toBe(42);
    expect(getOpeningSupply('not_a_resource')).toBe(0);
  });

  it('order-book-priced goods have NO curve baseline, so their multiplier is a flat 1.0', () => {
    // Before this pass every consumer fell back to `startingSupply || 1000`,
    // which priced a manufactured good with zero supply at the 10× clamp —
    // a display lie on a market the NPC curve refuses to trade at all.
    for (const id of [...MANUFACTURED_RESOURCE_IDS, ...MINED_ONLY_RESOURCE_IDS]) {
      const def = RESOURCE_MAP.get(id as never)!;
      expect(def.baselineSupply).toBe(0);
      expect(getSupplyPriceMultiplier(def.startingSupply, getPricingBaseline(id))).toBe(1);
    }
  });

  it('the pricing baselines are unchanged for a MATURE market — Pass 14 moves the opening, not the yardstick', () => {
    // A market sitting at its baseline prices at exactly 1.0× as it always
    // has; only a world that has not been mined yet prices above it.
    for (const r of curvePricedResources()) {
      expect(getSupplyPriceMultiplier(r.baselineSupply, r.baselineSupply)).toBeCloseTo(1, 10);
    }
  });
});

describe('Pass 14 — origin classification covers the whole roster', () => {
  it('every resource has a KNOWN origin', () => {
    for (const r of RESOURCES) {
      expect(RESOURCE_ORIGINS[r.origin]).toBeDefined();
      expect(RESOURCE_ORIGINS[r.origin].id).toBe(r.origin);
    }
  });

  // THE GUARD. A new resource added without an opening level consistent with
  // its origin fails here — you cannot ship an abundant belt commodity by
  // forgetting to think about it.
  it('every opening stock is exactly what its origin implies', () => {
    for (const r of RESOURCES) {
      expect({ id: r.id, opening: r.startingSupply })
        .toEqual({ id: r.id, opening: computeOpeningSupply(r.baselineSupply, r.origin) });
    }
  });

  it('off-world resources open SCARCE — well under a tenth of a functioning market', () => {
    for (const r of RESOURCES) {
      if (!OFF_WORLD.includes(r.origin)) continue;
      expect(r.startingSupply / Math.max(1, r.baselineSupply)).toBeLessThanOrEqual(0.05);
      expect(getSupplyPriceMultiplier(r.startingSupply, r.baselineSupply)).toBeGreaterThan(1.5);
    }
  });

  it('the founder\'s two named resources open near empty and price near the top of the band', () => {
    for (const id of ['mars_water', 'lunar_water'] as const) {
      const d = RESOURCE_MAP.get(id)!;
      expect(d.startingSupply).toBeLessThan(d.baselineSupply * 0.05);
      expect(getSupplyPriceMultiplier(d.startingSupply, d.baselineSupply)).toBeGreaterThan(5);
      // Band-clamped spot: the first cargo sells at 3× base, not 8×.
      expect(getFundamentalPrice(d.baseMarketPrice, d.startingSupply, d.baselineSupply, d.minPrice, d.maxPrice))
        .toBe(Math.round(d.baseMarketPrice * 3));
    }
  });

  it('terrestrial goods open TIGHT but never scarce — the on-ramp feedstock', () => {
    for (const r of RESOURCES) {
      if (r.origin !== 'terrestrial') continue;
      expect(r.startingSupply / r.baselineSupply).toBeGreaterThanOrEqual(0.7);
      expect(getSupplyPriceMultiplier(r.startingSupply, r.baselineSupply)).toBeLessThan(1.25);
    }
    // Methane specifically: it is the feedstock for the no-research
    // terrestrial fuel route, which is what keeps the Pass-10 starter launch
    // pad affordable. It must never be classified off-world.
    expect(RESOURCE_MAP.get('methane')!.origin).toBe('terrestrial');
  });

  it('interstellar and manufactured goods open at zero and stay curve-less', () => {
    for (const r of RESOURCES) {
      if (r.origin !== 'interstellar' && r.origin !== 'fabricated') continue;
      expect(r.startingSupply).toBe(0);
      expect(r.baselineSupply).toBe(0);
      expect(r.npcRestockPerHour).toBe(0);
    }
  });
});

describe('Pass 14 — the NPC arrival ramp', () => {
  it('terrestrial restock is at full rate from day zero — Earth industry already exists', () => {
    expect(npcRestockRampFactor('terrestrial', 0)).toBe(1);
    expect(npcRestockRampFactor('terrestrial', 500)).toBe(1);
  });

  it('every off-world origin starts at ZERO and reaches full rate at its window', () => {
    for (const origin of OFF_WORLD) {
      const p = RESOURCE_ORIGINS[origin];
      expect(npcRestockRampFactor(origin, 0)).toBe(0);
      expect(npcRestockRampFactor(origin, p.rampStartDays)).toBe(0);
      expect(npcRestockRampFactor(origin, p.rampFullDays)).toBe(1);
      expect(npcRestockRampFactor(origin, p.rampFullDays + 1000)).toBe(1);
      const mid = (p.rampStartDays + p.rampFullDays) / 2;
      expect(npcRestockRampFactor(origin, mid)).toBeCloseTo(0.5, 6);
    }
  });

  it('the ramp is monotonic — NPC supply arrives, it never retreats', () => {
    for (const origin of Object.keys(RESOURCE_ORIGINS) as ResourceOrigin[]) {
      let prev = -1;
      for (let d = 0; d <= 700; d += 7) {
        const f = npcRestockRampFactor(origin, d);
        expect(f).toBeGreaterThanOrEqual(prev);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
        prev = f;
      }
    }
  });

  it('interstellar and manufactured goods never get NPC restock', () => {
    for (const d of [0, 100, 10_000]) {
      expect(npcRestockRampFactor('interstellar', d)).toBe(0);
      expect(npcRestockRampFactor('fabricated', d)).toBe(0);
    }
  });

  it('effectiveNpcRestockPerHour ramps the AUTHORED mature rate, and recedes with population', () => {
    const water = RESOURCE_MAP.get('lunar_water')!;
    const start = scarcityClockStartMs();
    const day = 86_400_000;
    expect(effectiveNpcRestockPerHour(water, start)).toBe(0);
    expect(effectiveNpcRestockPerHour(water, start + 10 * day)).toBe(0);
    // Full rate at the end of the lunar window …
    const full = RESOURCE_ORIGINS.lunar.rampFullDays;
    expect(effectiveNpcRestockPerHour(water, start + full * day)).toBeCloseTo(water.npcRestockPerHour, 6);
    // … and the NPC floor recedes as the player base grows (a floor, not a ceiling).
    expect(effectiveNpcRestockPerHour(water, start + full * day, { populationScale: 0.25 }))
      .toBeCloseTo(water.npcRestockPerHour * 0.25, 6);
  });

  it('the scarcity clock starts at the model date for a world that opened earlier', () => {
    // Epoch 2 opened 2026-08-24, three weeks before Pass 14 shipped; the live
    // world must get the whole head start, not three weeks of ramp it never ran.
    expect(EPOCH_BEGAN_AT).toBeLessThan(OPENING_SCARCITY_LIVE_AT);
    expect(scarcityClockStartMs(EPOCH_BEGAN_AT)).toBe(OPENING_SCARCITY_LIVE_AT);
    expect(scarcityClockDays(OPENING_SCARCITY_LIVE_AT, EPOCH_BEGAN_AT)).toBe(0);
    // A future epoch that opens after the model date uses its own start.
    const future = OPENING_SCARCITY_LIVE_AT + 400 * 86_400_000;
    expect(scarcityClockStartMs(future)).toBe(future);
    expect(scarcityClockDays(future + 86_400_000, future)).toBeCloseTo(1, 6);
  });
});

describe('Pass 14 — the windfall decays as supply rises', () => {
  it('the multiplier falls monotonically on the existing curve and is never pinned', () => {
    const d = RESOURCE_MAP.get('mars_water')!;
    let prev = Infinity;
    for (const supply of [d.startingSupply, 100, 250, 500, 1000, d.baselineSupply, 2 * d.baselineSupply]) {
      const m = getSupplyPriceMultiplier(supply, d.baselineSupply);
      expect(m).toBeLessThan(prev);
      prev = m;
    }
    // Opens below the 10× clamp on purpose, so the curve is live from unit one.
    expect(getSupplyPriceMultiplier(d.startingSupply, d.baselineSupply)).toBeLessThan(10);
    // At baseline: par. At twice baseline: a glut discount.
    expect(getSupplyPriceMultiplier(d.baselineSupply, d.baselineSupply)).toBeCloseTo(1, 6);
    expect(getSupplyPriceMultiplier(2 * d.baselineSupply, d.baselineSupply)).toBeLessThan(0.8);
  });

  it('the realised spot price decays out of the band on a real mining ramp', () => {
    // svc_mining_mars produces 80 units of Martian water per game-month
    // (MINING_PRODUCTION); every unit sold or mined raises totalSupply.
    const d = RESOURCE_MAP.get('mars_water')!;
    const spotAt = (supply: number) =>
      getFundamentalPrice(d.baseMarketPrice, supply, d.baselineSupply, d.minPrice, d.maxPrice);
    const open = spotAt(d.startingSupply);
    expect(open).toBe(Math.round(d.baseMarketPrice * 3)); // band cap at open
    // Two and a half game-months of one Mars rig leaves the cap …
    expect(spotAt(d.startingSupply + 80 * 3)).toBeLessThan(open);
    // … six months halves the premium …
    expect(spotAt(d.startingSupply + 80 * 6)).toBeLessThan(open * 0.75);
    // … and a market at baseline is back to par.
    expect(spotAt(d.baselineSupply)).toBe(d.baseMarketPrice);
    // A glutted market pays BELOW base — mass extraction depresses price.
    expect(spotAt(4 * d.baselineSupply)).toBeLessThan(d.baseMarketPrice);
  });

  it('no fundamental can ever print more than 3× base, however empty the market', () => {
    for (const r of curvePricedResources()) {
      const worst = getFundamentalPrice(r.baseMarketPrice, 0, r.baselineSupply, r.minPrice, r.maxPrice);
      expect(worst).toBeLessThanOrEqual(Math.max(r.minPrice, Math.round(r.baseMarketPrice * 3)));
    }
  });
});

describe('Pass 14 — the Pass 10 starter launch pad still affords its fuel', () => {
  const openingPrice = (slug: string) => {
    const d = RESOURCE_MAP.get(slug as never)!;
    const spot = getFundamentalPrice(d.baseMarketPrice, d.startingSupply, d.baselineSupply, d.minPrice, d.maxPrice);
    return spot * getSupplyPriceMultiplier(d.startingSupply, d.baselineSupply);
  };

  it('the NPC industry picks the CHEAPEST fuel route, which is terrestrial methane at world open', () => {
    const fuelRecipes = PRODUCTION_CHAINS.filter((r) => r.outputId === 'rocket_fuel');
    const picked = chooseRecipes(fuelRecipes, openingPrice);
    expect(picked).toHaveLength(1);
    // Not the lunar-water cracking route: lunar ice opens at 3% of baseline,
    // so cracking it would price NPC fuel at the top of its band AND have the
    // NPC backdrop strip the ice before a player ever reached the Moon.
    expect(picked[0].inputs.lunar_water).toBeUndefined();
    expect(picked[0].inputs.methane).toBeGreaterThan(0);
    const water = fuelRecipes.find((r) => r.inputs.lunar_water)!;
    expect(estimateRecipeUnitCost(picked[0], openingPrice))
      .toBeLessThan(estimateRecipeUnitCost(water, openingPrice));
  });

  it('the chosen route keeps fuel well under the launch pad\'s gross revenue', () => {
    const pad = BUILDING_MAP.get('launch_pad_small')!;
    const perMonth = pad.consumesPerMonth!.rocket_fuel;
    expect(perMonth).toBe(10);
    const picked = chooseRecipes(PRODUCTION_CHAINS.filter((r) => r.outputId === 'rocket_fuel'), openingPrice);
    const unitCost = estimateRecipeUnitCost(picked[0], openingPrice);
    // NPC ask floors at 0.75 × base (npcListPrice) and marks up on cost; the
    // pad's bill is therefore ~$900K/month, a fifth of the $5M service gross.
    const ask = Math.max(unitCost * 1.2, RESOURCE_MAP.get('rocket_fuel')!.baseMarketPrice * 0.75);
    expect(ask * perMonth).toBeLessThan(1_200_000);
  });
});
