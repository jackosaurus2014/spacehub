// ─── Space Tycoon: real-world career crossover copy ──────────────────────────
// Pure copy-builder for the WorkforcePanel footer that points players at
// real /space-talent job listings. Kept separate from the component so the
// year/number formatting is unit-testable without a DOM/fetch environment.

import { getInGameLoreYear } from './lore-year';

/** Builds "Your corporation is hiring in {year}. In the real world, {N}
 *  space-industry jobs are open right now." — or null when there is no
 *  honest live count to report (never fabricate a number). */
export function buildCareerCrossoverLine(jobCount: number | null | undefined, now: Date = new Date()): string | null {
  if (typeof jobCount !== 'number' || !Number.isFinite(jobCount) || jobCount <= 0) return null;
  const year = getInGameLoreYear(now);
  return `Your corporation is hiring in ${year}. In the real world, ${Math.round(jobCount).toLocaleString('en-US')} space-industry jobs are open right now.`;
}
