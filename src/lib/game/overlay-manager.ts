// ─── Space Tycoon: overlay arbitration (GAME_DESIGN_REVIEW_2026-09 §3) ──────
//
// Ten overlay surfaces mount at shell level, each with its own focus trap
// (useModalA11y) and, until this pass, no arbitration beyond a few ad-hoc
// "gate the lower one on the upper one being empty" checks. Two traps at
// once is the failure the A2.3 note on LeaderMomentOverlay describes: the
// lower surface mounts last, pulls focus, and a keyboard user tabs through a
// dialog they cannot see.
//
// This module is the pure half of the fix: a fixed priority order and one
// function that, given which surfaces WANT to show, names the single one
// that may. Everything else is queued — not dropped. Every "want" is backed
// by state that persists (a queue head, a pendingChoice, a flag), so a
// surface that loses arbitration simply shows the moment the winner clears.
//
// React side: src/components/game/OverlayManager.tsx.

export type OverlayId =
  | 'cinematic'          // CinematicOverlay — full-screen moments
  | 'leader'             // LeaderMomentOverlay — portrait-framed appointments/retirements
  | 'eventChoice'        // EventChoiceModal — mandatory decision
  | 'frontierGraduation' // FrontierGraduationModal — one-time celebration
  | 'operationsDebrief'  // OperationsDebriefModal — away-time ledger
  | 'dailyBonus'         // DailyBonusModal
  | 'achievements'       // AchievementsModal
  | 'featureUnlock'      // FeatureUnlockToast
  | 'competitiveUnlock'  // CompetitiveUnlockToast
  | 'tutorial';          // TutorialOverlay (FTUE) / GameTutorial (deck)

/** Highest priority first. The founder-approved order is
 *  cinematic > event-choice > frontier graduation > debrief > daily bonus >
 *  achievements > unlock toasts > tutorial hints; the leader moment keeps the
 *  slot the shipped A2.3 ordering gave it (between cinematic and choice). */
export const OVERLAY_PRIORITY: readonly OverlayId[] = [
  'cinematic',
  'leader',
  'eventChoice',
  'frontierGraduation',
  'operationsDebrief',
  'dailyBonus',
  'achievements',
  'featureUnlock',
  'competitiveUnlock',
  'tutorial',
];

export type OverlayWants = Partial<Record<OverlayId, boolean>>;

export interface OverlayArbitration {
  /** The one surface allowed to mount, or null when nothing wants to. */
  active: OverlayId | null;
  /** Surfaces that want to show but must wait, highest priority first. */
  queued: OverlayId[];
}

export function overlayPriority(id: OverlayId): number {
  const i = OVERLAY_PRIORITY.indexOf(id);
  return i === -1 ? OVERLAY_PRIORITY.length : i;
}

/** Pure arbitration. Unknown ids are ignored; ties cannot occur because the
 *  order is total. */
export function arbitrateOverlays(wants: OverlayWants): OverlayArbitration {
  const wanting = OVERLAY_PRIORITY.filter(id => wants[id] === true);
  return {
    active: wanting[0] ?? null,
    queued: wanting.slice(1),
  };
}
