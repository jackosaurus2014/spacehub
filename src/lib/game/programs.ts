// ─── Space Tycoon: Programs Queue (Live-Service Wave LS6) ───────────────────
// docs/LIVE_SERVICE_2026-08.md §LS6: "long-running human-capital programs
// tick on the wall clock regardless of login... Queue up to 3 programs ahead
// per track. The EVE trick lands: progression continues while away, and
// re-pointing the queue is a recurring reason to return."
//
// Three independent SINGLE-CHANNEL tracks (unlike command-queue.ts, which
// shares a multi-slot pool across orders — 2 research channels, N build
// slots — a program TRACK is exactly one channel: only queues[track][0] can
// ever be "active"; everything behind it waits). That simpler scheduling
// problem means one function (advancePrograms) can serve both the live-tick
// pop AND the away-catchup chain — command-queue.ts needed two because of
// its multi-slot pool; a single FIFO-per-track model doesn't.
//
// Three tracks:
//   - crew_cohort: reserves a slice of one WorkerType's headcount for the
//     program's duration (the "trained crew are off-shift" opportunity cost
//     — see getReservedCrewCounts/getEffectiveWorkforceForBonuses, consumed
//     at the SAME wfBonuses call sites game-engine.ts/away-operations.ts/
//     economy-report.ts already have). On completion, contributes a small,
//     capped, additive bonus into the EXISTING WorkforceBonuses shape
//     (mergeProgramWorkforceBonuses) — per spec §LS6 "live inside existing
//     caps," this deliberately does NOT introduce a new multiplier chain
//     threaded through game-engine.ts's ~10 revenue/research/mining sites.
//   - leader_development: posts ANY hired commander to a 30-day program.
//     Clears their current assignment (the opportunity cost) and, on
//     completion, grants XP plus a CHANCE (deterministic, seeded off the
//     program instance id — never Math.random) at a second specialty trait
//     slot (HiredCommander.secondTraitSlot, commanders.ts).
//   - rd_residency: same posting mechanic, restricted to scientist/engineer
//     leaders, themed on a chosen research category (display/flavor —
//     compounding is realized as "XP scales with weeks committed," not as a
//     literal per-category live-updating multiplier; see file-header
//     deviation note below). Guarantees the second trait slot on completion
//     (the longer, costlier commitment). Reusing the EXISTING commander
//     trait/cap machinery for both leader tracks means zero new engine call
//     sites are needed for leader-scoped bonuses — they ride
//     computeCommanderBonuses' existing TRAIT_BONUS_CAP clamp for free.
//
// Deviation from the literal spec text, documented per this codebase's
// convention (see away-operations.ts's own header for the style): "R&D
// residencies... compounding weekly bonuses" is implemented as an XP payout
// that scales with committed weeks (min(8, weeks)), not as a live-ticking
// per-category multiplier — building true category-scoped research speed
// would require new plumbing in research-tree.ts's getResearchDisplayState
// well beyond an M-effort wave, and the XP-scaling model still rewards
// longer commitments (the core economic trade-off the spec asks for)
// without it.

import type {
  GameState, ProgramTrack, ProgramInstance, ProgramsState,
} from './types';
import type { WorkerType, WorkforceState } from './workforce';
import { DEFAULT_WORKFORCE, getWorkforceBonuses } from './workforce';
import type { CommanderClass, CommanderRarity } from './commanders';
import { COMMANDER_MAP, getLevelFromXp } from './commanders';
import { generateId, hashStringToSeed, mulberry32 } from './formulas';
import { RESEARCH_CATEGORIES } from './research-tree';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Free per-track queue depth (active slot + queued-ahead). CLAUDE.md's
 *  monetization hold means everything ships free/earnable this wave — no
 *  purchased expansion exists, but the function shape (not a bare constant)
 *  leaves room for a future earnable bonus (research/tier), matching the
 *  getCommandQueueCapacity(state) precedent in command-queue.ts. */
export function getProgramTrackCapacity(_state: GameState, _track: ProgramTrack): number {
  return 3;
}

export const PROGRAM_TRACKS: ProgramTrack[] = ['crew_cohort', 'leader_development', 'rd_residency'];

// ─── Bonus fields a crew_cohort completion can add to (a strict subset of
// workforce.ts's WorkforceBonuses shape — the fields that already exist and
// are already consumed). ────────────────────────────────────────────────────

export type ProgramWorkforceBonusField =
  | 'buildSpeed' | 'researchSpeed' | 'miningOutput' | 'serviceRevenue'
  | 'contractPayBonus' | 'hazardMitigation' | 'crewSurvival' | 'shipEfficiency';

/** Per-field cap on the AGGREGATE program-sourced contribution — mirrors
 *  commanders.ts's TRAIT_BONUS_CAP pattern (a separate, smaller pool than
 *  workforce.ts's own per-field caps, which mergeProgramWorkforceBonuses
 *  re-applies on top so the combined total can never exceed workforce.ts's
 *  own ceiling either). */
export const PROGRAM_BONUS_FIELD_CAP = 0.15;

export interface ProgramDef {
  id: string;
  track: ProgramTrack;
  name: string;
  description: string;
  icon: string;
  durationDays: number;
  // crew_cohort
  workerType?: WorkerType;
  /** Minimum headcount of workerType required to enroll AND the count
   *  reserved (off-shift, reduced-output) for the program's duration. */
  crewRequired?: number;
  upfrontCost?: number;
  completionBonus?: Partial<Record<ProgramWorkforceBonusField, number>>;
  // leader_development / rd_residency
  requiresClass?: CommanderClass[];
  requiresCategory?: boolean;
  costByRarity?: Record<CommanderRarity, number>;
}

// ─── Program Definitions ─────────────────────────────────────────────────────
// 8 crew cohorts (one per workforce.ts WORKER_TYPES entry — full coverage of
// the existing 8 worker types) + one leader_development posting + one
// rd_residency posting (both parameterized by target commander at enqueue
// time, per the file header).

export const PROGRAM_DEFS: ProgramDef[] = [
  {
    id: 'eva_certification_cohort', track: 'crew_cohort', icon: '🛰️',
    name: 'EVA Certification Cohort',
    description: 'Extravehicular-activity certification for your mining crews — safer, faster belt operations.',
    durationDays: 21, workerType: 'miner', crewRequired: 3, upfrontCost: 8_000_000,
    completionBonus: { miningOutput: 0.04 },
  },
  {
    id: 'avionics_upskill_cohort', track: 'crew_cohort', icon: '🔧',
    name: 'Avionics Upskilling Cohort',
    description: 'Advanced fabrication and systems-integration training for engineering crews.',
    durationDays: 18, workerType: 'engineer', crewRequired: 3, upfrontCost: 7_000_000,
    completionBonus: { buildSpeed: 0.04 },
  },
  {
    id: 'mission_control_cohort', track: 'crew_cohort', icon: '🔬',
    name: 'Mission Control Methods Cohort',
    description: 'Structured research-operations training — fewer false starts, faster publication.',
    durationDays: 24, workerType: 'scientist', crewRequired: 2, upfrontCost: 9_000_000,
    completionBonus: { researchSpeed: 0.05 },
  },
  {
    id: 'trade_desk_certification', track: 'crew_cohort', icon: '📡',
    name: 'Trade Desk Certification',
    description: 'Service-operations certification for satellite and station operators.',
    durationDays: 16, workerType: 'operator', crewRequired: 3, upfrontCost: 6_000_000,
    completionBonus: { serviceRevenue: 0.04 },
  },
  {
    id: 'flight_ops_cohort', track: 'crew_cohort', icon: '🧑‍✈️',
    name: 'Flight Operations Cohort',
    description: 'Advanced piloting and cargo-throughput training for ship crews.',
    durationDays: 20, workerType: 'pilot', crewRequired: 2, upfrontCost: 7_000_000,
    completionBonus: { shipEfficiency: 0.05 },
  },
  {
    id: 'negotiation_masterclass', track: 'crew_cohort', icon: '🤝',
    name: 'Negotiation Masterclass',
    description: 'Contract-desk training — better terms on every deal.',
    durationDays: 20, workerType: 'negotiator', crewRequired: 2, upfrontCost: 7_000_000,
    completionBonus: { contractPayBonus: 0.05 },
  },
  {
    id: 'tactical_response_cohort', track: 'crew_cohort', icon: '🛡️',
    name: 'Tactical Response Cohort',
    description: 'Incident-response drills for security personnel — less damage when hazards strike.',
    durationDays: 18, workerType: 'security', crewRequired: 2, upfrontCost: 6_000_000,
    completionBonus: { hazardMitigation: 0.05 },
  },
  {
    id: 'field_medicine_cohort', track: 'crew_cohort', icon: '🩺',
    name: 'Field Medicine Cohort',
    description: 'Trauma and long-duration-exposure training for medical staff.',
    durationDays: 18, workerType: 'medic', crewRequired: 2, upfrontCost: 6_000_000,
    completionBonus: { crewSurvival: 0.05 },
  },
  {
    id: 'leadership_development_program', track: 'leader_development', icon: '🎖️',
    name: 'Leadership Development Program',
    description: 'A 30-day posting for any hired commander — real XP, and a chance at a second specialty trait.',
    durationDays: 30,
    costByRarity: { common: 3_000_000, uncommon: 10_000_000, rare: 40_000_000, epic: 200_000_000, legendary: 1_000_000_000 },
  },
  {
    id: 'rd_residency_program', track: 'rd_residency', icon: '🧪',
    name: 'R&D Residency',
    description: 'An 8-week residency for a scientist or engineer, themed on a research category — guaranteed second specialty trait on completion, XP scaling with the weeks committed.',
    durationDays: 56,
    requiresClass: ['scientist', 'engineer'], requiresCategory: true,
    costByRarity: { common: 5_000_000, uncommon: 15_000_000, rare: 60_000_000, epic: 300_000_000, legendary: 1_500_000_000 },
  },
];

export const PROGRAM_DEF_MAP = new Map(PROGRAM_DEFS.map(d => [d.id, d]));

const LEADER_DEV_XP_BONUS = 6;
const LEADER_DEV_TRAIT_CHANCE = 0.4;

// ─── State helpers ────────────────────────────────────────────────────────

function emptyProgramsState(): ProgramsState {
  return { queues: { crew_cohort: [], leader_development: [], rd_residency: [] }, completedCohortDefIds: [] };
}

export function getProgramsState(state: GameState): ProgramsState {
  return state.programs || emptyProgramsState();
}

export function getProgramQueue(state: GameState, track: ProgramTrack): ProgramInstance[] {
  return getProgramsState(state).queues[track] || [];
}

/** Every commander id currently posted (active or queued, either leader
 *  track) — used to stop the same commander being double-booked. */
export function getReservedLeaderIds(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const track of ['leader_development', 'rd_residency'] as ProgramTrack[]) {
    for (const inst of getProgramQueue(state, track)) {
      if (inst.targetCommanderId) ids.add(inst.targetCommanderId);
    }
  }
  return ids;
}

function withQueue(state: GameState, track: ProgramTrack, queue: ProgramInstance[]): GameState {
  const ps = getProgramsState(state);
  return { ...state, programs: { ...ps, queues: { ...ps.queues, [track]: queue } } };
}

// ─── Enqueue / dequeue / reorder (UI-facing CRUD) ───────────────────────────

export interface EnqueueProgramResult {
  ok: boolean;
  state: GameState;
  reason?: 'queue_full' | 'unknown_definition' | 'wrong_track' | 'commander_not_hired' | 'wrong_class' | 'missing_category' | 'commander_busy' | 'insufficient_crew_type';
}

export function enqueueProgram(
  state: GameState,
  track: ProgramTrack,
  defId: string,
  opts: { targetCommanderId?: string; targetCategory?: string } = {},
  now: number = Date.now(),
): EnqueueProgramResult {
  const def = PROGRAM_DEF_MAP.get(defId);
  if (!def) return { ok: false, state, reason: 'unknown_definition' };
  if (def.track !== track) return { ok: false, state, reason: 'wrong_track' };

  const queue = getProgramQueue(state, track);
  if (queue.length >= getProgramTrackCapacity(state, track)) return { ok: false, state, reason: 'queue_full' };

  if (track === 'crew_cohort') {
    if (!def.workerType) return { ok: false, state, reason: 'unknown_definition' };
  } else {
    const commanderId = opts.targetCommanderId;
    if (!commanderId) return { ok: false, state, reason: 'commander_not_hired' };
    const hired = (state.hiredCommanders || []).find(h => h.definitionId === commanderId);
    if (!hired) return { ok: false, state, reason: 'commander_not_hired' };
    const cdef = COMMANDER_MAP.get(commanderId);
    if (!cdef) return { ok: false, state, reason: 'commander_not_hired' };
    if (def.requiresClass && !def.requiresClass.includes(cdef.class)) return { ok: false, state, reason: 'wrong_class' };
    if (def.requiresCategory && !opts.targetCategory) return { ok: false, state, reason: 'missing_category' };
    if (getReservedLeaderIds(state).has(commanderId)) return { ok: false, state, reason: 'commander_busy' };
  }

  const instance: ProgramInstance = {
    id: generateId(),
    track,
    defId,
    label: def.name,
    createdAtMs: now,
    startedAtMs: null,
    durationMs: def.durationDays * DAY_MS,
    targetCommanderId: track === 'crew_cohort' ? undefined : opts.targetCommanderId,
    targetCategory: track === 'rd_residency' ? opts.targetCategory : undefined,
  };

  return { ok: true, state: withQueue(state, track, [...queue, instance]) };
}

export function dequeueProgram(state: GameState, track: ProgramTrack, instanceId: string): GameState {
  const queue = getProgramQueue(state, track);
  if (!queue.some(i => i.id === instanceId)) return state;
  return withQueue(state, track, queue.filter(i => i.id !== instanceId));
}

/** Reorder within the QUEUED portion only (index 1+) — the active head
 *  (index 0, already started) can't be displaced mid-run. */
export function reorderProgram(state: GameState, track: ProgramTrack, instanceId: string, direction: 'up' | 'down'): GameState {
  const queue = [...getProgramQueue(state, track)];
  const idx = queue.findIndex(i => i.id === instanceId);
  if (idx <= 0) return state; // not found, or is the active head
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx <= 0 || swapIdx >= queue.length) return state;
  [queue[idx], queue[swapIdx]] = [queue[swapIdx], queue[idx]];
  return withQueue(state, track, queue);
}

// ─── Shared validators ───────────────────────────────────────────────────────

interface AttemptOk { ok: true; state: GameState }
interface AttemptFail { ok: false; reason: string; permanent: boolean }

/** `permanent: true` failures can never resolve themselves (the target
 *  commander left the roster, wrong class, etc.) — advancePrograms discards
 *  these rather than deadlocking the track forever. `permanent: false`
 *  (insufficient funds/crew) leaves the instance queued to retry next tick,
 *  matching command-queue.ts's "leave queued for a busy channel" semantics. */
function attemptProgramStart(state: GameState, track: ProgramTrack, instance: ProgramInstance, startedAtMs: number): AttemptOk | AttemptFail {
  const def = PROGRAM_DEF_MAP.get(instance.defId);
  if (!def) return { ok: false, reason: 'unknown_definition', permanent: true };

  if (track === 'crew_cohort') {
    if (!def.workerType) return { ok: false, reason: 'unknown_definition', permanent: true };
    const wf = state.workforce || DEFAULT_WORKFORCE;
    const have = (wf[`${def.workerType}s` as keyof WorkforceState] as number | undefined) || 0;
    if (have < (def.crewRequired || 0)) return { ok: false, reason: 'insufficient_crew', permanent: false };
    const cost = def.upfrontCost || 0;
    if (state.money < cost) return { ok: false, reason: 'insufficient_funds', permanent: false };

    const queue = getProgramQueue(state, track);
    const updatedQueue = [{ ...instance, startedAtMs }, ...queue.slice(1)];
    return {
      ok: true,
      state: {
        ...withQueue(state, track, updatedQueue),
        money: state.money - cost,
        totalSpent: state.totalSpent + cost,
        eventLog: [{
          id: generateId(), date: state.gameDate, type: 'build_complete' as const,
          title: `🎓 Program started: ${def.name}`,
          description: `${def.crewRequired} ${def.workerType}(s) reserved for ${def.durationDays} days.`,
        }, ...state.eventLog].slice(0, 50),
      },
    };
  }

  // leader_development / rd_residency
  const commanderId = instance.targetCommanderId;
  if (!commanderId) return { ok: false, reason: 'invalid_order', permanent: true };
  const hired = state.hiredCommanders || [];
  const hIdx = hired.findIndex(h => h.definitionId === commanderId);
  if (hIdx === -1) return { ok: false, reason: 'commander_not_hired', permanent: true };
  const cdef = COMMANDER_MAP.get(commanderId);
  if (!cdef) return { ok: false, reason: 'unknown_commander', permanent: true };
  if (def.requiresClass && !def.requiresClass.includes(cdef.class)) return { ok: false, reason: 'wrong_class', permanent: true };
  if (def.requiresCategory && !instance.targetCategory) return { ok: false, reason: 'missing_category', permanent: true };

  const cost = (def.costByRarity && def.costByRarity[cdef.rarity]) || 0;
  if (state.money < cost) return { ok: false, reason: 'insufficient_funds', permanent: false };

  const updatedHired = [...hired];
  // Opportunity cost (spec): posting a leader clears their current
  // assignment (and its retirement clock — see commanders.ts's
  // assignedSinceMs doc) for the program's duration.
  updatedHired[hIdx] = { ...updatedHired[hIdx], assignment: null, assignedSinceMs: undefined };

  const queue = getProgramQueue(state, track);
  const updatedQueue = [{ ...instance, startedAtMs }, ...queue.slice(1)];

  return {
    ok: true,
    state: {
      ...withQueue(state, track, updatedQueue),
      hiredCommanders: updatedHired,
      money: state.money - cost,
      totalSpent: state.totalSpent + cost,
      eventLog: [{
        id: generateId(), date: state.gameDate, type: 'build_complete' as const,
        title: `🎓 Program started: ${cdef.name} — ${def.name}`,
        description: `Posted for ${def.durationDays} days. Their current assignment is cleared for the duration.`,
      }, ...state.eventLog].slice(0, 50),
    },
  };
}

/** Applies the effects of the ALREADY-DUE head instance of a track and pops
 *  it off the queue. Assumes the caller has already checked it's due. */
function completeProgramHead(state: GameState, track: ProgramTrack): GameState {
  const queue = getProgramQueue(state, track);
  if (queue.length === 0) return state;
  const inst = queue[0];
  let working = withQueue(state, track, queue.slice(1));

  if (track === 'crew_cohort') {
    const ps = getProgramsState(working);
    working = {
      ...working,
      programs: { ...ps, completedCohortDefIds: [...ps.completedCohortDefIds, inst.defId] },
      eventLog: [{
        id: generateId(), date: working.gameDate, type: 'milestone' as const,
        title: `🎓 ${inst.label} complete`,
        description: 'Cohort certified — the bonus is now live (see Workforce Bonuses).',
      }, ...working.eventLog].slice(0, 50),
    };
    return working;
  }

  // leader_development / rd_residency
  const hired = working.hiredCommanders || [];
  const hIdx = hired.findIndex(h => h.definitionId === inst.targetCommanderId);
  if (hIdx === -1) {
    return {
      ...working,
      eventLog: [{
        id: generateId(), date: working.gameDate, type: 'milestone' as const,
        title: `${inst.label} concluded`,
        description: 'The posted leader is no longer with the corporation — no effect applied.',
      }, ...working.eventLog].slice(0, 50),
    };
  }
  const h = hired[hIdx];
  const commanderDef = COMMANDER_MAP.get(inst.targetCommanderId!);

  let xpGain: number;
  let grantedSlot: boolean;
  if (track === 'leader_development') {
    xpGain = LEADER_DEV_XP_BONUS;
    // Deterministic, seeded off the instance id fixed at enqueue time —
    // identical outcome whether this resolves on a live tick or three weeks
    // into an away catch-up. Never Math.random.
    const roll = mulberry32(hashStringToSeed(inst.id))();
    grantedSlot = !h.secondTraitSlot && roll < LEADER_DEV_TRAIT_CHANCE;
  } else {
    const weeks = Math.max(1, Math.round(inst.durationMs / (7 * DAY_MS)));
    xpGain = Math.min(8, weeks);
    grantedSlot = true;
  }
  const newXp = (h.xp || 0) + xpGain;
  const updatedHired = [...hired];
  updatedHired[hIdx] = { ...h, xp: newXp, level: getLevelFromXp(newXp), secondTraitSlot: h.secondTraitSlot || grantedSlot };

  const trackLabel = track === 'leader_development' ? 'Leadership Development Program' : 'R&D Residency';
  const categoryLabel = inst.targetCategory ? RESEARCH_CATEGORIES.find(c => c.id === inst.targetCategory)?.name : undefined;
  const traitMsg = grantedSlot && !h.secondTraitSlot ? ' A second specialty trait has unlocked.' : '';

  return {
    ...working,
    hiredCommanders: updatedHired,
    eventLog: [{
      id: generateId(), date: working.gameDate, type: 'milestone' as const,
      title: `🎓 ${commanderDef?.name || 'Leader'}: ${trackLabel} complete`,
      description: `+${xpGain} XP${categoryLabel ? ` (${categoryLabel} residency)` : ''}.${traitMsg} Re-assign them to put it to work.`,
    }, ...working.eventLog].slice(0, 50),
  };
}

// ─── Unified advance (live tick + away catch-up) ────────────────────────────

export interface AdvanceProgramsResult {
  state: GameState;
  completedCount: number;
  startedCount: number;
  skippedCount: number;
}

/** Advance every track: complete whatever's due (chaining through multiple
 *  completions if `now` is far enough past — the away-catchup case) and
 *  start the next queued item the instant its track frees. Deterministic:
 *  same state + `now` always produces the same result — safe to call from
 *  both game-engine.ts's live tick and away-operations.ts's catch-up pass.
 *  Returns counts (not just an eventLog length delta — eventLog is capped at
 *  MAX_EVENT_LOG and would silently undercount once full) for callers like
 *  away-operations.ts that need an accurate away-ledger summary. */
export function advanceProgramsDetailed(state: GameState, now: number = Date.now()): AdvanceProgramsResult {
  let working = state;
  let completedCount = 0;
  let startedCount = 0;
  let skippedCount = 0;

  for (const track of PROGRAM_TRACKS) {
    let freeAt = -Infinity;
    const activeHead = getProgramQueue(working, track)[0];
    if (activeHead && activeHead.startedAtMs !== null) {
      freeAt = activeHead.startedAtMs + activeHead.durationMs;
    }

    let iterations = 0;
    while (iterations++ < getProgramTrackCapacity(working, track) * 2 + 4) {
      const queue = getProgramQueue(working, track);
      if (queue.length === 0) break;
      const head = queue[0];

      if (head.startedAtMs !== null) {
        if (freeAt > now) break; // still running
        // NOTE: freeAt is intentionally NOT reset here — it still holds the
        // exact moment this channel freed, which is precisely the backdated
        // start time the next queued instance should get (mirrors
        // command-queue.ts's simulateCommandQueueCatchUp, which captures
        // `freeAt` into `startAt` BEFORE resetting the channel's tracked
        // free-time for the same reason).
        working = completeProgramHead(working, track);
        completedCount++;
        continue;
      }

      // Queued, not yet started — try to start it the instant its channel
      // frees (backdated to when that actually happened, matching
      // command-queue.ts's startAt = max(freeAt, order.createdAtMs)).
      const startAt = Math.max(freeAt === -Infinity ? head.createdAtMs : freeAt, head.createdAtMs);
      if (startAt > now) break;
      const result = attemptProgramStart(working, track, head, startAt);
      if (!result.ok) {
        if (!result.permanent) break; // transient — leave queued, retry later
        // Permanent failure — discard so the track never deadlocks forever.
        working = {
          ...withQueue(working, track, queue.slice(1)),
          eventLog: [{
            id: generateId(), date: working.gameDate, type: 'milestone' as const,
            title: `Program skipped: ${head.label}`,
            description: `Could not start (${result.reason.replace(/_/g, ' ')}) — removed from the queue.`,
          }, ...working.eventLog].slice(0, 50),
        };
        skippedCount++;
        continue;
      }
      working = result.state;
      startedCount++;
      const newHead = getProgramQueue(working, track)[0];
      freeAt = newHead && newHead.startedAtMs !== null ? newHead.startedAtMs + newHead.durationMs : now;
    }
  }

  return { state: working, completedCount, startedCount, skippedCount };
}

/** Thin wrapper for call sites (game-engine.ts's live tick) that only need
 *  the resulting state, not the counts. */
export function advancePrograms(state: GameState, now: number = Date.now()): GameState {
  return advanceProgramsDetailed(state, now).state;
}

// ─── Crew reservation + workforce-bonus merge (opportunity cost) ───────────

/** WorkerType counts currently reserved by an ACTIVE crew_cohort program
 *  (queued-but-not-started programs reserve nothing yet). */
export function getReservedCrewCounts(state: GameState): Partial<Record<WorkerType, number>> {
  const head = getProgramQueue(state, 'crew_cohort')[0];
  if (!head || head.startedAtMs === null) return {};
  const def = PROGRAM_DEF_MAP.get(head.defId);
  if (!def || !def.workerType || !def.crewRequired) return {};
  return { [def.workerType]: def.crewRequired };
}

/** Workforce with any actively-enrolled cohort's headcount subtracted before
 *  bonus calculation — the "trained crew are off-shift at reduced output"
 *  opportunity cost. Consumed at the SAME single call site each of
 *  game-engine.ts / away-operations.ts / economy-report.ts already has for
 *  getWorkforceBonuses(workforce) — three small edits instead of a new
 *  multiplier threaded through every consumption site. */
export function getEffectiveWorkforceForBonuses(state: GameState): WorkforceState {
  const wf = state.workforce || DEFAULT_WORKFORCE;
  const reserved = getReservedCrewCounts(state);
  const keys = Object.keys(reserved) as WorkerType[];
  if (keys.length === 0) return wf;
  const out = { ...wf };
  for (const type of keys) {
    const key = `${type}s` as keyof WorkforceState;
    const have = (out[key] as number | undefined) || 0;
    (out as Record<string, number>)[key] = Math.max(0, have - (reserved[type] || 0));
  }
  return out;
}

export interface ProgramWorkforceBonuses {
  buildSpeed: number;
  researchSpeed: number;
  miningOutput: number;
  serviceRevenue: number;
  contractPayBonus: number;
  hazardMitigation: number;
  crewSurvival: number;
  shipEfficiency: number;
}

const ZERO_PROGRAM_BONUSES: ProgramWorkforceBonuses = {
  buildSpeed: 0, researchSpeed: 0, miningOutput: 0, serviceRevenue: 0,
  contractPayBonus: 0, hazardMitigation: 0, crewSurvival: 0, shipEfficiency: 0,
};

/** Raw (pre-workforce-cap) aggregate bonus from every completed crew_cohort
 *  program, each field independently capped at PROGRAM_BONUS_FIELD_CAP —
 *  repeat completions of the same cohort stack, but converge, never break
 *  the cap (the 4X W8/W10 "fills toward caps, never past" rule). */
export function getProgramWorkforceBonuses(state: GameState): ProgramWorkforceBonuses {
  const completed = getProgramsState(state).completedCohortDefIds;
  if (completed.length === 0) return ZERO_PROGRAM_BONUSES;
  const totals: ProgramWorkforceBonuses = { ...ZERO_PROGRAM_BONUSES };
  for (const defId of completed) {
    const def = PROGRAM_DEF_MAP.get(defId);
    if (!def || def.track !== 'crew_cohort' || !def.completionBonus) continue;
    for (const [field, val] of Object.entries(def.completionBonus)) {
      totals[field as ProgramWorkforceBonusField] += val as number;
    }
  }
  for (const key of Object.keys(totals) as ProgramWorkforceBonusField[]) {
    totals[key] = Math.min(PROGRAM_BONUS_FIELD_CAP, totals[key]);
  }
  return totals;
}

/** Merge program completion bonuses into an already-computed
 *  getWorkforceBonuses() result, re-applying workforce.ts's OWN per-field
 *  caps afterward (duplicated here intentionally — see workforce.ts's
 *  getWorkforceBonuses for the source of truth on these numbers) so the
 *  combined total can never exceed what a maxed-out crew already could. */
export function mergeProgramWorkforceBonuses(
  wfBonuses: ReturnType<typeof getWorkforceBonuses>,
  state: GameState,
): ReturnType<typeof getWorkforceBonuses> {
  const p = getProgramWorkforceBonuses(state);
  return {
    ...wfBonuses,
    buildSpeed: Math.min(0.5, wfBonuses.buildSpeed + p.buildSpeed),
    researchSpeed: Math.min(0.5, wfBonuses.researchSpeed + p.researchSpeed),
    miningOutput: Math.min(1.0, wfBonuses.miningOutput + p.miningOutput),
    serviceRevenue: Math.min(0.5, wfBonuses.serviceRevenue + p.serviceRevenue),
    contractPayBonus: Math.min(0.5, wfBonuses.contractPayBonus + p.contractPayBonus),
    hazardMitigation: Math.min(0.8, wfBonuses.hazardMitigation + p.hazardMitigation),
    crewSurvival: Math.min(0.9, wfBonuses.crewSurvival + p.crewSurvival),
    shipEfficiency: Math.min(0.5, wfBonuses.shipEfficiency + p.shipEfficiency),
  };
}

/** Convenience one-shot: effective workforce bonuses INCLUDING program
 *  completion bonuses AND the active-cohort crew reservation, in one call —
 *  what most call sites actually want. */
export function getEffectiveWorkforceBonuses(state: GameState): ReturnType<typeof getWorkforceBonuses> {
  return mergeProgramWorkforceBonuses(getWorkforceBonuses(getEffectiveWorkforceForBonuses(state)), state);
}
