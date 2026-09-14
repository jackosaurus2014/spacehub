// ─── HUD header density (2026-09-14) ────────────────────────────────────────
// Bridge mode (lib/game/bridge-mode.ts) hides the SITE chrome so the map fills
// the screen. It does nothing about the GAME's own chrome, and at 1366×900
// that was still 293 px above the map stage:
//
//   ResourceBar plate      139 px   (main row wrapped to two lines, 88 px,
//                                    + the resource stock/flow strip, 28 px)
//   Protected Frontier      48 px   (a full-width band for "30d left · $109M")
//   hub bar                 53 px
//   sub-view row            53 px
//
// The money row wrapped because the audio/haptics/density cluster carries a
// 44 px touch-target floor and three flex groups do not fit inside the bar's
// `max-w-5xl` (1024 px) content box. So the fix is not to delete anything —
// it is to (a) fold those switches behind ONE overflow button, (b) let the
// plate use the full width bridge mode just handed it, (c) collapse the
// resource strip to a count with the cells one click/hover away, and (d) drop
// the Frontier band to a chip inside the money row once it stops being news.
//
// Pure decision functions live here so the rules are unit-testable without a
// DOM, the same posture as bridge-mode.ts and map-stage.ts.

/** A Frontier summary's shape, narrowed to what the layout decision reads. */
export interface FrontierLayoutInput {
  /** Whole days left of the 30-day Protected Frontier (0 during the grace period). */
  remainingDays: number;
  /** The save is over the graduation threshold and will auto-graduate. */
  autoGraduateReady: boolean;
}

/** How the Protected Frontier status renders in the header. */
export type FrontierVariant = 'band' | 'chip';

/** Days of the 30-day Frontier during which the band still reads as news.
 *  After this the same three figures ride in the money row as a chip. */
export const FRONTIER_BAND_NEW_DAYS = 2;

/** Days remaining at or below which the band comes back regardless of mode —
 *  graduation is imminent and the player has a decision to make. */
export const FRONTIER_BAND_URGENT_DAYS = 3;

/** Graduation is a live decision right now: the last three days, the grace
 *  period (remainingDays === 0), or auto-graduation already armed. Urgency
 *  keeps the band in BOTH modes — bridge mode buys screen space, not the
 *  right to bury a deadline. */
export function frontierIsUrgent(f: FrontierLayoutInput): boolean {
  return f.autoGraduateReady || f.remainingDays <= FRONTIER_BAND_URGENT_DAYS;
}

/** Band or chip.
 *
 *  `compact` is bridge mode, where the player has explicitly asked for the
 *  map to take the screen: only urgency earns a full-width band there.
 *  Outside bridge mode the band also survives while the Frontier is still
 *  news (its first two days) — a player who has not pressed F sees what
 *  they saw before for as long as the status is worth announcing. */
export function frontierVariant(
  f: FrontierLayoutInput | null | undefined,
  compact = false,
): FrontierVariant {
  if (!f) return 'chip';
  if (frontierIsUrgent(f)) return 'band';
  if (compact) return 'chip';
  return f.remainingDays > 30 - FRONTIER_BAND_NEW_DAYS ? 'band' : 'chip';
}

/** Summary line for the collapsed resource strip: how many stockpiles are on
 *  the strip and how many of them need a decision (short of an input, or
 *  draining inside three months). Text, never colour, carries the warning. */
export interface ResourceStripSummary {
  total: number;
  attention: number;
  /** Visible label, e.g. "6 resources · 2 low". */
  label: string;
  /** Accessible name for the disclosure button. */
  ariaLabel: string;
}

export interface ResourceStripFlowInput {
  short?: boolean;
  depletionMonths: number | null;
}

/** Months of remaining cover below which a stockpile is called out. Mirrors
 *  the amber cell treatment in ResourceBar's ResourceFlowCell. */
export const RESOURCE_ATTENTION_MONTHS = 3;

export function resourceStripSummary(flows: readonly ResourceStripFlowInput[]): ResourceStripSummary {
  const total = flows.length;
  const attention = flows.filter(
    f => f.short || (f.depletionMonths !== null && f.depletionMonths <= RESOURCE_ATTENTION_MONTHS),
  ).length;
  const noun = total === 1 ? 'resource' : 'resources';
  const label = attention > 0 ? `${total} ${noun} · ${attention} low` : `${total} ${noun}`;
  const ariaLabel = attention > 0
    ? `Resource stocks and monthly flow — ${total} tracked, ${attention} running low. Show the detail.`
    : `Resource stocks and monthly flow — ${total} tracked. Show the detail.`;
  return { total, attention, label, ariaLabel };
}
