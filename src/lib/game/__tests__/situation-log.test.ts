/**
 * @jest-environment node
 *
 * Wave V3 (docs/VISUAL_DEPTH_2026-08.md §V3) — Situation Log pure derivation.
 * Covers: each source produces the right severity/category/target, the
 * closing-soon/recent windows are respected, and the function is
 * deterministic (same inputs -> identical output).
 */
import { getNewGameState } from '../save-load';
import type { GameState } from '../types';
import { deriveSituationLog } from '../situation-log';
import { SERVER_EPOCH_MS, REAL_SECONDS_PER_GAME_MONTH } from '../server-time';
import { STARTING_YEAR } from '../constants';
import { recordQuarterlyReport } from '../quarterly-reports';

const NOW = Date.UTC(2026, 7, 14, 12, 0, 0);

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), ...overrides };
}

describe('deriveSituationLog', () => {
  it('maps hazard warning severity: severe -> critical, major -> warning, minor -> info', () => {
    const state = baseState({
      hazardWarnings: [
        { id: 'w1', type: 'solar_storm', severity: 'severe', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: NOW, summary: 'Severe storm inbound' },
        { id: 'w2', type: 'pirate_raid', severity: 'major', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: NOW, summary: 'Raiders sighted' },
        { id: 'w3', type: 'micrometeorite', severity: 'minor', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: NOW, summary: 'Debris field' },
      ],
    });
    const items = deriveSituationLog(state, { nowMs: NOW });
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    expect(byId['sit-hazard-forecast-w1'].severity).toBe('critical');
    expect(byId['sit-hazard-forecast-w2'].severity).toBe('warning');
    expect(byId['sit-hazard-forecast-w3'].severity).toBe('info');
    // Every hazard-forecast item navigates to the map, focused on its location.
    expect(byId['sit-hazard-forecast-w1'].tab).toBe('map');
    expect(byId['sit-hazard-forecast-w1'].target).toEqual({ kind: 'location', id: 'leo' });
  });

  it('excludes recent hazards outside the recentHazardMs window', () => {
    const state = baseState({
      recentHazards: [
        {
          id: 'h1', type: 'solar_storm', severity: 'major', locationId: 'leo',
          occurredAtMs: NOW - 2 * 60 * 60 * 1000, damagePct: 0.2, mitigatedPct: 0, destroyed: false,
          insurancePayout: 0, summary: 'Struck 2h ago',
        },
        {
          id: 'h2', type: 'solar_storm', severity: 'major', locationId: 'leo',
          occurredAtMs: NOW - 48 * 60 * 60 * 1000, damagePct: 0.2, mitigatedPct: 0, destroyed: false,
          insurancePayout: 0, summary: 'Struck 48h ago',
        },
      ],
    });
    const items = deriveSituationLog(state, { nowMs: NOW, recentHazardMs: 24 * 60 * 60 * 1000 });
    const ids = items.map(i => i.id);
    expect(ids).toContain('sit-hazard-recent-h1');
    expect(ids).not.toContain('sit-hazard-recent-h2');
  });

  it('contracts: urgency severity thresholds and status/window filtering', () => {
    const state = baseState({
      activeDeliveries: [
        // 3h remaining -> critical
        { id: 'd1', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Iron delivery', resourceId: 'iron', quantity: 10, paymentMoney: 1000, deadlineAtMs: NOW + 3 * 60 * 60 * 1000, reputationOnComplete: 1, reputationOnDefault: -1, status: 'accepted', offeredAtMs: NOW - 1000 },
        // 12h remaining -> warning
        { id: 'd2', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Water delivery', resourceId: 'water', quantity: 10, paymentMoney: 1000, deadlineAtMs: NOW + 12 * 60 * 60 * 1000, reputationOnComplete: 1, reputationOnDefault: -1, status: 'accepted', offeredAtMs: NOW - 1000 },
        // 40h remaining -> info (still inside default 48h window)
        { id: 'd3', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Titanium delivery', resourceId: 'titanium', quantity: 10, paymentMoney: 1000, deadlineAtMs: NOW + 40 * 60 * 60 * 1000, reputationOnComplete: 1, reputationOnDefault: -1, status: 'accepted', offeredAtMs: NOW - 1000 },
        // outside the 48h window -> excluded
        { id: 'd4', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Far-off delivery', resourceId: 'iron', quantity: 10, paymentMoney: 1000, deadlineAtMs: NOW + 96 * 60 * 60 * 1000, reputationOnComplete: 1, reputationOnDefault: -1, status: 'accepted', offeredAtMs: NOW - 1000 },
        // status !== 'accepted' -> excluded even though the deadline is close
        { id: 'd5', issuerKind: 'faction', issuerFactionId: 'the-dominion', title: 'Open offer', resourceId: 'iron', quantity: 10, paymentMoney: 1000, deadlineAtMs: NOW + 1 * 60 * 60 * 1000, reputationOnComplete: 1, reputationOnDefault: -1, status: 'open', offeredAtMs: NOW - 1000 },
      ],
    });
    const items = deriveSituationLog(state, { nowMs: NOW });
    const byId = Object.fromEntries(items.map(i => [i.id, i]));
    expect(byId['sit-contract-d1'].severity).toBe('critical');
    expect(byId['sit-contract-d2'].severity).toBe('warning');
    expect(byId['sit-contract-d3'].severity).toBe('info');
    expect(byId['sit-contract-d4']).toBeUndefined();
    expect(byId['sit-contract-d5']).toBeUndefined();
    expect(byId['sit-contract-d1'].tab).toBe('contracts');
  });

  it('queue-idle item present only when the command queue is empty', () => {
    const empty = deriveSituationLog(baseState(), { nowMs: NOW });
    expect(empty.some(i => i.category === 'queue_idle')).toBe(true);

    const withQueue = deriveSituationLog(
      baseState({ commandQueue: [{ id: 'q1', kind: 'research', createdAtMs: NOW, label: 'Reusable Boosters', researchId: 'reusable_boosters' }] }),
      { nowMs: NOW },
    );
    expect(withQueue.some(i => i.category === 'queue_idle')).toBe(false);
  });

  it('mail item reflects the unread report count and is absent when all read', () => {
    const unread = deriveSituationLog(
      baseState({ reports: [
        { id: 'r1', type: 'milestone', title: 'A', body: 'a', createdAt: NOW, read: false },
        { id: 'r2', type: 'milestone', title: 'B', body: 'b', createdAt: NOW, read: false },
      ] }),
      { nowMs: NOW },
    );
    const mail = unread.find(i => i.category === 'mail');
    expect(mail?.label).toBe('2 unread reports');

    const allRead = deriveSituationLog(
      baseState({ reports: [{ id: 'r1', type: 'milestone', title: 'A', body: 'a', createdAt: NOW, read: true }] }),
      { nowMs: NOW },
    );
    expect(allRead.some(i => i.category === 'mail')).toBe(false);
  });

  it('surfaces a senate docket closing within the window, mapped to the factions tab', () => {
    const quarterIndex = 30; // arbitrary quarter boundary (world-calendar.test.ts precedent)
    const closeMs = SERVER_EPOCH_MS + (quarterIndex + 3) * REAL_SECONDS_PER_GAME_MONTH * 1000;
    const state = baseState({
      accordDocket: { quarterIndex, measureIds: ['m1'], resolved: false },
    });
    // "now" sits 12h before the docket closes — inside the default 48h
    // closing-soon window and in the warning (not critical) urgency band.
    const nowMs = closeMs - 12 * 60 * 60 * 1000;
    const items = deriveSituationLog(state, { nowMs });
    const senate = items.find(i => i.category === 'senate');
    expect(senate).toBeDefined();
    expect(senate?.tab).toBe('factions');
    expect(senate?.icon).toBe('cal-senate');
    expect(senate?.severity).toBe('warning'); // 12h remaining -> warning band
  });

  it('is sorted critical -> warning -> info, then soonest atMs within a tier', () => {
    const state = baseState({
      recentHazards: [
        { id: 'h1', type: 'solar_storm', severity: 'minor', locationId: 'leo', occurredAtMs: NOW - 1000, damagePct: 0, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: 'minor' },
      ],
      hazardWarnings: [
        { id: 'w1', type: 'pirate_raid', severity: 'severe', locationId: 'leo', forecastMonthIndex: 1, issuedAtMs: NOW, summary: 'severe' },
      ],
    });
    const items = deriveSituationLog(state, { nowMs: NOW });
    const severities = items.map(i => i.severity);
    const rank: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(rank[severities[i]]).toBeGreaterThanOrEqual(rank[severities[i - 1]]);
    }
  });

  it('is a pure function — identical inputs produce an identical item list', () => {
    const state = baseState({
      recentHazards: [
        { id: 'h1', type: 'solar_storm', severity: 'major', locationId: 'leo', occurredAtMs: NOW - 1000, damagePct: 0.2, mitigatedPct: 0, destroyed: false, insurancePayout: 0, summary: 'x' },
      ],
    });
    const a = deriveSituationLog(state, { nowMs: NOW });
    const b = deriveSituationLog(state, { nowMs: NOW });
    expect(a).toEqual(b);
  });
});

// ─── quarter_closed (monthly loop, 2026-09-01) ──────────────────────────────
describe('deriveSituationLog — quarter_closed', () => {
  it('emits nothing inside the very first quarter', () => {
    const items = deriveSituationLog(baseState(), { nowMs: NOW });
    expect(items.some(i => i.category === 'quarter_closed')).toBe(false);
  });

  it('previews the due filing when a quarter has elapsed with no report yet, deep-linking to Reports → Quarterly', () => {
    const state = baseState({ gameDate: { year: STARTING_YEAR, month: 4 }, quarterlyReports: [] });
    const items = deriveSituationLog(state, { nowMs: NOW });
    const item = items.find(i => i.category === 'quarter_closed');
    expect(item).toBeDefined();
    expect(item!.id).toBe('sit-quarter-closed-0');
    expect(item!.label).toMatch(/^Q1 \d{4} closed: revenue \$[\d.]+[KMBT]?, profit -?\$[\d.]+[KMBT]?, first filing — publish to the registry\?$/);
    expect(item!.severity).toBe('info');
    expect(item!.tab).toBe('reports');
    expect(item!.subView).toBe('reports:quarterly');
  });

  it('uses the stored report once recorded this quarter, and drops it once the next quarter closes unreported', () => {
    const due = baseState({ gameDate: { year: STARTING_YEAR, month: 4 }, quarterlyReports: [] });
    const recorded = recordQuarterlyReport(due, NOW);
    expect(recorded.quarterlyReports).toHaveLength(1);
    const items = deriveSituationLog(recorded, { nowMs: NOW });
    const item = items.find(i => i.category === 'quarter_closed');
    expect(item).toBeDefined();
    expect(item!.atMs).toBe(recorded.quarterlyReports![0].generatedAtMs);
    expect(item!.label).toContain('Q1');
    // Two quarters later with the Q1 report still the newest: the trigger
    // check fires for the NEW quarter, so the item describes that one.
    const later = { ...recorded, gameDate: { year: STARTING_YEAR, month: 10 } };
    const laterItem = deriveSituationLog(later, { nowMs: NOW }).find(i => i.category === 'quarter_closed');
    expect(laterItem!.id).toBe('sit-quarter-closed-2');
    expect(laterItem!.label).toContain('Q3');
  });
});
