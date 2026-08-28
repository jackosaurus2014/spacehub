/**
 * @jest-environment jsdom
 */
import {
  LEARN_PROGRESS_KEY, isLessonComplete, mergeServerProgress, moduleCompletion,
  readProgress, setLessonComplete, touchLesson, writeProgress,
} from '@/lib/learn-progress';

describe('learn progress store', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty and survives garbage in storage', () => {
    expect(readProgress()).toEqual({ modules: {} });
    window.localStorage.setItem(LEARN_PROGRESS_KEY, '{not json');
    expect(readProgress()).toEqual({ modules: {} });
    window.localStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify({ nope: 1 }));
    expect(readProgress()).toEqual({ modules: {} });
  });

  it('marks, unmarks and persists completion', () => {
    let s = setLessonComplete(readProgress(), 'orbital-mechanics-101', 'keplers-laws', true);
    writeProgress(s);
    expect(isLessonComplete(readProgress(), 'orbital-mechanics-101', 'keplers-laws')).toBe(true);
    s = setLessonComplete(readProgress(), 'orbital-mechanics-101', 'keplers-laws', false);
    writeProgress(s);
    expect(isLessonComplete(readProgress(), 'orbital-mechanics-101', 'keplers-laws')).toBe(false);
  });

  it('computes module completion', () => {
    let s = readProgress();
    s = setLessonComplete(s, 'm', 'a', true);
    s = setLessonComplete(s, 'm', 'b', true);
    expect(moduleCompletion(s, 'm', ['a', 'b', 'c', 'd'])).toEqual({ done: 2, total: 4, pct: 50 });
    expect(moduleCompletion(s, 'other', ['x'])).toEqual({ done: 0, total: 1, pct: 0 });
    expect(moduleCompletion(s, 'm', [])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('merges server progress as a union without clobbering local', () => {
    let s = setLessonComplete(readProgress(), 'm', 'local-only', true);
    s = mergeServerProgress(s, [
      { moduleSlug: 'm', lessonSlug: 'server-only', completedAt: '2026-08-01T00:00:00.000Z' },
      { moduleSlug: 'm', lessonSlug: 'local-only', completedAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(isLessonComplete(s, 'm', 'local-only')).toBe(true);
    expect(isLessonComplete(s, 'm', 'server-only')).toBe(true);
    expect(s.modules.m['local-only']).not.toBe('2026-01-01T00:00:00.000Z'); // local timestamp kept
  });

  it('records the last-opened lesson and emits a change event', () => {
    const handler = jest.fn();
    window.addEventListener('sn:learn:progress', handler);
    writeProgress(touchLesson(readProgress(), { track: 'kids', moduleSlug: 'rockets-orbits-and-astronauts', lessonSlug: 'why-rockets-work', title: 'Why Rockets Work', at: 'now' }));
    expect(readProgress().last?.lessonSlug).toBe('why-rockets-work');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
