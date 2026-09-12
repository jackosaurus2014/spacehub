/**
 * Outliner "Operations" shows research in progress with the same countdown
 * as construction (Jay, 2026-09-12): one row per active slot, ETA from the
 * real clock, opens the Research tab rather than focusing the map.
 */
import { getNewGameState } from '../save-load';
import { buildOrderQueue } from '../order-queue';
import { RESEARCH } from '../research-tree';
import type { GameState, ActiveResearch } from '../types';

function research(definitionId: string, startedAtMs: number, realDurationSeconds: number): ActiveResearch {
  return { definitionId, startDate: { year: 2100, month: 1 }, progressMonths: 0, totalMonths: 6, startedAtMs, realDurationSeconds } as ActiveResearch;
}

describe('order queue: research rows', () => {
  const def = RESEARCH[0];
  it('emits a row per active research slot with a live ETA and the research tab', () => {
    const now = Date.now();
    const state: GameState = { ...getNewGameState(), activeResearch: research(def.id, now - 30_000, 120), activeResearch2: research(RESEARCH[1].id, now - 60_000, 60) };
    const rows = buildOrderQueue(state).filter((r) => r.id.startsWith('research-'));
    expect(rows).toHaveLength(2);
    const first = rows.find((r) => r.id === `research-1-${def.id}`)!;
    expect(first.label).toBe(def.name);
    expect(first.icon).toBe('research');
    expect(first.tab).toBe('research');
    expect(first.pct).toBeGreaterThan(20); expect(first.pct).toBeLessThan(30);
    expect(first.etaSeconds).toBeGreaterThan(85); expect(first.etaSeconds).toBeLessThanOrEqual(90);
    expect(rows.find((r) => r.id.startsWith('research-2-'))!.sub).toMatch(/second lab/);
  });
  it('emits nothing when no research is running; a finished timer clamps to 0', () => {
    expect(buildOrderQueue({ ...getNewGameState(), activeResearch: null, activeResearch2: null }).some((r) => r.id.startsWith('research-'))).toBe(false);
    const done = buildOrderQueue({ ...getNewGameState(), activeResearch: research(def.id, Date.now() - 10_000_000, 60) }).find((r) => r.id.startsWith('research-'))!;
    expect(done.etaSeconds).toBe(0); expect(done.pct).toBe(100);
  });
});
