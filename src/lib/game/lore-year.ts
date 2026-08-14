// ─── Space Tycoon: narrative-year offset ─────────────────────────────────────
// docs/LORE.md pins the game's narrative present: "The year is 2150 CE." That
// line was authored when the real-world calendar read 2026 (the same
// real-world anchor as STARTING_YEAR in ./constants.ts). Rather than
// hardcoding "2150" anywhere copy references the in-universe year — which
// would read as a typo the moment the real calendar rolls to 2027 — every
// consumer computes the narrative year as a fixed offset from *today's* real
// year. The offset itself only changes if docs/LORE.md's stated year changes.

/** The real-world year LORE.md's "2150 CE" was written against. */
export const LORE_EPOCH_REAL_YEAR = 2026;

/** The in-universe year stated in docs/LORE.md as of LORE_EPOCH_REAL_YEAR. */
export const LORE_EPOCH_GAME_YEAR = 2150;

/** Years the game's narrative present sits ahead of the real world. Fixed at
 *  124 (2150 − 2026) — never recompute this from "now," only apply it to
 *  "now" (see getInGameLoreYear). */
export const LORE_YEAR_OFFSET = LORE_EPOCH_GAME_YEAR - LORE_EPOCH_REAL_YEAR;

/** The in-universe "current year" for narrative copy (Sol Historical
 *  Archive, career-crossover footer, etc.) — always real-world-year +
 *  LORE_YEAR_OFFSET, so it advances automatically as real time passes and
 *  never needs a manual doc update to stay accurate. */
export function getInGameLoreYear(now: Date = new Date()): number {
  return now.getFullYear() + LORE_YEAR_OFFSET;
}

/** The offset in years, exposed on its own for copy that reads "N years ago
 *  today" rather than "the year is Y." */
export function getLoreYearOffset(): number {
  return LORE_YEAR_OFFSET;
}
