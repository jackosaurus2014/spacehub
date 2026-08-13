/**
 * @jest-environment node
 *
 * Audit Wave B — "wire the dead-multiplier pack" (audit Change #2 / A3),
 * alliance bonus pipe-through (Change #6 / A2), territory pays (A7),
 * espionage rewards (A8), league boosts (§1b), module effects (§1b),
 * subsidiary income (§1b). Each wired system gets at least one test proving
 * the bonus changes an outcome (before/after).
 */
import type { GameState } from '../types';
import { processTick, processFullTick } from '../game-engine';
import { getGlobalGameDate } from '../server-time';
import { getSpecializationBonuses } from '../specializations';
import { getVictoryBonuses } from '../victory-conditions';
import { getEffectiveBrokerFeeRate, MARKET_BROKER_FEE_RATE } from '../market-engine';
import {
  applyServerEffectsToState,
  clampAllianceBonuses,
  queueServerEffects,
  consumeServerEffects,
  __clearServerEffectsQueue,
} from '../server-effects';
import { applyMiniActivityBonus } from '../mini-activities';
import { getHireCost, consumeHeadhuntVoucher } from '../workforce';
import { applyContractReward } from '../contracts';
import { deliverContract } from '../delivery-contracts';
import {
  getShipMiningRateMultiplier,
  getShipTransitSpeedMultiplier,
} from '../modules';
import { getShipDerivedStats, SHIP_MAP } from '../ships';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Base state pinned to the CURRENT global game date so isMonthEnd is false
 *  and the tick is fully deterministic (random/market/hazard rolls are all
 *  month-end gated). */
function baseState(overrides: Partial<GameState> = {}): GameState {
  const now = Date.now();
  const globalDate = getGlobalGameDate();
  return {
    version: 1,
    createdAt: now,
    lastTickAt: now,
    money: 50_000_000, // below the $100M exec-comp threshold
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: globalDate.year, month: globalDate.month },
    tickSpeed: 1,
    buildings: [],
    completedResearch: [],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    frontierStatus: 'none',
    ...overrides,
  };
}

function withLaunchService(overrides: Partial<GameState> = {}): GameState {
  const globalDate = getGlobalGameDate();
  return baseState({
    activeServices: [{
      definitionId: 'svc_launch_small', // launch_payload, $5M/mo
      locationId: 'earth_surface',
      linkedBuildingIds: [],
      startDate: { year: globalDate.year, month: globalDate.month },
      revenueMultiplier: 1,
    }],
    ...overrides,
  });
}

/** Net money delta from one deterministic (non-month-end) tick. */
function tickMoneyDelta(state: GameState): number {
  return processTick(state).money - state.money;
}

// ─── Specializations (audit §1b / Change #2 item 1) ──────────────────────────

describe('specializations wiring — bonuses apply in the tick', () => {
  it('launch_magnate primary raises launch service revenue', () => {
    const plain = withLaunchService();
    const specced = withLaunchService({
      specialization: { primary: { path: 'launch_magnate', tier: 3 }, secondary: null, respecCount: 0 },
    });
    const deltaPlain = tickMoneyDelta(plain);
    const deltaSpec = tickMoneyDelta(specced);
    expect(deltaSpec).toBeGreaterThan(deltaPlain);
    // tier 3 = +10% +15% +20% launch revenue = +45%
    const bonuses = getSpecializationBonuses(specced.specialization!);
    expect(bonuses.launchRevenue).toBeCloseTo(0.45, 5);
  });

  it('mining_baron primary raises mining production', () => {
    const globalDate = getGlobalGameDate();
    const miningService = {
      definitionId: 'svc_mining_lunar', locationId: 'lunar_surface',
      linkedBuildingIds: [], startDate: { year: globalDate.year, month: globalDate.month },
      revenueMultiplier: 1,
    };
    const plain = processTick(baseState({ activeServices: [miningService] }));
    const specced = processTick(baseState({
      activeServices: [miningService],
      specialization: { primary: { path: 'mining_baron', tier: 3 }, secondary: null, respecCount: 0 },
    }));
    const totalPlain = Object.values(plain.resources).reduce((a, b) => a + b, 0);
    const totalSpec = Object.values(specced.resources).reduce((a, b) => a + b, 0);
    expect(totalSpec).toBeGreaterThan(totalPlain);
  });

  it('maintenance_reduction lowers building maintenance', () => {
    const now = Date.now();
    const building = {
      instanceId: 'b1', definitionId: 'launch_pad_small', locationId: 'earth_surface',
      buildStartDate: { year: 2026, month: 1 }, completionDate: { year: 2026, month: 1 },
      isComplete: true, startedAtMs: now - 1_000_000, realDurationSeconds: 1,
    };
    const plain = baseState({ buildings: [building] });
    // tourism_mogul tier 4 includes maintenance_reduction 0.10
    const specced = baseState({
      buildings: [building],
      specialization: { primary: { path: 'tourism_mogul', tier: 4 }, secondary: null, respecCount: 0 },
    });
    expect(tickMoneyDelta(specced)).toBeGreaterThan(tickMoneyDelta(plain));
  });
});

// ─── Victory conditions (audit §1b) ──────────────────────────────────────────

describe('victory bonuses wiring', () => {
  it('earned victories raise service revenue', () => {
    const plain = withLaunchService();
    const victorious = withLaunchService({
      earnedVictories: ['economic_dominion', 'terraformer'], // 1.05 × 1.05 revenue
    });
    expect(tickMoneyDelta(victorious)).toBeGreaterThan(tickMoneyDelta(plain));
    const vb = getVictoryBonuses(victorious.earnedVictories!);
    expect(vb.revenueMultiplier).toBeCloseTo(1.1025, 4);
  });
});

// ─── Subsidiaries (audit §1b "a $66B purchase of a fake readout") ────────────

describe('subsidiary income wiring', () => {
  it('subsidiary net income accrues in the tick at the displayed rate', () => {
    const plain = baseState();
    const withSub = baseState({
      subsidiaries: [{
        id: 'sub1', type: 'sub_mining', createdAtMs: Date.now(),
        operations: 3, synergy: 0, efficiency: 0,
      }],
    });
    const deltaPlain = tickMoneyDelta(plain);
    const deltaSub = tickMoneyDelta(withSub);
    // sub_mining base $20M × ops mult 3.5 = $70M gross − overhead ($5M+1.5M) = $63.5M/mo
    expect(deltaSub).toBeGreaterThan(deltaPlain);
    expect(deltaSub - deltaPlain).toBeCloseTo(Math.round(63_500_000 / 30), -3);
  });

  it('subsidiary synergy bonus raises matching service revenue', () => {
    const plain = withLaunchService();
    const withSub = withLaunchService({
      subsidiaries: [{
        id: 'sub1', type: 'sub_launch', createdAtMs: Date.now(),
        operations: 0, synergy: 3, efficiency: 0, // +30% launch_payload synergy
      }],
    });
    // Isolate the synergy effect from the (small, possibly negative) ops
    // income by comparing revenue via totalEarned growth.
    const earnedPlain = processTick(plain).totalEarned;
    const earnedSub = processTick(withSub).totalEarned;
    expect(earnedSub).toBeGreaterThan(earnedPlain);
  });
});

// ─── Alliance bonuses (audit Change #6 / A2) ─────────────────────────────────

describe('alliance bonus pipe-through', () => {
  it('allianceBonuses on state raise revenue in the tick', () => {
    const plain = withLaunchService();
    const allied = withLaunchService({
      allianceBonuses: { revenueBonus: 0.25, miningBonus: 0, researchBonus: 0, buildSpeedBonus: 0 },
    });
    expect(tickMoneyDelta(allied)).toBeGreaterThan(tickMoneyDelta(plain));
  });

  it('clampAllianceBonuses caps a bugged aggregate', () => {
    const clamped = clampAllianceBonuses({ revenueBonus: 5, miningBonus: -2, researchBonus: 0.3, buildSpeedBonus: NaN });
    expect(clamped!.revenueBonus).toBe(0.75);
    expect(clamped!.miningBonus).toBe(0);
    expect(clamped!.researchBonus).toBe(0.3);
    expect(clamped!.buildSpeedBonus).toBe(0);
  });

  it('server-effects queue delivers alliance bonuses into state via processFullTick', () => {
    __clearServerEffectsQueue();
    queueServerEffects({
      allianceBonuses: { revenueBonus: 0.10, miningBonus: 0.05, researchBonus: 0, buildSpeedBonus: 0 },
      fetchedAtMs: Date.now(),
    });
    const out = processFullTick(withLaunchService());
    expect(out.allianceBonuses).toBeDefined();
    expect(out.allianceBonuses!.revenueBonus).toBeCloseTo(0.10, 5);
    // queue is consumed
    expect(consumeServerEffects()).toBeNull();
  });
});

// ─── Territory governorship (audit A7) ───────────────────────────────────────

describe('territory wiring — governor benefits + stakeholder bonus', () => {
  it('governor collects zone tax as a revenue line', () => {
    const plain = baseState();
    const governor = baseState({
      zoneStandings: [{ zoneSlug: 'zone_leo', sharePct: 30, isGovernor: true, taxBaseMonthly: 2_000_000_000 }],
    });
    const deltaPlain = tickMoneyDelta(plain);
    const deltaGov = tickMoneyDelta(governor);
    // tax = min(zone_leo cap $10M, 2% × $2B = $40M) = $10M/mo → /30 per tick
    expect(deltaGov - deltaPlain).toBeCloseTo(Math.round(10_000_000 / 30), -2);
  });

  it('multi-zone governance penalty reduces per-zone tax', () => {
    const oneZone = baseState({
      zoneStandings: [{ zoneSlug: 'zone_leo', sharePct: 30, isGovernor: true, taxBaseMonthly: 2_000_000_000 }],
    });
    const twoZones = baseState({
      zoneStandings: [
        { zoneSlug: 'zone_leo', sharePct: 30, isGovernor: true, taxBaseMonthly: 2_000_000_000 },
        { zoneSlug: 'zone_geo', sharePct: 30, isGovernor: true, taxBaseMonthly: 2_000_000_000 },
      ],
    });
    const one = tickMoneyDelta(oneZone);
    const two = tickMoneyDelta(twoZones);
    // Two capped zones at 0.9 penalty: 2 × $10M × 0.9 = $18M/mo vs $10M/mo
    expect(two - one).toBeCloseTo(Math.round(8_000_000 / 30), -2);
  });

  it('stakeholder standing raises revenue of services in the zone', () => {
    const plain = withLaunchService();
    const stakeholder = withLaunchService({
      zoneStandings: [{ zoneSlug: 'zone_leo', sharePct: 10, isGovernor: false, taxBaseMonthly: 0 }],
    });
    // earth_surface belongs to zone_leo; 10% share → major stakeholder +3%
    expect(tickMoneyDelta(stakeholder)).toBeGreaterThan(tickMoneyDelta(plain));
  });
});

// ─── Espionage rewards (audit A8) ────────────────────────────────────────────

describe('espionage reward wiring', () => {
  it('headhunt voucher discounts the next hire when state is passed', () => {
    const now = Date.now();
    const state = baseState({
      activeIntelPerks: [{ type: 'headhunt_voucher', discount: 0.5, expiresAtMs: now + 3600_000 }],
    });
    const undiscounted = getHireCost('engineer');
    expect(getHireCost('engineer', state, now)).toBe(Math.round(undiscounted * 0.5));
    // Expired voucher does nothing
    const expired = baseState({
      activeIntelPerks: [{ type: 'headhunt_voucher', discount: 0.5, expiresAtMs: now - 1 }],
    });
    expect(getHireCost('engineer', expired, now)).toBe(undiscounted);
  });

  it('consumeHeadhuntVoucher removes exactly one active voucher', () => {
    const now = Date.now();
    const state = baseState({
      activeIntelPerks: [
        { type: 'market_discount', discount: 0.1, expiresAtMs: now + 3600_000 },
        { type: 'headhunt_voucher', discount: 0.5, expiresAtMs: now + 3600_000 },
      ],
    });
    const after = consumeHeadhuntVoucher(state, now);
    expect(after.activeIntelPerks).toHaveLength(1);
    expect(after.activeIntelPerks![0].type).toBe('market_discount');
  });

  it('expired intel perks are cleaned up by the tick', () => {
    const now = Date.now();
    const state = baseState({
      activeIntelPerks: [
        { type: 'market_discount', discount: 0.1, expiresAtMs: now - 1000 },
        { type: 'headhunt_voucher', discount: 0.5, expiresAtMs: now + 3600_000 },
      ],
    });
    const out = processTick(state);
    expect(out.activeIntelPerks).toHaveLength(1);
    expect(out.activeIntelPerks![0].type).toBe('headhunt_voucher');
  });

  it('market_discount + magnate + diplomacy stack into the broker fee (capped)', () => {
    // Base rate untouched
    expect(getEffectiveBrokerFeeRate({})).toBeCloseTo(MARKET_BROKER_FEE_RATE, 10);
    // Espionage discount alone: −10%
    expect(getEffectiveBrokerFeeRate({ espionageDiscount: 0.10 }))
      .toBeCloseTo(MARKET_BROKER_FEE_RATE * 0.9, 10);
    // Magnate commanders (marketPriceMultiplier 1.07 → 7% cut)
    expect(getEffectiveBrokerFeeRate({ commanderMarketMultiplier: 1.07 }))
      .toBeCloseTo(MARKET_BROKER_FEE_RATE * 0.93, 10);
    // Diplomacy trade agreement (tradeBonus 0.02 → 2% cut)
    expect(getEffectiveBrokerFeeRate({ diplomacyTradeBonus: 0.02 }))
      .toBeCloseTo(MARKET_BROKER_FEE_RATE * 0.98, 10);
    // Total reduction is capped at 85% — fee never fully disappears
    const floor = getEffectiveBrokerFeeRate({
      commanderMarketMultiplier: 2.5, espionageDiscount: 0.5, diplomacyTradeBonus: 0.5,
    });
    expect(floor).toBeCloseTo(MARKET_BROKER_FEE_RATE * 0.15, 10);
    expect(floor).toBeGreaterThan(0);
  });
});

// ─── League boosts (audit §1b "Leagues") ─────────────────────────────────────

describe('league promotion boost wiring', () => {
  it('grants the defined boost once, idempotent per season', () => {
    const snapshot = {
      leagueBoost: {
        seasonId: 'season_42', rank: 1, league: 3,
        boostType: 'construction' as const, boostMultiplier: 3.0, boostDurationSeconds: 4 * 3600,
      },
      fetchedAtMs: Date.now(),
    };
    const once = applyServerEffectsToState(baseState(), snapshot);
    expect(once.availableBoosts).toHaveLength(1);
    expect(once.availableBoosts![0]).toMatchObject({
      id: 'boost_league_season_42', type: 'construction', multiplier: 3.0, durationSeconds: 14_400,
    });
    expect(once.claimedLeagueBoostSeasonIds).toContain('season_42');
    // Re-applying the same snapshot (sync retry) does not double-grant
    const twice = applyServerEffectsToState(once, snapshot);
    expect(twice.availableBoosts).toHaveLength(1);
  });
});

// ─── Modules (audit §1b "Modules") ───────────────────────────────────────────

describe('ship module wiring', () => {
  const now = Date.now();

  function shipState(fitModuleId: string | null, shipDefId: string, extra: Partial<GameState> = {}): GameState {
    const inventory = fitModuleId
      ? [{ instanceId: 'own1', definitionId: fitModuleId, acquiredAtMs: now }]
      : [];
    return baseState({
      ships: [{
        instanceId: 'ship1', definitionId: shipDefId, name: 'Test Ship',
        status: 'idle', currentLocation: 'leo', isBuilt: true,
      }],
      moduleInventory: inventory,
      fittedModules: fitModuleId ? { ship1: ['own1'] } : {},
      ...extra,
    });
  }

  it('mining laser cluster raises the ship mining-rate multiplier by 30%', () => {
    expect(getShipMiningRateMultiplier(shipState(null, 'ore_harvester'), 'ship1')).toBe(1);
    expect(getShipMiningRateMultiplier(shipState('mod_mining_laser', 'ore_harvester'), 'ship1')).toBeCloseTo(1.3, 10);
  });

  it('ion thruster raises the transit-speed multiplier', () => {
    const plain = getShipTransitSpeedMultiplier(shipState(null, 'freighter'), 'ship1');
    const boosted = getShipTransitSpeedMultiplier(shipState('mod_ion_thruster', 'freighter'), 'ship1');
    expect(plain).toBe(1);
    expect(boosted).toBeGreaterThan(1);
  });

  it('a module-boosted ship arrives from transit earlier than base ETA', () => {
    const def = SHIP_MAP.get('freighter')!;
    const base = getShipDerivedStats(def);
    const warpRatio = (base.warpFactor + 0.2) / base.warpFactor; // ion thruster delta
    const durationMs = 1_000_000;
    // Elapsed time sits between boosted duration and planned duration.
    const elapsed = Math.round((durationMs / warpRatio + durationMs) / 2);
    const makeTransit = (fit: string | null) => {
      const s = shipState(fit, 'freighter');
      s.ships![0] = {
        ...s.ships![0],
        status: 'in_transit',
        route: {
          from: 'leo', to: 'mars_orbit',
          departedAtMs: now - elapsed, arrivalAtMs: now - elapsed + durationMs,
          cargo: {},
        },
      };
      return s;
    };
    const stillFlying = processFullTick(makeTransit(null));
    const arrived = processFullTick(makeTransit('mod_ion_thruster'));
    expect(stillFlying.ships![0].status).toBe('in_transit');
    expect(arrived.ships![0].status).toBe('idle');
    expect(arrived.ships![0].currentLocation).toBe('mars_orbit');
  });
});

// ─── Timed-event boostReward (audit §1c) ─────────────────────────────────────

describe('timed-event boost reward wiring', () => {
  it('completing an event with a boostReward grants an available boost', () => {
    const now = Date.now();
    const state = baseState({
      resources: { rare_earth: 100 },
      lastTimedEventSpawnMs: now, // suppress a new spawn
      activeTimedEvents: [{
        templateId: 'evt_rare_earth_hunt', name: 'Rare Earth Hunt', icon: '💎',
        category: 'mining', description: '', targetLabel: 'rare earth',
        target: 50, startedAtMs: now - 1000, expiresAtMs: now + 3600_000,
        rewardAmount: 25_000_000, boostReward: 'research',
      }],
    });
    const out = processFullTick(state);
    const grant = (out.availableBoosts || []).find(b => b.id.startsWith('boost_timed_evt_rare_earth_hunt'));
    expect(grant).toBeDefined();
    expect(grant!.type).toBe('research');
    expect(grant!.multiplier).toBe(2.0);
    expect(out.money).toBeGreaterThan(state.money); // cash reward still paid
  });
});

// ─── Contract reward multipliers (audit §1c) ─────────────────────────────────

describe('contract payout wiring — reputation + negotiators', () => {
  it('applyContractReward scales cash by reputation contractRewardMultiplier', () => {
    const plain = applyContractReward(baseState(), { money: 100_000_000 });
    const reputable = applyContractReward(baseState({ reputation: 25_000 }), { money: 100_000_000 });
    expect(plain.money - 50_000_000).toBe(100_000_000);
    // Space Baron threshold: contractRewardMultiplier 1.20
    expect(reputable.money - 50_000_000).toBe(120_000_000);
  });

  it('negotiators add contractPayBonus on top', () => {
    const negotiated = applyContractReward(
      baseState({ workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, negotiators: 2, morale: 1.0, fatigue: 0, trainingLevel: 0.5 } }),
      { money: 100_000_000 },
    );
    // 2 negotiators × 0.10 × bonusScale 1.0 = +20%
    expect(negotiated.money - 50_000_000).toBe(120_000_000);
  });

  it('deliverContract pays more with reputation', () => {
    const now = Date.now();
    const delivery = {
      id: 'd1', issuerKind: 'faction' as const, issuerFactionId: 'the-dominion',
      title: 'Iron run', resourceId: 'iron', quantity: 10, paymentMoney: 100_000_000,
      deadlineAtMs: now + 3600_000, reputationOnComplete: 5, reputationOnDefault: -5,
      status: 'accepted' as const, offeredAtMs: now - 1000, acceptedAtMs: now - 500,
    };
    const mk = (reputation: number) => baseState({
      resources: { iron: 10 },
      reputation,
      activeDeliveries: [{ ...delivery }],
    });
    const plain = deliverContract(mk(0), 'd1', now);
    const reputable = deliverContract(mk(25_000), 'd1', now);
    const plainPay = plain.money - 50_000_000;
    const repPay = reputable.money - 50_000_000;
    expect(repPay).toBe(Math.round(plainPay * 1.2));
  });
});

// ─── Milestone reputation (audit §1c) ────────────────────────────────────────

describe('milestone reputation wiring', () => {
  it('claiming a competitive milestone now awards milestone_claimed reputation', () => {
    // Comfortably above $1B so this tick's exec-comp deduction can't dip
    // below the milestone_first_billion threshold before the check runs.
    const state = baseState({ money: 1_100_000_000, reputation: 0 });
    const out = processFullTick(state);
    expect(out.claimedMilestones?.milestone_first_billion).toBeDefined();
    // REPUTATION_POINTS.milestone_claimed = 1000 — previously never awarded
    expect(out.reputation).toBeGreaterThanOrEqual(1000);
  });
});

// ─── Mini-activity bonuses (audit §1c) ───────────────────────────────────────

describe('mini-activity bonus applier', () => {
  it('resource_find grants the resource', () => {
    const out = applyMiniActivityBonus(baseState(), { type: 'resource_find', value: 3, label: '+3 iron' });
    expect(out.resources.iron).toBe(3);
  });

  it('mining_boost creates a timed mining boost the engine consumes', () => {
    const now = Date.now();
    const boosted = applyMiniActivityBonus(
      baseState(),
      { type: 'mining_boost', value: 1.5, durationMs: 600_000, label: '+50% mining (10m)' },
      now,
    );
    expect(boosted.activeBoosts).toHaveLength(1);
    expect(boosted.activeBoosts![0].type).toBe('mining');

    // Engine integration: mining service production rises under the boost
    const globalDate = getGlobalGameDate();
    const miningService = {
      definitionId: 'svc_mining_lunar', locationId: 'lunar_surface',
      linkedBuildingIds: [], startDate: { year: globalDate.year, month: globalDate.month },
      revenueMultiplier: 1,
    };
    const plainOut = processTick(baseState({ activeServices: [miningService] }));
    const boostOut = processTick(applyMiniActivityBonus(
      baseState({ activeServices: [miningService] }),
      { type: 'mining_boost', value: 1.5, durationMs: 600_000, label: '+50% mining (10m)' },
      now,
    ));
    const sum = (s: GameState) => Object.values(s.resources).reduce((a, b) => a + b, 0);
    expect(sum(boostOut)).toBeGreaterThan(sum(plainOut));
  });

  it('research_speed creates a research boost', () => {
    const out = applyMiniActivityBonus(baseState(), { type: 'research_speed', value: 1.2, durationMs: 600_000, label: '+20% research' });
    expect(out.activeBoosts![0].type).toBe('research');
  });
});
