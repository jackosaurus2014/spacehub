/**
 * @jest-environment node
 *
 * Live-Service Wave LS2 "Operations Debrief" — docs/LIVE_SERVICE_2026-08.md
 * §LS2 mechanic 1. Covers: tier thresholds (toast/compact/full), section
 * assembly from a mock AwayLedger + before/after GameState pair, senate
 * vote-history diffing, and the "always <=3 next actions" invariant.
 */
import { getNewGameState } from '../save-load';
import type { GameState, AwayLedger } from '../types';
import { assembleOperationsDebrief, getDebriefTier } from '../debrief';
import { DEBRIEF_COMPACT_THRESHOLD_MS, DEBRIEF_CINEMATIC_THRESHOLD_MS } from '../constants';

const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), money: 1_000_000_000, createdAt: NOW - 999_999_999, lastTickAt: NOW, ...overrides };
}

function baseLedger(overrides: Partial<AwayLedger> = {}): AwayLedger {
  return {
    computedAtMs: NOW,
    timeAwayMs: 60 * 60 * 1000, // 1h
    efficiencyTierLabel: 'Fresh shift (0-12h)',
    effectiveEfficiencyPct: 1.0,
    moneyDelta: 5_000_000,
    resourcesDelta: {},
    gameMonthsProcessed: 0,
    directiveFeesCharged: 0,
    directiveActionsSummary: [],
    queueExecuted: [],
    queueSkipped: [],
    hazardsApplied: [],
    message: 'test',
    ...overrides,
  };
}

describe('getDebriefTier', () => {
  it('is toast below the compact threshold', () => {
    expect(getDebriefTier(DEBRIEF_COMPACT_THRESHOLD_MS - 1)).toBe('toast');
  });
  it('is compact between the two thresholds', () => {
    expect(getDebriefTier(DEBRIEF_COMPACT_THRESHOLD_MS)).toBe('compact');
    expect(getDebriefTier(DEBRIEF_CINEMATIC_THRESHOLD_MS - 1)).toBe('compact');
  });
  it('is full at/above the cinematic threshold', () => {
    expect(getDebriefTier(DEBRIEF_CINEMATIC_THRESHOLD_MS)).toBe('full');
  });
});

describe('assembleOperationsDebrief', () => {
  it('mirrors the ledger fields through verbatim', () => {
    const prev = baseState();
    const ledger = baseLedger({ moneyDelta: 12_345, resourcesDelta: { iron: 10 }, gameMonthsProcessed: 2 });
    const debrief = assembleOperationsDebrief(prev, ledger, prev);
    expect(debrief.moneyDelta).toBe(12_345);
    expect(debrief.resourcesDelta).toEqual({ iron: 10 });
    expect(debrief.gameMonthsProcessed).toBe(2);
    expect(debrief.efficiencyLabel).toBe(ledger.efficiencyTierLabel);
  });

  it('cinematic flag matches the "full" tier exactly', () => {
    const prev = baseState();
    const compact = assembleOperationsDebrief(prev, baseLedger({ timeAwayMs: DEBRIEF_COMPACT_THRESHOLD_MS }), prev);
    expect(compact.tier).toBe('compact');
    expect(compact.cinematic).toBe(false);
    const full = assembleOperationsDebrief(prev, baseLedger({ timeAwayMs: DEBRIEF_CINEMATIC_THRESHOLD_MS }), prev);
    expect(full.tier).toBe('full');
    expect(full.cinematic).toBe(true);
  });

  it('marks isLapsedReturn / lapseDays / reentryStipend only for 14+ day absences', () => {
    const prev = baseState();
    const short = assembleOperationsDebrief(prev, baseLedger({ timeAwayMs: 3 * 24 * 60 * 60 * 1000 }), prev);
    expect(short.isLapsedReturn).toBe(false);
    expect(short.reentryStipend).toBe(0);

    const lapsed = assembleOperationsDebrief(prev, baseLedger({ timeAwayMs: 20 * 24 * 60 * 60 * 1000 }), prev);
    expect(lapsed.isLapsedReturn).toBe(true);
    expect(lapsed.lapseDays).toBe(20);
    expect(lapsed.reentryStipend).toBeGreaterThan(0);
  });

  it('surfaces senate measures resolved strictly after the docket the player last saw', () => {
    const prev = baseState({ accordDocket: { quarterIndex: 5, measureIds: ['m1'], resolved: false } });
    const next = baseState({
      accordDocket: { quarterIndex: 6, measureIds: ['m2'], resolved: false },
      accordVoteHistory: [
        { quarterIndex: 5, measureId: 'm1', measureName: 'Orbital Tariff Reform', icon: '🏛️', category: 'trade', passed: true, playerStance: 'support', publishedOdds: 0.5, finalOdds: 0.6, effectLabel: 'test' },
        // A stale, already-seen entry from BEFORE the docket the player had —
        // must NOT appear (the player already saw this quarter resolve).
        { quarterIndex: 3, measureId: 'm0', measureName: 'Old Measure', icon: '🏛️', category: 'trade', passed: false, playerStance: null, publishedOdds: 0.5, finalOdds: 0.4, effectLabel: 'test' },
      ],
    });
    const debrief = assembleOperationsDebrief(prev, baseLedger(), next);
    const labels = debrief.worldEvents.map(e => e.label);
    expect(labels.some(l => l.includes('Orbital Tariff Reform'))).toBe(true);
    expect(labels.some(l => l.includes('Old Measure'))).toBe(false);
  });

  it('adds a "world advanced N months" line when catch-up processed game-months', () => {
    const prev = baseState();
    const debrief = assembleOperationsDebrief(prev, baseLedger({ gameMonthsProcessed: 3 }), prev);
    expect(debrief.worldEvents.some(e => e.label.includes('3 game-months'))).toBe(true);
  });

  it('never returns more than 3 next actions', () => {
    const prev = baseState();
    const next = baseState({
      commandQueue: [],
      accordDocket: { quarterIndex: 1, measureIds: ['m1'], resolved: false },
      accordLobbying: [],
    });
    const debrief = assembleOperationsDebrief(
      prev,
      baseLedger({ timeAwayMs: 20 * 24 * 60 * 60 * 1000, queueSkipped: [{ kind: 'research', label: 'X', ok: false, reason: 'insufficient_funds' }], hazardsApplied: [{ monthIndex: 1, summary: 'Solar storm' }] }),
      next,
    );
    expect(debrief.nextActions.length).toBeLessThanOrEqual(3);
    expect(debrief.nextActions.length).toBeGreaterThan(0);
  });

  it('always suggests at least one action even when nothing went wrong', () => {
    const prev = baseState();
    const next = baseState({ commandQueue: [{ id: 'o1', kind: 'research', createdAtMs: NOW, label: 'Test' }] });
    const debrief = assembleOperationsDebrief(prev, baseLedger(), next);
    expect(debrief.nextActions.length).toBeGreaterThan(0);
  });
});
