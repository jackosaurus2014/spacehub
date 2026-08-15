/**
 * @jest-environment node
 *
 * Live-Service Wave LS6 "Programs Queue" — crew/leader training.
 * Covers: track capacity, enqueue/dequeue/reorder CRUD, attemptProgramStart
 * validation (crew cohorts + leader postings), completion effects (workforce
 * bonus, XP, second-trait-slot grant), advancePrograms determinism (same
 * state + elapsed time -> identical result) and chaining across a long
 * absence (the away-catchup case), and the crew-reservation opportunity cost.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  PROGRAM_DEFS, PROGRAM_DEF_MAP, getProgramTrackCapacity, getProgramQueue,
  enqueueProgram, dequeueProgram, reorderProgram,
  advancePrograms, advanceProgramsDetailed,
  getReservedCrewCounts, getEffectiveWorkforceForBonuses,
  getProgramWorkforceBonuses, mergeProgramWorkforceBonuses, PROGRAM_BONUS_FIELD_CAP,
  getReservedLeaderIds,
} from '../programs';
import { hireCommander, getRetirementEtaMs } from '../commanders';
import { getWorkforceBonuses } from '../workforce';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...getNewGameState(),
    money: 10_000_000_000, // $10B — plenty for programs
    lastTickAt: NOW,
    createdAt: NOW,
    unlockedLocations: ['earth_surface', 'leo', 'geo', 'lunar_orbit', 'lunar_surface', 'mars_orbit'],
    workforce: {
      engineers: 5, scientists: 5, miners: 5, operators: 5,
      pilots: 5, negotiators: 5, securitys: 5, medics: 5,
      morale: 1.0, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 0,
    },
    ...overrides,
  };
}

const EVA_DEF_ID = 'eva_certification_cohort';
const LEADER_DEV_DEF_ID = 'leadership_development_program';
const RD_RESIDENCY_DEF_ID = 'rd_residency_program';

describe('program track capacity', () => {
  it('is 3 for every track on a fresh save', () => {
    const s = baseState();
    expect(getProgramTrackCapacity(s, 'crew_cohort')).toBe(3);
    expect(getProgramTrackCapacity(s, 'leader_development')).toBe(3);
    expect(getProgramTrackCapacity(s, 'rd_residency')).toBe(3);
  });
});

describe('enqueue / dequeue / reorder — crew_cohort', () => {
  it('enqueues a crew cohort with a captured label', () => {
    const s = baseState();
    const result = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID);
    expect(result.ok).toBe(true);
    const queue = getProgramQueue(result.state, 'crew_cohort');
    expect(queue).toHaveLength(1);
    expect(queue[0].label).toBe(PROGRAM_DEF_MAP.get(EVA_DEF_ID)!.name);
    expect(queue[0].startedAtMs).toBeNull();
  });

  it('rejects enqueue past track capacity', () => {
    let s = baseState();
    for (let i = 0; i < 3; i++) s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID).state;
    const result = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('queue_full');
  });

  it('rejects an unknown definition', () => {
    const s = baseState();
    const result = enqueueProgram(s, 'crew_cohort', 'not_a_real_def');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_definition');
  });

  it('rejects a definition enqueued on the wrong track', () => {
    const s = baseState();
    const result = enqueueProgram(s, 'leader_development', EVA_DEF_ID);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('wrong_track');
  });

  it('dequeues by instance id', () => {
    const s0 = baseState();
    const s1 = enqueueProgram(s0, 'crew_cohort', EVA_DEF_ID).state;
    const instId = getProgramQueue(s1, 'crew_cohort')[0].id;
    const s2 = dequeueProgram(s1, 'crew_cohort', instId);
    expect(getProgramQueue(s2, 'crew_cohort')).toHaveLength(0);
  });

  it('reorders queued (not-yet-active) instances', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW); // starts the first one (index 0 becomes active)
    s = enqueueProgram(s, 'crew_cohort', 'avionics_upskill_cohort', {}, NOW).state;
    s = enqueueProgram(s, 'crew_cohort', 'mission_control_cohort', {}, NOW).state;
    const before = getProgramQueue(s, 'crew_cohort').map(i => i.defId);
    expect(before[0]).toBe(EVA_DEF_ID); // active head untouched by reorder
    const secondId = getProgramQueue(s, 'crew_cohort')[1].id;
    s = reorderProgram(s, 'crew_cohort', secondId, 'down');
    const after = getProgramQueue(s, 'crew_cohort').map(i => i.defId);
    expect(after[0]).toBe(EVA_DEF_ID); // still untouched
    expect(after[1]).toBe('mission_control_cohort');
    expect(after[2]).toBe('avionics_upskill_cohort');
  });

  it('cannot reorder the active head', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW);
    s = enqueueProgram(s, 'crew_cohort', 'avionics_upskill_cohort', {}, NOW).state;
    const activeId = getProgramQueue(s, 'crew_cohort')[0].id;
    const after = reorderProgram(s, 'crew_cohort', activeId, 'down');
    expect(getProgramQueue(after, 'crew_cohort')[0].defId).toBe(EVA_DEF_ID);
  });
});

describe('advancePrograms — crew_cohort start + complete', () => {
  it('starts a queued cohort on the next advance, deducting cost', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    const moneyBefore = s.money;
    s = advancePrograms(s, NOW);
    const queue = getProgramQueue(s, 'crew_cohort');
    expect(queue).toHaveLength(1);
    expect(queue[0].startedAtMs).toBe(NOW);
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    expect(s.money).toBe(moneyBefore - (def.upfrontCost || 0));
  });

  it('does not start a cohort the crew cannot staff', () => {
    let s = baseState({ workforce: { engineers: 0, scientists: 0, miners: 0, operators: 0, morale: 1, fatigue: 0, trainingLevel: 0.5, trainingBudgetPerCrew: 0 } });
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW);
    const queue = getProgramQueue(s, 'crew_cohort');
    expect(queue).toHaveLength(1);
    expect(queue[0].startedAtMs).toBeNull(); // left queued — transient failure
  });

  it('completes a cohort once its duration elapses and records the completion', () => {
    let s = baseState();
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW); // starts
    const completesAt = NOW + def.durationDays * DAY_MS;
    s = advancePrograms(s, completesAt); // completes
    expect(getProgramQueue(s, 'crew_cohort')).toHaveLength(0);
    expect(s.programs?.completedCohortDefIds).toContain(EVA_DEF_ID);
  });

  it('chains a second queued cohort immediately after the first completes (away-catchup case)', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state; // 21d
    s = enqueueProgram(s, 'crew_cohort', 'avionics_upskill_cohort', {}, NOW).state; // 18d
    s = advancePrograms(s, NOW); // starts EVA
    const evaDuration = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!.durationDays * DAY_MS;
    const farFuture = NOW + evaDuration + 5 * DAY_MS; // well past EVA's completion — long absence
    s = advancePrograms(s, farFuture);
    const queue = getProgramQueue(s, 'crew_cohort');
    expect(s.programs?.completedCohortDefIds).toContain(EVA_DEF_ID);
    expect(queue).toHaveLength(1);
    expect(queue[0].defId).toBe('avionics_upskill_cohort');
    expect(queue[0].startedAtMs).toBe(NOW + evaDuration); // backdated to when the channel actually freed
  });
});

describe('crew reservation (opportunity cost)', () => {
  it('reserves nothing while a cohort is only queued (not yet active)', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    expect(getReservedCrewCounts(s)).toEqual({});
  });

  it('reserves the def crewRequired count of the worker type once active', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW);
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    expect(getReservedCrewCounts(s)).toEqual({ [def.workerType!]: def.crewRequired });
  });

  it('getEffectiveWorkforceForBonuses subtracts the reservation, never below zero', () => {
    let s = baseState();
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW);
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    const effective = getEffectiveWorkforceForBonuses(s);
    expect(effective.miners).toBe(s.workforce!.miners - (def.crewRequired || 0));
  });
});

describe('program workforce bonuses', () => {
  it('is zero with no completed cohorts', () => {
    const s = baseState();
    const b = getProgramWorkforceBonuses(s);
    expect(Object.values(b).every(v => v === 0)).toBe(true);
  });

  it('adds the completion bonus once a cohort finishes', () => {
    let s = baseState();
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW);
    s = advancePrograms(s, NOW + def.durationDays * DAY_MS);
    const b = getProgramWorkforceBonuses(s);
    expect(b.miningOutput).toBeCloseTo(def.completionBonus!.miningOutput!);
  });

  it('caps the aggregate per-field contribution at PROGRAM_BONUS_FIELD_CAP even with repeats', () => {
    let s = baseState();
    // Simulate many completions directly via state (faster than re-running
    // the full duration loop many times) — the cap is a pure function of
    // completedCohortDefIds, so this is a fair unit test of the cap itself.
    s = { ...s, programs: { queues: s.programs!.queues, completedCohortDefIds: Array(20).fill(EVA_DEF_ID) } };
    const b = getProgramWorkforceBonuses(s);
    expect(b.miningOutput).toBe(PROGRAM_BONUS_FIELD_CAP);
  });

  it('mergeProgramWorkforceBonuses adds to (and re-caps against) workforce.ts bonuses', () => {
    let s = baseState();
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    s = advancePrograms(s, NOW);
    s = advancePrograms(s, NOW + def.durationDays * DAY_MS);
    const wfBase = getWorkforceBonuses(s.workforce!);
    const merged = mergeProgramWorkforceBonuses(wfBase, s);
    expect(merged.miningOutput).toBeCloseTo(Math.min(1.0, wfBase.miningOutput + def.completionBonus!.miningOutput!));
  });
});

describe('leader_development / rd_residency programs', () => {
  function hireOne(state: GameState, defId: string): GameState {
    return hireCommander(state, defId, NOW);
  }

  it('rejects posting a commander who is not hired', () => {
    const s = baseState();
    const result = enqueueProgram(s, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'rookie-alpha' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('commander_not_hired');
  });

  it('rejects rd_residency for a non-scientist/engineer class', () => {
    let s = baseState();
    s = hireOne(s, 'rookie-alpha'); // class: commander
    const result = enqueueProgram(s, 'rd_residency', RD_RESIDENCY_DEF_ID, { targetCommanderId: 'rookie-alpha', targetCategory: 'rocketry' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('wrong_class');
  });

  it('rejects rd_residency without a target category', () => {
    let s = baseState();
    s = hireOne(s, 'surveyor'); // class: scientist
    const result = enqueueProgram(s, 'rd_residency', RD_RESIDENCY_DEF_ID, { targetCommanderId: 'surveyor' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing_category');
  });

  it('rejects double-booking the same commander across leader tracks', () => {
    let s = baseState();
    s = hireOne(s, 'surveyor');
    s = enqueueProgram(s, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'surveyor' }).state;
    const result = enqueueProgram(s, 'rd_residency', RD_RESIDENCY_DEF_ID, { targetCommanderId: 'surveyor', targetCategory: 'rocketry' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('commander_busy');
  });

  it('starting a leader_development program clears the commander current assignment', () => {
    let s = baseState();
    s = hireOne(s, 'surveyor');
    s = { ...s, hiredCommanders: s.hiredCommanders!.map(h => h.definitionId === 'surveyor' ? { ...h, assignment: { postType: 'zone' as const, targetId: 'leo' }, assignedSinceMs: NOW - 1000 } : h) };
    s = enqueueProgram(s, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'surveyor' }, NOW).state;
    s = advancePrograms(s, NOW);
    const h = s.hiredCommanders!.find(x => x.definitionId === 'surveyor')!;
    expect(h.assignment).toBeNull();
    expect(h.assignedSinceMs).toBeUndefined();
    // opportunity cost: the commander is off the retirement clock while training
    expect(getRetirementEtaMs(h)).toBeNull();
  });

  it('grants XP on leader_development completion', () => {
    let s = baseState();
    s = hireOne(s, 'surveyor');
    s = enqueueProgram(s, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'surveyor' }, NOW).state;
    s = advancePrograms(s, NOW);
    const def = PROGRAM_DEF_MAP.get(LEADER_DEV_DEF_ID)!;
    s = advancePrograms(s, NOW + def.durationDays * DAY_MS);
    const h = s.hiredCommanders!.find(x => x.definitionId === 'surveyor')!;
    expect(h.xp).toBeGreaterThan(0);
  });

  it('rd_residency guarantees the second trait slot on completion', () => {
    let s = baseState();
    s = hireOne(s, 'surveyor'); // scientist
    s = enqueueProgram(s, 'rd_residency', RD_RESIDENCY_DEF_ID, { targetCommanderId: 'surveyor', targetCategory: 'rocketry' }, NOW).state;
    s = advancePrograms(s, NOW);
    const def = PROGRAM_DEF_MAP.get(RD_RESIDENCY_DEF_ID)!;
    s = advancePrograms(s, NOW + def.durationDays * DAY_MS);
    const h = s.hiredCommanders!.find(x => x.definitionId === 'surveyor')!;
    expect(h.secondTraitSlot).toBe(true);
  });

  it('is deterministic: replaying the SAME started instance twice yields the same trait-chance outcome', () => {
    // The roll is seeded off the program instance's id (fixed at enqueue
    // time — see programs.ts's completeProgramHead) — not off wall-clock
    // Math.random — so completing the SAME already-started snapshot twice,
    // independently, must produce an identical outcome. (generateId() itself
    // uses Math.random, so re-building the queue from scratch on each replay
    // would legitimately roll a different id/outcome — this test instead
    // freezes the snapshot AFTER the id is assigned, which is the actual
    // determinism guarantee programs.ts makes.)
    let started = baseState();
    started = hireOne(started, 'surveyor');
    started = enqueueProgram(started, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'surveyor' }, NOW).state;
    started = advancePrograms(started, NOW);
    const def = PROGRAM_DEF_MAP.get(LEADER_DEV_DEF_ID)!;
    const completesAt = NOW + def.durationDays * DAY_MS;

    const r1 = advancePrograms(started, completesAt);
    const r2 = advancePrograms(started, completesAt);
    const slot1 = r1.hiredCommanders!.find(x => x.definitionId === 'surveyor')!.secondTraitSlot;
    const slot2 = r2.hiredCommanders!.find(x => x.definitionId === 'surveyor')!.secondTraitSlot;
    expect(slot1).toBe(slot2);
  });

  it('gracefully skips effects if the commander was dismissed mid-program', () => {
    let s = baseState();
    s = hireOne(s, 'surveyor');
    s = enqueueProgram(s, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'surveyor' }, NOW).state;
    s = advancePrograms(s, NOW);
    s = { ...s, hiredCommanders: [] }; // dismissed while training
    const def = PROGRAM_DEF_MAP.get(LEADER_DEV_DEF_ID)!;
    expect(() => advancePrograms(s, NOW + def.durationDays * DAY_MS)).not.toThrow();
    const after = advancePrograms(s, NOW + def.durationDays * DAY_MS);
    expect(getProgramQueue(after, 'leader_development')).toHaveLength(0);
  });
});

describe('advanceProgramsDetailed', () => {
  it('reports accurate completed/started/skipped counts even with a capped eventLog', () => {
    let s = baseState({ eventLog: Array.from({ length: 50 }, (_, i) => ({ id: `pad_${i}`, date: { year: 2026, month: 1 }, type: 'milestone' as const, title: 'pad', description: 'pad' })) });
    s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
    const result1 = advanceProgramsDetailed(s, NOW);
    expect(result1.startedCount).toBe(1);
    s = result1.state;
    const def = PROGRAM_DEF_MAP.get(EVA_DEF_ID)!;
    const result2 = advanceProgramsDetailed(s, NOW + def.durationDays * DAY_MS);
    expect(result2.completedCount).toBe(1);
  });
});

describe('determinism', () => {
  it('same state + elapsed time -> identical result', () => {
    function build(): GameState {
      let s = baseState();
      s = enqueueProgram(s, 'crew_cohort', EVA_DEF_ID, {}, NOW).state;
      s = enqueueProgram(s, 'crew_cohort', 'avionics_upskill_cohort', {}, NOW).state;
      return s;
    }
    const far = NOW + 60 * DAY_MS;
    const r1 = advancePrograms(build(), far);
    const r2 = advancePrograms(build(), far);
    expect(r1.programs).toEqual(r2.programs);
    expect(r1.money).toBe(r2.money);
  });
});

describe('getReservedLeaderIds', () => {
  it('includes commanders in both queued and active leader-track instances', () => {
    let s = baseState();
    s = hireCommander(s, 'surveyor', NOW);
    s = hireCommander(s, 'professor-quark', NOW);
    s = enqueueProgram(s, 'leader_development', LEADER_DEV_DEF_ID, { targetCommanderId: 'surveyor' }, NOW).state;
    s = enqueueProgram(s, 'rd_residency', RD_RESIDENCY_DEF_ID, { targetCommanderId: 'professor-quark', targetCategory: 'rocketry' }, NOW).state;
    const ids = getReservedLeaderIds(s);
    expect(ids.has('surveyor')).toBe(true);
    expect(ids.has('professor-quark')).toBe(true);
  });
});

describe('program def coverage', () => {
  it('has one crew_cohort def per WORKER_TYPES entry', () => {
    const cohortDefs = PROGRAM_DEFS.filter(d => d.track === 'crew_cohort');
    expect(cohortDefs).toHaveLength(8);
  });
});
