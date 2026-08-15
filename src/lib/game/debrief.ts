// ─── Space Tycoon: Operations Debrief (Live-Service Wave LS2) ───────────────
// docs/LIVE_SERVICE_2026-08.md §LS2 mechanic 1. Assembles LS1's AwayLedger
// (away-operations.ts) + the before/after GameState pair into a structured,
// presentational digest for OperationsDebriefModal.tsx — "full-screen
// cinematic digest replacing the toast: earnings curve, completed queue
// items, directives executed, hazards weathered, senate results, ... what's
// on the calendar next... must end with three one-tap recommended actions."
//
// 100% pure and framework-free, same discipline as cinematic-moments.ts:
// takes state + a ledger, returns a plain data structure. No React, no
// side effects, no persistence — the debrief is recomputed fresh every time
// the page has an AwayLedger to show, never itself saved to GameState.

import type { GameState, AwayLedger } from './types';
import { isLapsedReturn, getReentryStipend } from './returning-commander';
import { DEBRIEF_COMPACT_THRESHOLD_MS, DEBRIEF_CINEMATIC_THRESHOLD_MS } from './constants';

/** 'toast': under 30 min away — a small non-blocking summary, not a modal.
 *  'compact': 30 min - 3 days — the standard debrief modal.
 *  'full': 3+ days — the same modal gets the cinematic art/title treatment
 *  (reuses CinematicOverlay's .cinematic-* CSS, which already respects
 *  prefers-reduced-motion — see GameStyles.tsx). */
export type DebriefTier = 'toast' | 'compact' | 'full';

export interface DebriefNextAction {
  id: string;
  label: string;
  reason: string;
  /** page.tsx tab id to navigate to on click. */
  tab: string;
}

export interface DebriefWorldEvent {
  icon: string;
  label: string;
}

export interface OperationsDebrief {
  tier: DebriefTier;
  cinematic: boolean;
  timeAwayLabel: string;
  efficiencyLabel: string;
  efficiencyPct: number;
  moneyDelta: number;
  resourcesDelta: Record<string, number>;
  gameMonthsProcessed: number;
  queueExecuted: AwayLedger['queueExecuted'];
  queueSkipped: AwayLedger['queueSkipped'];
  directiveFeesCharged: number;
  directiveActionsSummary: string[];
  hazardsApplied: AwayLedger['hazardsApplied'];
  worldEvents: DebriefWorldEvent[];
  isLapsedReturn: boolean;
  lapseDays: number;
  /** Informational only — the actual grant already happened via
   *  returning-commander.ts's startReturningCommanderTrack; this mirrors it
   *  for display so the debrief can say "you received $X." */
  reentryStipend: number;
  nextActions: DebriefNextAction[];
}

function formatTimeAway(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getDebriefTier(timeAwayMs: number): DebriefTier {
  if (timeAwayMs >= DEBRIEF_CINEMATIC_THRESHOLD_MS) return 'full';
  if (timeAwayMs >= DEBRIEF_COMPACT_THRESHOLD_MS) return 'compact';
  return 'toast';
}

/** Senate measures resolved while away — everything in nextState's vote
 *  history the player hadn't already seen resolved. prevState's docket (if
 *  any) records the quarter/resolved-flag the player last had loaded; any
 *  vote-history entry from a later quarter, or the SAME quarter if it was
 *  still unresolved at logout, happened during the absence. */
function collectWorldEvents(prevState: GameState, nextState: GameState, ledger: AwayLedger): DebriefWorldEvent[] {
  const prevQuarter = prevState.accordDocket?.quarterIndex ?? -1;
  const prevResolved = prevState.accordDocket?.resolved ?? true;

  const events: DebriefWorldEvent[] = (nextState.accordVoteHistory || [])
    .filter(v => v.quarterIndex > prevQuarter || (v.quarterIndex === prevQuarter && !prevResolved))
    .slice(0, 5)
    .map(v => ({
      icon: v.icon || '🏛️',
      label: `${v.measureName} — ${v.passed ? 'PASSED' : 'FAILED'}`,
    }));

  if (ledger.gameMonthsProcessed > 0) {
    events.push({
      icon: '🌍',
      label: `The world advanced ${ledger.gameMonthsProcessed} game-month${ledger.gameMonthsProcessed === 1 ? '' : 's'} while you were away.`,
    });
  }

  return events;
}

/** Up to 3 recommended one-tap actions — the debrief's required close
 *  (§2.2 item 5). Prioritized: unresolved problems first (skipped orders,
 *  hazard damage), then idle capacity (empty queue), then routine
 *  engagement, with a Returning Commander nudge folded in when relevant. */
function buildNextActions(state: GameState, ledger: AwayLedger, lapsed: boolean): DebriefNextAction[] {
  const actions: DebriefNextAction[] = [];

  if (ledger.queueSkipped.length > 0) {
    actions.push({
      id: 'fix_queue',
      tab: 'fleet',
      label: 'Review skipped orders',
      reason: `${ledger.queueSkipped.length} queued order${ledger.queueSkipped.length === 1 ? '' : 's'} couldn't start — check funds and prerequisites.`,
    });
  }
  if (ledger.hazardsApplied.length > 0) {
    actions.push({
      id: 'check_hazards',
      tab: 'fleet',
      label: 'Inspect hazard damage',
      reason: `${ledger.hazardsApplied.length} forecasted hazard${ledger.hazardsApplied.length === 1 ? '' : 's'} struck while away.`,
    });
  }
  if ((state.commandQueue || []).length === 0) {
    actions.push({
      id: 'set_queue',
      tab: 'research',
      label: 'Queue your next research or build',
      reason: 'Your command queue is empty — nothing runs automatically until you set it.',
    });
  }
  if (state.accordDocket && !state.accordDocket.resolved && (state.accordLobbying || []).length === 0) {
    actions.push({
      id: 'lobby',
      tab: 'governance',
      label: "Lobby this quarter's Senate docket",
      reason: 'A measure is open for lobbying before it resolves.',
    });
  }
  if (lapsed) {
    actions.push({
      id: 'returning_track',
      tab: 'dashboard',
      label: 'Review your Returning Commander objectives',
      reason: "Complete this week's re-entry objectives while your earnings boost is active.",
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: 'standing_orders',
      tab: 'fleet',
      label: 'Tune your standing directives',
      reason: 'Keep your empire running efficiently through your next absence.',
    });
  }

  return actions.slice(0, 3);
}

/** Pure assembly: ledger (LS1) + the state BEFORE catch-up (for baselining
 *  what the player already knew) + the state AFTER catch-up (LS1's
 *  applyAwayOperations result) -> a structured, presentational debrief.
 *  Called once per load whenever away-operations.ts produced a ledger —
 *  never mutates or reads/writes GameState itself. */
export function assembleOperationsDebrief(
  prevState: GameState,
  ledger: AwayLedger,
  nextState: GameState,
): OperationsDebrief {
  const tier = getDebriefTier(ledger.timeAwayMs);
  const lapsed = isLapsedReturn(ledger.timeAwayMs);
  const lapseDays = Math.round(ledger.timeAwayMs / 86_400_000);

  return {
    tier,
    cinematic: tier === 'full',
    timeAwayLabel: formatTimeAway(ledger.timeAwayMs),
    efficiencyLabel: ledger.efficiencyTierLabel,
    efficiencyPct: ledger.effectiveEfficiencyPct,
    moneyDelta: ledger.moneyDelta,
    resourcesDelta: ledger.resourcesDelta,
    gameMonthsProcessed: ledger.gameMonthsProcessed,
    queueExecuted: ledger.queueExecuted,
    queueSkipped: ledger.queueSkipped,
    directiveFeesCharged: ledger.directiveFeesCharged,
    directiveActionsSummary: ledger.directiveActionsSummary,
    hazardsApplied: ledger.hazardsApplied,
    worldEvents: collectWorldEvents(prevState, nextState, ledger),
    isLapsedReturn: lapsed,
    lapseDays,
    reentryStipend: lapsed ? getReentryStipend(ledger.timeAwayMs) : 0,
    nextActions: buildNextActions(nextState, ledger, lapsed),
  };
}
