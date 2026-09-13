/**
 * @jest-environment node
 *
 * Wave V4 (docs/VISUAL_DEPTH_2026-08.md §V4.1) — map-as-stage layout state
 * machine: desktop panels-as-overlays over a frozen map, phones unchanged.
 * 2026-09-12: the 768-1279px band keeps the map mounted but hidden so a hub
 * switch never creates a new WebGL context (browser-crash investigation).
 * CC-1 (docs/COMMAND_CENTER_DESIGN_2026-09-13.md): the dashboard tab is the
 * Bridge — a second stage kind, never an overlay over the map.
 */
import {
  computeStageLayout,
  overlayDismissTab,
  STAGE_MIN_WIDTH,
  STAGE_MEDIA_QUERY,
  STAGE_HIDDEN_MIN_WIDTH,
  STAGE_HIDDEN_MEDIA_QUERY,
} from '../map-stage';

describe('computeStageLayout', () => {
  it('map tab: map mounted, live, visible, no overlay — on every viewport', () => {
    for (const desktop of [true, false]) {
      for (const wide of [true, false]) {
        expect(computeStageLayout('map', desktop, wide)).toEqual({
          kind: 'map', mapMounted: true, mapCovered: false, overlayOpen: false, mapHidden: false,
        });
      }
    }
  });

  it('desktop panel tab: map stays mounted but covered, panel overlays', () => {
    expect(computeStageLayout('build', true, true)).toEqual({
      kind: 'panel', mapMounted: true, mapCovered: true, overlayOpen: true, mapHidden: false,
    });
    expect(computeStageLayout('market', true, true)).toEqual({
      kind: 'panel', mapMounted: true, mapCovered: true, overlayOpen: true, mapHidden: false,
    });
  });

  it('dashboard tab is the Bridge stage: no overlay, map kept alive but hidden on wide viewports', () => {
    // desktop: the window takes the stage; the map is mounted-but-hidden
    // (WebGL context preserved, nothing drawn) rather than dimmed behind an
    // overlay sheet.
    expect(computeStageLayout('dashboard', true, true)).toEqual({
      kind: 'bridge', mapMounted: true, mapCovered: true, overlayOpen: false, mapHidden: true,
    });
    // 768-1279px: same
    expect(computeStageLayout('dashboard', false, true)).toEqual({
      kind: 'bridge', mapMounted: true, mapCovered: true, overlayOpen: false, mapHidden: true,
    });
    // phone: map unmounts exactly as for any other tab
    expect(computeStageLayout('dashboard', false, false)).toEqual({
      kind: 'bridge', mapMounted: false, mapCovered: false, overlayOpen: false, mapHidden: false,
    });
    // the Bridge is never an overlay on any viewport
    for (const desktop of [true, false]) {
      for (const wide of [true, false]) {
        expect(computeStageLayout('dashboard', desktop, wide).overlayOpen).toBe(false);
      }
    }
  });

  it('768-1279px panel tab: map stays mounted but hidden, panel is full-width (no overlay)', () => {
    expect(computeStageLayout('research', false, true)).toEqual({
      kind: 'panel', mapMounted: true, mapCovered: true, overlayOpen: false, mapHidden: true,
    });
    expect(computeStageLayout('build', false, true)).toEqual({
      kind: 'panel', mapMounted: true, mapCovered: true, overlayOpen: false, mapHidden: true,
    });
  });

  it('phone panel tab: map unmounts, full-screen panel', () => {
    expect(computeStageLayout('build', false, false)).toEqual({
      kind: 'panel', mapMounted: false, mapCovered: false, overlayOpen: false, mapHidden: false,
    });
    // the third argument defaults to the phone behaviour
    expect(computeStageLayout('build', false)).toEqual({
      kind: 'panel', mapMounted: false, mapCovered: false, overlayOpen: false, mapHidden: false,
    });
    expect(computeStageLayout('dashboard', false).mapMounted).toBe(false);
  });

  it('the map is never remounted by a hub switch on any viewport ≥768px', () => {
    const tabs = ['dashboard', 'build', 'research', 'map', 'fleet', 'governance', 'market'] as const;
    for (const desktop of [true, false]) {
      for (const tab of tabs) {
        expect(computeStageLayout(tab, desktop, true).mapMounted).toBe(true);
      }
    }
  });

  it('invariants: covered ⇒ mounted; overlay ⇒ covered and visible; hidden ⇒ covered and no overlay', () => {
    const tabs = ['dashboard', 'build', 'research', 'map', 'fleet', 'governance'] as const;
    for (const tab of tabs) {
      for (const desktop of [true, false]) {
        for (const wide of [true, false]) {
          const layout = computeStageLayout(tab, desktop, wide);
          if (layout.mapCovered) expect(layout.mapMounted).toBe(true);
          if (layout.overlayOpen) {
            expect(layout.mapCovered).toBe(true);
            expect(layout.mapHidden).toBe(false);
          }
          if (layout.mapHidden) {
            expect(layout.mapCovered).toBe(true);
            expect(layout.overlayOpen).toBe(false);
          }
          // a map that is neither covered nor hidden is the live surface
          if (!layout.mapCovered) expect(layout.mapHidden).toBe(false);
        }
      }
    }
  });
});

describe('overlayDismissTab (Escape handling)', () => {
  it('Escape returns to the map tab', () => {
    expect(overlayDismissTab('Escape')).toBe('map');
    expect(overlayDismissTab('Escape', 'dashboard')).toBe('dashboard');
    expect(overlayDismissTab('Escape', 'map')).toBe('map');
  });

  it('other keys are ignored', () => {
    for (const key of ['Enter', ' ', 'Tab', 'm', 'ArrowLeft', 'a']) {
      expect(overlayDismissTab(key)).toBeNull();
    }
  });
});

describe('breakpoints', () => {
  it('stage breakpoint matches the Outliner docking width (1280px)', () => {
    expect(STAGE_MIN_WIDTH).toBe(1280);
    expect(STAGE_MEDIA_QUERY).toBe('(min-width: 1280px)');
  });

  it('hidden-band floor matches the 3D-capability floor (768px)', () => {
    expect(STAGE_HIDDEN_MIN_WIDTH).toBe(768);
    expect(STAGE_HIDDEN_MEDIA_QUERY).toBe('(min-width: 768px)');
    expect(STAGE_HIDDEN_MIN_WIDTH).toBeLessThan(STAGE_MIN_WIDTH);
  });
});
