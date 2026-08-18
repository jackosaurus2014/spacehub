/**
 * @jest-environment node
 *
 * Balance Pass 8 (docs/BALANCE.md "Pass 8") — regression guards for the two
 * opt-in override switches added to scripts/sim-harness.ts for the
 * competitive-tools campaign sim (scripts/sim-tools.ts):
 *
 *   1. SimWorldOpts.laborSupplyDivisor — H2 supply-side override validation:
 *      wage index recomputed with LABOR_SUPPLY_BASE ÷ divisor (crew-quarters
 *      supply term keeps full weight).
 *   2. SimPlayer.glideSpotFloor — PROPOSED-mechanic override: the graduation
 *      glide extended to the mining spot floor (spot + (base − spot) ×
 *      glideFrac while the glide is active).
 *
 * Both are strictly opt-in — defaults-off behavior must stay byte-identical
 * (the Pass-2/Pass-3 CI discipline that protects every legacy sim table).
 */

import {
  newPlayer, newWorld, runWorld,
  type SimPlayer,
} from '../../../../scripts/sim-harness';
import {
  computeWageIndex, LABOR_SUPPLY_BASE, WAGE_INDEX_MIN,
} from '../labor-market';
import { WORKER_MAP } from '../workforce';
import { RESOURCE_MAP } from '../resources';
import type { ResourceId } from '../resources';
import type { MarketSnapshot } from '../spot-price';

function corpWithHeads(name: string, engineers: number): SimPlayer {
  return newPlayer(name, 1_000_000_000, () => [], {
    buysInputs: false,
    headcount: { engineer: engineers },
  });
}

/** A lunar miner (mining_lunar_basic mines lunar_water + helium3). */
function lunarMiner(name: string, opts: Parameters<typeof newPlayer>[3] = {}): SimPlayer {
  const plan: SimPlayer['plan'] = (p, month) =>
    month === 0 ? [
      { definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' },
      { definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' },
    ] : [];
  return newPlayer(name, 2_000_000_000, plan, { maxBuildsPerMonth: 2, ...opts });
}

function crashedSnapshot(): MarketSnapshot {
  const prices: Record<string, number> = {};
  RESOURCE_MAP.forEach((def, id) => { prices[id] = def.baseMarketPrice; });
  prices['lunar_water'] = Math.round(
    (RESOURCE_MAP.get('lunar_water' as ResourceId)!.baseMarketPrice) * 0.3,
  );
  return { prices, asOf: 0 };
}

describe('Pass 9 — LABOR_SUPPLY_BASE ships the Pass-8 ÷4 prescription EXACTLY', () => {
  it('engineer 150, scientist 125, miner 175, operator 138, pilot 100, negotiator 75, security 100, medic 88', () => {
    expect(LABOR_SUPPLY_BASE).toEqual({
      engineer: 150, scientist: 125, miner: 175, operator: 138,
      pilot: 100, negotiator: 75, security: 100, medic: 88,
    });
  });
});

describe('Pass 8/9 — laborSupplyDivisor (H2 sweep switch over the shipped base)', () => {
  it('defaults off: divisor absent and divisor 1 produce identical histories (both = shipped ÷4 base)', () => {
    const a = corpWithHeads('c', 40);
    runWorld(newWorld([a], 0, null, { laborMarket: true }), 3);
    const b = corpWithHeads('c', 40);
    runWorld(newWorld([b], 0, null, { laborMarket: true, laborSupplyDivisor: 1 }), 3);
    expect(a.history).toEqual(b.history);
  });

  it('divisor scales only the base supply — payroll matches computeWageIndex(effective, base/div)', () => {
    // 40 engineers at default trainingLevel 0.5 → effective 40 × (1 − 0.15) = 34.
    // ÷5 supply of the SHIPPED base: 150/5 = 30 (no buildings → zero crew
    // quarters). Index = 34/30 ≈ 1.1333 — inside the band, no clamp.
    const p = corpWithHeads('c', 40);
    runWorld(newWorld([p], 0, null, { laborMarket: true, laborSupplyDivisor: 5 }), 1);
    const expectedIdx = computeWageIndex(34, LABOR_SUPPLY_BASE.engineer / 5);
    expect(expectedIdx).toBeCloseTo(34 / 30, 10);
    const salary = WORKER_MAP.get('engineer')!.salary;
    expect(p.history[0].payroll).toBe(Math.round(40 * salary * expectedIdx));
  });

  it('Pass 9 alive-signal: a 200-engineer boom moves the index OFF the floor at the shipped base (the old 600 base kept this dead)', () => {
    const p = corpWithHeads('c', 200);
    runWorld(newWorld([p], 0, null, { laborMarket: true }), 1);
    const salary = WORKER_MAP.get('engineer')!.salary;
    const expectedIdx = computeWageIndex(170, LABOR_SUPPLY_BASE.engineer); // 170/150 ≈ 1.133
    expect(expectedIdx).toBeGreaterThan(1.0);
    expect(p.history[0].payroll).toBe(Math.round(200 * salary * expectedIdx));
  });

  it('small-world hiring still sits on the 0.8 floor (no newcomer wage squeeze from the ÷4)', () => {
    const p = corpWithHeads('c', 40); // effective 34 / 150 = 0.227 → floor
    runWorld(newWorld([p], 0, null, { laborMarket: true }), 1);
    const salary = WORKER_MAP.get('engineer')!.salary;
    expect(p.history[0].payroll).toBe(Math.round(40 * salary * WAGE_INDEX_MIN));
  });
});

describe('Pass 8/9 — glideSpotFloor (graduate mining-spot shield, SHIPPED in mining-pricing.ts; this guards the harness mirror)', () => {
  const base = RESOURCE_MAP.get('lunar_water' as ResourceId)!.baseMarketPrice;

  it('defaults off: a glide-carrying miner with glideSpotFloor absent is unchanged by the new code path', () => {
    const mk = (flag: boolean | undefined) => lunarMiner('m', {
      graduationGlide: { startMonth: 0, glideMonths: 24 },
      glideSpotFloor: flag,
    });
    const a = mk(undefined);
    runWorld(newWorld([a], 0, crashedSnapshot()), 3);
    const b = mk(false);
    runWorld(newWorld([b], 0, crashedSnapshot()), 3);
    expect(a.history).toEqual(b.history);
  });

  it('with the flag on and a crashed spot, mining revenue is floored by the glide blend', () => {
    const unshielded = lunarMiner('m', { graduationGlide: { startMonth: 0, glideMonths: 24 } });
    runWorld(newWorld([unshielded], 0, crashedSnapshot()), 2);
    const shielded = lunarMiner('m', {
      graduationGlide: { startMonth: 0, glideMonths: 24 },
      glideSpotFloor: true,
    });
    runWorld(newWorld([shielded], 0, crashedSnapshot()), 2);
    const neutral = lunarMiner('m');
    runWorld(newWorld([neutral], 0, null), 2);
    // Month 1 (glideFrac = 1 − 1/24 ≈ 0.958): the shielded miner's revenue
    // must sit strictly between the crashed and neutral miners', and close
    // to neutral (the blend is ~96% of the way back to base).
    const rC = unshielded.history[1].revenue;
    const rS = shielded.history[1].revenue;
    const rN = neutral.history[1].revenue;
    expect(rC).toBeLessThan(rS);
    expect(rS).toBeLessThanOrEqual(rN + 1e-6);
    expect(rS - rC).toBeGreaterThan((rN - rC) * 0.9);
  });

  it('expired glide: the flag does nothing (fraction 0) — veteran takes the full crash', () => {
    const expired = lunarMiner('m', {
      graduationGlide: { startMonth: 0, glideMonths: 1 },
      glideSpotFloor: true,
    });
    runWorld(newWorld([expired], 0, crashedSnapshot()), 3);
    const plain = lunarMiner('m');
    runWorld(newWorld([plain], 0, crashedSnapshot()), 3);
    // Month 2 is past the 1-month glide for both.
    expect(expired.history[2].revenue).toBeCloseTo(plain.history[2].revenue, 6);
  });

  it('premiums pass through: a spot ABOVE base is never reduced by the shield', () => {
    const prices: Record<string, number> = {};
    RESOURCE_MAP.forEach((def, id) => { prices[id] = def.baseMarketPrice; });
    prices['lunar_water'] = base * 2;
    const boosted = lunarMiner('m', {
      graduationGlide: { startMonth: 0, glideMonths: 24 },
      glideSpotFloor: true,
    });
    runWorld(newWorld([boosted], 0, { prices, asOf: 0 }), 2);
    const boostedPlain = lunarMiner('m');
    runWorld(newWorld([boostedPlain], 0, { prices: { ...prices }, asOf: 0 }), 2);
    expect(boosted.history[1].revenue).toBeCloseTo(boostedPlain.history[1].revenue, 6);
  });
});
