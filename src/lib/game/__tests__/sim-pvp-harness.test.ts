/**
 * @jest-environment node
 *
 * Balance Pass 3 (docs/BALANCE.md "Pass 3") — regression guards for the
 * multi-player shared-world switches added to scripts/sim-harness.ts:
 *
 *   1. contendedNpcCaps — ONE monthly NPC absorption budget per resource for
 *      the whole world, consumed first-come in player array order (the order
 *      book's price-time FIFO — market-orderbook.ts matchOrders has no
 *      fair-split mechanism).
 *   2. laborMarket — payroll charged at the REAL shared wage index
 *      (labor-market.ts computeLaborAggregates over every player).
 *   3. dynamicSpot — world spot evolved from COMBINED flows through the real
 *      market-engine impact + mean-reversion functions; campaignSlugs pins a
 *      campaigned resource (mean reversion skips it).
 *
 * All three are strictly opt-in: with defaults, harness behavior (and every
 * legacy sim-strategies/sim-resources table) is byte-identical — asserted
 * here so CI catches drift (the Pass-2 discipline).
 */

import {
  newPlayer, newWorld, runWorld, stepMonth, npcAbsorptionPerMonth,
  type SimPlayer,
} from '../../../../scripts/sim-harness';
import { computeLaborAggregates } from '../labor-market';
import { WORKER_MAP } from '../workforce';
import { RESOURCE_MAP } from '../resources';

function staticSeller(name: string, resources: Record<string, number>, opts: Parameters<typeof newPlayer>[3] = {}): SimPlayer {
  const p = newPlayer(name, 1_000_000_000, () => [], { buysInputs: false, ...opts });
  p.resources = { ...resources };
  return p;
}

describe('Pass 3 — defaults-off invariance', () => {
  it('headcount set but laborMarket OFF: history identical to a headcount-free player, no payroll field', () => {
    const withHeads = staticSeller('a', { iron: 500 }, { headcount: { engineer: 50, miner: 20 } });
    const without = staticSeller('a', { iron: 500 });
    runWorld(newWorld([withHeads]), 3);
    runWorld(newWorld([without]), 3);
    expect(withHeads.history).toEqual(without.history);
    expect(withHeads.history[0].payroll).toBeUndefined();
  });

  it('multi-player world with all Pass-3 flags off: per-player results match the same players run with pre-Pass-3 options only', () => {
    const mk = () => [
      staticSeller('a', { iron: 10_000 }),
      staticSeller('b', { iron: 10_000 }),
    ];
    const w1players = mk();
    runWorld(newWorld(w1players, 0, null, { npcSaleCaps: true }), 2);
    const w2players = mk();
    runWorld(newWorld(w2players, 0, null, {
      npcSaleCaps: true,
      contendedNpcCaps: false, laborMarket: false, dynamicSpot: false,
    }), 2);
    expect(w1players.map(p => p.history)).toEqual(w2players.map(p => p.history));
  });
});

describe('Pass 3 — contended NPC absorption (order-book FIFO)', () => {
  const IRON_CAP = npcAbsorptionPerMonth('iron'); // 200/real-day × 0.25 = 50 u/game-month

  it('legacy per-player caps: each of two sellers dumps the FULL monthly cap', () => {
    const players = [staticSeller('a', { iron: 10_000 }), staticSeller('b', { iron: 10_000 })];
    stepMonth(newWorld(players, 0, null, { npcSaleCaps: true }), 0);
    expect(players[0].history[0].flows!.sold.iron).toBeCloseTo(IRON_CAP, 6);
    expect(players[1].history[0].flows!.sold.iron).toBeCloseTo(IRON_CAP, 6);
  });

  it('contended: ONE shared budget, consumed first-come in player order', () => {
    const players = [staticSeller('a', { iron: 10_000 }), staticSeller('b', { iron: 10_000 })];
    stepMonth(newWorld(players, 0, null, { npcSaleCaps: true, contendedNpcCaps: true }), 0);
    expect(players[0].history[0].flows!.sold.iron).toBeCloseTo(IRON_CAP, 6);
    expect(players[1].history[0].flows!.sold.iron ?? 0).toBe(0);
    expect(players[1].history[0].flows!.unsold.iron).toBeGreaterThan(0);
  });

  it('contended: a partial first seller leaves the remainder for the second', () => {
    const players = [staticSeller('a', { iron: 20 }), staticSeller('b', { iron: 10_000 })];
    stepMonth(newWorld(players, 0, null, { npcSaleCaps: true, contendedNpcCaps: true }), 0);
    expect(players[0].history[0].flows!.sold.iron).toBeCloseTo(20, 6);
    expect(players[1].history[0].flows!.sold.iron).toBeCloseTo(IRON_CAP - 20, 6);
  });

  it('the shared budget resets each month', () => {
    const players = [staticSeller('a', { iron: 10_000 }), staticSeller('b', { iron: 10_000 })];
    const world = newWorld(players, 0, null, { npcSaleCaps: true, contendedNpcCaps: true });
    stepMonth(world, 0);
    stepMonth(world, 1);
    expect(players[0].history[1].flows!.sold.iron).toBeCloseTo(IRON_CAP, 6);
  });
});

describe('Pass 3 — labor market world (real computeLaborAggregates)', () => {
  it('payroll equals headcount × base salary × the aggregate wage index; net includes it', () => {
    const players = [
      staticSeller('big', {}, { headcount: { engineer: 900 } }),
      staticSeller('small', {}, { headcount: { engineer: 25 } }),
    ];
    runWorld(newWorld(players, 0, null, { laborMarket: true }), 1);
    const agg = computeLaborAggregates(players.map(p => ({
      id: p.name, headcount: p.headcount || {}, trainingLevel: p.trainingLevel, crewQuarters: 0,
    })));
    const idx = agg.get('engineer')!.index;
    const engSalary = WORKER_MAP.get('engineer')!.salary;
    expect(players[1].history[0].payroll).toBe(Math.round(25 * engSalary * idx));
    expect(players[0].history[0].payroll).toBe(Math.round(900 * engSalary * idx));
    // The big player's hiring raised the index above the 0.8 floor — the
    // small player pays the boom too (the shared-tax mechanic under audit).
    expect(idx).toBeGreaterThan(0.8);
    // Net reflects the payroll charge.
    const h = players[1].history[0];
    expect(h.net).toBe(-(h.operating + h.maintenance + h.overhead + h.execComp + (h.payroll || 0)) + h.revenue + h.resourceSales + (h.contractSales || 0) - h.inputCost);
  });
});

describe('Pass 3 — dynamic spot (real market-engine impact + reversion)', () => {
  it('is deterministic: identical worlds produce identical prices and histories', () => {
    const mk = () => {
      const players = [staticSeller('a', { iron: 10_000 })];
      const world = newWorld(players, 0, null, { npcSaleCaps: true, dynamicSpot: true });
      runWorld(world, 6);
      return { players, world };
    };
    const r1 = mk(), r2 = mk();
    expect(r1.world.spotSnapshot!.prices).toEqual(r2.world.spotSnapshot!.prices);
    expect(r1.players[0].history).toEqual(r2.players[0].history);
  });

  it('combined selling presses the spot below base', () => {
    const players = [staticSeller('a', { iron: 100_000 }), staticSeller('b', { iron: 100_000 })];
    const world = newWorld(players, 0, null, { npcSaleCaps: true, dynamicSpot: true });
    runWorld(world, 3);
    const base = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    expect(world.spotSnapshot!.prices.iron).toBeLessThan(base);
  });

  it('campaignSlugs pins a crashed price (mean reversion skips it); uncampaigned resources heal', () => {
    const ironBase = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    const lwBase = RESOURCE_MAP.get('lunar_water')!.baseMarketPrice;
    const seed = {
      prices: {
        iron: Math.round(ironBase * 0.3),
        lunar_water: Math.round(lwBase * 0.3),
      },
      asOf: 0,
    };
    const world = newWorld([staticSeller('idle', {})], 0, seed, {
      dynamicSpot: true, campaignSlugs: ['lunar_water'],
    });
    runWorld(world, 2);
    // Campaigned resource stays at the floor; the other reverts toward base.
    expect(world.spotSnapshot!.prices.lunar_water).toBe(Math.round(lwBase * 0.3));
    expect(world.spotSnapshot!.prices.iron).toBeGreaterThan(Math.round(ironBase * 0.3));
  });
});
