/**
 * @jest-environment node
 *
 * Overlay arbitration (GAME_DESIGN_REVIEW_2026-09 §3 "Overlay stacking").
 *
 * Ten overlay surfaces used to mount independently at shell level, each with
 * its own focus trap. The manager mounts AT MOST ONE by a fixed priority and
 * queues the rest. These tests pin the priority order and the queue
 * semantics so a future overlay cannot silently jump the line.
 */
import {
  OVERLAY_PRIORITY,
  arbitrateOverlays,
  overlayPriority,
  type OverlayId,
} from '../overlay-manager';

const ALL: OverlayId[] = [
  'cinematic', 'leader', 'eventChoice', 'frontierGraduation', 'operationsDebrief',
  'dailyBonus', 'achievements', 'featureUnlock', 'competitiveUnlock', 'tutorial',
];

describe('overlay-manager — priority order', () => {
  it('lists every overlay exactly once', () => {
    expect([...OVERLAY_PRIORITY].sort()).toEqual([...ALL].sort());
    expect(new Set(OVERLAY_PRIORITY).size).toBe(OVERLAY_PRIORITY.length);
  });

  it('is the founder-approved order: cinematic > choice > graduation > debrief > daily bonus > achievements > toasts > tutorial', () => {
    const rank = (id: OverlayId) => overlayPriority(id);
    expect(rank('cinematic')).toBeLessThan(rank('eventChoice'));
    expect(rank('eventChoice')).toBeLessThan(rank('frontierGraduation'));
    expect(rank('frontierGraduation')).toBeLessThan(rank('operationsDebrief'));
    expect(rank('operationsDebrief')).toBeLessThan(rank('dailyBonus'));
    expect(rank('dailyBonus')).toBeLessThan(rank('achievements'));
    expect(rank('achievements')).toBeLessThan(rank('featureUnlock'));
    expect(rank('achievements')).toBeLessThan(rank('competitiveUnlock'));
    expect(rank('featureUnlock')).toBeLessThan(rank('tutorial'));
    expect(rank('competitiveUnlock')).toBeLessThan(rank('tutorial'));
  });

  it('keeps the shipped A2.3 ordering: leader moments sit between cinematic and event choice', () => {
    expect(overlayPriority('cinematic')).toBeLessThan(overlayPriority('leader'));
    expect(overlayPriority('leader')).toBeLessThan(overlayPriority('eventChoice'));
  });
});

describe('overlay-manager — arbitrateOverlays', () => {
  it('returns nothing when nothing wants to show', () => {
    expect(arbitrateOverlays({})).toEqual({ active: null, queued: [] });
    expect(arbitrateOverlays({ cinematic: false, tutorial: false })).toEqual({ active: null, queued: [] });
  });

  it('mounts exactly one — the highest-priority wanter — and queues the rest in order', () => {
    const result = arbitrateOverlays({ tutorial: true, dailyBonus: true, eventChoice: true, featureUnlock: true });
    expect(result.active).toBe('eventChoice');
    expect(result.queued).toEqual(['dailyBonus', 'featureUnlock', 'tutorial']);
  });

  it('a cinematic beats everything, including a mandatory event choice', () => {
    const wants: Partial<Record<OverlayId, boolean>> = {};
    for (const id of ALL) wants[id] = true;
    const result = arbitrateOverlays(wants);
    expect(result.active).toBe('cinematic');
    expect(result.queued).toEqual(OVERLAY_PRIORITY.slice(1));
  });

  it('the tutorial only ever shows when nothing else wants to', () => {
    expect(arbitrateOverlays({ tutorial: true }).active).toBe('tutorial');
    for (const id of ALL) {
      if (id === 'tutorial') continue;
      expect(arbitrateOverlays({ tutorial: true, [id]: true }).active).toBe(id);
    }
  });

  it('queued surfaces surface when the winner clears — nothing is dropped', () => {
    let wants: Partial<Record<OverlayId, boolean>> = { cinematic: true, dailyBonus: true, achievements: true };
    let r = arbitrateOverlays(wants);
    expect(r.active).toBe('cinematic');
    wants = { ...wants, cinematic: false };
    r = arbitrateOverlays(wants);
    expect(r.active).toBe('dailyBonus');
    expect(r.queued).toEqual(['achievements']);
    wants = { ...wants, dailyBonus: false };
    r = arbitrateOverlays(wants);
    expect(r.active).toBe('achievements');
    expect(r.queued).toEqual([]);
  });

  it('ignores ids it does not know', () => {
    const r = arbitrateOverlays({ ...( { bogus: true } as unknown as Partial<Record<OverlayId, boolean>>), tutorial: true });
    expect(r.active).toBe('tutorial');
    expect(r.queued).toEqual([]);
  });
});
