/**
 * @jest-environment node
 *
 * Row 12 (docs/GAME_DESIGN_REVIEW_2026-09.md §2, founder-approved
 * 2026-09-02) — interstellar signal lag.
 *
 * `PendingInterstellarCommand` sat in interstellar.ts with no consumer since
 * Phase VIII: every beyond-heliopause order executed on click, exactly like a
 * Sol-side one. These prove the queue is real:
 *
 *  - lag math: 2 game-months per light-year → 12 real hours per ly on the
 *    world clock (Proxima 4.24 ly ≈ 2.1 days)
 *  - lifecycle: issue debits the fee NOW and executes nothing; the tick
 *    executes on arrival and only then
 *  - cancellation before arrival works and refunds NOTHING
 *  - an order that is no longer legal on arrival fails loudly, still no refund
 *  - saves with no queue are untouched (same state reference back)
 */
import {
  LIGHT_LAG_PER_LY_MS,
  SIGNAL_LAG_GAME_MONTHS_PER_LY,
  getSignalLagMs,
  getSystemSignalLagMs,
  INTERSTELLAR_SYSTEM_MAP,
} from '../interstellar';
import {
  issueInterstellarCommand,
  cancelInterstellarCommand,
  processInterstellarCommandTick,
  getInterstellarCommandProgress,
  formatSignalEta,
} from '../interstellar-commands';
import { COLONY_FOUNDING_COST, TRADE_ROUTE_SETUP_COST, getColonyUpgradeCost } from '../expeditions';
import { REAL_SECONDS_PER_GAME_MONTH } from '../server-time';
import { getGlobalGameDate } from '../server-time';
import type { GameState, ExpeditionState, InterstellarColonyState } from '../types';

const NOW = 1_800_000_000_000;

function baseState(overrides: Partial<GameState> = {}): GameState {
  const g = getGlobalGameDate();
  return {
    version: 1,
    createdAt: NOW,
    lastTickAt: NOW,
    money: 500_000_000_000,
    totalEarned: 0,
    totalSpent: 0,
    gameDate: { year: g.year, month: g.month },
    tickSpeed: 1,
    buildings: [],
    completedResearch: ['jump_drive'],
    activeResearch: null,
    activeServices: [],
    unlockedLocations: ['earth_surface', 'leo'],
    resources: {},
    craftedProducts: {},
    eventLog: [],
    stats: {
      rocketsLaunched: 0, satellitesDeployed: 0, stationsBuilt: 0,
      researchCompleted: 0, missionsToMoon: 0, missionsToMars: 0, missionsToOuterPlanets: 0,
    },
    npcCompanies: [],
    frontierStatus: 'none',
    ...overrides,
  } as GameState;
}

function arkOnStation(systemId = 'proxima_centauri'): ExpeditionState {
  return {
    id: 'exp-1',
    targetSystemId: systemId,
    shipInstanceId: 'ark-1',
    shipDefinitionId: 'colony_ark',
    crew: 40,
    crewBreakdown: { engineers: 40 },
    phase: 'exploring',
    launchedAtMs: NOW - 1_000,
    launchGameMonth: 0,
    outboundMonths: 127,
    exploreMonths: 12,
    monthsElapsed: 130,
    hullIntegrity: 1,
    hazardLog: [],
    insured: false,
    totalCost: 1,
    outcome: {
      summary: 'test',
      surveyDataPayout: 1_000_000_000,
      colonySuitability: 0.7,
      resourceSamples: {},
    },
  } as unknown as ExpeditionState;
}

function colony(systemId = 'proxima_centauri'): InterstellarColonyState {
  return {
    id: 'col-1',
    systemId,
    name: 'Test Colony',
    foundedAtMs: NOW - 10_000,
    foundedGameMonth: 0,
    population: 450,
    infrastructureLevel: 1,
    upgradeInProgress: null,
    localResources: ['helium3'],
    stockpile: {},
    lastProcessedGameMonth: 0,
    suitability: 0.7,
  } as unknown as InterstellarColonyState;
}

// ─── lag math ────────────────────────────────────────────────────────────────

describe('signal-lag constant', () => {
  it('is 2 game-months per light-year, i.e. 12 real hours on the world clock', () => {
    expect(SIGNAL_LAG_GAME_MONTHS_PER_LY).toBe(2);
    expect(LIGHT_LAG_PER_LY_MS).toBe(2 * REAL_SECONDS_PER_GAME_MONTH * 1000);
    expect(LIGHT_LAG_PER_LY_MS / 3_600_000).toBe(12);
  });

  it('Proxima (4.24 ly) is a bit over two real days out', () => {
    const ms = getSystemSignalLagMs('proxima_centauri');
    expect(ms).toBe(Math.round(4.24 * LIGHT_LAG_PER_LY_MS));
    expect(ms / 86_400_000).toBeCloseTo(2.12, 2);
  });

  it('scales linearly with distance and never goes negative', () => {
    const sirius = INTERSTELLAR_SYSTEM_MAP.get('sirius')!;
    expect(getSystemSignalLagMs('sirius')).toBeGreaterThan(getSystemSignalLagMs('proxima_centauri'));
    expect(getSignalLagMs(sirius.distanceLy)).toBe(getSystemSignalLagMs('sirius'));
    expect(getSignalLagMs(-5)).toBe(0);
    expect(getSystemSignalLagMs('nowhere')).toBe(0);
  });
});

// ─── lifecycle ───────────────────────────────────────────────────────────────

describe('issue → in transit → execute on arrival', () => {
  it('debits the fee at issue and executes nothing yet', () => {
    const s = baseState({ expeditions: [arkOnStation()] });
    const res = issueInterstellarCommand(s, { kind: 'found_colony', expeditionId: 'exp-1' }, NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.state.money).toBe(s.money - COLONY_FOUNDING_COST);
    expect(res.state.totalSpent).toBe(COLONY_FOUNDING_COST);
    expect(res.state.interstellarColonies || []).toHaveLength(0);
    expect(res.state.pendingInterstellarCommands).toHaveLength(1);
    expect(res.command.executeAtMs).toBe(NOW + getSystemSignalLagMs('proxima_centauri'));
    expect(res.command.feePaid).toBe(COLONY_FOUNDING_COST);
  });

  it('the tick does nothing until the signal arrives, then founds the colony', () => {
    const s = baseState({ expeditions: [arkOnStation()] });
    const issued = issueInterstellarCommand(s, { kind: 'found_colony', expeditionId: 'exp-1' }, NOW);
    if (!issued.ok) throw new Error('issue failed');
    const lag = getSystemSignalLagMs('proxima_centauri');

    const early = processInterstellarCommandTick(issued.state, NOW + lag - 1);
    expect(early).toBe(issued.state);                       // same reference — nothing due
    expect(early.interstellarColonies || []).toHaveLength(0);

    const arrived = processInterstellarCommandTick(issued.state, NOW + lag);
    expect(arrived.interstellarColonies).toHaveLength(1);
    expect(arrived.pendingInterstellarCommands).toHaveLength(0);
    // Prepaid: the arrival must NOT charge the founding cost a second time.
    expect(arrived.money).toBe(issued.state.money);
  });

  it('trade-route and colony-upgrade orders take the same road', () => {
    const s = baseState({ interstellarColonies: [colony()] });
    const route = issueInterstellarCommand(s, { kind: 'establish_trade_route', colonyId: 'col-1', resourceId: 'helium3' }, NOW);
    expect(route.ok).toBe(true);
    if (!route.ok) return;
    expect(route.state.money).toBe(s.money - TRADE_ROUTE_SETUP_COST);
    expect(route.state.interstellarTradeRoutes || []).toHaveLength(0);
    const landed = processInterstellarCommandTick(route.state, NOW + getSystemSignalLagMs('proxima_centauri'));
    expect(landed.interstellarTradeRoutes).toHaveLength(1);
    expect(landed.money).toBe(route.state.money);

    const upg = issueInterstellarCommand(s, { kind: 'upgrade_colony', colonyId: 'col-1' }, NOW);
    expect(upg.ok).toBe(true);
    if (!upg.ok) return;
    expect(upg.state.money).toBe(s.money - getColonyUpgradeCost(1));
    expect(upg.state.interstellarColonies![0].upgradeInProgress).toBeNull();
    const upgLanded = processInterstellarCommandTick(upg.state, NOW + getSystemSignalLagMs('proxima_centauri'));
    expect(upgLanded.interstellarColonies![0].upgradeInProgress).not.toBeNull();
  });

  it('refuses a second copy of an order already in transit', () => {
    const s = baseState({ interstellarColonies: [colony()] });
    const first = issueInterstellarCommand(s, { kind: 'upgrade_colony', colonyId: 'col-1' }, NOW);
    if (!first.ok) throw new Error('issue failed');
    const second = issueInterstellarCommand(first.state, { kind: 'upgrade_colony', colonyId: 'col-1' }, NOW + 1_000);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('already_queued');
  });

  it('refuses an order the corporation cannot pay to transmit', () => {
    const s = baseState({ expeditions: [arkOnStation()], money: 1_000 });
    const res = issueInterstellarCommand(s, { kind: 'found_colony', expeditionId: 'exp-1' }, NOW);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('insufficient_funds');
  });

  it('a save with no queue is returned untouched', () => {
    const s = baseState();
    expect(processInterstellarCommandTick(s, NOW + 10_000_000)).toBe(s);
  });
});

// ─── cancellation ────────────────────────────────────────────────────────────

describe('cancellation is free of the order, not of the bill', () => {
  it('removes the order and refunds nothing', () => {
    const s = baseState({ expeditions: [arkOnStation()] });
    const issued = issueInterstellarCommand(s, { kind: 'found_colony', expeditionId: 'exp-1' }, NOW);
    if (!issued.ok) throw new Error('issue failed');
    const cancelled = cancelInterstellarCommand(issued.state, issued.command.id);
    expect(cancelled.pendingInterstellarCommands).toHaveLength(0);
    expect(cancelled.money).toBe(issued.state.money);          // NO refund
    expect(cancelled.money).toBe(s.money - COLONY_FOUNDING_COST);
    // And nothing happens later either.
    const later = processInterstellarCommandTick(cancelled, NOW + 10 * getSystemSignalLagMs('proxima_centauri'));
    expect(later.interstellarColonies || []).toHaveLength(0);
  });

  it('an unknown id is a no-op', () => {
    const s = baseState();
    expect(cancelInterstellarCommand(s, 'nope')).toBe(s);
  });
});

// ─── conditions change in flight ─────────────────────────────────────────────

describe('an order can arrive too late to be legal', () => {
  it('fails on arrival, logs it, and still does not refund', () => {
    const s = baseState({ expeditions: [arkOnStation()] });
    const issued = issueInterstellarCommand(s, { kind: 'found_colony', expeditionId: 'exp-1' }, NOW);
    if (!issued.ok) throw new Error('issue failed');
    // Someone already founded a colony in that system while the order flew.
    const raced: GameState = { ...issued.state, interstellarColonies: [colony()] };
    const landed = processInterstellarCommandTick(raced, NOW + getSystemSignalLagMs('proxima_centauri'));
    expect(landed.interstellarColonies).toHaveLength(1);      // not two
    expect(landed.pendingInterstellarCommands).toHaveLength(0);
    expect(landed.money).toBe(raced.money);                   // no refund
    expect(landed.eventLog[0].title).toContain('could not be carried out');
  });
});

// ─── UI lens ─────────────────────────────────────────────────────────────────

describe('progress lens', () => {
  it('reports fraction crossed and a plain-text ETA', () => {
    const s = baseState({ interstellarColonies: [colony()] });
    const issued = issueInterstellarCommand(s, { kind: 'upgrade_colony', colonyId: 'col-1' }, NOW);
    if (!issued.ok) throw new Error('issue failed');
    const lag = getSystemSignalLagMs('proxima_centauri');
    const half = getInterstellarCommandProgress(issued.state, NOW + lag / 2)[0];
    expect(half.progress).toBeCloseTo(0.5, 3);
    expect(half.msRemaining).toBe(lag / 2);
    expect(half.etaLabel).toMatch(/arrives in \d+h/);
    const done = getInterstellarCommandProgress(issued.state, NOW + lag)[0];
    expect(done.progress).toBe(1);
    expect(done.etaLabel).toBe('arriving');
  });

  it('falls back to minutes under an hour', () => {
    expect(formatSignalEta(90_000)).toBe('arrives in 2m');
    expect(formatSignalEta(0)).toBe('arriving');
  });
});
