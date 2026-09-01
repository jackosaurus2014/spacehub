/**
 * 4X Upgrade Wave W5 — cinematic presentation queue
 * (docs/4X_BASELINE_2026-08.md Part 3.4 + Part 4 wave table row W5).
 *
 * cinematic-moments.ts is deliberately pure (no React, no timers, no DOM) so
 * the detection + queue logic can be tested as plain functions. Covers:
 *  - eventLog-diff detection (victory / megastructure / expedition /
 *    first-contact / narrative chain-head 'info' stages)
 *  - non-matches are correctly ignored (wrong type, non-cinematic-flagged
 *    chain stage)
 *  - pendingChoice detection for chain-head 'choice' stages, including the
 *    negative cases (non-head stage, non-chain pendingChoice, null)
 *  - the discovery-moment builder's art selection
 *  - queue enqueue/dequeue: de-dupe by id, cap at MAX_CINEMATIC_QUEUE,
 *    referential stability when there's nothing to add
 */
import type { GameEvent } from '../types';
import type { PendingChainChoiceUI } from '../narrative-events';
import { isCinematicChainStage, CINEMATIC_INFO_STAGE_TITLES } from '../narrative-events';
import {
  detectCinematicMomentsFromEvents,
  buildNarrativeChoiceCinematicMoment,
  buildDiscoveryCinematicMoment,
  buildQuarterCloseCinematicMoment,
  QUARTERLY_REPORT_TITLE_PREFIX,
  enqueueCinematicMoments,
  dequeueCinematicMoment,
  MAX_CINEMATIC_QUEUE,
  type CinematicMoment,
} from '../cinematic-moments';

const DATE = { year: 2026, month: 6 };

function ev(overrides: Partial<GameEvent>): GameEvent {
  return {
    id: overrides.id || 'ev1',
    date: DATE,
    type: 'milestone',
    title: 'Untitled',
    description: '',
    ...overrides,
  };
}

describe('cinematic-moments: detectCinematicMomentsFromEvents', () => {
  it('detects a victory event', () => {
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 'v1', type: 'milestone', title: '🥇 Victory: Galactic Mogul', description: '"Galactic Mogul" — permanent bonus applied.' }),
    ]);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({
      id: 'victory:v1', kind: 'victory', title: 'VICTORY ACHIEVED', subtitle: 'Galactic Mogul', icon: '🥇',
    });
  });

  it('detects a megastructure completion and extracts the icon/subtitle', () => {
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 'm1', type: 'milestone', title: '🛰️ Orbital Ring Complete!', description: 'Your Orbital Ring is fully operational. Permanent bonuses now active.' }),
    ]);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({ id: 'megastructure:m1', kind: 'megastructure', icon: '🛰️', subtitle: '🛰️ Orbital Ring' });
  });

  it('detects a plain expedition arrival (no first contact)', () => {
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 'e1', type: 'milestone', title: '🌌 Arrival: Tau Ceti', description: 'Expedition arrived after 14 months. Survey underway.' }),
    ]);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({ id: 'expedition:e1', kind: 'expedition', title: 'EXPEDITION ARRIVAL', icon: '🌌' });
  });

  it('detects a first-contact expedition arrival distinctly', () => {
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 'e2', type: 'milestone', title: '🌌 Arrival: Wolf 359', description: 'Expedition arrived after 20 months. First contact: hive-collective.' }),
    ]);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({ id: 'expedition:e2', kind: 'expedition', title: 'FIRST CONTACT', icon: '👽' });
  });

  it('detects a cinematic-flagged narrative chain-head info stage by its exact logged title', () => {
    // iso_21 "ISO Detected" is the chain-head of iso_flyby and is flagged cinematic.
    const [entry] = Array.from(CINEMATIC_INFO_STAGE_TITLES.entries()).filter(([, v]) => v.chainId === 'iso_flyby');
    expect(entry).toBeDefined();
    const [title, meta] = entry;
    const moments = detectCinematicMomentsFromEvents([ev({ id: 'n1', type: 'random_event', title, description: meta.description })]);
    expect(moments).toHaveLength(1);
    expect(moments[0]).toMatchObject({ id: 'narrative:n1', kind: 'narrative', title: 'Interstellar Object Flyby', subtitle: 'ISO Detected' });
  });

  it('does NOT flag the tactical space_weather_ladder chain head (deliberately unflagged — CLAUDE.md "don\'t collapse the tempo")', () => {
    expect(isCinematicChainStage('space_weather_ladder', 0)).toBe(false);
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 's1', type: 'random_event', title: '🌤️ M-Class Solar Flare', description: 'irrelevant' }),
    ]);
    expect(moments).toHaveLength(0);
  });

  it('ignores unrelated event types/titles', () => {
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 'b1', type: 'build_complete', title: 'Ship ordered: Freighter', description: '' }),
      ev({ id: 'r1', type: 'random_event', title: 'Routine Maintenance', description: '' }),
    ]);
    expect(moments).toHaveLength(0);
  });

  it('classifies multiple new events in one diff batch', () => {
    const moments = detectCinematicMomentsFromEvents([
      ev({ id: 'v2', type: 'milestone', title: '🥇 Victory: Voyager', description: '"Voyager" — permanent bonus applied.' }),
      ev({ id: 'm2', type: 'milestone', title: '🏗️ Dyson Swarm Complete!', description: 'operational' }),
    ]);
    expect(moments.map(m => m.kind).sort()).toEqual(['megastructure', 'victory']);
  });
});

describe('cinematic-moments: buildNarrativeChoiceCinematicMoment', () => {
  function pending(overrides: Partial<PendingChainChoiceUI>): PendingChainChoiceUI {
    return {
      eventId: 'x:y', eventName: 'Stage Name', eventIcon: '🧊', eventDescription: 'desc',
      choices: [], ...overrides,
    };
  }

  it('returns a moment for a cinematic-flagged chain-head choice stage', () => {
    const moment = buildNarrativeChoiceCinematicMoment(
      pending({ eventId: 'europa_biosignature:eu_11', chainId: 'europa_biosignature', chainName: 'Europa Biosignature Arc', stageIndex: 0, totalStages: 8, eventName: 'Ambiguous Chemistry', eventIcon: '🧊' }),
    );
    expect(moment).not.toBeNull();
    expect(moment).toMatchObject({ id: 'narrative:europa_biosignature:eu_11', kind: 'narrative', title: 'Europa Biosignature Arc', subtitle: 'Ambiguous Chemistry' });
  });

  it('returns null for a non-head stage of the same chain', () => {
    const moment = buildNarrativeChoiceCinematicMoment(
      pending({ eventId: 'europa_biosignature:eu_18', chainId: 'europa_biosignature', chainName: 'Europa Biosignature Arc', stageIndex: 4, totalStages: 8 }),
    );
    expect(moment).toBeNull();
  });

  it('returns null when pendingChoice has no chainId (a random-events.ts choice, not a narrative chain)', () => {
    const moment = buildNarrativeChoiceCinematicMoment(pending({ chainId: undefined, stageIndex: undefined }));
    expect(moment).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(buildNarrativeChoiceCinematicMoment(null)).toBeNull();
    expect(buildNarrativeChoiceCinematicMoment(undefined)).toBeNull();
  });
});

describe('cinematic-moments: buildDiscoveryCinematicMoment', () => {
  it('builds a stable id and a human-readable subtitle', () => {
    const moment = buildDiscoveryCinematicMoment('first_europa_ocean_entry', 'Europa Clipper II');
    expect(moment).toMatchObject({
      id: 'discovery:first_europa_ocean_entry',
      kind: 'discovery',
      title: 'FIRST IN THE WORLD',
      subtitle: 'first europa ocean entry — Europa Clipper II',
      icon: '🔬',
    });
  });

  it('picks ocean-flavored art for ocean/plume/aquifer milestones, else the nebula fallback', () => {
    expect(buildDiscoveryCinematicMoment('first_europa_ocean_entry', 'p').art).toContain('ice');
    expect(buildDiscoveryCinematicMoment('first_enceladus_plume_sample', 'p').art).toContain('ice');
    expect(buildDiscoveryCinematicMoment('first_martian_aquifer', 'p').art).toContain('ice');
    expect(buildDiscoveryCinematicMoment('first_heliopause_crossing', 'p').art).toContain('nebula');
  });
});

describe('cinematic-moments: queue operations', () => {
  const m1: CinematicMoment = { id: 'a', kind: 'victory', title: 'A', icon: '🥇', accent: '#fff' };
  const m2: CinematicMoment = { id: 'b', kind: 'victory', title: 'B', icon: '🥇', accent: '#fff' };

  it('enqueues new moments in order', () => {
    const q = enqueueCinematicMoments([], [m1, m2]);
    expect(q.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('de-dupes against the existing queue by id', () => {
    const q = enqueueCinematicMoments([m1], [m1, m2]);
    expect(q.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('de-dupes duplicates within the same incoming batch', () => {
    const q = enqueueCinematicMoments([], [m1, m1, m2]);
    expect(q.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('returns the same array reference when there is nothing new to add', () => {
    const q0 = [m1];
    const q1 = enqueueCinematicMoments(q0, [m1]);
    expect(q1).toBe(q0);
    const q2 = enqueueCinematicMoments(q0, []);
    expect(q2).toBe(q0);
  });

  it('caps the queue at MAX_CINEMATIC_QUEUE', () => {
    const many = Array.from({ length: MAX_CINEMATIC_QUEUE + 4 }, (_, i) => ({
      id: `m${i}`, kind: 'victory' as const, title: `T${i}`, icon: '🥇', accent: '#fff',
    }));
    const q = enqueueCinematicMoments([], many);
    expect(q).toHaveLength(MAX_CINEMATIC_QUEUE);
    expect(q[0].id).toBe('m0');
  });

  it('dequeue drops only the head', () => {
    const q = dequeueCinematicMoment([m1, m2]);
    expect(q.map(m => m.id)).toEqual(['b']);
  });

  it('dequeue on an empty queue stays empty', () => {
    expect(dequeueCinematicMoment([])).toEqual([]);
  });
});

describe('narrative-events: isCinematicChainStage / CINEMATIC_INFO_STAGE_TITLES consistency', () => {
  it('every entry in CINEMATIC_INFO_STAGE_TITLES is confirmed cinematic by isCinematicChainStage', () => {
    for (const meta of Array.from(CINEMATIC_INFO_STAGE_TITLES.values())) {
      expect(isCinematicChainStage(meta.chainId, meta.stageIndex)).toBe(true);
    }
  });

  it('returns false for an unknown chain id', () => {
    expect(isCinematicChainStage('not_a_real_chain', 0)).toBe(false);
  });
});

// ─── quarter close (monthly loop, 2026-09-01) ───────────────────────────────
describe('quarter-close cinematic moment', () => {
  const report = {
    quarterIndex: 4, quarterNumber: 5, gameYear: 2027, quarterOfYear: 1,
    revenue: 120_000_000, costs: 90_000_000, profit: 30_000_000, netWorth: 2_500_000_000,
    fleetCount: 3, buildingCount: 9, corporationTier: 2, notableEvents: [], growthRatePct: 12.34,
  };

  it('builds a short card: quarter label, three numbers, Publish CTA to Reports → Quarterly, Dismiss', () => {
    const m = buildQuarterCloseCinematicMoment(report);
    expect(m.id).toBe('quarter:4');
    expect(m.kind).toBe('quarter');
    expect(m.title).toBe('Q1 2027 CLOSED');
    expect(m.subtitle).toBe('Net worth +12.3% vs. last quarter');
    expect(m.stats).toEqual([
      { label: 'Revenue', value: '$120.0M' },
      { label: 'Profit', value: '$30.0M' },
      { label: 'Net worth', value: '$2.5B' },
    ]);
    expect(m.cta).toEqual({ label: 'Publish report', tab: 'reports', subView: 'reports:quarterly' });
    expect(m.dismissLabel).toBe('Dismiss');
    expect(buildQuarterCloseCinematicMoment({ ...report, growthRatePct: null, profit: -5_000_000 }).subtitle).toBe('First filing on record');
    expect(buildQuarterCloseCinematicMoment({ ...report, profit: -5_000_000 }).stats![1].value).toBe('−$5.0M');
  });

  it('is detected from the quarterly milestone title and hydrated from the stored report', () => {
    const events = [ev({ id: 'q1', title: `${QUARTERLY_REPORT_TITLE_PREFIX}5` })];
    expect(detectCinematicMomentsFromEvents(events, { quarterlyReports: [report] }).map(m => m.id)).toEqual(['quarter:4']);
    // no report to hydrate from → no card (never a card with no numbers)
    expect(detectCinematicMomentsFromEvents(events)).toEqual([]);
    expect(detectCinematicMomentsFromEvents(events, { quarterlyReports: [{ ...report, quarterNumber: 6 }] })).toEqual([]);
    // wrong event type is ignored
    expect(detectCinematicMomentsFromEvents([ev({ id: 'q2', type: 'random_event', title: `${QUARTERLY_REPORT_TITLE_PREFIX}5` })], { quarterlyReports: [report] })).toEqual([]);
  });
});
