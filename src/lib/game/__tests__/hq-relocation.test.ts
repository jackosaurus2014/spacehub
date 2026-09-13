/**
 * @jest-environment node
 *
 * CC-2 (docs/COMMAND_CENTER_DESIGN_2026-09-13.md §2-3, §8; BALANCE.md
 * Pass 11): seat pool math, requirement checks, cost/time constants, the
 * project transitions, bonus wiring parity (client tick / P&L / server
 * ceiling for a LEO deck), the hidden-in-progress rule, the Outliner row,
 * the mining logistics terms, and the save migration for seat-less saves.
 */
import type { GameState, HeadquartersState } from '../types';
import { getNewGameState, migrateLoadedState } from '../save-load';
import { getGlobalGameDate, REAL_MS_PER_GAME_MONTH } from '../server-time';
import { processTick } from '../game-engine';
import { computeEconomyReport } from '../economy-report';
import { buildServerFlowState, computeServerMonthlyGrossDetailed } from '../resource-plausibility';
import { buildOrderQueue } from '../order-queue';
import { CLIENT_APPLIED_LEDGER_REASONS } from '../ledger-reconcile';
import { quoteLeg, legLogisticsFor } from '../mining-orders';
import { getHireCostWithWageIndex } from '../labor-market';
import { applyContractReward } from '../contracts';
import { MAX_STATIC_CONTRACT_PAYOUT_MULT } from '../contract-credit';
import {
  HQ_SEAT_COUNTS, HQ_SEAT_BASE_PRICE, HQ_RELOCATION, HQ_RETURN_COST_FRACTION, HQ_UPKEEP_MONTHLY, HQ_SEAT_TERM_MONTHS,
  HQ_FRONTIER_STACK_CAP, HQ_SATELLITE_SERVICE_IDS, NEUTRAL_HQ_BONUSES,
  getHqBonuses, getHqStage, hqRevenueMultUnderFrontier, hqSeatLabel, hqReachableStages, isValidHeadquarters,
  hqMiningLogisticsFor, maxHqBonus, migrateHeadquarters, getHeadquarters,
} from '../headquarters';
import {
  postedSeatPrice, HQ_SEAT_TERM_MS, quoteHqRelocation, evaluateHqRequirementsFrom, checkHqRelocationRequest,
  startHqProject, completeHqProject, applyDueHqProject, adoptServerHeadquarters, hqProjectProgress,
  hqRelocationReportId, hqUpkeepMonthly, buildHqLadder, HQ_STAGE_REQUIREMENTS,
} from '../hq-relocation';

const DAY = 24 * 60 * 60 * 1000;

function earth(nowMs = 1_800_000_000_000): HeadquartersState {
  return { stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: nowMs - 30 * DAY };
}

/** A veteran corporation with one small launch pad + service, Frontier off. */
function launchState(hqStage: 'earth_ops' | 'orbital_deck' | 'lunar_hq', extra: Partial<GameState> = {}): GameState {
  const g = getGlobalGameDate();
  const now = Date.now();
  const def = getHqStage(hqStage);
  const base = getNewGameState();
  return {
    ...base,
    money: 100_000_000,
    resources: { rocket_fuel: 200 },
    gameDate: { year: g.year, month: g.month },
    lastTickAt: now,
    workforce: { engineers: 1, scientists: 0, miners: 0, operators: 1 },
    activeServices: [
      { definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], startDate: { year: g.year, month: g.month }, revenueMultiplier: 1 },
    ],
    buildings: [
      { instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', buildStartDate: { year: g.year, month: g.month }, completionDate: { year: g.year, month: g.month }, isComplete: true, startedAtMs: now - 10_000_000, realDurationSeconds: 1 },
    ],
    createdAt: now - 400 * DAY,
    frontierStatus: 'none',
    headquarters: { stage: def.id, locationId: def.locationId, movedAtMs: now - DAY },
    ...extra,
  } as GameState;
}

describe('seat pool (headquarters.ts / hq-relocation.ts)', () => {
  it('Epoch 2 counts shrink with distance, Earth unlimited; CC-3 reaches every rung', () => {
    expect(HQ_SEAT_COUNTS.orbital_deck).toBe(24);
    expect(HQ_SEAT_COUNTS.lunar_hq).toBe(12);
    expect(HQ_SEAT_COUNTS.earth_ops).toBe(0);
    expect(hqReachableStages().map(s => s.id)).toEqual([
      'earth_ops', 'orbital_deck', 'lunar_hq', 'mars_hq', 'jovian_hq', 'saturnian_hq', 'deep_space_hq', 'interstellar_hq',
    ]);
  });

  it('posted price starts at base, rises monotonically with occupancy to ~3x at the last seat, rounds to $0.1M', () => {
    expect(postedSeatPrice('orbital_deck', 0)).toBe(HQ_SEAT_BASE_PRICE.orbital_deck);
    let prev = 0;
    for (let occ = 0; occ <= 24; occ++) {
      const p = postedSeatPrice('orbital_deck', occ);
      expect(p).toBeGreaterThanOrEqual(prev);
      expect(p % 100_000).toBe(0);
      prev = p;
    }
    expect(postedSeatPrice('orbital_deck', 24)).toBe(HQ_SEAT_BASE_PRICE.orbital_deck * 3);
    expect(postedSeatPrice('orbital_deck', 12)).toBeGreaterThan(HQ_SEAT_BASE_PRICE.orbital_deck);
    expect(postedSeatPrice('orbital_deck', 12)).toBeLessThan(HQ_SEAT_BASE_PRICE.orbital_deck * 2);
    expect(postedSeatPrice('orbital_deck', 99)).toBe(HQ_SEAT_BASE_PRICE.orbital_deck * 3); // clamped
    expect(postedSeatPrice('earth_ops', 0)).toBe(0);
  });

  it('lease term is 6 game-months of 6 h; the public seat label is null on Earth', () => {
    expect(HQ_SEAT_TERM_MONTHS).toBe(6);
    expect(HQ_SEAT_TERM_MS).toBe(6 * REAL_MS_PER_GAME_MONTH);
    expect(hqSeatLabel('orbital_deck', 7)).toBe('LEO seat 7');
    expect(hqSeatLabel('lunar_hq', 3)).toBe('Lunar seat 3');
    expect(hqSeatLabel('earth_ops', 1)).toBeNull();
    expect(hqSeatLabel('orbital_deck', 0)).toBeNull();
    expect(hqSeatLabel('orbital_deck', undefined)).toBeNull();
  });
});

describe('relocation cost / time constants', () => {
  it('LEO: 2 game-months; Luna: 4; return to Earth: 25% of the departing fee, 1 month', () => {
    const leo = quoteHqRelocation('earth_ops', 'orbital_deck');
    expect(leo.cost).toBe(HQ_RELOCATION.orbital_deck.cost);
    expect(leo.months).toBe(2);
    expect(leo.durationMs).toBe(2 * REAL_MS_PER_GAME_MONTH);
    expect(leo.seatNeeded).toBe(true);
    expect(leo.isReturn).toBe(false);
    const luna = quoteHqRelocation('orbital_deck', 'lunar_hq');
    expect(luna.cost).toBe(HQ_RELOCATION.lunar_hq.cost);
    expect(luna.months).toBe(4);
    const back = quoteHqRelocation('lunar_hq', 'earth_ops');
    expect(back.isReturn).toBe(true);
    expect(back.cost).toBe(Math.round(HQ_RELOCATION.lunar_hq.cost * HQ_RETURN_COST_FRACTION));
    expect(back.months).toBe(1);
    expect(back.seatNeeded).toBe(false);
    expect(HQ_RETURN_COST_FRACTION).toBe(0.25);
  });

  it('upkeep: Earth free, LEO and Luna pay monthly; the state reader follows the seat', () => {
    expect(HQ_UPKEEP_MONTHLY.earth_ops).toBe(0);
    expect(HQ_UPKEEP_MONTHLY.orbital_deck).toBeGreaterThan(0);
    expect(HQ_UPKEEP_MONTHLY.lunar_hq).toBeGreaterThan(HQ_UPKEEP_MONTHLY.orbital_deck);
    expect(HQ_UPKEEP_MONTHLY.mars_hq).toBeGreaterThan(HQ_UPKEEP_MONTHLY.lunar_hq);
    expect(hqUpkeepMonthly(launchState('earth_ops'))).toBe(0);
    expect(hqUpkeepMonthly(launchState('orbital_deck'))).toBe(HQ_UPKEEP_MONTHLY.orbital_deck);
  });
});

describe('requirements (design §3 table)', () => {
  const noBuildings = { tier: 1, buildings: [] as Array<{ definitionId: string; locationId: string; isComplete: boolean }> };
  it('LEO needs tier 2 + an Orbital Outpost in LEO; Luna tier 3 + a Lunar Gateway or Habitat', () => {
    expect(HQ_STAGE_REQUIREMENTS.orbital_deck.building?.locations).toEqual(['leo']);
    expect(HQ_STAGE_REQUIREMENTS.lunar_hq.building?.locations).toEqual(['lunar_orbit', 'lunar_surface']);
    const t1 = evaluateHqRequirementsFrom(noBuildings, 'orbital_deck');
    expect(t1.met).toBe(false);
    expect(t1.tier).toEqual({ need: 2, have: 1, met: false });
    expect(t1.building?.met).toBe(false);
    expect(t1.seatNeeded).toBe(true);
    const t2 = evaluateHqRequirementsFrom({ tier: 2, buildings: [{ definitionId: 'space_station_small', locationId: 'leo', isComplete: true }] }, 'orbital_deck');
    expect(t2.met).toBe(true);
    // A pending outpost does not count; a station at the wrong place does not count.
    expect(evaluateHqRequirementsFrom({ tier: 2, buildings: [{ definitionId: 'space_station_small', locationId: 'leo', isComplete: false }] }, 'orbital_deck').met).toBe(false);
    expect(evaluateHqRequirementsFrom({ tier: 3, buildings: [{ definitionId: 'space_station_small', locationId: 'leo', isComplete: true }] }, 'lunar_hq').building?.met).toBe(false);
    expect(evaluateHqRequirementsFrom({ tier: 3, buildings: [{ definitionId: 'habitat_lunar', locationId: 'lunar_surface', isComplete: true }] }, 'lunar_hq').met).toBe(true);
    expect(evaluateHqRequirementsFrom({ tier: 3, buildings: [{ definitionId: 'space_station_lunar', locationId: 'lunar_orbit', isComplete: true }] }, 'lunar_hq').met).toBe(true);
    // Earth needs nothing; CC-3 made Mars reachable (tier 4 + a Mars station).
    expect(evaluateHqRequirementsFrom(noBuildings, 'earth_ops').met).toBe(true);
    const mars = evaluateHqRequirementsFrom({ tier: 7, buildings: [{ definitionId: 'habitat_mars', locationId: 'mars_surface', isComplete: true }] }, 'mars_hq');
    expect(mars.reachable).toBe(true);
    expect(mars.met).toBe(true);
  });

  it('checkHqRelocationRequest: one HQ, one project at a time, tier and station gates, no coming-soon seats', () => {
    const view = { tier: 2, buildings: [{ definitionId: 'space_station_small', locationId: 'leo', isComplete: true }] };
    expect(checkHqRelocationRequest(earth(), view, 'nowhere')).toMatchObject({ ok: false, error: 'unknown_stage' });
    expect(checkHqRelocationRequest(earth(), view, 'earth_ops')).toMatchObject({ ok: false, error: 'same_stage' });
    // CC-3: Mars is open but tier-gated, and its seat must be won at auction.
    expect(checkHqRelocationRequest(earth(), view, 'mars_hq')).toMatchObject({ ok: false, error: 'tier' });
    expect(checkHqRelocationRequest(earth(), { ...view, tier: 1 }, 'orbital_deck')).toMatchObject({ ok: false, error: 'tier' });
    expect(checkHqRelocationRequest(earth(), { tier: 2, buildings: [] }, 'orbital_deck')).toMatchObject({ ok: false, error: 'building' });
    const inFlight = startHqProject(earth(), 'orbital_deck', 1_800_000_000_000);
    expect(checkHqRelocationRequest(inFlight, view, 'lunar_hq')).toMatchObject({ ok: false, error: 'in_progress' });
    const ok = checkHqRelocationRequest(earth(), view, 'orbital_deck');
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.quote.cost).toBe(HQ_RELOCATION.orbital_deck.cost);
  });
});

describe('project transitions', () => {
  const T0 = 1_800_000_000_000;
  it('start → not due → due flips the seat and carries the reserved seat index', () => {
    const p = startHqProject(earth(T0), 'orbital_deck', T0, { seatIndex: 7, relocationId: 'r1' });
    expect(p.stage).toBe('earth_ops');
    expect(p.project).toEqual({ targetStage: 'orbital_deck', startedAtMs: T0, completesAtMs: T0 + 2 * REAL_MS_PER_GAME_MONTH, seatIndex: 7, relocationId: 'r1' });
    expect(isValidHeadquarters(p)).toBe(true);
    expect(completeHqProject(p, T0 + REAL_MS_PER_GAME_MONTH)).toBe(p);
    const done = completeHqProject(p, T0 + 2 * REAL_MS_PER_GAME_MONTH);
    expect(done).toEqual({ stage: 'orbital_deck', locationId: 'leo', movedAtMs: T0 + 2 * REAL_MS_PER_GAME_MONTH, seatIndex: 7 });
    const prog = hqProjectProgress(p.project!, T0 + REAL_MS_PER_GAME_MONTH);
    expect(prog.pct).toBeCloseTo(50, 5);
    expect(prog.etaSeconds).toBeCloseTo(REAL_MS_PER_GAME_MONTH / 1000, 5);
  });

  it('a return to Earth drops the seat index; the tick hook posts the charter mail exactly once', () => {
    const seated: HeadquartersState = { stage: 'orbital_deck', locationId: 'leo', movedAtMs: T0, seatIndex: 7 };
    const back = completeHqProject(startHqProject(seated, 'earth_ops', T0 + DAY), T0 + 10 * DAY);
    expect(back).toEqual({ stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: T0 + DAY + REAL_MS_PER_GAME_MONTH });
    expect(back.seatIndex).toBeUndefined();

    const state = { ...launchState('earth_ops'), headquarters: startHqProject(earth(T0), 'orbital_deck', T0, { seatIndex: 2 }), reports: [] } as GameState;
    const before = applyDueHqProject(state, T0 + REAL_MS_PER_GAME_MONTH);
    expect(before).toBe(state);
    const after = applyDueHqProject(state, T0 + 3 * REAL_MS_PER_GAME_MONTH);
    expect(getHeadquarters(after).stage).toBe('orbital_deck');
    expect(after.reports).toHaveLength(1);
    expect(after.reports![0].id).toBe(hqRelocationReportId('orbital_deck', T0 + 2 * REAL_MS_PER_GAME_MONTH));
    expect(after.reports![0].body).toMatch(/LEO seat 2/);
    // The server's block for the same move (movedAtMs = scheduled completesAt) adds no second mail.
    const again = adoptServerHeadquarters(after, { stage: 'orbital_deck', locationId: 'leo', seatIndex: 2, movedAtMs: T0 + 2 * REAL_MS_PER_GAME_MONTH, project: null }, T0 + 3 * REAL_MS_PER_GAME_MONTH);
    expect(again.reports).toHaveLength(1);
  });

  it('adoptServerHeadquarters: the server is authoritative, garbage is ignored, a server-completed move mails once', () => {
    const state = { ...launchState('earth_ops'), headquarters: startHqProject(earth(T0), 'orbital_deck', T0), reports: [] } as GameState;
    expect(adoptServerHeadquarters(state, null)).toBe(state);
    expect(adoptServerHeadquarters(state, { stage: 'orbital_deck', locationId: 'earth_surface' })).toBe(state); // seat/location mismatch
    expect(adoptServerHeadquarters(state, { stage: 'nope', locationId: 'leo' })).toBe(state);
    const moved = adoptServerHeadquarters(state, { stage: 'orbital_deck', locationId: 'leo', seatIndex: 5, movedAtMs: T0 + 2 * REAL_MS_PER_GAME_MONTH, project: null }, T0 + 3 * DAY);
    expect(getHeadquarters(moved)).toEqual({ stage: 'orbital_deck', locationId: 'leo', movedAtMs: T0 + 2 * REAL_MS_PER_GAME_MONTH, seatIndex: 5 });
    expect(moved.reports).toHaveLength(1);
    // Same block again → no change, no second mail.
    expect(adoptServerHeadquarters(moved, { stage: 'orbital_deck', locationId: 'leo', seatIndex: 5, movedAtMs: T0 + 2 * REAL_MS_PER_GAME_MONTH, project: null })).toBe(moved);
  });
});

describe('bonus profiles + Frontier stacking rule', () => {
  it('Earth: hiring −10%, contracts +10%; LEO: launch +12%, sat ops −10%; Luna: fuel −12%, belt Δv −10%; everything else neutral', () => {
    expect(getHqBonuses('earth_ops')).toEqual({ ...NEUTRAL_HQ_BONUSES, hiringCostMult: 0.9, contractPayoutMult: 1.1 });
    expect(getHqBonuses('orbital_deck')).toEqual({ ...NEUTRAL_HQ_BONUSES, launchRevenueMult: 1.12, satelliteOpsCostMult: 0.9 });
    expect(getHqBonuses('lunar_hq')).toEqual({ ...NEUTRAL_HQ_BONUSES, miningFuelMult: 0.88, beltDeltaVMult: 0.9 });
    expect(getHqBonuses('bogus')).toEqual(NEUTRAL_HQ_BONUSES);
    // ±10-15% (design §8 call 1): every non-neutral term sits inside the band.
    for (const s of ['earth_ops', 'orbital_deck', 'lunar_hq', 'mars_hq', 'jovian_hq', 'saturnian_hq', 'deep_space_hq', 'interstellar_hq'] as const) {
      for (const v of Object.values(getHqBonuses(s))) {
        if (v === 1) continue;
        expect(Math.abs(v - 1)).toBeGreaterThanOrEqual(0.10 - 1e-9);
        expect(Math.abs(v - 1)).toBeLessThanOrEqual(0.15 + 1e-9);
      }
    }
    expect(maxHqBonus('contractPayoutMult')).toBe(1.1);
    expect(maxHqBonus('launchRevenueMult')).toBe(1.12);
  });

  it('never stacks with the Frontier ×2 beyond ×2.3 on the same term', () => {
    expect(HQ_FRONTIER_STACK_CAP).toBe(2.3);
    expect(hqRevenueMultUnderFrontier(1.12, 1)).toBe(1.12);
    expect(hqRevenueMultUnderFrontier(1.12, 2)).toBe(1.12); // 2.24 ≤ 2.3 — untrimmed today
    expect(hqRevenueMultUnderFrontier(1.3, 2)).toBeCloseTo(1.15, 10); // would be 2.6 → trimmed to 2.3/2
    expect(hqRevenueMultUnderFrontier(1.12, 2.5)).toBeCloseTo(1, 10); // cap already exceeded by the Frontier alone → no HQ stacking
    expect(hqRevenueMultUnderFrontier(1, 2)).toBe(1);
    expect(hqRevenueMultUnderFrontier(NaN, 2)).toBe(1);
  });

  it('satellite ops = services a satellite-category building enables', () => {
    expect(HQ_SATELLITE_SERVICE_IDS.has('svc_telecom_leo')).toBe(true);
    expect(HQ_SATELLITE_SERVICE_IDS.has('svc_launch_small')).toBe(false);
  });
});

describe('bonus wiring parity — LEO deck', () => {
  it('the live tick, the P&L and the server monthly-gross ceiling all carry the same +12% on launch services', () => {
    const earthState = launchState('earth_ops');
    const leoState = launchState('orbital_deck');
    const earthTick = processTick(earthState);
    const leoTick = processTick(leoState);
    const earthEarned = earthTick.totalEarned - earthState.totalEarned;
    const leoEarned = leoTick.totalEarned - leoState.totalEarned;
    expect(earthEarned).toBeGreaterThan(0);
    expect(Math.abs(leoEarned - 1.12 * earthEarned)).toBeLessThanOrEqual(1);

    const earthRep = computeEconomyReport(earthState, Date.now());
    const leoRep = computeEconomyReport(leoState, Date.now());
    const earthLine = earthRep.revenueLines.find(l => l.serviceId === 'svc_launch_small')!;
    const leoLine = leoRep.revenueLines.find(l => l.serviceId === 'svc_launch_small')!;
    expect(leoLine.baseRevenuePerMonth).toBeCloseTo(earthLine.baseRevenuePerMonth * 1.12, -1);
    // Upkeep rides the overhead line, flat.
    expect(leoRep.costs.corporateOverhead - earthRep.costs.corporateOverhead).toBe(HQ_UPKEEP_MONTHLY.orbital_deck);

    const row = buildServerFlowState({
      prevResources: {},
      prevBuildingsData: [{ instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface', isComplete: true }],
      prevShipsData: [],
      prevActiveServices: [{ definitionId: 'svc_launch_small', locationId: 'earth_surface', linkedBuildingIds: [], revenueMultiplier: 1 }],
      prevResearch: [],
    });
    const wf = { engineers: 1, scientists: 0, miners: 0, operators: 1 };
    const earthCeil = computeServerMonthlyGrossDetailed(row, { totalEarned: 0, workforceData: wf, createdAtMs: Date.now() - 400 * DAY, hqStage: 'earth_ops' });
    const leoCeil = computeServerMonthlyGrossDetailed(row, { totalEarned: 0, workforceData: wf, createdAtMs: Date.now() - 400 * DAY, hqStage: 'orbital_deck' });
    const unknownCeil = computeServerMonthlyGrossDetailed(row, { totalEarned: 0, workforceData: wf, createdAtMs: Date.now() - 400 * DAY, hqStage: 'unknown' });
    expect(earthCeil.hqLaunchRevenueMult).toBe(1);
    expect(leoCeil.hqLaunchRevenueMult).toBe(1.12);
    expect(unknownCeil.hqLaunchRevenueMult).toBe(1.12);
    expect(leoCeil.services).toBeCloseTo(earthCeil.services * 1.12, -1);
    // Absent = Earth (the pre-CC-2 call shape).
    expect(computeServerMonthlyGrossDetailed(row, { totalEarned: 0, workforceData: wf }).hqLaunchRevenueMult).toBe(1);
    // The Frontier cap applies server-side too: a new profile's bound is
    // min(1.12, 2.3/2.0) = 1.12 today.
    expect(computeServerMonthlyGrossDetailed(row, { totalEarned: 0, workforceData: wf, createdAtMs: Date.now() - DAY, hqStage: 'orbital_deck' }).hqLaunchRevenueMult).toBe(1.12);
  });

  it('a Lunar seat changes nothing on the service ledger (its terms live on the Mining-Order loop)', () => {
    const earthState = launchState('earth_ops');
    const lunaState = launchState('lunar_hq');
    const e = processTick(earthState).totalEarned - earthState.totalEarned;
    const l = processTick(lunaState).totalEarned - lunaState.totalEarned;
    expect(l).toBe(e);
  });
});

describe('cost-side wiring — Earth seat', () => {
  it('hiring is 10% cheaper on Earth than in LEO (labor-market.ts getHireCostWithWageIndex)', () => {
    const earthState = launchState('earth_ops');
    const leoState = launchState('orbital_deck');
    const e = getHireCostWithWageIndex(earthState, 'engineer');
    const l = getHireCostWithWageIndex(leoState, 'engineer');
    expect(l).toBeGreaterThan(0);
    expect(e).toBe(Math.round(l * 0.9));
  });

  it('static contract rewards pay +10% on Earth; the server headroom bound carries the same term', () => {
    const earthState = launchState('earth_ops');
    const leoState = launchState('orbital_deck');
    const reward = { money: 10_000_000 };
    const e = applyContractReward(earthState, reward).money - earthState.money;
    const l = applyContractReward(leoState, reward).money - leoState.money;
    expect(e).toBe(Math.round(l * 1.1));
    expect(MAX_STATIC_CONTRACT_PAYOUT_MULT).toBeGreaterThanOrEqual(1.1);
  });
});

describe('mining logistics — Lunar seat', () => {
  it('quoteLeg: fuel ×0.88 on every leg, the rock Δv surcharge ×0.9 only for belt fields; transit time unchanged', () => {
    const luna = hqMiningLogisticsFor('lunar_hq');
    expect(luna).toEqual({ fuelMult: 0.88, beltDeltaVMult: 0.9 });
    expect(legLogisticsFor(luna, 'asteroid_belt')).toEqual({ fuelMult: 0.88, deltaVMult: 0.9 });
    expect(legLogisticsFor(luna, 'lunar_orbit')).toEqual({ fuelMult: 0.88, deltaVMult: 1 });
    expect(legLogisticsFor(null, 'asteroid_belt')).toEqual({});
    const base = quoteLeg('lunar_surface', 'asteroid_belt', 800, 2, 100, 1);
    const belt = quoteLeg('lunar_surface', 'asteroid_belt', 800, 2, 100, 1, legLogisticsFor(luna, 'asteroid_belt'));
    const near = quoteLeg('lunar_surface', 'lunar_orbit', 800, 2, 100, 1, legLogisticsFor(luna, 'lunar_orbit'));
    const nearBase = quoteLeg('lunar_surface', 'lunar_orbit', 800, 2, 100, 1);
    expect(belt.deltaV).toBeCloseTo(base.deltaV - 80, 6);
    expect(belt.seconds).toBe(base.seconds);
    expect(belt.fuel).toBeLessThan(base.fuel * 0.88 + 1);
    expect(belt.fuel).toBeGreaterThan(base.fuel * 0.80);
    expect(near.deltaV).toBe(nearBase.deltaV);
    expect(near.fuel).toBe(Math.round(nearBase.fuel * 0.88) < 10_000 ? 10_000 : Math.round(nearBase.fuel * 0.88));
    // Earth terms are neutral.
    expect(quoteLeg('lunar_surface', 'asteroid_belt', 800, 2, 100, 1, legLogisticsFor(hqMiningLogisticsFor('earth_ops'), 'asteroid_belt'))).toEqual(base);
  });
});

describe('hidden-in-progress rule + public surfaces', () => {
  it('the ladder marks the inbound stage; the public seat label never names a reservation', () => {
    const T0 = 1_800_000_000_000;
    const state = { ...launchState('earth_ops'), headquarters: startHqProject(earth(T0), 'orbital_deck', T0, { seatIndex: 4 }) } as GameState;
    const ladder = buildHqLadder(state);
    expect(ladder.find(r => r.stage.id === 'orbital_deck')?.inbound).toBe(true);
    expect(ladder.find(r => r.stage.id === 'earth_ops')?.current).toBe(true);
    // The public label reads the CURRENT stage + seat only (the project's
    // reserved seat is not exposed until the move completes).
    const hq = getHeadquarters(state);
    expect(hqSeatLabel(hq.stage, hq.seatIndex)).toBeNull();
    expect(hqSeatLabel(hq.stage, hq.project?.seatIndex)).toBeNull(); // Earth has no seats anyway
  });

  it('the server ledger and the CLIENT_APPLIED contract know the two HQ reasons', () => {
    expect(CLIENT_APPLIED_LEDGER_REASONS).toEqual(expect.arrayContaining(['hq_relocation', 'hq_seat_lease']));
  });
});

describe('Outliner row (order-queue.ts)', () => {
  it('emits one relocation row with a live ETA that opens the Bridge', () => {
    const now = Date.now();
    const state = { ...getNewGameState(), headquarters: startHqProject(earth(now), 'lunar_hq', now - REAL_MS_PER_GAME_MONTH) } as GameState;
    const rows = buildOrderQueue(state).filter(r => r.id.startsWith('hq-relocation-'));
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Relocating HQ → Lunar HQ');
    expect(rows[0].tab).toBe('dashboard');
    expect(rows[0].target).toEqual({ kind: 'location', id: 'lunar_surface' });
    expect(rows[0].pct).toBeGreaterThan(20); expect(rows[0].pct).toBeLessThan(30);
    expect(rows[0].etaSeconds).toBeGreaterThan(3 * REAL_MS_PER_GAME_MONTH / 1000 - 5);
    expect(buildOrderQueue(getNewGameState()).some(r => r.id.startsWith('hq-relocation-'))).toBe(false);
  });
});

describe('save migration (seat-less and pre-CC-2 saves)', () => {
  it('a CC-1 save (no seat, no project) is valid as-is; malformed optional fields are dropped, the stage kept', () => {
    const cc1 = { ...getNewGameState(), headquarters: { stage: 'orbital_deck', locationId: 'leo', movedAtMs: 5 } } as GameState;
    expect(isValidHeadquarters(cc1.headquarters)).toBe(true);
    migrateHeadquarters(cc1);
    expect(cc1.headquarters).toEqual({ stage: 'orbital_deck', locationId: 'leo', movedAtMs: 5 });

    const bad = { ...getNewGameState(), headquarters: { stage: 'lunar_hq', locationId: 'lunar_surface', movedAtMs: 5, seatIndex: 'x', project: { targetStage: 'nope' } } } as unknown as GameState;
    migrateHeadquarters(bad);
    expect(bad.headquarters).toEqual({ stage: 'lunar_hq', locationId: 'lunar_surface', movedAtMs: 5 });

    const good = { ...getNewGameState(), headquarters: { stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: 5, project: { targetStage: 'orbital_deck', startedAtMs: 10, completesAtMs: 20, seatIndex: 3 } } } as GameState;
    migrateHeadquarters(good);
    expect(good.headquarters?.project?.seatIndex).toBe(3);

    // The full loader path keeps a seated save seated.
    const raw = JSON.parse(JSON.stringify({ ...getNewGameState(), headquarters: { stage: 'orbital_deck', locationId: 'leo', movedAtMs: 5, seatIndex: 9 } }));
    const loaded = migrateLoadedState(raw)!;
    expect(loaded.headquarters).toEqual({ stage: 'orbital_deck', locationId: 'leo', movedAtMs: 5, seatIndex: 9 });
    // No headquarters at all → Earth default, as in CC-1.
    const none = migrateLoadedState(JSON.parse(JSON.stringify({ ...getNewGameState(), headquarters: undefined })))!;
    expect(none.headquarters?.stage).toBe('earth_ops');
  });
});
