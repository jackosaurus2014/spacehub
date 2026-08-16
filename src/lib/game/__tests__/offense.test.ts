/**
 * @jest-environment jsdom
 *
 * Wave M5 (docs/MEANINGFUL_2026-08.md §M5) — the offense snapshot's client
 * side: defensive clamping, idempotent poach-outcome application (crew
 * transfers apply exactly once under sync retries), freight-toll math with
 * every exemption the spec requires (Frontier, own-governor, treaty
 * reduction, caps), and the toll hand-off queue.
 */
import { getNewGameState } from '../save-load';
import {
  clampOffenseSnapshot, applyOffenseToState,
  computeCargoValue, computeFreightTolls, clampTollPct,
  accumulateTollPayments, subtractTransmittedTolls,
  queueTollFlush, consumeTollFlush, __clearTollFlushQueue,
  FREIGHT_TOLL_MIN, FREIGHT_TOLL_MAX, FREIGHT_TOLL_CAP_PER_DISPATCH,
  OFFENSE_SNAPSHOT_STALE_MS,
  type OffenseSnapshot,
} from '../offense';
import { LOCATION_TO_ZONE } from '../zone-influence';
import { RESOURCE_MAP } from '../resources';
import type { GameState } from '../types';

const NOW = Date.now();

function emptySnapshot(over: Partial<OffenseSnapshot> = {}): OffenseSnapshot {
  return { campaigns: [], poachIncoming: [], poachOutcomes: [], laneTolls: [], corneringAlerts: [], asOf: NOW, ...over };
}

function graduatedState(): GameState {
  const s = getNewGameState();
  return { ...s, frontierStatus: 'graduated', frontierGraduatedAtMs: NOW };
}

afterEach(() => __clearTollFlushQueue());

describe('M5 — snapshot clamping', () => {
  it('null/garbage in, null out', () => {
    expect(clampOffenseSnapshot(null)).toBeNull();
    expect(clampOffenseSnapshot(undefined)).toBeNull();
  });

  it('clamps toll percentages into the 0.5-2% band and drops zero tolls', () => {
    const snap = clampOffenseSnapshot(emptySnapshot({
      laneTolls: [
        { zoneSlug: 'zone_leo', tollPct: 0.5, governorName: 'Gov' },   // absurd → clamped to max
        { zoneSlug: 'zone_mars', tollPct: 0.0001, governorName: null }, // below min → clamped up
        { zoneSlug: 'zone_belt', tollPct: 0, governorName: null },      // zero → dropped
      ],
    }))!;
    expect(snap.laneTolls.find(t => t.zoneSlug === 'zone_leo')!.tollPct).toBe(FREIGHT_TOLL_MAX);
    expect(snap.laneTolls.find(t => t.zoneSlug === 'zone_mars')!.tollPct).toBe(FREIGHT_TOLL_MIN);
    expect(snap.laneTolls.find(t => t.zoneSlug === 'zone_belt')).toBeUndefined();
  });

  it('drops poach entries with unknown crew types or bad statuses', () => {
    const snap = clampOffenseSnapshot(emptySnapshot({
      poachOutcomes: [
        { id: 'a', role: 'attacker', status: 'poached', crewType: 'engineer', count: 2, resolvedAtMs: NOW, counterpartyName: null },
        { id: 'b', role: 'attacker', status: 'poached', crewType: 'wizard' as never, count: 2, resolvedAtMs: NOW, counterpartyName: null },
        { id: 'c', role: 'attacker', status: 'exploded' as never, crewType: 'engineer', count: 2, resolvedAtMs: NOW, counterpartyName: null },
      ],
    }))!;
    expect(snap.poachOutcomes.map(o => o.id)).toEqual(['a']);
  });
});

describe('M5 O4 — poach outcome application (idempotent crew transfer)', () => {
  const outcomeTarget = {
    id: 'offer1', role: 'target' as const, status: 'poached' as const,
    crewType: 'engineer' as const, count: 3, resolvedAtMs: NOW, counterpartyName: 'Rival Corp',
  };

  it('target loses crew exactly once, clamped at zero', () => {
    let s = getNewGameState();
    s = { ...s, workforce: { ...s.workforce!, engineers: 10 } };
    const applied = applyOffenseToState(s, emptySnapshot({ poachOutcomes: [outcomeTarget] }));
    expect(applied.workforce!.engineers).toBe(7);
    expect(applied.appliedPoachOfferIds).toContain('offer1');
    // Re-applying the same snapshot (sync retry) is a no-op.
    const again = applyOffenseToState(applied, emptySnapshot({ poachOutcomes: [outcomeTarget] }));
    expect(again.workforce!.engineers).toBe(7);
    // Losses clamp at zero — never negative headcount.
    let poor = getNewGameState();
    poor = { ...poor, workforce: { ...poor.workforce!, engineers: 1 } };
    const clamped = applyOffenseToState(poor, emptySnapshot({ poachOutcomes: [outcomeTarget] }));
    expect(clamped.workforce!.engineers).toBe(0);
  });

  it('attacker gains the crew and both sides get an event-log entry', () => {
    const s = getNewGameState();
    const applied = applyOffenseToState(s, emptySnapshot({
      poachOutcomes: [{ ...outcomeTarget, role: 'attacker' }],
    }));
    expect(applied.workforce!.engineers).toBe(3);
    expect(applied.eventLog.some(e => e.id === 'evt_poach_offer1')).toBe(true);
  });

  it('retained outcomes log an event but move no crew', () => {
    const s = getNewGameState();
    const applied = applyOffenseToState(s, emptySnapshot({
      poachOutcomes: [{ ...outcomeTarget, status: 'retained' }],
    }));
    expect(applied.workforce!.engineers).toBe(0);
    expect(applied.eventLog.some(e => e.id === 'evt_poach_offer1')).toBe(true);
  });

  it('stores the clamped snapshot on state for the Situation Log lens', () => {
    const s = getNewGameState();
    const applied = applyOffenseToState(s, emptySnapshot({
      campaigns: [{ resourceSlug: 'iron', byCompanyName: 'Dumper Inc', declaredAtMs: NOW, endsAtMs: NOW + 1000 }],
    }));
    expect(applied.offense?.campaigns[0].resourceSlug).toBe('iron');
  });
});

describe('M5 O6 — freight toll math', () => {
  const fromZone = LOCATION_TO_ZONE.get('earth_surface')!;
  const cargo = { iron: 100 }; // 100 × iron base price
  const cargoValue = computeCargoValue(cargo);

  function tolledState(): GameState {
    const s = graduatedState();
    return {
      ...s,
      offense: emptySnapshot({
        laneTolls: [{ zoneSlug: fromZone, tollPct: 0.02, governorName: 'Gov Corp' }],
      }),
    };
  }

  it('cargo value prices at deterministic base prices', () => {
    expect(cargoValue).toBe(100 * RESOURCE_MAP.get('iron')!.baseMarketPrice);
  });

  it('charges the toll on a dispatch touching the tolled zone', () => {
    const charges = computeFreightTolls(tolledState(), 'earth_surface', 'mars_surface', cargoValue, NOW);
    expect(charges).toHaveLength(1);
    expect(charges[0].zoneSlug).toBe(fromZone);
    expect(charges[0].amount).toBe(Math.min(FREIGHT_TOLL_CAP_PER_DISPATCH, Math.round(cargoValue * 0.02)));
  });

  it('Frontier corporations never pay tolls ([FRONTIER])', () => {
    const s = tolledState();
    const frontier = { ...s, frontierStatus: 'active' as const, frontierEnteredAtMs: NOW };
    expect(computeFreightTolls(frontier, 'earth_surface', 'mars_surface', cargoValue, NOW)).toHaveLength(0);
  });

  it('the zone\'s own governor never self-tolls', () => {
    const s = tolledState();
    const gov = { ...s, zoneStandings: [{ zoneSlug: fromZone, sharePct: 30, isGovernor: true, taxBaseMonthly: 0 }] };
    expect(computeFreightTolls(gov, 'earth_surface', 'mars_surface', cargoValue, NOW)).toHaveLength(0);
  });

  it('alliance trade treaties reduce the toll (counterplay via diplomacy)', () => {
    const s = tolledState();
    const treaty = { ...s, allianceBonuses: { revenueBonus: 0, miningBonus: 0, researchBonus: 0, buildSpeedBonus: 0, tradeBonus: 0.2 } };
    const [plain] = computeFreightTolls(s, 'earth_surface', 'mars_surface', cargoValue, NOW);
    const [reduced] = computeFreightTolls(treaty, 'earth_surface', 'mars_surface', cargoValue, NOW);
    expect(reduced.amount).toBeLessThan(plain.amount);
    expect(reduced.amount).toBe(Math.round(cargoValue * 0.02 * 0.8));
  });

  it('the per-dispatch cap binds on huge cargo values (a squeeze, not a wall)', () => {
    const charges = computeFreightTolls(tolledState(), 'earth_surface', 'mars_surface', 10_000_000_000, NOW);
    expect(charges[0].amount).toBe(FREIGHT_TOLL_CAP_PER_DISPATCH);
  });

  it('a stale snapshot charges nothing (offline players never pay a dead toll)', () => {
    const s = tolledState();
    const stale = { ...s, offense: { ...s.offense!, asOf: NOW - OFFENSE_SNAPSHOT_STALE_MS - 1 } };
    expect(computeFreightTolls(stale, 'earth_surface', 'mars_surface', cargoValue, NOW)).toHaveLength(0);
  });

  it('empty cargo owes nothing', () => {
    expect(computeFreightTolls(tolledState(), 'earth_surface', 'mars_surface', 0, NOW)).toHaveLength(0);
  });

  it('clampTollPct enforces the authored 0.5-2% band', () => {
    expect(clampTollPct(0.5)).toBe(FREIGHT_TOLL_MAX);
    expect(clampTollPct(0.0001)).toBe(FREIGHT_TOLL_MIN);
    expect(clampTollPct(0)).toBe(0);
    expect(clampTollPct(NaN)).toBe(0);
  });
});

describe('M5 O6 — toll settlement hand-off (mirrors lane-usage flush)', () => {
  it('accumulate → send → flush drains exactly what was transmitted', () => {
    let pending = accumulateTollPayments(undefined, [
      { zoneSlug: 'zone_leo', tollPct: 0.02, amount: 1_000_000, governorName: null },
    ]);
    pending = accumulateTollPayments(pending, [
      { zoneSlug: 'zone_leo', tollPct: 0.02, amount: 500_000, governorName: null },
      { zoneSlug: 'zone_mars', tollPct: 0.01, amount: 200_000, governorName: null },
    ]);
    expect(pending).toEqual({ zone_leo: 1_500_000, zone_mars: 200_000 });

    // Mid-flight accrual survives the flush.
    const sent = { zone_leo: 1_500_000 };
    queueTollFlush(sent);
    const flush = consumeTollFlush()!;
    const remaining = subtractTransmittedTolls(pending, flush);
    expect(remaining).toEqual({ zone_mars: 200_000 });
    // Queue is single-consume.
    expect(consumeTollFlush()).toBeNull();
  });
});
