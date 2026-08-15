// ─── Juice event derivation (Wave V7 — order acknowledgment & world feedback)
// docs/VISUAL_DEPTH_2026-08.md §V7 "Sound hooks for LS surfaces": calendar
// final-hour tick, era medal change sting, program completion chime. Pure
// derivation functions (state diff / threshold check → "did an event just
// happen") kept independent of any component so GlobalEffectsLayer.tsx can
// drive all three sound hooks from one place without importing
// MissionCalendarPanel / CorporateEraPanel / ProgramsPanel (out of this
// wave's file scope — see docs/VISUAL_DEPTH_2026-08.md §V7 Files list).

/** Mission-calendar entries crossing into their final hour. Returns the ids
 *  that just entered the window (i.e. weren't already in `dinged`) so the
 *  caller can play the sting exactly once per entry and add them to its own
 *  running `dinged` set. Pure — no timers, no I/O. */
export function getEntriesEnteringFinalHour(
  entries: { id: string; atMs: number }[],
  dinged: ReadonlySet<string>,
  nowMs: number,
  windowMs = 3_600_000,
): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const remaining = e.atMs - nowMs;
    if (remaining > 0 && remaining <= windowMs && !dinged.has(e.id)) out.push(e.id);
  }
  return out;
}

/** Returns the medal grade of a newly-completed corporate era, or null if no
 *  new era completed between the two snapshots. Length-growth diff (eras are
 *  append-only — corporate-eras.ts never rewrites history), so this is a
 *  simple growth check rather than an id-based diff. */
export function deriveMedalEarned(
  prevCompletedEras: { medal: string }[] | null | undefined,
  nextCompletedEras: { medal: string }[] | null | undefined,
): string | null {
  const prevLen = prevCompletedEras?.length ?? 0;
  const next = nextCompletedEras ?? [];
  if (next.length > prevLen) return next[next.length - 1].medal;
  return null;
}

/** Number of program-queue entries (crew cohort / leader development / R&D
 *  residency — programs.ts ProgramTrack) that were active (startedAtMs set)
 *  in `prev` and are no longer present at all in `next` — i.e. completed and
 *  dequeued by the tick engine. Counts, not ids: ProgramsPanel plays one
 *  chime per completion regardless of which track. */
export function countProgramCompletions(
  prevQueues: Record<string, { id: string; startedAtMs: number | null }[]> | null | undefined,
  nextQueues: Record<string, { id: string; startedAtMs: number | null }[]> | null | undefined,
): number {
  if (!prevQueues) return 0;
  const prevActive = new Set<string>();
  for (const list of Object.values(prevQueues)) {
    for (const p of list) if (p.startedAtMs !== null) prevActive.add(p.id);
  }
  const nextIds = new Set<string>();
  for (const list of Object.values(nextQueues || {})) {
    for (const p of list) nextIds.add(p.id);
  }
  let count = 0;
  Array.from(prevActive).forEach(id => { if (!nextIds.has(id)) count++; });
  return count;
}
