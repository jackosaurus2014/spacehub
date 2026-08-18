/**
 * @jest-environment node
 *
 * Balance Pass 3 (docs/BALANCE.md "Pass 3") — the [FRONTIER] gap fix on
 * price-linked mining. Before this pass, priceLinkedMiningRevenue read the
 * synced spot with NO Frontier shield: a rival's M5 price campaign (or any
 * organic crash) flowed straight into a Protected-Frontier miner's cash
 * revenue — the one offense-reachable revenue channel that bypassed the
 * on-ramp shield (service pools, hazards, espionage, poaching, tolls, and
 * tenders were all already shielded). Proofs:
 *  - unit: `frontierSpotFloor` floors each resource's spot at base — crashes
 *    can't bite, premiums still pay in full (the demand-pool shield's exact
 *    "premiums pay, penalties wait" posture)
 *  - default opts: byte-identical to pre-Pass-3 behavior (crash bites)
 *  - live tick: a Frontier save's money delta is IDENTICAL under a crashed
 *    snapshot and a neutral one, still HIGHER under a spike, and a graduated
 *    save still takes the crash (the shield ends at graduation)
 */
import type { GameState, BuildingInstance } from '../types';
import { getNewGameState } from '../save-load';
import { getGlobalGameDate } from '../server-time';
import { processTick } from '../game-engine';
import { priceLinkedMiningRevenue } from '../mining-pricing';
import { RESOURCE_MAP } from '../resources';

const LW_BASE = RESOURCE_MAP.get('lunar_water')!.baseMarketPrice;
const HE3_BASE = RESOURCE_MAP.get('helium3')!.baseMarketPrice;

describe('priceLinkedMiningRevenue — frontierSpotFloor (unit)', () => {
  const units = { lunar_water: 20, helium3: 0.5 };
  const crash = { asOf: 0, prices: { lunar_water: Math.round(LW_BASE * 0.3), helium3: Math.round(HE3_BASE * 0.3) } };
  const spike = { asOf: 0, prices: { lunar_water: Math.round(LW_BASE * 2), helium3: Math.round(HE3_BASE * 2) } };

  it('floors a crashed spot at base — shielded revenue equals the neutral number', () => {
    const neutral = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, null);
    const shielded = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash, { frontierSpotFloor: true });
    expect(shielded).toBeCloseTo(neutral, 6);
  });

  it('premiums still pay in full through the shield', () => {
    const spiked = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, spike);
    const shieldedSpike = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, spike, { frontierSpotFloor: true });
    expect(shieldedSpike).toBeCloseTo(spiked, 6);
    expect(shieldedSpike).toBeGreaterThan(priceLinkedMiningRevenue('svc_mining_lunar_basic', units, null));
  });

  it('default opts: pre-Pass-3 behavior exactly — the crash bites', () => {
    const neutral = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, null);
    const crashed = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash);
    expect(crashed).toBeLessThan(neutral);
  });
});

// ─── Balance Pass 9: graduation-glide spot floor (unit) ─────────────────────
// Pass 8 prescription #3 (ships WITH the market-keyed fee): below-base spot
// floors at spot + (base − spot) × glideFraction — the decaying mirror of
// frontierSpotFloor. Premiums always pass through; fraction 0 is
// byte-identical to pre-Pass-9.
describe('priceLinkedMiningRevenue — graduationGlideFraction (Pass 9, unit)', () => {
  const units = { lunar_water: 20, helium3: 0.5 };
  const crash = { asOf: 0, prices: { lunar_water: Math.round(LW_BASE * 0.3), helium3: Math.round(HE3_BASE * 0.3) } };
  const spike = { asOf: 0, prices: { lunar_water: Math.round(LW_BASE * 2), helium3: Math.round(HE3_BASE * 2) } };

  it('fraction 1 equals the full Frontier floor (fresh graduate ≈ fully shielded)', () => {
    const fullFloor = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash, { frontierSpotFloor: true });
    const glided = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash, { graduationGlideFraction: 1 });
    expect(glided).toBeCloseTo(fullFloor, 6);
  });

  it('fraction 0.5 lands exactly at the midpoint blend spot + (base − spot) × 0.5', () => {
    const crashed = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash);
    const neutral = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, null);
    const half = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash, { graduationGlideFraction: 0.5 });
    expect(half).toBeCloseTo((crashed + neutral) / 2, 4);
  });

  it('fraction 0 / absent is byte-identical to the unshielded crash (veterans)', () => {
    const crashed = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash);
    expect(priceLinkedMiningRevenue('svc_mining_lunar_basic', units, crash, { graduationGlideFraction: 0 })).toBe(crashed);
  });

  it('premiums (spot > base) are NEVER reduced by the glide', () => {
    const spiked = priceLinkedMiningRevenue('svc_mining_lunar_basic', units, spike);
    expect(priceLinkedMiningRevenue('svc_mining_lunar_basic', units, spike, { graduationGlideFraction: 1 })).toBeCloseTo(spiked, 6);
  });
});

// ─── Live-tick integration ──────────────────────────────────────────────────

function makeBuilding(partial: Partial<BuildingInstance> & { instanceId: string; definitionId: string; locationId: string }): BuildingInstance {
  return {
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 1 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 0,
    ...partial,
  };
}

/** A small Frontier-scale lunar miner: Basic Lunar Extractor + solar farm.
 *  Book NW ≈ $50M cash + 0.6×($250M + $400M) = $440M — inside the Frontier
 *  hard cap ($500M), so `isInFrontier` holds while frontierStatus is active. */
function lunarMiner(overrides: Partial<GameState> = {}): GameState {
  const now = Date.now();
  const globalDate = getGlobalGameDate(now);
  const s = getNewGameState();
  return {
    ...s,
    npcCompanies: [],
    money: 50_000_000,
    createdAt: now,
    lastTickAt: now,
    frontierStatus: 'active',
    frontierEnteredAtMs: now,
    gameDate: { year: globalDate.year, month: globalDate.month },
    unlockedLocations: ['earth_surface', 'leo', 'lunar_surface'],
    buildings: [
      makeBuilding({ instanceId: 'm1', definitionId: 'mining_lunar_basic', locationId: 'lunar_surface' }),
      makeBuilding({ instanceId: 'p1', definitionId: 'solar_farm_lunar', locationId: 'lunar_surface' }),
    ],
    activeServices: [{
      definitionId: 'svc_mining_lunar_basic', locationId: 'lunar_surface',
      startDate: { year: 2026, month: 1 }, revenueMultiplier: 1, linkedBuildingIds: ['m1'],
    }],
    ...overrides,
  } as GameState;
}

const crashSnapshot = () => ({
  asOf: Date.now(),
  prices: {
    lunar_water: Math.round(LW_BASE * 0.3),
    helium3: Math.round(HE3_BASE * 0.3),
  },
});
const spikeSnapshot = () => ({
  asOf: Date.now(),
  prices: {
    lunar_water: Math.round(LW_BASE * 2.5),
    helium3: Math.round(HE3_BASE * 2.5),
  },
});

describe('game-engine.ts §1 — Frontier shield on price-linked mining (live tick)', () => {
  it('a Frontier save ticks the SAME money delta under a crash as under neutral spot', () => {
    const before = lunarMiner().money;
    const neutralDelta = processTick(lunarMiner()).money - before;
    const crashedDelta = processTick(lunarMiner({ marketSnapshot: crashSnapshot() })).money - before;
    expect(crashedDelta).toBeCloseTo(neutralDelta, 0);
  });

  it('a Frontier save still earns MORE under a spike (premiums pay)', () => {
    const before = lunarMiner().money;
    const neutralDelta = processTick(lunarMiner()).money - before;
    const spikedDelta = processTick(lunarMiner({ marketSnapshot: spikeSnapshot() })).money - before;
    expect(spikedDelta).toBeGreaterThan(neutralDelta);
  });

  it('a long-graduated save still takes the crash — the shield (and glide) end', () => {
    // frontierGraduatedAtMs far in the past → glide fraction 0.
    const grad = (over: Partial<GameState> = {}) => lunarMiner({
      frontierStatus: 'graduated',
      frontierGraduatedAtMs: Date.now() - 100 * 24 * 60 * 60 * 1000,
      ...over,
    });
    const before = grad().money;
    const neutralDelta = processTick(grad()).money - before;
    const crashedDelta = processTick(grad({ marketSnapshot: crashSnapshot() })).money - before;
    expect(crashedDelta).toBeLessThan(neutralDelta);
  });

  // Balance Pass 9: the graduation glide on the mining spot floor (live tick).
  it('a FRESH graduate is near-fully shielded from the crash (glide fraction ≈ 1)', () => {
    const grad = (over: Partial<GameState> = {}) => lunarMiner({
      frontierStatus: 'graduated',
      frontierGraduatedAtMs: Date.now(),
      ...over,
    });
    const before = grad().money;
    const neutralDelta = processTick(grad()).money - before;
    const crashedDelta = processTick(grad({ marketSnapshot: crashSnapshot() })).money - before;
    // Near-identical to neutral (fraction is within a tick of 1.0).
    expect(Math.abs(crashedDelta - neutralDelta)).toBeLessThan(Math.abs(neutralDelta) * 0.02 + 1000);
  });

  it('a mid-glide graduate takes a PARTIAL crash — between fresh-graduate and veteran outcomes', () => {
    const gradAt = (agoMs: number, over: Partial<GameState> = {}) => lunarMiner({
      frontierStatus: 'graduated',
      frontierGraduatedAtMs: Date.now() - agoMs,
      ...over,
    });
    const before = gradAt(0).money;
    const neutralDelta = processTick(gradAt(0)).money - before;
    const midDelta = processTick(gradAt(7 * 24 * 60 * 60 * 1000, { marketSnapshot: crashSnapshot() })).money - before; // half the 14-day glide
    const vetDelta = processTick(gradAt(100 * 24 * 60 * 60 * 1000, { marketSnapshot: crashSnapshot() })).money - before;
    expect(midDelta).toBeLessThan(neutralDelta);
    expect(midDelta).toBeGreaterThan(vetDelta);
  });

  it('a mid-glide graduate still earns MORE under a spike (premiums untouched by the glide)', () => {
    const gradAt = (agoMs: number, over: Partial<GameState> = {}) => lunarMiner({
      frontierStatus: 'graduated',
      frontierGraduatedAtMs: Date.now() - agoMs,
      ...over,
    });
    const before = gradAt(7 * 24 * 60 * 60 * 1000).money;
    const neutralDelta = processTick(gradAt(7 * 24 * 60 * 60 * 1000)).money - before;
    const spikedDelta = processTick(gradAt(7 * 24 * 60 * 60 * 1000, { marketSnapshot: spikeSnapshot() })).money - before;
    expect(spikedDelta).toBeGreaterThan(neutralDelta);
  });
});
