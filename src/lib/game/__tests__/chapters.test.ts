/**
 * @jest-environment node
 *
 * Live-Service Wave LS8 — Story Chapters.
 * Covers: deterministic calendar staging (same nowMs -> identical chapter
 * state for every caller), fixed-UTC finale weekend math, act/finale
 * progression through advanceStoryChapters + resolveChapterChoice,
 * compressed late-joiner/lapsed-return catch-up recap, and the
 * participation-weighted finale outcome roll.
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import {
  CHAPTER_DEFINITIONS, CHAPTER_CYCLE_WEEKS, CHAPTER_ACT_WEEK_OFFSETS,
  getChapterWeekIndex, getChapterCycleIndex, getWeekInChapterCycle, getChapterForCycle,
  getChapterCycleStartMs, getActRevealMs, getFinaleWindow, getEpilogueEndMs,
  getCurrentChapterInstance, advanceStoryChapters, resolveChapterChoice,
  computeFinaleOutcome, resolveChapterEpilogue,
} from '../chapters';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), ...overrides };
}

describe('calendar math — determinism', () => {
  it('getChapterWeekIndex/getChapterCycleIndex/getWeekInChapterCycle are pure functions of nowMs', () => {
    const now = Date.UTC(2026, 9, 3, 12, 0, 0);
    const a = getChapterWeekIndex(now);
    const b = getChapterWeekIndex(now);
    expect(a).toBe(b);
    expect(getChapterCycleIndex(a)).toBe(getChapterCycleIndex(b));
    expect(getWeekInChapterCycle(a)).toBe(getWeekInChapterCycle(b));
  });

  it('getCurrentChapterInstance produces byte-identical output for the same nowMs, called repeatedly', () => {
    const now = Date.UTC(2026, 9, 3, 12, 0, 0);
    const a = getCurrentChapterInstance(now);
    const b = getCurrentChapterInstance(now);
    expect(a).toEqual(b);
  });

  it('epoch week 0 starts on a Thursday (Jan 1 1970 UTC) — the assumption the finale weekend math depends on', () => {
    expect(new Date(0).getUTCDay()).toBe(4); // Thursday
    expect(getChapterWeekIndex(0)).toBe(0);
  });

  it('cycles through the authored chapter catalog in order, wrapping around', () => {
    for (let i = 0; i < CHAPTER_DEFINITIONS.length; i++) {
      expect(getChapterForCycle(i)).toBe(CHAPTER_DEFINITIONS[i]);
    }
    expect(getChapterForCycle(CHAPTER_DEFINITIONS.length)).toBe(CHAPTER_DEFINITIONS[0]);
    expect(getChapterForCycle(CHAPTER_DEFINITIONS.length * 7 + 2)).toBe(CHAPTER_DEFINITIONS[2]);
  });

  it('act reveal timestamps are strictly increasing within a cycle, each exactly one week apart', () => {
    const cycleIndex = 42;
    const revealMs = CHAPTER_ACT_WEEK_OFFSETS.map((_, i) => getActRevealMs(cycleIndex, i));
    for (let i = 1; i < revealMs.length; i++) {
      expect(revealMs[i]).toBe(revealMs[i - 1] + WEEK_MS);
    }
    expect(revealMs[0]).toBe(getChapterCycleStartMs(cycleIndex));
  });

  it('the finale window always falls on a real Saturday evening -> Sunday night (UTC), for any cycle', () => {
    for (const cycleIndex of [0, 1, 7, 42, 1000]) {
      const { startMs, endMs } = getFinaleWindow(cycleIndex);
      expect(new Date(startMs).getUTCDay()).toBe(6); // Saturday
      expect(new Date(startMs).getUTCHours()).toBe(18);
      expect(new Date(endMs).getUTCDay()).toBe(0); // Sunday
      expect(new Date(endMs).getUTCHours()).toBe(23);
      expect(endMs).toBeGreaterThan(startMs);
    }
  });

  it('the epilogue ends exactly when the next cycle begins', () => {
    const cycleIndex = 5;
    expect(getEpilogueEndMs(cycleIndex)).toBe(getChapterCycleStartMs(cycleIndex + 1));
  });

  it('getCurrentChapterInstance reports the correct revealedActCount at each week boundary', () => {
    const cycleIndex = 10;
    const cycleStart = getChapterCycleStartMs(cycleIndex);
    // Week 0: only act 0 revealed.
    expect(getCurrentChapterInstance(cycleStart).revealedActCount).toBe(1);
    // Week 2 (an instant after it starts): acts 0,1,2 revealed.
    expect(getCurrentChapterInstance(cycleStart + 2 * WEEK_MS + 1).revealedActCount).toBe(3);
    // Just before week 1 starts: still only act 0.
    expect(getCurrentChapterInstance(cycleStart + WEEK_MS - 1).revealedActCount).toBe(1);
  });

  it('finaleOpen/finaleClosed/epilogueActive are mutually exclusive and correctly gated', () => {
    const cycleIndex = 3;
    const { startMs, endMs } = getFinaleWindow(cycleIndex);
    const beforeInst = getCurrentChapterInstance(startMs - 1);
    expect(beforeInst.finaleOpen).toBe(false);
    expect(beforeInst.finaleClosed).toBe(false);

    const duringInst = getCurrentChapterInstance(startMs + 1);
    expect(duringInst.finaleOpen).toBe(true);
    expect(duringInst.finaleClosed).toBe(false);

    const afterInst = getCurrentChapterInstance(endMs);
    expect(afterInst.finaleOpen).toBe(false);
    expect(afterInst.finaleClosed).toBe(true);
    expect(afterInst.epilogueActive).toBe(true);
  });
});

describe('act progression — live single-act presentation', () => {
  it('resolves an info act automatically, applies its consequence, advances actIndex, and logs an event', () => {
    const cycleIndex = 100;
    const cycleStart = getChapterCycleStartMs(cycleIndex);
    const def = getChapterForCycle(cycleIndex);
    // First act of every authored chapter is an 'info' stage.
    expect(def.acts[0].kind).toBe('info');

    const state = baseState();
    const result = advanceStoryChapters(state, cycleStart, true);
    expect(result.pendingChoice).toBeNull();
    expect(result.state.storyChapters?.current?.cycleIndex).toBe(cycleIndex);
    expect(result.state.storyChapters?.current?.actIndex).toBe(1);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events[0].title).toBe(`${def.acts[0].icon} ${def.acts[0].name}`);
  });

  it('presents a pendingChoice for a choice-kind act and does not advance until resolved', () => {
    const cycleIndex = 100;
    const def = getChapterForCycle(cycleIndex);
    const choiceActIndex = def.acts.findIndex(a => a.kind === 'choice');
    expect(choiceActIndex).toBeGreaterThanOrEqual(0);
    const actRevealMs = getActRevealMs(cycleIndex, choiceActIndex);

    const state = baseState({
      storyChapters: { current: { cycleIndex, chapterId: def.id, actIndex: choiceActIndex, status: 'active', joinedAtWeek: 0, flags: {} }, history: [] },
    });
    const result = advanceStoryChapters(state, actRevealMs, true);
    expect(result.pendingChoice).not.toBeNull();
    expect(result.pendingChoice?.chapterId).toBe(def.id);
    expect(result.pendingChoice?.chapterName).toBe(def.name);
    expect(result.state.storyChapters?.current?.actIndex).toBe(choiceActIndex); // unchanged until resolved
    expect(result.state.storyChapters?.current?.awaitingChoice).toBe(true);
  });

  it('respects the single global pendingChoice slot (allowNewChoice=false skips presentation)', () => {
    const cycleIndex = 100;
    const def = getChapterForCycle(cycleIndex);
    const choiceActIndex = def.acts.findIndex(a => a.kind === 'choice');
    const actRevealMs = getActRevealMs(cycleIndex, choiceActIndex);

    const state = baseState({
      storyChapters: { current: { cycleIndex, chapterId: def.id, actIndex: choiceActIndex, status: 'active', joinedAtWeek: 0, flags: {} }, history: [] },
    });
    const result = advanceStoryChapters(state, actRevealMs, false);
    expect(result.pendingChoice).toBeNull();
    expect(result.state.storyChapters?.current?.awaitingChoice).toBeFalsy();
  });

  it('resolveChapterChoice applies the chosen consequence and advances actIndex', () => {
    const cycleIndex = 100;
    const def = getChapterForCycle(cycleIndex);
    const choiceActIndex = def.acts.findIndex(a => a.kind === 'choice');
    const act = def.acts[choiceActIndex]!;

    const state = baseState({
      money: 1_000_000_000,
      storyChapters: { current: { cycleIndex, chapterId: def.id, actIndex: choiceActIndex, status: 'active', joinedAtWeek: 0, flags: {} }, history: [] },
    });
    // Manually mark awaitingChoice as advanceStoryChapters would have.
    const withPending: GameState = { ...state, storyChapters: { current: { ...state.storyChapters!.current!, awaitingChoice: true }, history: [] } };

    const next = resolveChapterChoice(withPending, def.id, 0);
    expect(next.storyChapters?.current?.actIndex).toBe(choiceActIndex + 1);
    expect(next.storyChapters?.current?.awaitingChoice).toBe(false);
    if (act.choices![0].consequence.moneyCost) {
      expect(next.money).toBeLessThan(withPending.money);
    }
  });

  it('is a no-op if resolveChapterChoice is called without an awaiting choice (guards against stale UI)', () => {
    const cycleIndex = 100;
    const def = getChapterForCycle(cycleIndex);
    const state = baseState({
      storyChapters: { current: { cycleIndex, chapterId: def.id, actIndex: 0, status: 'active', joinedAtWeek: 0, flags: {} }, history: [] },
    });
    const next = resolveChapterChoice(state, def.id, 0);
    expect(next).toBe(state);
  });
});

describe('late-joiner / lapsed-return compressed catch-up recap', () => {
  it('compresses more than one due act into a single recap event instead of one modal per act', () => {
    const cycleIndex = 200;
    const cycleStart = getChapterCycleStartMs(cycleIndex);
    const def = getChapterForCycle(cycleIndex);
    // Land partway through week 2 -> acts 0,1,2 are all due at once (dueCount=3).
    const nowMs = cycleStart + 2 * WEEK_MS + HOUR_MS;

    const state = baseState();
    const result = advanceStoryChapters(state, nowMs, true);

    expect(result.state.storyChapters?.current?.actIndex).toBe(3);
    expect(result.pendingChoice).toBeNull(); // no modal — the recap is compressed
    expect(result.events.length).toBe(1);
    expect(result.events[0].title).toContain('Recap');
    // The recap event names every resolved act, in order.
    expect(result.events[0].description).toContain(def.acts[0].name);
    expect(result.events[0].description).toContain(def.acts[2].name);
  });

  it('uses the authored recapConsequence for choice-kind acts during a compressed catch-up, never a live modal', () => {
    const cycleIndex = 200;
    const def = getChapterForCycle(cycleIndex);
    const choiceActIndex = def.acts.findIndex(a => a.kind === 'choice');
    expect(def.acts[choiceActIndex].recapConsequence).toBeDefined();

    const cycleStart = getChapterCycleStartMs(cycleIndex);
    // Land after every act has revealed (end of week 3) — guarantees the
    // choice act is swept into the recap regardless of its index.
    const nowMs = cycleStart + 3 * WEEK_MS + HOUR_MS;
    const state = baseState();
    const result = advanceStoryChapters(state, nowMs, true);

    expect(result.pendingChoice).toBeNull();
    expect(result.state.storyChapters?.current?.actIndex).toBe(def.acts.length);
  });

  it('produces identical recap results for two saves that both catch up from scratch at the same nowMs (determinism)', () => {
    const cycleIndex = 200;
    const cycleStart = getChapterCycleStartMs(cycleIndex);
    const nowMs = cycleStart + 3 * WEEK_MS + HOUR_MS;

    const a = advanceStoryChapters(baseState(), nowMs, true);
    const b = advanceStoryChapters(baseState(), nowMs, true);
    expect(a.state.storyChapters).toEqual(b.state.storyChapters);
    expect(a.events.map(e => e.title)).toEqual(b.events.map(e => e.title));
  });

  it('files a chapter as missed (no consequence, no penalty) if the world moved to a new cycle before the finale ever resolved', () => {
    const cycleIndex = 5;
    const def = getChapterForCycle(cycleIndex);
    const nextCycleStart = getChapterCycleStartMs(cycleIndex + 1);

    const state = baseState({
      money: 500_000_000,
      storyChapters: {
        current: { cycleIndex, chapterId: def.id, actIndex: def.acts.length, status: 'active', joinedAtWeek: 0, flags: { finaleAnswered: true, finaleParticipated: false } },
        history: [],
      },
    });
    const result = advanceStoryChapters(state, nextCycleStart, true);
    expect(result.state.storyChapters?.history).toHaveLength(1);
    expect(result.state.storyChapters?.history[0].chapterId).toBe(def.id);
    expect(result.state.storyChapters?.history[0].finaleSuccess).toBe(false);
    expect(result.state.money).toBe(500_000_000); // no penalty applied
    expect(result.state.storyChapters?.current?.cycleIndex).toBe(cycleIndex + 1); // fresh progress started
  });
});

describe('finale — participation-weighted outcome', () => {
  it('computeFinaleOutcome is a pure function of (chapterId, cycleIndex, participationCount)', () => {
    const def = CHAPTER_DEFINITIONS[0];
    const a = computeFinaleOutcome(def, 7, 20);
    const b = computeFinaleOutcome(def, 7, 20);
    expect(a).toEqual(b);
  });

  it('higher participation never lowers the success threshold', () => {
    const def = CHAPTER_DEFINITIONS[0];
    const low = computeFinaleOutcome(def, 7, 0).threshold;
    const mid = computeFinaleOutcome(def, 7, 25).threshold;
    const high = computeFinaleOutcome(def, 7, 1000).threshold;
    expect(mid).toBeGreaterThanOrEqual(low);
    expect(high).toBeGreaterThanOrEqual(mid);
    expect(high).toBeLessThanOrEqual(0.9); // capped
  });

  it('resolveChapterEpilogue applies the epilogue consequence, records history, and is idempotent', () => {
    const cycleIndex = 300;
    const def = getChapterForCycle(cycleIndex);
    const { endMs } = getFinaleWindow(cycleIndex);

    const state = baseState({
      storyChapters: {
        current: { cycleIndex, chapterId: def.id, actIndex: def.acts.length, status: 'active', joinedAtWeek: 0, flags: { finaleAnswered: true, finaleParticipated: true } },
        history: [],
      },
    });

    const resolved = resolveChapterEpilogue(state, 50, endMs);
    expect(resolved.storyChapters?.current?.status).toBe('completed');
    expect(resolved.storyChapters?.history).toHaveLength(1);
    expect(resolved.storyChapters?.history[0].chapterId).toBe(def.id);

    // Idempotent — calling again on the already-resolved state changes nothing.
    const resolvedAgain = resolveChapterEpilogue(resolved, 999, endMs + HOUR_MS);
    expect(resolvedAgain).toBe(resolved);
  });

  it('resolveChapterEpilogue is a no-op before the finale window has closed', () => {
    const cycleIndex = 300;
    const def = getChapterForCycle(cycleIndex);
    const { startMs } = getFinaleWindow(cycleIndex);

    const state = baseState({
      storyChapters: {
        current: { cycleIndex, chapterId: def.id, actIndex: def.acts.length, status: 'active', joinedAtWeek: 0, flags: {} },
        history: [],
      },
    });
    const result = resolveChapterEpilogue(state, 10, startMs + 1); // finale open, not closed
    expect(result).toBe(state);
  });

  it('resolveChapterEpilogue is a no-op if the acts have not all resolved yet', () => {
    const cycleIndex = 300;
    const def = getChapterForCycle(cycleIndex);
    const { endMs } = getFinaleWindow(cycleIndex);

    const state = baseState({
      storyChapters: {
        current: { cycleIndex, chapterId: def.id, actIndex: 1, status: 'active', joinedAtWeek: 0, flags: {} },
        history: [],
      },
    });
    const result = resolveChapterEpilogue(state, 10, endMs);
    expect(result).toBe(state);
  });
});

describe('content sanity — every authored chapter is well-formed', () => {
  it('every chapter has at least one choice act with an authored recapConsequence, and a finale with both outcomes defined', () => {
    for (const def of CHAPTER_DEFINITIONS) {
      const choiceActs = def.acts.filter(a => a.kind === 'choice');
      expect(choiceActs.length).toBeGreaterThan(0);
      for (const act of choiceActs) {
        expect(act.recapConsequence).toBeDefined();
        expect(act.choices && act.choices.length).toBeGreaterThan(1);
      }
      expect(def.finale.epilogueSuccess).toBeDefined();
      expect(def.finale.epilogueFailure).toBeDefined();
      expect(def.finale.participateCost.moneyCost).toBeGreaterThan(0);
    }
  });

  it('exactly one act per chapter carries the cinematic chapter-open hint (Act 1)', () => {
    for (const def of CHAPTER_DEFINITIONS) {
      const cinematicActs = def.acts.filter(a => a.presentationHint === 'cinematic');
      expect(cinematicActs.length).toBe(1);
      expect(def.acts[0].presentationHint).toBe('cinematic');
    }
  });
});
