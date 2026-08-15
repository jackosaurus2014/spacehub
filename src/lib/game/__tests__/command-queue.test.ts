/**
 * @jest-environment node
 *
 * Live-Service Wave LS1 "Night Shift" — command queue.
 * Covers: capacity math, enqueue/dequeue/reorder CRUD, live-tick pop
 * (popCommandQueue — starts whatever is free right now), and the away-catchup
 * discrete-event chain (simulateCommandQueueCatchUp — can complete + chain
 * MULTIPLE orders across a long absence), plus determinism.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  getCommandQueueCapacity,
  enqueueResearchOrder,
  enqueueBuildOrder,
  dequeueOrder,
  reorderQueueOrder,
  popCommandQueue,
  simulateCommandQueueCatchUp,
  completeActiveResearchChannel,
  attemptResearchStart,
  attemptBuildStart,
} from '../command-queue';
import {
  COMMAND_QUEUE_BASE_DEPTH,
  COMMAND_QUEUE_AUTOMATION_RESEARCH_ID,
  COMMAND_QUEUE_TIER5_THRESHOLD,
} from '../constants';
import { RESEARCH_MAP } from '../research-tree';
import { BUILDING_MAP } from '../buildings';

const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    money: 10_000_000_000, // $10B — plenty for tier-1 research/builds
    lastTickAt: NOW,
    createdAt: NOW,
    unlockedLocations: ['earth_surface', 'leo'],
    ...overrides,
  };
}

describe('command queue capacity', () => {
  it('starts at the base depth', () => {
    expect(getCommandQueueCapacity(baseState())).toBe(COMMAND_QUEUE_BASE_DEPTH);
  });

  it('adds automation-research bonus', () => {
    const s = baseState({ completedResearch: [COMMAND_QUEUE_AUTOMATION_RESEARCH_ID] });
    expect(getCommandQueueCapacity(s)).toBe(COMMAND_QUEUE_BASE_DEPTH + 2);
  });

  it('adds tier-5 bonus', () => {
    const s = baseState({ corporationTier: COMMAND_QUEUE_TIER5_THRESHOLD });
    expect(getCommandQueueCapacity(s)).toBe(COMMAND_QUEUE_BASE_DEPTH + 2);
  });

  it('stacks both bonuses', () => {
    const s = baseState({ completedResearch: [COMMAND_QUEUE_AUTOMATION_RESEARCH_ID], corporationTier: COMMAND_QUEUE_TIER5_THRESHOLD });
    expect(getCommandQueueCapacity(s)).toBe(COMMAND_QUEUE_BASE_DEPTH + 4);
  });
});

describe('enqueue / dequeue / reorder', () => {
  it('enqueues a research order with a captured label', () => {
    const s = baseState();
    const result = enqueueResearchOrder(s, 'reusable_boosters', NOW);
    expect(result.ok).toBe(true);
    expect(result.state.commandQueue).toHaveLength(1);
    expect(result.state.commandQueue![0]).toMatchObject({ kind: 'research', researchId: 'reusable_boosters', label: RESEARCH_MAP.get('reusable_boosters')!.name });
  });

  it('enqueues a build order', () => {
    const s = baseState();
    const result = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW);
    expect(result.ok).toBe(true);
    expect(result.state.commandQueue![0]).toMatchObject({ kind: 'build', buildingId: 'launch_pad_small', locationId: 'earth_surface' });
  });

  it('refuses to enqueue past capacity', () => {
    let s = baseState();
    for (let i = 0; i < COMMAND_QUEUE_BASE_DEPTH; i++) {
      s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    }
    const result = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('queue_full');
    expect(result.state.commandQueue).toHaveLength(COMMAND_QUEUE_BASE_DEPTH);
  });

  it('rejects an unknown definition id', () => {
    const s = baseState();
    const result = enqueueResearchOrder(s, 'not_a_real_tech', NOW);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_definition');
  });

  it('dequeues by id', () => {
    let s = baseState();
    s = enqueueResearchOrder(s, 'reusable_boosters', NOW).state;
    const id = s.commandQueue![0].id;
    s = dequeueOrder(s, id);
    expect(s.commandQueue).toHaveLength(0);
  });

  it('reorders up and down, no-ops at the ends', () => {
    let s = baseState();
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    s = enqueueResearchOrder(s, 'reusable_boosters', NOW).state;
    const [first, second] = s.commandQueue!;
    s = reorderQueueOrder(s, second.id, 'up');
    expect(s.commandQueue!.map(o => o.id)).toEqual([second.id, first.id]);
    // Already at front — 'up' is a no-op.
    s = reorderQueueOrder(s, second.id, 'up');
    expect(s.commandQueue!.map(o => o.id)).toEqual([second.id, first.id]);
    // Already at back — 'down' is a no-op.
    s = reorderQueueOrder(s, first.id, 'down');
    expect(s.commandQueue!.map(o => o.id)).toEqual([second.id, first.id]);
  });
});

describe('attemptResearchStart / attemptBuildStart validators', () => {
  it('fails on insufficient funds', () => {
    const s = baseState({ money: 0 });
    const order = enqueueResearchOrder(s, 'reusable_boosters', NOW).state.commandQueue![0];
    const result = attemptResearchStart(s, order, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient_funds');
  });

  it('fails a build outside unlocked locations', () => {
    const s = baseState({ unlockedLocations: [] });
    const order = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state.commandQueue![0];
    const result = attemptBuildStart(s, order, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('location_locked');
  });

  it('starts research into queue1 when free, deducting cost', () => {
    const s = baseState();
    const order = enqueueResearchOrder(s, 'reusable_boosters', NOW).state.commandQueue![0];
    const result = attemptResearchStart(s, order, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.activeResearch?.definitionId).toBe('reusable_boosters');
      expect(result.state.money).toBeLessThan(s.money);
    }
  });
});

describe('popCommandQueue (live tick — starts whatever is free NOW)', () => {
  it('starts a queued research order into the free queue1 slot', () => {
    let s = baseState();
    s = enqueueResearchOrder(s, 'reusable_boosters', NOW).state;
    const { state, executed, skipped } = popCommandQueue(s, NOW);
    expect(executed).toHaveLength(1);
    expect(skipped).toHaveLength(0);
    expect(state.activeResearch?.definitionId).toBe('reusable_boosters');
    expect(state.commandQueue).toHaveLength(0);
  });

  it('leaves a research order queued when both channels are busy', () => {
    let s = baseState({ completedResearch: ['parallel_research'] });
    const busyEntry = { definitionId: 'reusable_boosters', startDate: s.gameDate, progressMonths: 0, totalMonths: 12, startedAtMs: NOW, realDurationSeconds: 600 };
    s = { ...s, activeResearch: busyEntry, activeResearch2: busyEntry };
    const thirdTechId = Array.from(RESEARCH_MAP.keys()).find(id => id !== 'reusable_boosters')!;
    s = enqueueResearchOrder(s, thirdTechId, NOW).state;

    const { state, executed, skipped } = popCommandQueue(s, NOW);
    expect(executed).toHaveLength(0);
    expect(skipped).toHaveLength(0);
    expect(state.commandQueue).toHaveLength(1); // still queued, not lost
  });

  it('starts a build when a construction slot is free', () => {
    let s = baseState();
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    const { state, executed } = popCommandQueue(s, NOW);
    expect(executed).toHaveLength(1);
    expect(state.buildings).toHaveLength(1);
    expect(state.buildings[0].isComplete).toBe(false);
  });

  it('skips (never blocks) an unaffordable order and removes it from the queue', () => {
    let s = baseState({ money: 0 });
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    const { state, executed, skipped } = popCommandQueue(s, NOW);
    expect(executed).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('insufficient_funds');
    expect(state.commandQueue).toHaveLength(0); // skip, don't jam
  });

  it('skips an unsupported queue kind immediately with a reason', () => {
    let s = baseState();
    s = {
      ...s,
      commandQueue: [{ id: 'x1', kind: 'ship_dispatch', createdAtMs: NOW, label: 'Test dispatch' }],
    };
    const { state, skipped } = popCommandQueue(s, NOW);
    expect(skipped).toEqual([{ kind: 'ship_dispatch', label: 'Test dispatch', ok: false, reason: 'not_yet_automatable' }]);
    expect(state.commandQueue).toHaveLength(0);
  });

  it('fills BOTH research channels in a single pass when both are free', () => {
    let s = baseState({ completedResearch: ['parallel_research'] });
    const secondTechId = Array.from(RESEARCH_MAP.keys()).find(id => id !== 'reusable_boosters' && RESEARCH_MAP.get(id)!.prerequisites.length === 0)!;
    s = enqueueResearchOrder(s, 'reusable_boosters', NOW).state;
    s = enqueueResearchOrder(s, secondTechId, NOW).state;
    const { state, executed } = popCommandQueue(s, NOW);
    expect(executed).toHaveLength(2);
    expect(state.activeResearch).not.toBeNull();
    expect(state.activeResearch2).not.toBeNull();
  });
});

describe('completeActiveResearchChannel', () => {
  it('pushes a non-repeatable tech to completedResearch and clears the channel', () => {
    const s = baseState({
      activeResearch: { definitionId: 'reusable_boosters', startDate: { year: 2026, month: 1 }, progressMonths: 0, totalMonths: 12, startedAtMs: NOW, realDurationSeconds: 600 },
    });
    const next = completeActiveResearchChannel(s, 'q1');
    expect(next.completedResearch).toContain('reusable_boosters');
    expect(next.activeResearch).toBeNull();
    expect(next.stats.researchCompleted).toBe(s.stats.researchCompleted + 1);
  });

  it('bumps a repeatable program level instead of pushing to completedResearch', () => {
    const repeatableId = Array.from(RESEARCH_MAP.values()).find(d => d.repeatable)!.id;
    const s = baseState({
      activeResearch2: { definitionId: repeatableId, startDate: { year: 2026, month: 1 }, progressMonths: 0, totalMonths: 12, startedAtMs: NOW, realDurationSeconds: 600 },
    });
    const next = completeActiveResearchChannel(s, 'q2');
    expect(next.completedResearch).not.toContain(repeatableId);
    expect(next.repeatableResearchLevels?.[repeatableId]).toBe(1);
    expect(next.activeResearch2).toBeNull();
  });

  it('is a no-op when the channel is already empty', () => {
    const s = baseState();
    expect(completeActiveResearchChannel(s, 'q1')).toBe(s);
  });
});

describe('simulateCommandQueueCatchUp (away catch-up — can chain MULTIPLE completions)', () => {
  it('chains two queued research orders across a long absence', () => {
    let s = baseState();
    s = enqueueResearchOrder(s, 'reusable_boosters', NOW).state;
    const secondTechId = Array.from(RESEARCH_MAP.keys()).find(id => id !== 'reusable_boosters' && RESEARCH_MAP.get(id)!.prerequisites.length === 0)!;
    s = enqueueResearchOrder(s, secondTechId, NOW).state;

    // Away for 30 days real time — comfortably longer than two tier-1 techs'
    // combined realResearchSeconds (minutes, per TIER_RESEARCH_SECONDS).
    const returnNow = NOW + 30 * 24 * 3_600_000;
    const { state, executed } = simulateCommandQueueCatchUp(s, returnNow);

    expect(executed.length).toBeGreaterThanOrEqual(2);
    expect(state.commandQueue).toHaveLength(0);
    // Both techs should have fully completed and a NEW one started (or at
    // minimum the first is done and the second occupies the freed slot).
    expect(state.completedResearch).toContain('reusable_boosters');
  });

  it('chains two queued build orders into the (2-slot, tier-1) construction pool', () => {
    let s = baseState();
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    s = enqueueBuildOrder(s, 'ground_station', 'earth_surface', NOW).state; // second tier-1, no-research building
    const returnNow = NOW + 30 * 24 * 3_600_000;
    const { state, executed } = simulateCommandQueueCatchUp(s, returnNow);
    expect(executed.length).toBeGreaterThanOrEqual(2);
    expect(state.buildings.length).toBeGreaterThanOrEqual(2);
  });

  it('skips an unaffordable queued order without jamming the rest', () => {
    // Just enough money for ONE launch pad, not two.
    const oneOrderCost = BUILDING_MAP.get('launch_pad_small')!.baseCost;
    let s = baseState({ money: oneOrderCost });
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    const returnNow = NOW + 3_600_000;
    const { executed, skipped } = simulateCommandQueueCatchUp(s, returnNow);
    expect(executed).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('insufficient_funds');
  });

  it('is deterministic — identical state + elapsed time produce identical results', () => {
    let s = baseState();
    s = enqueueResearchOrder(s, 'reusable_boosters', NOW).state;
    s = enqueueBuildOrder(s, 'launch_pad_small', 'earth_surface', NOW).state;
    const returnNow = NOW + 10 * 24 * 3_600_000;
    const a = simulateCommandQueueCatchUp(s, returnNow);
    const b = simulateCommandQueueCatchUp(s, returnNow);
    expect(a.state.money).toBe(b.state.money);
    expect(a.state.completedResearch).toEqual(b.state.completedResearch);
    expect(a.state.buildings.length).toBe(b.state.buildings.length);
    expect(a.executed.length).toBe(b.executed.length);
  });

  it('never infinite-loops on an all-unsupported queue', () => {
    let s = baseState();
    s = {
      ...s,
      commandQueue: [
        { id: 'a', kind: 'ship_dispatch', createdAtMs: NOW, label: 'A' },
        { id: 'b', kind: 'craft', createdAtMs: NOW, label: 'B' },
      ],
    };
    const { state, skipped } = simulateCommandQueueCatchUp(s, NOW + 1000);
    expect(skipped).toHaveLength(2);
    expect(state.commandQueue).toHaveLength(0);
  });
});
