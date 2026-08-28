// ─── Learning Zone progress (client store) ───────────────────────────────────
// Completion lives in localStorage so anonymous learners get progress bars
// and "continue where you left off" without an account; signed-in users
// additionally sync to LessonProgress via /api/learn/progress so it follows
// them across devices and can drive the "you're 2 lessons from finishing"
// email later. Merge rule: union — a lesson completed anywhere is complete.

export const LEARN_PROGRESS_KEY = 'sn:learn:progress:v1';

export interface ProgressStore {
  /** moduleSlug → lessonSlug → ISO completion time */
  modules: Record<string, Record<string, string>>;
  /** Last lesson opened, for "continue" */
  last?: { track: string; moduleSlug: string; lessonSlug: string; title: string; at: string };
}

const EMPTY: ProgressStore = { modules: {} };

export function readProgress(): ProgressStore {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(LEARN_PROGRESS_KEY);
    if (!raw) return { modules: {} };
    const parsed = JSON.parse(raw) as ProgressStore;
    return parsed && typeof parsed === 'object' && parsed.modules ? parsed : { modules: {} };
  } catch {
    return { modules: {} };
  }
}

export function writeProgress(store: ProgressStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent('sn:learn:progress'));
  } catch {
    /* storage unavailable (private mode, quota) — progress is best-effort */
  }
}

export function isLessonComplete(store: ProgressStore, moduleSlug: string, lessonSlug: string): boolean {
  return !!store.modules[moduleSlug]?.[lessonSlug];
}

export function setLessonComplete(store: ProgressStore, moduleSlug: string, lessonSlug: string, complete: boolean): ProgressStore {
  const mod = { ...(store.modules[moduleSlug] ?? {}) };
  if (complete) mod[lessonSlug] = new Date().toISOString();
  else delete mod[lessonSlug];
  return { ...store, modules: { ...store.modules, [moduleSlug]: mod } };
}

export function touchLesson(store: ProgressStore, last: NonNullable<ProgressStore['last']>): ProgressStore {
  return { ...store, last };
}

export function moduleCompletion(store: ProgressStore, moduleSlug: string, lessonSlugs: string[]): { done: number; total: number; pct: number } {
  const done = lessonSlugs.filter((s) => isLessonComplete(store, moduleSlug, s)).length;
  const total = lessonSlugs.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Union of local and server completion, keyed by "moduleSlug/lessonSlug". */
export function mergeServerProgress(store: ProgressStore, serverKeys: Array<{ moduleSlug: string; lessonSlug: string; completedAt: string }>): ProgressStore {
  let next = store;
  for (const k of serverKeys) {
    if (!isLessonComplete(next, k.moduleSlug, k.lessonSlug)) {
      next = { ...next, modules: { ...next.modules, [k.moduleSlug]: { ...(next.modules[k.moduleSlug] ?? {}), [k.lessonSlug]: k.completedAt } } };
    }
  }
  return next;
}
