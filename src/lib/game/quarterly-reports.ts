// ─── Space Tycoon: Quarterly Corporate Reports ──────────────────────────────
// Per CLAUDE.md: "Every corporation produces an automatic public quarterly —
// revenue, growth rate, notable acquisitions." Per docs/SESSION_DESIGN.md this
// fills the "Monthly / Quarterly" loop gap between Weekly (seasons/leagues)
// and Campaign (prestige/legacy) — "a clear 30-day measurement point" (here,
// a 3-game-month quarter, consistent with the existing season cadence defined
// in server-time.ts's getCurrentSeason()).
//
// Quarter number is derived from the player's own game clock (`state.gameDate`),
// NOT the global server clock in server-time.ts — state.gameDate is what
// actually advances via processTick() and is what every other periodic
// system in game-engine.ts (achievements, legacy milestones) keys off of.
// A "quarter" is 3 game-months, matching getCurrentSeason()'s definition.

import type { GameDate, GameState } from './types';
import { STARTING_YEAR } from './constants';
import { computeEconomyReport } from './economy-report';
import { computeNetWorth } from './frontier';
import { generateId, formatMoney } from './formulas';
// W13 (Corporate Doctrine & Board Politics, docs/4X_BASELINE_2026-08.md
// §1.7): board directives hook this module's generation point additively —
// see the bottom of recordQuarterlyReport below.
import { advanceBoardDirectives } from './corporate-doctrine';
import { addReputationPoints } from './reputation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QuarterlyReport {
  id: string;
  /** 0-based quarter index since game start (Q1 of Year 1 = index 0). */
  quarterIndex: number;
  /** 1-based, human-facing quarter number ("Quarter 3"). */
  quarterNumber: number;
  /** Game year this quarter falls in. */
  gameYear: number;
  /** 1-4, which quarter of that game year. */
  quarterOfYear: number;
  generatedAtMs: number;
  gameDate: GameDate;

  // Snapshot financials — monthly run-rate at report time × 3 (a quarter's
  // worth), consistent with the game's monthly revenue/cost model. Labeled
  // as an estimate because the engine does not persist per-tick history.
  revenue: number;
  costs: number;
  profit: number;

  netWorth: number;
  fleetCount: number;
  buildingCount: number;
  corporationTier: number;

  /** Up to 5 notable event titles pulled from the event log since the prior report. */
  notableEvents: string[];

  /** % change in net worth vs. the prior stored report. Null for the first report. */
  growthRatePct: number | null;

  // ─── Wave F (h): previously-invisible P&L lines (from economy-report.ts's
  // pnlLines, monthly figures × 3 for the quarter — except outstandingRepairCost,
  // a standing balance, not a monthly charge). Optional: older stored reports
  // (pre-Wave-F) don't have these fields; readers must handle undefined. ────
  governorTaxQuarterly?: number;
  subsidiaryIncomeQuarterly?: number;
  insurancePremiumQuarterly?: number;
  outstandingRepairCost?: number;
}

// ─── Quarter derivation (from the player's own game clock) ─────────────────

/** Total whole game-months elapsed since STARTING_YEAR/January. */
export function getTotalGameMonthsElapsed(gameDate: GameDate): number {
  return (gameDate.year - STARTING_YEAR) * 12 + (gameDate.month - 1);
}

/** 0-based index of the quarter the player is CURRENTLY in (may be in-progress). */
export function getCurrentQuarterIndex(gameDate: GameDate): number {
  return Math.floor(getTotalGameMonthsElapsed(gameDate) / 3);
}

/** 0-based index of the most recently FULLY COMPLETED quarter, or -1 if the
 *  player is still inside their very first quarter (nothing to report yet). */
export function getCompletedQuarterIndex(gameDate: GameDate): number {
  return getCurrentQuarterIndex(gameDate) - 1;
}

// ─── Trigger check ───────────────────────────────────────────────────────────

/** True when a new quarter has fully elapsed since the last stored report
 *  (or the player has completed their first quarter and has no report yet). */
export function shouldGenerateQuarterlyReport(state: GameState): boolean {
  const completedIdx = getCompletedQuarterIndex(state.gameDate);
  if (completedIdx < 0) return false;
  const reports = state.quarterlyReports || [];
  const lastIdx = reports.length > 0 ? reports[reports.length - 1].quarterIndex : -1;
  return completedIdx > lastIdx;
}

// ─── Generation ──────────────────────────────────────────────────────────────

/** Build the QuarterlyReport for the most recently completed quarter.
 *  Pure function — caller is responsible for appending the result to
 *  state.quarterlyReports (see recordQuarterlyReport below). */
export function generateQuarterlyReport(state: GameState, now: number = Date.now()): QuarterlyReport {
  const quarterIndex = getCompletedQuarterIndex(state.gameDate);
  const quarterNumber = quarterIndex + 1;
  const gameYear = STARTING_YEAR + Math.floor(quarterIndex / 4);
  const quarterOfYear = (quarterIndex % 4) + 1;

  const econ = computeEconomyReport(state, now);
  const netWorth = computeNetWorth(state);

  const priorReports = state.quarterlyReports || [];
  const priorReport = priorReports.length > 0 ? priorReports[priorReports.length - 1] : null;
  const growthRatePct = priorReport
    ? ((netWorth - priorReport.netWorth) / Math.max(1, Math.abs(priorReport.netWorth))) * 100
    : null;

  // Notable events from within the completed quarter's game-month window
  // (eventLog entries carry a GameDate, not a wall-clock timestamp, so we
  // bucket by total-months-elapsed rather than real time). Prefer
  // milestone-type entries; fall back to whatever's in the window.
  const quarterStartMonths = quarterIndex * 3;
  const quarterEndMonthsExclusive = quarterStartMonths + 3;
  const eventsInQuarter = (state.eventLog || []).filter(e => {
    const m = getTotalGameMonthsElapsed(e.date);
    return m >= quarterStartMonths && m < quarterEndMonthsExclusive;
  });
  const milestoneEvents = eventsInQuarter.filter(e => e.type === 'milestone');
  const notableEvents = (milestoneEvents.length > 0 ? milestoneEvents : eventsInQuarter)
    .slice(0, 5)
    .map(e => e.title);

  return {
    id: generateId(),
    quarterIndex,
    quarterNumber,
    gameYear,
    quarterOfYear,
    generatedAtMs: now,
    gameDate: { ...state.gameDate },

    revenue: Math.round(econ.monthlyRevenue * 3),
    costs: Math.round(econ.monthlyCosts * 3),
    profit: Math.round(econ.monthlyNet * 3),

    netWorth,
    fleetCount: (state.ships || []).filter(s => s.isBuilt).length,
    buildingCount: state.buildings.filter(b => b.isComplete).length,
    corporationTier: state.corporationTier || 1,

    governorTaxQuarterly: Math.round(econ.pnlLines.governorTaxMonthly * 3),
    subsidiaryIncomeQuarterly: Math.round(econ.pnlLines.subsidiaryIncomeMonthly * 3),
    insurancePremiumQuarterly: Math.round(econ.costs.insurancePremium * 3),
    outstandingRepairCost: econ.pnlLines.outstandingRepairCost,

    notableEvents,
    growthRatePct,
  };
}

/** Append a freshly generated quarterly report to state, if one is due.
 *  No-op (returns the same state reference) if no quarter boundary has
 *  passed. Also drops a milestone entry into the event log so the report
 *  is visible in the normal activity feed, matching how victories/achievements
 *  announce themselves. */
export function recordQuarterlyReport(state: GameState, now: number = Date.now()): GameState {
  if (!shouldGenerateQuarterlyReport(state)) return state;
  const report = generateQuarterlyReport(state, now);
  const growthLabel = report.growthRatePct === null
    ? 'first report on file'
    : `${report.growthRatePct >= 0 ? '+' : ''}${report.growthRatePct.toFixed(1)}% net worth vs. last quarter`;

  let next: GameState = {
    ...state,
    quarterlyReports: [...(state.quarterlyReports || []), report],
    eventLog: [{
      id: generateId(),
      date: state.gameDate,
      type: 'milestone' as const,
      title: `📊 Quarterly Report: Q${report.quarterNumber}`,
      description: `Net worth ${growthLabel}. Revenue ${formatMoney(report.revenue)}, profit ${formatMoney(report.profit)}.`,
    }, ...(state.eventLog || [])].slice(0, 50),
  };

  // W13 (Corporate Doctrine & Board Politics): additively hook this
  // generation point — evaluate the directive that governed the quarter
  // just reported and seed the next one. A fresh corporation's first report
  // has no pending directive yet (nothing to evaluate), so this only ever
  // ADDS an eventLog entry from its second report onward; the existing
  // "does not duplicate a report" guard above is untouched either way.
  const cycle = advanceBoardDirectives(
    state,
    { quarterIndex: report.quarterIndex, profit: report.profit, growthRatePct: report.growthRatePct },
    now,
  );
  next = { ...next, boardDirectives: cycle.boardDirectives };
  if (cycle.reputationGain > 0) next = addReputationPoints(next, cycle.reputationGain);
  if (cycle.moraleDelta !== 0 && next.workforce) {
    const morale = next.workforce.morale ?? 1.0;
    next = { ...next, workforce: { ...next.workforce, morale: Math.max(0.5, Math.min(1.15, morale + cycle.moraleDelta)) } };
  }
  if (cycle.evaluated) {
    const hit = cycle.evaluated.status === 'hit';
    next = {
      ...next,
      eventLog: [{
        id: generateId(),
        date: state.gameDate,
        type: 'milestone' as const,
        title: hit ? `✅ Board directive met: ${cycle.evaluated.label}` : `⚠️ Board directive missed: ${cycle.evaluated.label}`,
        description: hit
          ? `The board is pleased. +${cycle.reputationGain} reputation.`
          : 'The board expected better. Crew morale takes a small hit.',
      }, ...next.eventLog].slice(0, 50),
    };
  }

  return next;
}
