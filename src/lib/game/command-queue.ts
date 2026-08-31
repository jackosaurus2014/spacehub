// ─── Space Tycoon: Command Queue (Live-Service Wave LS1 "Night Shift") ──────
// docs/LIVE_SERVICE_2026-08.md §LS1 item 1. An ordered list of typed orders
// that execute automatically as slots free — "queue the next three
// researches, chain two builds" and it runs while you're away. Fully
// implemented this wave: 'research' (queue1/queue2) and 'build' (the shared
// construction-slot pool). 'ship_dispatch' / 'craft' / 'service_activate' are
// typed for forward compatibility (see types.ts CommandQueueOrderKind doc)
// but skip immediately with a logged reason — never silently vanish.
//
// Two execution paths share the same `attempt*Start` validators so a queued
// order is judged identically whether it pops during a live tick or during
// away catch-up:
//   - popCommandQueue()            — live tick: starts whatever is free RIGHT
//                                     NOW (game-engine.ts calls this every
//                                     processFullTick after builds/research
//                                     self-complete on wall-clock time).
//   - simulateCommandQueueCatchUp() — away catch-up: a bounded discrete-event
//                                     simulation that can chain MULTIPLE
//                                     completions across a long absence (e.g.
//                                     three overnight research techs), using
//                                     each order's own realDurationSeconds /
//                                     totalMonths timer. Documented
//                                     simplification: this simulation does
//                                     NOT re-apply the live tick's dynamic
//                                     speed-bonus multiplier stack (buildSpeed
//                                     / researchSpeed bonuses that can
//                                     compound up to ~2x in game-engine.ts) —
//                                     those are already baked into
//                                     effectiveRealDurationSeconds at queue
//                                     time via getResearchDisplayState, and
//                                     re-deriving the full live multiplier
//                                     stack here would duplicate ~40 lines of
//                                     game-engine.ts bonus wiring with real
//                                     drift risk. The discrepancy is bounded
//                                     (2x cap) and self-corrects the moment
//                                     the player returns to a live tick.

import type { GameState, CommandQueueOrder, CommandQueueOrderKind, AwayLedgerQueueEntry, ActiveResearch } from './types';
import { RESEARCH_MAP, getResearchDisplayState, getResearchBonuses } from './research-tree';
import { BUILDING_MAP, scaledBuildTime, checkBuildingCap } from './buildings';
import { generateId, formatDuration, advanceDate, scaledBuildingCost, scaledResearchTime } from './formulas';
import { getConstructionSlots, getActiveConstructions } from './construction-slots';
// Balance Pass 4: saturated orbital-slot pools block new builds (slot gate).
import { checkOrbitalSlotGate } from './spatial-strategy';
import {
  COMMAND_QUEUE_BASE_DEPTH,
  COMMAND_QUEUE_AUTOMATION_RESEARCH_ID,
  COMMAND_QUEUE_AUTOMATION_BONUS,
  COMMAND_QUEUE_TIER5_BONUS,
  COMMAND_QUEUE_TIER5_THRESHOLD,
  MAX_EVENT_LOG,
} from './constants';

// ─── Capacity + CRUD (UI-facing) ─────────────────────────────────────────────

/** Total command-queue slots available right now. Everything free/earnable —
 *  see COMMAND_QUEUE_* constants for the exact sources. */
export function getCommandQueueCapacity(state: GameState): number {
  let cap = COMMAND_QUEUE_BASE_DEPTH;
  if (state.completedResearch.includes(COMMAND_QUEUE_AUTOMATION_RESEARCH_ID)) cap += COMMAND_QUEUE_AUTOMATION_BONUS;
  if ((state.corporationTier || 1) >= COMMAND_QUEUE_TIER5_THRESHOLD) cap += COMMAND_QUEUE_TIER5_BONUS;
  return cap;
}

export interface EnqueueResult {
  ok: boolean;
  state: GameState;
  reason?: 'queue_full' | 'unknown_definition';
}

export function enqueueResearchOrder(state: GameState, researchId: string, now: number = Date.now()): EnqueueResult {
  const queue = state.commandQueue || [];
  if (queue.length >= getCommandQueueCapacity(state)) return { ok: false, state, reason: 'queue_full' };
  const def = RESEARCH_MAP.get(researchId);
  if (!def) return { ok: false, state, reason: 'unknown_definition' };
  const order: CommandQueueOrder = {
    id: generateId(), kind: 'research', createdAtMs: now, label: def.name, researchId,
  };
  return { ok: true, state: { ...state, commandQueue: [...queue, order] } };
}

export function enqueueBuildOrder(state: GameState, buildingId: string, locationId: string, now: number = Date.now()): EnqueueResult {
  const queue = state.commandQueue || [];
  if (queue.length >= getCommandQueueCapacity(state)) return { ok: false, state, reason: 'queue_full' };
  const def = BUILDING_MAP.get(buildingId);
  if (!def) return { ok: false, state, reason: 'unknown_definition' };
  const order: CommandQueueOrder = {
    id: generateId(), kind: 'build', createdAtMs: now, label: def.name, buildingId, locationId,
  };
  return { ok: true, state: { ...state, commandQueue: [...queue, order] } };
}

export function dequeueOrder(state: GameState, orderId: string): GameState {
  const queue = state.commandQueue || [];
  if (!queue.some(o => o.id === orderId)) return state;
  return { ...state, commandQueue: queue.filter(o => o.id !== orderId) };
}

/** Move an order one position toward the front ('up') or back ('down') of
 *  the queue. No-op if already at that end. */
export function reorderQueueOrder(state: GameState, orderId: string, direction: 'up' | 'down'): GameState {
  const queue = [...(state.commandQueue || [])];
  const idx = queue.findIndex(o => o.id === orderId);
  if (idx < 0) return state;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= queue.length) return state;
  [queue[idx], queue[swapIdx]] = [queue[swapIdx], queue[idx]];
  return { ...state, commandQueue: queue };
}

// ─── Shared validators (single source of truth for both execution paths) ───

interface AttemptOk { ok: true; state: GameState }
interface AttemptFail { ok: false; reason: string }

/** Mirrors handleStartResearch's validation/cost/queue-selection in
 *  page.tsx exactly (same disp-derived effective cost/duration, same
 *  queue1-preferred-else-queue2 selection) so a queued order is never judged
 *  by different rules than a manually-started one. `startedAtMs` lets the
 *  away-catchup simulation backdate a start to the instant a slot actually
 *  freed up mid-absence; the live path just passes "now". */
export function attemptResearchStart(
  state: GameState,
  order: CommandQueueOrder,
  startedAtMs: number,
): AttemptOk | AttemptFail {
  const def = order.researchId ? RESEARCH_MAP.get(order.researchId) : undefined;
  if (!def) return { ok: false, reason: 'unknown_research' };
  const disp = getResearchDisplayState(def, state);
  if (!disp.visible) return { ok: false, reason: 'not_unlocked' };
  if (disp.completed) return { ok: false, reason: 'already_completed' };
  if (state.money < disp.effectiveMoneyCost) return { ok: false, reason: 'insufficient_funds' };
  if (def.resourceCost) {
    for (const [resId, qty] of Object.entries(def.resourceCost)) {
      if ((state.resources[resId] || 0) < qty) return { ok: false, reason: 'insufficient_resources' };
    }
  }
  const queue1Free = !state.activeResearch;
  const hasQueue2 = state.completedResearch.includes('parallel_research');
  const queue2Free = hasQueue2 && !state.activeResearch2;
  if (!queue1Free && !queue2Free) return { ok: false, reason: 'no_free_slot' };

  const newResources = { ...state.resources };
  if (def.resourceCost) {
    for (const [resId, qty] of Object.entries(def.resourceCost)) newResources[resId] = (newResources[resId] || 0) - qty;
  }
  const entry: ActiveResearch = {
    definitionId: def.id,
    startDate: state.gameDate,
    progressMonths: 0,
    totalMonths: scaledResearchTime(disp.effectiveTotalMonths, def.tier),
    startedAtMs,
    realDurationSeconds: disp.effectiveRealDurationSeconds,
  };
  return {
    ok: true,
    state: {
      ...state,
      money: state.money - disp.effectiveMoneyCost,
      totalSpent: state.totalSpent + disp.effectiveMoneyCost,
      resources: newResources,
      activeResearch: queue1Free ? entry : state.activeResearch,
      activeResearch2: queue1Free ? state.activeResearch2 : entry,
      eventLog: [{
        id: generateId(), date: state.gameDate, type: 'research_complete' as const,
        title: `🌙 Queued research started: ${def.name}${queue1Free ? '' : ' (Q2)'}`,
        description: `Auto-started from your command queue. Ready in ${formatDuration(disp.effectiveRealDurationSeconds)}.`,
      }, ...state.eventLog].slice(0, MAX_EVENT_LOG),
    },
  };
}

/** Mirrors handleBuild's validation/cost logic in page.tsx exactly, plus an
 *  unlockedLocations/requiredResearch guard (handleBuild relies on the UI to
 *  only ever offer valid building/location pairs; a queued order can sit
 *  stale for a while, so this path checks explicitly). */
export function attemptBuildStart(
  state: GameState,
  order: CommandQueueOrder,
  startedAtMs: number,
): AttemptOk | AttemptFail {
  if (!order.buildingId || !order.locationId) return { ok: false, reason: 'invalid_order' };
  const def = BUILDING_MAP.get(order.buildingId);
  if (!def) return { ok: false, reason: 'unknown_building' };
  if (!(state.unlockedLocations || []).includes(order.locationId)) return { ok: false, reason: 'location_locked' };
  if (!def.requiredResearch.every(r => state.completedResearch.includes(r))) return { ok: false, reason: 'missing_research' };
  // Balance Pass 4 (docs/BALANCE.md "Pass 4"): a queued order can sit until
  // after its target pool saturates — the orbital-slot gate applies here
  // exactly as it does in handleBuild (lease or Frontier first-building
  // exemption required at a saturated pool). The order stays queued and
  // retries next tick, like any other transient failure.
  if (!checkOrbitalSlotGate(state, order.locationId, startedAtMs).allowed) return { ok: false, reason: 'slot_pool_saturated' };
  // Early-fab wave: per-corporation cap (e.g. fabrication_earth max 1). A
  // queued duplicate FAILS permanently rather than retrying — the cap will
  // not clear on its own while the first copy stands.
  if (!checkBuildingCap(state.buildings, def).allowed) return { ok: false, reason: 'building_cap_reached' };

  const count = state.buildings.filter(b => b.definitionId === order.buildingId && b.locationId === order.locationId).length;
  const { buildCostReduction } = getResearchBonuses(state.completedResearch, state.repeatableResearchLevels);
  const cost = Math.round(scaledBuildingCost(def.baseCost, count) * (1 - buildCostReduction));
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds' };
  if (def.resourceCost) {
    for (const [resId, qty] of Object.entries(def.resourceCost)) {
      if ((state.resources[resId] || 0) < qty) return { ok: false, reason: 'insufficient_resources' };
    }
  }

  const newResources = { ...state.resources };
  if (def.resourceCost) {
    for (const [resId, qty] of Object.entries(def.resourceCost)) newResources[resId] = (newResources[resId] || 0) - qty;
  }
  const completionDate = advanceDate(state.gameDate, def.buildTimeMonths);
  const realDuration = scaledBuildTime(def.realBuildSeconds, count);

  return {
    ok: true,
    state: {
      ...state,
      money: state.money - cost,
      totalSpent: state.totalSpent + cost,
      resources: newResources,
      buildings: [...state.buildings, {
        instanceId: generateId(),
        definitionId: order.buildingId,
        locationId: order.locationId,
        buildStartDate: state.gameDate,
        completionDate,
        isComplete: false,
        startedAtMs,
        realDurationSeconds: realDuration,
      }],
      eventLog: [{
        id: generateId(), date: state.gameDate, type: 'build_complete' as const,
        title: `🌙 Queued construction started: ${def.name}`,
        description: `Auto-started from your command queue. Ready in ${formatDuration(realDuration)}.`,
      }, ...state.eventLog].slice(0, MAX_EVENT_LOG),
    },
  };
}

const UNSUPPORTED_KINDS: readonly CommandQueueOrderKind[] = ['ship_dispatch', 'craft', 'service_activate'];

// ─── Live-tick pop: start whatever is free RIGHT NOW ────────────────────────

export interface PopResult {
  state: GameState;
  executed: AwayLedgerQueueEntry[];
  skipped: AwayLedgerQueueEntry[];
}

/** Called once per live tick (game-engine.ts, after builds/research
 *  self-complete on wall-clock time). Orders whose channel is busy stay in
 *  place at their queue position — a busy build slot never blocks a research
 *  order elsewhere in the list from starting the moment ITS slot is free. */
export function popCommandQueue(state: GameState, now: number = Date.now()): PopResult {
  const queue = state.commandQueue || [];
  if (queue.length === 0) return { state, executed: [], skipped: [] };

  let working = state;
  const remaining: CommandQueueOrder[] = [];
  const executed: AwayLedgerQueueEntry[] = [];
  const skipped: AwayLedgerQueueEntry[] = [];

  for (const order of queue) {
    if (order.kind === 'research') {
      const queue1Free = !working.activeResearch;
      const hasQueue2 = working.completedResearch.includes('parallel_research');
      const queue2Free = hasQueue2 && !working.activeResearch2;
      if (!queue1Free && !queue2Free) { remaining.push(order); continue; }
      const result = attemptResearchStart(working, order, now);
      if (result.ok) { working = result.state; executed.push({ kind: order.kind, label: order.label, ok: true }); }
      else { skipped.push({ kind: order.kind, label: order.label, ok: false, reason: result.reason }); }
      continue;
    }
    if (order.kind === 'build') {
      if (getActiveConstructions(working) >= getConstructionSlots(working)) { remaining.push(order); continue; }
      const result = attemptBuildStart(working, order, now);
      if (result.ok) { working = result.state; executed.push({ kind: order.kind, label: order.label, ok: true }); }
      else { skipped.push({ kind: order.kind, label: order.label, ok: false, reason: result.reason }); }
      continue;
    }
    // Unsupported kinds — never silently vanish.
    skipped.push({ kind: order.kind, label: order.label, ok: false, reason: 'not_yet_automatable' });
  }

  return { state: { ...working, commandQueue: remaining }, executed, skipped };
}

// ─── Away catch-up: chain multiple completions across a long absence ───────

/** Complete whichever order is currently occupying research channel q1/q2,
 *  applying the SAME completion effects game-engine.ts's completeResearchDef
 *  applies on a live tick (push to completedResearch, or bump a repeatable's
 *  level; record the doctrine choice on first completion). Kept intentionally
 *  tiny and mirrors game-engine.ts:425-436 — if that block's shape changes,
 *  update this one too. */
export function completeActiveResearchChannel(state: GameState, channel: 'q1' | 'q2'): GameState {
  const active = channel === 'q1' ? state.activeResearch : state.activeResearch2;
  if (!active) return state;
  const def = RESEARCH_MAP.get(active.definitionId);
  let completedResearch = state.completedResearch;
  let repeatableResearchLevels = state.repeatableResearchLevels;
  let doctrineChoices = state.doctrineChoices;
  if (def?.repeatable) {
    const next = Math.min((repeatableResearchLevels?.[def.id] || 0) + 1, def.repeatable.maxLevel);
    repeatableResearchLevels = { ...(repeatableResearchLevels || {}), [def.id]: next };
  } else if (def) {
    completedResearch = [...completedResearch, def.id];
    if (def.doctrineGroup && !(doctrineChoices || {})[def.doctrineGroup]) {
      doctrineChoices = { ...(doctrineChoices || {}), [def.doctrineGroup]: def.id };
    }
  }
  return {
    ...state,
    completedResearch,
    repeatableResearchLevels,
    doctrineChoices,
    stats: { ...state.stats, researchCompleted: state.stats.researchCompleted + 1 },
    activeResearch: channel === 'q1' ? null : state.activeResearch,
    activeResearch2: channel === 'q2' ? null : state.activeResearch2,
  };
}

/** Away-catchup discrete-event queue chaining. Unlike popCommandQueue (one
 *  instant), this walks forward through the away window so a night's worth
 *  of research/build durations can each complete and free their channel for
 *  the next queued order — the "chain two builds ... it worked while I
 *  slept" outcome. Bounded by a safety-valve iteration cap (queue length is
 *  finite; this can never loop unboundedly). */
export function simulateCommandQueueCatchUp(state: GameState, nowMs: number): PopResult {
  let working = state;
  const executed: AwayLedgerQueueEntry[] = [];
  const skipped: AwayLedgerQueueEntry[] = [];
  const queue = [...(working.commandQueue || [])];
  if (queue.length === 0) return { state: working, executed, skipped };

  let r1FreeAt = working.activeResearch
    ? working.activeResearch.startedAtMs + working.activeResearch.realDurationSeconds * 1000
    : -Infinity;
  let r2FreeAt = working.activeResearch2
    ? working.activeResearch2.startedAtMs + working.activeResearch2.realDurationSeconds * 1000
    : -Infinity;

  const capacity = Math.max(1, getConstructionSlots(working));
  const buildFreeAts = working.buildings
    .filter(b => !b.isComplete)
    .map(b => (b.startedAtMs || 0) + (b.realDurationSeconds || 0) * 1000)
    .sort((a, b) => a - b);
  while (buildFreeAts.length < capacity) buildFreeAts.unshift(-Infinity);

  const maxIterations = queue.length * 3 + 16; // safety valve — no unbounded loop
  let iterations = 0;
  let mutated = true;

  while (mutated && queue.length > 0 && iterations < maxIterations) {
    mutated = false;
    iterations++;

    for (let i = 0; i < queue.length; i++) {
      const order = queue[i];

      if (order.kind === 'research') {
        const hasQueue2 = working.completedResearch.includes('parallel_research');
        const channel: 'q1' | 'q2' = (!hasQueue2 || r1FreeAt <= r2FreeAt) ? 'q1' : 'q2';
        const freeAt = channel === 'q1' ? r1FreeAt : r2FreeAt;
        if (freeAt > nowMs) continue; // this channel won't free before "now" — leave queued

        if (freeAt > -Infinity) {
          working = completeActiveResearchChannel(working, channel);
          if (channel === 'q1') r1FreeAt = -Infinity; else r2FreeAt = -Infinity;
        }
        const startAt = Math.max(freeAt, order.createdAtMs);
        const result = attemptResearchStart(working, order, startAt);
        queue.splice(i, 1);
        if (result.ok) {
          working = result.state;
          const started = channel === 'q1' ? working.activeResearch : working.activeResearch2;
          const newFreeAt = started ? started.startedAtMs + started.realDurationSeconds * 1000 : nowMs;
          if (channel === 'q1') r1FreeAt = newFreeAt; else r2FreeAt = newFreeAt;
          executed.push({ kind: order.kind, label: order.label, ok: true });
        } else {
          skipped.push({ kind: order.kind, label: order.label, ok: false, reason: result.reason });
        }
        mutated = true;
        break;
      }

      if (order.kind === 'build') {
        let minIdx = 0;
        for (let k = 1; k < buildFreeAts.length; k++) if (buildFreeAts[k] < buildFreeAts[minIdx]) minIdx = k;
        if (buildFreeAts[minIdx] > nowMs) continue;

        const startAt = Math.max(buildFreeAts[minIdx], order.createdAtMs);
        const result = attemptBuildStart(working, order, startAt);
        queue.splice(i, 1);
        if (result.ok) {
          working = result.state;
          const newBld = working.buildings[working.buildings.length - 1];
          buildFreeAts[minIdx] = (newBld.startedAtMs || 0) + (newBld.realDurationSeconds || 0) * 1000;
          executed.push({ kind: order.kind, label: order.label, ok: true });
        } else {
          skipped.push({ kind: order.kind, label: order.label, ok: false, reason: result.reason });
        }
        mutated = true;
        break;
      }

      // Unsupported kinds this wave — never silently vanish.
      queue.splice(i, 1);
      skipped.push({ kind: order.kind, label: order.label, ok: false, reason: 'not_yet_automatable' });
      mutated = true;
      break;
    }
  }

  return { state: { ...working, commandQueue: queue }, executed, skipped };
}

export function isUnsupportedQueueKind(kind: CommandQueueOrderKind): boolean {
  return UNSUPPORTED_KINDS.includes(kind);
}
