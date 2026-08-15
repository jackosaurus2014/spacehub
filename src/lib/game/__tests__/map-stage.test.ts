/**
 * @jest-environment node
 *
 * Wave V4 (docs/VISUAL_DEPTH_2026-08.md §V4.1) — map-as-stage layout state
 * machine: desktop panels-as-overlays over a frozen map, phones unchanged.
 */
import { computeStageLayout, overlayDismissTab, STAGE_MIN_WIDTH, STAGE_MEDIA_QUERY } from '../map-stage';

describe('computeStageLayout', () => {
  it('map tab: map mounted, live, no overlay — on every viewport', () => {
    for (const desktop of [true, false]) {
      expect(computeStageLayout('map', desktop)).toEqual({
        mapMounted: true, mapCovered: false, overlayOpen: false,
      });
    }
  });

  it('desktop non-map tab: map stays mounted but covered, panel overlays', () => {
    expect(computeStageLayout('dashboard', true)).toEqual({
      mapMounted: true, mapCovered: true, overlayOpen: true,
    });
    expect(computeStageLayout('market', true)).toEqual({
      mapMounted: true, mapCovered: true, overlayOpen: true,
    });
  });

  it('phone non-map tab: today\'s behavior exactly — map unmounts, full-screen panel', () => {
    expect(computeStageLayout('dashboard', false)).toEqual({
      mapMounted: false, mapCovered: false, overlayOpen: false,
    });
  });

  it('a covered map is always a mounted map (freeze ⇒ WebGL context preserved)', () => {
    const tabs = ['dashboard', 'build', 'research', 'map', 'fleet', 'governance'] as const;
    for (const tab of tabs) {
      for (const desktop of [true, false]) {
        const layout = computeStageLayout(tab, desktop);
        if (layout.mapCovered) expect(layout.mapMounted).toBe(true);
        // the overlay exists iff the map is covered — they are the same state
        expect(layout.overlayOpen).toBe(layout.mapCovered);
      }
    }
  });
});

describe('overlayDismissTab (Escape handling)', () => {
  it('Escape returns to the map tab', () => {
    expect(overlayDismissTab('Escape')).toBe('map');
  });

  it('other keys are ignored', () => {
    for (const key of ['Enter', ' ', 'Tab', 'm', 'ArrowLeft', 'a']) {
      expect(overlayDismissTab(key)).toBeNull();
    }
  });
});

describe('breakpoint', () => {
  it('stage breakpoint matches the Outliner docking width (1280px)', () => {
    expect(STAGE_MIN_WIDTH).toBe(1280);
    expect(STAGE_MEDIA_QUERY).toBe('(min-width: 1280px)');
  });
});
