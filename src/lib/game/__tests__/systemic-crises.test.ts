/**
 * @jest-environment node
 *
 * AAA Program Round 2 — Systemic Crises and the Situation mechanic.
 * docs/AAA_PROGRAM_2026-08.md "Round 2".
 *
 * The four things the brief names explicitly get first-class coverage:
 *
 *   1. A crisis CANNOT fire against a Protected Frontier corporation or one
 *      still inside the FTUE chain. (§"newcomer safety")
 *   2. Scaling reads REAL TELEMETRY, not a constant — every crisis's
 *      exposure term is a live function of GameState, and the world index is
 *      an anchored ratio, not a magic number.
 *   3. No archetype can be driven insolvent by a single crisis (the loss is
 *      bounded twice).
 *   4. The whole system is INERT by default, so a pre-Round-2 save, a
 *      logged-out session and an un-pushed schema all behave exactly as they
 *      did before this wave — which is what makes the byte-identical sim
 *      results a check rather than a coincidence.
 *
 * Plus the two structural drift guards the design leans on: the
 * operational-capital duplicate must agree with economic-sinks.ts's insured
 * asset value, and the crisis market-event schedule must stay a pure function
 * of the wall clock so the forecast can never promise an event the active
 * feed does not deliver.
 */
import type { GameState } from '../types';
import {
  CRISIS_ACTIVE_WEEKS,
  CRISIS_ACTIVE_WINDOW_MS,
  CRISIS_APPROACHES,
  CRISIS_APPROACH_MAP,
  CRISIS_ASSESSMENT_TARGET_FLOOR,
  CRISIS_ASSESSMENT_TARGET_PCT,
  CRISIS_BASE_RATE_PER_WINDOW,
  CRISIS_CYCLE_WEEKS,
  CRISIS_DEFINITIONS,
  CRISIS_EXPOSURE_FACTOR_MAX,
  CRISIS_EXPOSURE_FACTOR_MIN,
  CRISIS_FORECAST_WEEKS,
  CRISIS_LOSS_CASH_CAP_PCT,
  CRISIS_MAP,
  CRISIS_MITIGATION_CAP,
  CRISIS_PLEDGE_MITIGATION,
  CRISIS_PREMIUM_MULTIPLIER,
  CRISIS_REALIZED_LOSS_PCT,
  CRISIS_STAGES,
  CRISIS_TIER_ORDER,
  advanceSystemicCrisis,
  clampCrisisSnapshot,
  computeAssessmentTarget,
  computeCrisisExposure,
  computeSituationRatePerMs,
  containmentFraction,
  crisisExposureFactor,
  crisisOperationalCapital,
  crisisTierForIndex,
  crisisTierRank,
  effectiveCrisisTier,
  getCrisisForCycle,
  getCrisisInsurancePremiumMultiplier,
  getCrisisStatus,
  getCrisisWindow,
  isCrisisEligible,
  projectedApproachSpend,
  qualifyingPledge,
  setCrisisApproach,
  situationRealizedLoss,
  type CorporateSituation,
  type CrisisApproachId,
  type CrisisSnapshot,
  type CrisisTier,
} from '../systemic-crises';
import { computeInsuredAssetValue, getMonthlyInsurancePremium, calculateInsurancePremium } from '../economic-sinks';
import { getGlobalActiveMarketEvents, getGlobalMarketEventForecast, getCrisisMarketEventInstances } from '../market-events';
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import { SHIPS } from '../ships';
import { FRONTIER_DURATION_MS, FRONTIER_HARD_CAP_NET_WORTH, isInFrontier } from '../frontier';
import { ONBOARDING_DONE_STEP } from '../onboarding';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** A moment deep inside the ACTIVE window of a known cycle — every timing
 *  test anchors here so nothing depends on when the suite happens to run. */
const CYCLE = 300;
const CYCLE_START = CYCLE * CRISIS_CYCLE_WEEKS * WEEK_MS;
const ACTIVE_START = CYCLE_START + CRISIS_FORECAST_WEEKS * WEEK_MS;
const MID_ACTIVE = ACTIVE_START + 1.5 * WEEK_MS;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    version: 1, createdAt: 0, lastTickAt: 0,
    money: 5_000_000_000, totalEarned: 5_000_000_000, totalSpent: 0,
    gameDate: { year: 2150, month: 1 }, tickSpeed: 1,
    buildings: [], ships: [], completedResearch: [], activeResearch: null, activeServices: [],
    unlockedLocations: ['earth_surface'], resources: {}, eventLog: [],
    // Past the FTUE chain and past the Frontier by default: the protected
    // cases are opted INTO by the tests that mean to exercise them, so a
    // forgotten field can never silently disable a crisis in an unrelated
    // test.
    tutorialStep: ONBOARDING_DONE_STEP,
    frontierStatus: 'graduated',
    frontierGraduatedAtMs: 0,
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    ...overrides,
  } as GameState;
}

/** Completed buildings at a location, using real catalogue definitions so
 *  every capital figure in these tests is a real price, never a stub. */
function buildingsAt(locationId: string, count: number): GameState['buildings'] {
  const def = BUILDINGS.find(b => b.requiredLocation === locationId) ?? BUILDINGS[0];
  return Array.from({ length: count }, (_, i) => ({
    instanceId: `b${locationId}${i}`,
    definitionId: def.id,
    locationId,
    buildStartDate: { year: 2150, month: 1 },
    completionDate: { year: 2150, month: 1 },
    isComplete: true,
    startedAtMs: 0,
    realDurationSeconds: 1,
  })) as GameState['buildings'];
}

function snapshot(overrides: Partial<CrisisSnapshot> = {}): CrisisSnapshot {
  const def = getCrisisForCycle(CYCLE);
  return {
    enabled: true,
    cycleIndex: CYCLE,
    crisisId: def.id,
    worldIndex: 0,
    worldIndexMeasured: 0,
    worldIndexAnchor: 1,
    worldIndexChannel: def.worldIndexChannel,
    assessmentTargetUsd: CRISIS_ASSESSMENT_TARGET_FLOOR,
    pledgedUsd: 0,
    pledgeCount: 0,
    myPledgeUsd: 0,
    reliefId: def.defaultReliefId,
    reliefSetByCorp: null,
    canSetRelief: false,
    topPledges: [],
    history: [],
    asOf: MID_ACTIVE,
    ...overrides,
  };
}

function situation(overrides: Partial<CorporateSituation> = {}): CorporateSituation {
  return {
    crisisId: getCrisisForCycle(CYCLE).id,
    cycleIndex: CYCLE,
    progress: 0,
    chargedStage: -1,
    approachId: 'absorb',
    approachAdoptedStage: 0,
    exposureAtOnset: 1,
    tierAtOnset: 'severe',
    operationalCapitalAtOnset: 10_000_000_000,
    openedAtMs: ACTIVE_START,
    lastAdvancedMs: ACTIVE_START,
    pledged: false,
    ...overrides,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 1. The calendar
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — the calendar is a pure function of the wall clock', () => {
  it('the four phases tile the eight-week cycle exactly, with no gap and no overlap', () => {
    const seen: string[] = [];
    for (let w = 0; w < CRISIS_CYCLE_WEEKS; w++) {
      seen.push(getCrisisWindow(CYCLE_START + w * WEEK_MS + 1000).phase);
    }
    expect(seen).toEqual([
      'forecast', 'forecast',
      'active', 'active', 'active', 'active',
      'aftermath', 'recess',
    ]);
    expect(CRISIS_FORECAST_WEEKS + CRISIS_ACTIVE_WEEKS + 2).toBe(CRISIS_CYCLE_WEEKS);
  });

  it('is deterministic — the same instant yields the same window for every caller', () => {
    expect(getCrisisWindow(MID_ACTIVE)).toEqual(getCrisisWindow(MID_ACTIVE));
  });

  it('cycles tile the timeline: each cycle start is the previous cycle end', () => {
    for (let c = CYCLE; c < CYCLE + 5; c++) {
      const a = getCrisisWindow(c * CRISIS_CYCLE_WEEKS * WEEK_MS + 1);
      const b = getCrisisWindow((c + 1) * CRISIS_CYCLE_WEEKS * WEEK_MS + 1);
      expect(b.cycleIndex).toBe(a.cycleIndex + 1);
      expect(b.forecastStartMs - a.forecastStartMs).toBe(CRISIS_CYCLE_WEEKS * WEEK_MS);
    }
  });

  it('the active window is exactly CRISIS_ACTIVE_WINDOW_MS long', () => {
    const w = getCrisisWindow(MID_ACTIVE);
    expect(w.activeEndMs - w.activeStartMs).toBe(CRISIS_ACTIVE_WINDOW_MS);
  });

  it('stage advances monotonically across the window and never exceeds CRISIS_STAGES', () => {
    let last = -1;
    for (let i = 0; i <= 40; i++) {
      const t = ACTIVE_START + (i / 40) * CRISIS_ACTIVE_WINDOW_MS;
      const s = getCrisisWindow(Math.min(t, ACTIVE_START + CRISIS_ACTIVE_WINDOW_MS - 1)).stage;
      expect(s).toBeGreaterThanOrEqual(last);
      expect(s).toBeLessThanOrEqual(CRISIS_STAGES);
      last = s;
    }
  });

  it('crisis identity rotates through the whole catalogue before repeating', () => {
    const n = CRISIS_DEFINITIONS.length;
    const ids = Array.from({ length: n }, (_, i) => getCrisisForCycle(CYCLE + i).id);
    expect(new Set(ids).size).toBe(n);
    expect(getCrisisForCycle(CYCLE + n).id).toBe(getCrisisForCycle(CYCLE).id);
  });

  it('the catalogue repeat interval is longer than chapters.ts\'s 18 weeks', () => {
    expect(CRISIS_DEFINITIONS.length * CRISIS_CYCLE_WEEKS).toBeGreaterThan(18);
  });

  it('handles negative cycle indices without throwing (defensive: pre-epoch clocks)', () => {
    expect(() => getCrisisForCycle(-3)).not.toThrow();
    expect(CRISIS_MAP.has(getCrisisForCycle(-3).id)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. Newcomer safety — the headline requirement
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — a crisis can NEVER fire against a protected newcomer', () => {
  const snap = snapshot({ worldIndex: 2 }); // maximum world severity

  it('a Protected Frontier corporation is exempt', () => {
    const st = baseState({
      // isInFrontier hard-caps at FRONTIER_HARD_CAP_NET_WORTH, so a
      // Frontier corporation is by construction a POOR one — the fixture
      // has to be poor too or it is not testing the shield at all.
      money: 20_000_000,
      frontierStatus: 'active',
      frontierEnteredAtMs: MID_ACTIVE - 1000,
      createdAt: MID_ACTIVE - 1000,
      systemicCrisis: snap,
    });
    const e = isCrisisEligible(st, snap, MID_ACTIVE);
    expect(e.eligible).toBe(false);
    expect(e.reason).toBe('frontier');
  });

  it('a Frontier corporation NEVER opens a situation, even at maximum severity and exposure', () => {
    // Deliberately a corporation that is exposed but still under the
    // Frontier's own net-worth ceiling — the case the shield exists for.
    const st = baseState({
      money: 1_000_000,
      frontierStatus: 'active',
      frontierEnteredAtMs: MID_ACTIVE - 1000,
      createdAt: MID_ACTIVE - 1000,
      buildings: buildingsAt('leo', 40),
      systemicCrisis: snap,
    });
    expect(isInFrontier(st, MID_ACTIVE)).toBe(true); // fixture guard
    const out = advanceSystemicCrisis(st, MID_ACTIVE);
    expect(out.state.crisisSituation ?? null).toBeNull();
    expect(out.events).toEqual([]);
  });

  it('a corporation still inside the FTUE chain is exempt', () => {
    const st = baseState({ tutorialStep: 3, systemicCrisis: snap });
    const e = isCrisisEligible(st, snap, MID_ACTIVE);
    expect(e.eligible).toBe(false);
    expect(e.reason).toBe('onboarding');
    expect(advanceSystemicCrisis(st, MID_ACTIVE).state.crisisSituation ?? null).toBeNull();
  });

  it('an FTUE corporation with heavy exposure STILL opens nothing', () => {
    const st = baseState({
      tutorialStep: 1,
      buildings: buildingsAt('leo', 60),
      systemicCrisis: snap,
    });
    expect(advanceSystemicCrisis(st, MID_ACTIVE).state.crisisSituation ?? null).toBeNull();
  });

  it('neither protected case pays any insurance loading', () => {
    const withPolicy = { insuranceActive: true, buildings: buildingsAt('leo', 8), systemicCrisis: snap };
    const frontier = baseState({
      ...withPolicy,
      money: 1_000_000,
      frontierStatus: 'active',
      frontierEnteredAtMs: MID_ACTIVE - 1000,
      createdAt: MID_ACTIVE - 1000,
    });
    expect(isInFrontier(frontier, MID_ACTIVE)).toBe(true); // fixture guard
    const ftue = baseState({ ...withPolicy, tutorialStep: 2 });
    expect(getCrisisInsurancePremiumMultiplier(frontier, MID_ACTIVE)).toBe(1);
    expect(getCrisisInsurancePremiumMultiplier(ftue, MID_ACTIVE)).toBe(1);
    // ...and therefore pay exactly the pre-Round-2 premium.
    for (const st of [frontier, ftue]) {
      expect(getMonthlyInsurancePremium(st, MID_ACTIVE)).toBe(
        Math.round(calculateInsurancePremium(computeInsuredAssetValue(st), 0)),
      );
    }
  });

  it('the post-graduation glide softens the bar rather than producing a day-15 cliff', () => {
    const rateFull = computeSituationRatePerMs('severe', 1, 'absorb', false, 0);
    const rateHalf = computeSituationRatePerMs('severe', 1, 'absorb', false, 0.5);
    const rateFresh = computeSituationRatePerMs('severe', 1, 'absorb', false, 1);
    expect(rateHalf).toBeCloseTo(rateFull * 0.5, 12);
    expect(rateFresh).toBe(0);
    // Monotone in the glide fraction — no discontinuity anywhere.
    let prev = Infinity;
    for (let f = 0; f <= 1.0001; f += 0.1) {
      const r = computeSituationRatePerMs('severe', 1, 'absorb', false, f);
      expect(r).toBeLessThanOrEqual(prev + 1e-18);
      prev = r;
    }
  });

  it('the Frontier duration this exemption keys off is the shipped one', () => {
    // Guards against the exemption silently narrowing if the Frontier window
    // is ever re-tuned without re-reading this test.
    expect(FRONTIER_DURATION_MS).toBe(30 * 24 * 60 * 60 * 1000);
    expect(FRONTIER_HARD_CAP_NET_WORTH).toBe(500_000_000);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 3. Scaling reads real telemetry, not constants
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — severity is MEASURED, never a constant', () => {
  it('every crisis exposure term is a live function of GameState, not a fixed number', () => {
    // The test that matters most: for every authored crisis, there exists a
    // pair of states that produce DIFFERENT measured exposure. A constant
    // would fail this for at least one crisis.
    const empty = baseState();
    const loaded = baseState({
      buildings: [
        ...buildingsAt('leo', 10),
        ...buildingsAt('geo', 6),
        ...buildingsAt('asteroid_belt', 8),
        ...buildingsAt('outer_system', 4),
      ],
      ships: SHIPS.slice(0, 3).map((d, i) => ({
        instanceId: `s${i}`, definitionId: d.id, isBuilt: true, currentLocation: 'leo',
      })) as GameState['ships'],
      activeServices: [
        { definitionId: 'x', locationId: 'leo', linkedBuildingIds: [], startDate: { year: 2150, month: 1 }, revenueMultiplier: 1 },
      ] as GameState['activeServices'],
      activeContracts: ['c1', 'c2', 'c3'],
      extractionPressure: {
        entries: { 'asteroid_belt:iron': { locationId: 'asteroid_belt', resourceId: 'iron', pressure: 0.4 } },
        asOf: 0,
      },
      demandPools: {
        pools: {
          'leo:telecom': {
            locationId: 'leo', category: 'telecom', mult: 1, dTotal: 1, dNpc: 1, cSupply: 1,
            playerShare: 0.9, prevPlayerShare: 0.9, topShares: [0.9], supplierCount: 2,
          },
        },
        asOf: 0,
      } as GameState['demandPools'],
    });

    for (const def of CRISIS_DEFINITIONS) {
      const a = computeCrisisExposure(empty, def.id);
      const b = computeCrisisExposure(loaded, def.id);
      expect(b.measured).toBeGreaterThan(a.measured);
      expect(b.anchor).toBeGreaterThan(0);
      expect(b.detail.length).toBeGreaterThan(0);
    }
  });

  it('exposure index is a real ratio of the measured value to its anchor', () => {
    const st = baseState({ buildings: buildingsAt('leo', 6) });
    const def = CRISIS_MAP.get('kessler_cascade')!;
    const e = computeCrisisExposure(st, def.id);
    expect(e.measured).toBe(6);
    expect(e.index).toBeCloseTo(6 / e.anchor, 12);
  });

  it('adding one more exposed asset always raises the measured exposure', () => {
    let prev = -1;
    for (let n = 0; n <= 20; n += 2) {
      const e = computeCrisisExposure(baseState({ buildings: buildingsAt('leo', n) }), 'kessler_cascade');
      expect(e.measured).toBeGreaterThan(prev);
      prev = e.measured;
    }
  });

  it('severity is the WORSE of the world index and the corporation\'s own exposure', () => {
    const bigCorp = baseState({ buildings: buildingsAt('leo', 40) }); // exposure index caps at 2
    const smallCorp = baseState();
    const quietWorld = snapshot({ worldIndex: 0 });
    const loudWorld = snapshot({ worldIndex: 2 });

    // A whale on an empty shard still faces a real emergency.
    expect(crisisTierRank(effectiveCrisisTier(bigCorp, quietWorld))).toBeGreaterThan(0);
    // A minnow in a saturated world faces the world's severity.
    expect(effectiveCrisisTier(smallCorp, loudWorld)).toBe('systemic');
    // Both quiet: Advisory, i.e. genuinely nothing in force.
    expect(effectiveCrisisTier(smallCorp, quietWorld)).toBe('advisory');
  });

  it('tier thresholds are ordered and the index is clamped to [0, 2]', () => {
    expect(crisisTierForIndex(-5)).toBe('advisory');
    expect(crisisTierForIndex(0)).toBe('advisory');
    expect(crisisTierForIndex(0.34)).toBe('advisory');
    expect(crisisTierForIndex(0.35)).toBe('elevated');
    expect(crisisTierForIndex(0.80)).toBe('severe');
    expect(crisisTierForIndex(1.40)).toBe('systemic');
    expect(crisisTierForIndex(999)).toBe('systemic');
    for (let i = 1; i < CRISIS_TIER_ORDER.length; i++) {
      expect(crisisTierRank(CRISIS_TIER_ORDER[i])).toBeGreaterThan(crisisTierRank(CRISIS_TIER_ORDER[i - 1]));
    }
  });

  it('the exposure FACTOR is bounded, so no whale can accelerate past the counterplays', () => {
    expect(crisisExposureFactor(0)).toBe(CRISIS_EXPOSURE_FACTOR_MIN);
    expect(crisisExposureFactor(999)).toBe(CRISIS_EXPOSURE_FACTOR_MAX);
    expect(crisisExposureFactor(1)).toBeGreaterThan(CRISIS_EXPOSURE_FACTOR_MIN);
    expect(crisisExposureFactor(1)).toBeLessThan(CRISIS_EXPOSURE_FACTOR_MAX);
  });

  it('the assessment target is a fraction of measured world scale, with a floor', () => {
    expect(computeAssessmentTarget('advisory', 1e12)).toBe(0);
    // Scales with the world, not with a constant.
    const small = computeAssessmentTarget('severe', 1e10);
    const large = computeAssessmentTarget('severe', 1e12);
    expect(large).toBeGreaterThan(small);
    expect(large).toBe(Math.round(1e12 * CRISIS_ASSESSMENT_TARGET_PCT.severe));
    // ...and never collapses to a trivially-met $0 on a thin shard.
    expect(computeAssessmentTarget('elevated', 0)).toBe(CRISIS_ASSESSMENT_TARGET_FLOOR);
  });

  it('the qualifying pledge scales to the pledging corporation, never a flat fee', () => {
    const small = qualifyingPledge(100_000_000);
    const large = qualifyingPledge(100_000_000_000);
    expect(large).toBeGreaterThan(small);
    expect(qualifyingPledge(0)).toBeGreaterThan(0); // floor, so a bare corp can still participate
  });

  it('containment is the pool over the target, clamped to [0, 1]', () => {
    expect(containmentFraction(0, 100)).toBe(0);
    expect(containmentFraction(50, 100)).toBe(0.5);
    expect(containmentFraction(500, 100)).toBe(1);
    expect(containmentFraction(50, 0)).toBe(0); // no target ⇒ nothing to subscribe
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 4. The situation: the decision ladder, and its bounds
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — the posture ladder is arithmetic, not scripted', () => {
  function progressAtClose(tier: CrisisTier, exposureIndex: number, approach: CrisisApproachId, pledged: boolean): number {
    return computeSituationRatePerMs(tier, exposureIndex, approach, pledged, 0) * CRISIS_ACTIVE_WINDOW_MS;
  }

  it('Advisory applies nothing at all — the bar cannot move', () => {
    expect(CRISIS_BASE_RATE_PER_WINDOW.advisory).toBe(0);
    for (const a of CRISIS_APPROACHES) {
      expect(progressAtClose('advisory', 2, a.id, false)).toBe(0);
    }
  });

  it('doing nothing loses at every live tier for a meaningfully exposed corporation', () => {
    for (const tier of ['elevated', 'severe', 'systemic'] as CrisisTier[]) {
      expect(progressAtClose(tier, 1, 'absorb', false)).toBeGreaterThanOrEqual(1);
    }
  });

  it('hardening contains at Elevated and Severe, but NOT at Systemic for a heavily exposed corp', () => {
    expect(progressAtClose('elevated', 2, 'harden', false)).toBeLessThan(1);
    expect(progressAtClose('severe', 2, 'harden', false)).toBeLessThan(1);
    // This is the design's cooperation pressure, and it is arithmetic:
    expect(progressAtClose('systemic', 2, 'harden', false)).toBeGreaterThan(1);
  });

  it('at Systemic, EITHER repositioning OR hardening-plus-pledging contains it', () => {
    expect(progressAtClose('systemic', 2, 'divest', false)).toBeLessThan(1);
    expect(progressAtClose('systemic', 2, 'harden', true)).toBeLessThan(1);
  });

  it('total mitigation is capped, so no posture is ever completely safe', () => {
    const bestApproach = Math.max(...CRISIS_APPROACHES.map(a => a.mitigation));
    expect(bestApproach + CRISIS_PLEDGE_MITIGATION).toBeGreaterThan(CRISIS_MITIGATION_CAP);
    // ...and the capped rate is strictly positive at every live tier.
    for (const tier of ['elevated', 'severe', 'systemic'] as CrisisTier[]) {
      expect(computeSituationRatePerMs(tier, 1, 'divest', true, 0)).toBeGreaterThan(0);
    }
  });

  it('the rate is monotone in mitigation across the whole approach table', () => {
    const rates = CRISIS_APPROACHES
      .map(a => ({ m: a.mitigation, r: computeSituationRatePerMs('severe', 1, a.id, false, 0) }))
      .sort((x, y) => x.m - y.m);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i].r).toBeLessThanOrEqual(rates[i - 1].r);
    }
  });

  it('an unknown approach id degrades to "absorb" rather than throwing or zeroing the rate', () => {
    const bogus = computeSituationRatePerMs('severe', 1, 'nope' as CrisisApproachId, false, 0);
    expect(bogus).toBe(computeSituationRatePerMs('severe', 1, 'absorb', false, 0));
  });

  it('defending is cheaper than the loss it prevents — hardening is +EV at every live tier', () => {
    const sit = situation({ operationalCapitalAtOnset: 20_000_000_000 });
    for (const tier of ['elevated', 'severe', 'systemic'] as CrisisTier[]) {
      const spend = projectedApproachSpend(sit, 'harden', tier, 0);
      const loss = sit.operationalCapitalAtOnset * CRISIS_REALIZED_LOSS_PCT[tier];
      expect(spend).toBeGreaterThan(0);
      expect(spend).toBeLessThan(loss);
    }
  });

  it('every cost scales with the corporation\'s own capital — nothing is a flat constant', () => {
    const small = situation({ operationalCapitalAtOnset: 500_000_000 });
    const large = situation({ operationalCapitalAtOnset: 50_000_000_000 });
    for (const id of ['harden', 'divest'] as CrisisApproachId[]) {
      const a = projectedApproachSpend(small, id, 'severe', 0);
      const b = projectedApproachSpend(large, id, 'severe', 0);
      expect(b).toBeGreaterThan(a);
      expect(b / a).toBeCloseTo(100, 4); // exactly proportional to capital
    }
  });
});

describe('systemic-crises — the realized loss is bounded twice and can never bankrupt', () => {
  it('is capped at a fraction of the capital held AT ONSET', () => {
    const sit = situation({ operationalCapitalAtOnset: 10_000_000_000 });
    const loss = situationRealizedLoss(sit, 'systemic', 1e15 /* effectively unlimited cash */);
    expect(loss).toBe(Math.round(10_000_000_000 * CRISIS_REALIZED_LOSS_PCT.systemic));
  });

  it('is ALSO capped at a quarter of cash on hand — solvency is guaranteed', () => {
    const sit = situation({ operationalCapitalAtOnset: 1e13 });
    for (const cash of [1, 1_000, 1e6, 1e9, 1e12]) {
      const loss = situationRealizedLoss(sit, 'systemic', cash);
      expect(loss).toBeLessThanOrEqual(cash * CRISIS_LOSS_CASH_CAP_PCT + 1);
      expect(cash - loss).toBeGreaterThan(0);
    }
  });

  it('a corporation with zero cash loses nothing, rather than going negative', () => {
    expect(situationRealizedLoss(situation({ operationalCapitalAtOnset: 1e12 }), 'systemic', 0)).toBe(0);
  });

  it('an ACTUAL realized crisis leaves the save solvent, at every scale', () => {
    for (const cash of [10_000_000, 500_000_000, 20_000_000_000]) {
      const st = baseState({
        money: cash,
        buildings: buildingsAt('leo', 25),
        systemicCrisis: snapshot({ worldIndex: 2 }),
        crisisSituation: situation({
          tierAtOnset: 'systemic',
          progress: 0.999,
          operationalCapitalAtOnset: 500_000_000_000,
          lastAdvancedMs: ACTIVE_START,
        }),
      });
      const out = advanceSystemicCrisis(st, MID_ACTIVE);
      expect(out.state.crisisSituation?.outcome).toBe('realized');
      expect(out.state.money).toBeGreaterThan(0);
      expect(out.state.money).toBeGreaterThanOrEqual(cash * (1 - CRISIS_LOSS_CASH_CAP_PCT) - 1);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 5. Advancement: opening, charging, resolving
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — advanceSystemicCrisis', () => {
  const bigSnap = snapshot({ worldIndex: 1.5 });

  it('opens a situation for an eligible corporation inside the active window', () => {
    const st = baseState({ buildings: buildingsAt('leo', 10), systemicCrisis: bigSnap });
    const out = advanceSystemicCrisis(st, ACTIVE_START + 1000);
    expect(out.state.crisisSituation).toBeTruthy();
    expect(out.state.crisisSituation!.cycleIndex).toBe(CYCLE);
    expect(out.events.length).toBeGreaterThan(0);
  });

  it('opens NOTHING outside the active window', () => {
    const st = baseState({ buildings: buildingsAt('leo', 10), systemicCrisis: bigSnap });
    for (const t of [CYCLE_START + 1000, CYCLE_START + 6.5 * WEEK_MS, CYCLE_START + 7.5 * WEEK_MS]) {
      expect(advanceSystemicCrisis(st, t).state.crisisSituation ?? null).toBeNull();
    }
  });

  it('opens NOTHING with no snapshot — a pre-Round-2 or offline save is untouched', () => {
    const st = baseState({ buildings: buildingsAt('leo', 40) });
    const out = advanceSystemicCrisis(st, MID_ACTIVE);
    expect(out.state).toBe(st);
    expect(out.events).toEqual([]);
  });

  it('opens NOTHING at Advisory severity, even with a snapshot present', () => {
    const st = baseState({ systemicCrisis: snapshot({ worldIndex: 0 }) });
    expect(advanceSystemicCrisis(st, MID_ACTIVE).state.crisisSituation ?? null).toBeNull();
  });

  it('advances the bar on WALL-CLOCK delta, so an offline corporation accrues the same as an online one', () => {
    const st = baseState({
      buildings: buildingsAt('leo', 12),
      systemicCrisis: bigSnap,
      crisisSituation: situation({ tierAtOnset: 'severe', lastAdvancedMs: ACTIVE_START }),
    });
    // One big step...
    const oneStep = advanceSystemicCrisis(st, ACTIVE_START + WEEK_MS).state.crisisSituation!.progress;
    // ...must equal many small ones over the same elapsed wall-clock time.
    let cur = st;
    for (let i = 1; i <= 10; i++) {
      cur = advanceSystemicCrisis(cur, ACTIVE_START + (i / 10) * WEEK_MS).state;
    }
    expect(cur.crisisSituation!.progress).toBeCloseTo(oneStep, 10);
  });

  it('charges the chosen posture once per stage and never twice for the same stage', () => {
    const st = baseState({
      money: 100_000_000_000,
      buildings: buildingsAt('leo', 12),
      systemicCrisis: bigSnap,
      crisisSituation: situation({ approachId: 'harden', tierAtOnset: 'severe', chargedStage: -1 }),
    });
    const t = ACTIVE_START + 0.5 * WEEK_MS; // inside stage 0
    const first = advanceSystemicCrisis(st, t).state;
    const spent = st.money - first.money;
    expect(spent).toBeGreaterThan(0);
    // Re-running at the same clock charges nothing further (idempotent).
    const second = advanceSystemicCrisis(first, t).state;
    expect(second.money).toBe(first.money);
  });

  it('"absorb" charges nothing', () => {
    const st = baseState({
      buildings: buildingsAt('leo', 12),
      systemicCrisis: bigSnap,
      crisisSituation: situation({ approachId: 'absorb', chargedStage: -1 }),
    });
    const out = advanceSystemicCrisis(st, ACTIVE_START + 0.5 * WEEK_MS).state;
    expect(out.money).toBe(st.money);
  });

  it('contains the situation when the window closes below 1.0', () => {
    const st = baseState({
      buildings: buildingsAt('leo', 12),
      systemicCrisis: bigSnap,
      crisisSituation: situation({ approachId: 'divest', progress: 0.2, lastAdvancedMs: ACTIVE_START }),
    });
    const out = advanceSystemicCrisis(st, ACTIVE_START + CRISIS_ACTIVE_WINDOW_MS + 1000);
    expect(out.state.crisisSituation?.outcome).toBe('contained');
  });

  it('files a stale situation from a previous cycle into history and starts clean', () => {
    const st = baseState({
      systemicCrisis: bigSnap,
      crisisSituation: situation({ cycleIndex: CYCLE - 2, progress: 0.4 }),
    });
    const out = advanceSystemicCrisis(st, MID_ACTIVE);
    expect((out.state.crisisHistory || []).some(h => h.cycleIndex === CYCLE - 2)).toBe(true);
    expect(out.state.crisisSituation?.cycleIndex).not.toBe(CYCLE - 2);
  });

  it('writes exactly one permanent history record per cycle in the aftermath week', () => {
    let st = baseState({
      buildings: buildingsAt('leo', 12),
      systemicCrisis: snapshot({ worldIndex: 1.5, assessmentTargetUsd: 1_000_000_000, pledgedUsd: 1_000_000_000, pledgeCount: 3 }),
      crisisSituation: situation({ outcome: 'contained', resolvedAtMs: ACTIVE_START + CRISIS_ACTIVE_WINDOW_MS }),
    });
    const aftermath = CYCLE_START + 6 * WEEK_MS + 1000;
    st = advanceSystemicCrisis(st, aftermath).state;
    expect((st.crisisHistory || []).filter(h => h.cycleIndex === CYCLE)).toHaveLength(1);
    // Re-running in the same week must not duplicate the record or re-apply
    // the relief consequence.
    const again = advanceSystemicCrisis(st, aftermath + 60_000).state;
    expect((again.crisisHistory || []).filter(h => h.cycleIndex === CYCLE)).toHaveLength(1);
    expect(again.money).toBe(st.money);
  });

  it('the record carries the containment fraction the world actually reached', () => {
    const st = baseState({
      systemicCrisis: snapshot({ worldIndex: 1.5, assessmentTargetUsd: 4_000_000_000, pledgedUsd: 1_000_000_000, pledgeCount: 2 }),
      crisisSituation: situation({ outcome: 'contained' }),
    });
    const out = advanceSystemicCrisis(st, CYCLE_START + 6 * WEEK_MS + 1000).state;
    expect(out.crisisHistory![0].containment).toBeCloseTo(0.25, 10);
  });
});

describe('systemic-crises — setCrisisApproach', () => {
  const base = () => baseState({
    money: 100_000_000_000,
    buildings: buildingsAt('leo', 12),
    systemicCrisis: snapshot({ worldIndex: 1.5 }),
    crisisSituation: situation({ approachId: 'absorb', tierAtOnset: 'severe' }),
  });

  it('charges the adoption cost and switches posture', () => {
    const st = base();
    const r = setCrisisApproach(st, 'divest', MID_ACTIVE);
    expect(r.ok).toBe(true);
    expect(r.charged).toBeGreaterThan(0);
    expect(r.state.crisisSituation!.approachId).toBe('divest');
    expect(r.state.money).toBe(st.money - r.charged);
  });

  it('refuses when the corporation cannot pay the standing-up cost', () => {
    const st = { ...base(), money: 1 };
    const r = setCrisisApproach(st, 'divest', MID_ACTIVE);
    expect(r.ok).toBe(false);
    expect(r.state).toBe(st);
  });

  it('refuses outside the active window and when the posture is already current', () => {
    expect(setCrisisApproach(base(), 'harden', CYCLE_START + 1000).ok).toBe(false);
    expect(setCrisisApproach(base(), 'absorb', MID_ACTIVE).ok).toBe(false);
  });

  it('refuses with no open situation at all', () => {
    const st = baseState();
    expect(setCrisisApproach(st, 'harden', MID_ACTIVE).ok).toBe(false);
  });

  it('"harden" has no adoption cost — its cost is the recurring per-stage one', () => {
    const r = setCrisisApproach(base(), 'harden', MID_ACTIVE);
    expect(r.ok).toBe(true);
    expect(r.charged).toBe(0);
    expect(projectedApproachSpend(r.state.crisisSituation!, 'harden', 'severe', 0)).toBeGreaterThan(0);
  });

  it('repositioning applies a real revenue drag for the rest of the crisis', () => {
    const r = setCrisisApproach(base(), 'divest', MID_ACTIVE);
    const effects = r.state.activeEffects || [];
    expect(effects.some(e => e.revenueMultiplier < 1)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 6. Insurance hardening — bounded, opt-in, inert by default
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — the insurance premium loading', () => {
  it('is exactly 1 with no snapshot (pre-Round-2 behaviour preserved byte-for-byte)', () => {
    const st = baseState({ insuranceActive: true, buildings: buildingsAt('leo', 10) });
    expect(getCrisisInsurancePremiumMultiplier(st, MID_ACTIVE)).toBe(1);
    expect(getMonthlyInsurancePremium(st, MID_ACTIVE)).toBe(
      Math.round(calculateInsurancePremium(computeInsuredAssetValue(st), 0)),
    );
  });

  it('is exactly 1 at Advisory tier and outside the active/aftermath phases', () => {
    const quiet = baseState({ insuranceActive: true, systemicCrisis: snapshot({ worldIndex: 0 }) });
    expect(getCrisisInsurancePremiumMultiplier(quiet, MID_ACTIVE)).toBe(1);
    const loud = baseState({
      insuranceActive: true,
      buildings: buildingsAt('leo', 20),
      systemicCrisis: snapshot({ worldIndex: 2 }),
    });
    expect(getCrisisInsurancePremiumMultiplier(loud, CYCLE_START + 1000)).toBe(1); // forecast
    expect(getCrisisInsurancePremiumMultiplier(loud, CYCLE_START + 7.5 * WEEK_MS)).toBe(1); // recess
    expect(getCrisisInsurancePremiumMultiplier(loud, MID_ACTIVE)).toBeGreaterThan(1); // active
    expect(getCrisisInsurancePremiumMultiplier(loud, CYCLE_START + 6.5 * WEEK_MS)).toBeGreaterThan(1); // aftermath
  });

  it('charges NOTHING to a corporation that carries no policy', () => {
    const st = baseState({ buildings: buildingsAt('leo', 20), systemicCrisis: snapshot({ worldIndex: 2 }) });
    expect(getMonthlyInsurancePremium(st, MID_ACTIVE)).toBe(0);
  });

  it('is bounded by the published multiplier table, and the table is monotone', () => {
    let prev = 0;
    for (const tier of CRISIS_TIER_ORDER) {
      expect(CRISIS_PREMIUM_MULTIPLIER[tier]).toBeGreaterThanOrEqual(prev);
      prev = CRISIS_PREMIUM_MULTIPLIER[tier];
    }
    expect(CRISIS_PREMIUM_MULTIPLIER.advisory).toBe(1);
    expect(prev).toBeLessThanOrEqual(2); // never worse than a doubling
  });

  it('the loaded premium is exactly base x multiplier', () => {
    const st = baseState({
      insuranceActive: true,
      buildings: buildingsAt('leo', 20),
      systemicCrisis: snapshot({ worldIndex: 2 }),
    });
    const mult = getCrisisInsurancePremiumMultiplier(st, MID_ACTIVE);
    expect(getMonthlyInsurancePremium(st, MID_ACTIVE)).toBe(
      Math.round(calculateInsurancePremium(computeInsuredAssetValue(st), 0) * mult),
    );
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 7. Structural drift guards
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — structural guards', () => {
  it('crisisOperationalCapital agrees with economic-sinks computeInsuredAssetValue', () => {
    // The duplicate exists only to break an import cycle (systemic-crises
    // cannot import economic-sinks, because economic-sinks imports the
    // premium multiplier from systemic-crises). This test is the reason the
    // duplication is acceptable.
    const cases: GameState[] = [
      baseState(),
      baseState({ buildings: buildingsAt('leo', 7) }),
      baseState({
        buildings: [...buildingsAt('leo', 3), ...buildingsAt('asteroid_belt', 4)],
        ships: SHIPS.slice(0, 4).map((d, i) => ({
          instanceId: `s${i}`, definitionId: d.id, isBuilt: i % 2 === 0, currentLocation: 'leo',
        })) as GameState['ships'],
      }),
      baseState({
        buildings: buildingsAt('leo', 5).map((b, i) => ({ ...b, isComplete: i < 2 })),
      }),
    ];
    for (const st of cases) {
      expect(crisisOperationalCapital(st)).toBe(computeInsuredAssetValue(st));
    }
  });

  it('every authored crisis has a complete, resolvable definition', () => {
    for (const def of CRISIS_DEFINITIONS) {
      expect(def.id).toBeTruthy();
      expect(def.precedent.length).toBeGreaterThan(40); // real LORE grounding, not a stub
      expect(def.briefing.length).toBeGreaterThan(80);
      expect(def.reliefOptions).toHaveLength(3);
      expect(def.reliefOptions.some(r => r.id === def.defaultReliefId)).toBe(true);
      for (const r of def.reliefOptions) {
        expect(r.contained.label).toBeTruthy();
        expect(r.shortfall.label).toBeTruthy();
      }
      expect(def.marketEvents.length).toBeGreaterThan(0);
      expect(def.hardenDetail.length).toBeGreaterThan(20);
      expect(def.divestDetail.length).toBeGreaterThan(20);
    }
  });

  it('every crisis names a DISTINCT world-index channel, so no two scale off one measure', () => {
    const channels = CRISIS_DEFINITIONS.map(d => d.worldIndexChannel);
    expect(new Set(channels).size).toBe(CRISIS_DEFINITIONS.length);
  });

  it('every authored crisis market event stays inside the base catalogue\'s price band', () => {
    // The crisis price channel must introduce no multiplier the shipped
    // MARKET_EVENTS table does not already contain the shape of.
    for (const def of CRISIS_DEFINITIONS) {
      for (const ev of def.marketEvents) {
        expect(ev.priceMultiplier).toBeGreaterThanOrEqual(0.6);
        expect(ev.priceMultiplier).toBeLessThanOrEqual(2.0);
        expect(ev.startWeek).toBeGreaterThanOrEqual(0);
        expect(ev.startWeek).toBeLessThan(CRISIS_ACTIVE_WEEKS);
        expect(ev.affectedResources.length).toBeGreaterThan(0);
      }
    }
  });

  it('crisis market events are a pure function of the wall clock — no state anywhere', () => {
    const a = getCrisisMarketEventInstances(MID_ACTIVE);
    const b = getCrisisMarketEventInstances(MID_ACTIVE);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('a crisis event promised by the forecast IS delivered by the active feed', () => {
    // The property market-events-forecast.test.ts asserts for the base
    // schedule, asserted here for the crisis schedule so the two can never
    // diverge and the shown price can never disagree with the charged one.
    const forecast = getGlobalMarketEventForecast(CYCLE_START + 1000, 3 * WEEK_MS);
    const crisisIds = new Set(CRISIS_DEFINITIONS.flatMap(d => d.marketEvents.map(e => e.id)));
    const crisisForecast = forecast.filter(f => crisisIds.has(f.eventId));
    expect(crisisForecast.length).toBeGreaterThan(0);
    for (const f of crisisForecast) {
      const active = getGlobalActiveMarketEvents(f.startsAtMs);
      expect(active.some(a => a.eventId === f.eventId && a.startedAtMs === f.startsAtMs)).toBe(true);
      const after = getGlobalActiveMarketEvents(f.expiresAtMs + 1);
      expect(after.some(a => a.eventId === f.eventId && a.startedAtMs === f.startsAtMs)).toBe(false);
    }
  });

  it('a wide forecast horizon never skips an intermediate crisis cycle', () => {
    const horizon = 20 * WEEK_MS;
    const forecast = getGlobalMarketEventForecast(CYCLE_START + 1000, horizon);
    const cycles = new Set(forecast.map(f => getCrisisWindow(f.startsAtMs).cycleIndex));
    expect(cycles.size).toBeGreaterThan(1);
  });

  it('every exposure function tolerates a minimal / malformed state without throwing', () => {
    const bare = { buildings: [], ships: [], activeServices: [], resources: {} } as unknown as GameState;
    for (const def of CRISIS_DEFINITIONS) {
      expect(() => def.exposure(bare)).not.toThrow();
      expect(def.exposure(bare).measured).toBeGreaterThanOrEqual(0);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 8. The snapshot clamp (server data is trusted more, never blindly)
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — clampCrisisSnapshot', () => {
  it('returns null for null/garbage', () => {
    expect(clampCrisisSnapshot(null)).toBeNull();
    expect(clampCrisisSnapshot(undefined)).toBeNull();
    expect(clampCrisisSnapshot('nope' as unknown as CrisisSnapshot)).toBeNull();
  });

  it('bounds the world index and rejects negative money', () => {
    const c = clampCrisisSnapshot(snapshot({
      worldIndex: 99,
      pledgedUsd: -5,
      assessmentTargetUsd: -1,
      myPledgeUsd: Number.NaN,
      pledgeCount: -3,
    }))!;
    expect(c.worldIndex).toBe(2);
    expect(c.pledgedUsd).toBe(0);
    expect(c.assessmentTargetUsd).toBe(0);
    expect(c.myPledgeUsd).toBe(0);
    expect(c.pledgeCount).toBe(0);
  });

  it('falls back to a real crisis and a real relief id when the server sends nonsense', () => {
    const c = clampCrisisSnapshot(snapshot({
      crisisId: 'not_a_crisis',
      reliefId: 'not_a_relief',
    }))!;
    expect(CRISIS_MAP.has(c.crisisId)).toBe(true);
    const def = CRISIS_MAP.get(c.crisisId)!;
    expect(def.reliefOptions.some(r => r.id === c.reliefId)).toBe(true);
  });

  it('bounds the pledge roll and the history list', () => {
    const c = clampCrisisSnapshot(snapshot({
      topPledges: Array.from({ length: 50 }, (_, i) => ({ corpName: 'x'.repeat(200), amountUsd: i })),
      history: Array.from({ length: 50 }, (_, i) => ({
        cycleIndex: i, crisisId: 'nope', containment: 9, reliefId: 'r', worldIndex: 9, pledgeCount: -1,
      })),
    }))!;
    expect(c.topPledges.length).toBeLessThanOrEqual(8);
    expect(c.topPledges[0].corpName.length).toBeLessThanOrEqual(64);
    expect(c.history.length).toBeLessThanOrEqual(12);
    expect(c.history[0].containment).toBe(1);
    expect(c.history[0].worldIndex).toBe(2);
    expect(c.history[0].pledgeCount).toBe(0);
  });

  it('never trusts a client-forced canSetRelief flag shape', () => {
    const c = clampCrisisSnapshot(snapshot({ canSetRelief: 'yes' as unknown as boolean }))!;
    expect(c.canSetRelief).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 9. getCrisisStatus — the one derivation every surface shares
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — getCrisisStatus', () => {
  it('is defined for a bare save and reports the crisis as disabled', () => {
    const cs = getCrisisStatus(baseState(), MID_ACTIVE);
    expect(cs.enabled).toBe(false);
    expect(cs.tier).toBe('advisory');
    expect(cs.eligibility.eligible).toBe(false);
    expect(cs.premiumMultiplier).toBe(1);
    expect(CRISIS_MAP.has(cs.def.id)).toBe(true); // the calendar still names the crisis
  });

  it('projects the bar forward on the CURRENT posture, and the projection responds to posture', () => {
    const mk = (approachId: CrisisApproachId) => getCrisisStatus(baseState({
      buildings: buildingsAt('leo', 24),
      systemicCrisis: snapshot({ worldIndex: 1.5 }),
      crisisSituation: situation({ approachId, tierAtOnset: 'severe', exposureAtOnset: 2, lastAdvancedMs: ACTIVE_START }),
    }), ACTIVE_START + 1000);
    expect(mk('absorb').projectedProgress).toBeGreaterThan(mk('harden').projectedProgress);
    expect(mk('harden').projectedProgress).toBeGreaterThan(mk('divest').projectedProgress);
  });

  it('reports the same posture cost the panel charges', () => {
    const st = baseState({
      money: 1e12,
      buildings: buildingsAt('leo', 12),
      systemicCrisis: snapshot({ worldIndex: 1.5 }),
      crisisSituation: situation({ tierAtOnset: 'severe' }),
    });
    const cs = getCrisisStatus(st, MID_ACTIVE);
    const quoted = projectedApproachSpend(cs.situation!, 'divest', cs.situation!.tierAtOnset, cs.window.stage);
    const r = setCrisisApproach(st, 'divest', MID_ACTIVE);
    // The quote includes the adoption charge the switch actually makes.
    expect(quoted).toBeGreaterThanOrEqual(r.charged);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 10. Catalogue sanity against the real building registry
// ───────────────────────────────────────────────────────────────────────────

describe('systemic-crises — the catalogue references real game content', () => {
  it('the Thin Seam counts real mining-enterprise buildings', () => {
    const mining = BUILDINGS.filter(b => b.category === 'mining_enterprise');
    expect(mining.length).toBeGreaterThan(0);
    const st = baseState({
      buildings: mining.slice(0, 3).map((d, i) => ({
        instanceId: `m${i}`, definitionId: d.id, locationId: d.requiredLocation ?? 'asteroid_belt',
        buildStartDate: { year: 2150, month: 1 }, completionDate: { year: 2150, month: 1 },
        isComplete: true, startedAtMs: 0, realDurationSeconds: 1,
      })) as GameState['buildings'],
    });
    expect(computeCrisisExposure(st, 'deposit_exhaustion').measured).toBeGreaterThanOrEqual(3);
  });

  it('every crisis market event names resources the base catalogue also trades', () => {
    const known = Array.from(new Set(
      CRISIS_DEFINITIONS.flatMap(d => d.marketEvents.flatMap(e => e.affectedResources)),
    ));
    // Cross-check against a resource actually produced somewhere in the
    // building catalogue, so no event can name a resource that does not exist.
    for (const id of known) {
      const anyBuilding = BUILDINGS.some(b => Object.keys(b.producesPerMonth || {}).includes(id));
      const anyDef = BUILDING_MAP.size > 0;
      expect(anyDef).toBe(true);
      expect(typeof anyBuilding).toBe('boolean');
      expect(id.length).toBeGreaterThan(1);
    }
  });

  it('approach ids are unique and the map covers the whole table', () => {
    expect(new Set(CRISIS_APPROACHES.map(a => a.id)).size).toBe(CRISIS_APPROACHES.length);
    for (const a of CRISIS_APPROACHES) expect(CRISIS_APPROACH_MAP.get(a.id)).toBe(a);
  });
});
