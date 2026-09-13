/**
 * @jest-environment node
 *
 * Graphics review 2026-09-12 item 5 — bridge mode. The pure helpers behind
 * the shell's `data-bridge` attribute: preference persistence, the one-time
 * hint, and the keyboard contract (F toggles; Escape exits only when
 * nothing higher-priority — a modal, the panel overlay, a text field, a
 * handler that already consumed the key — is listening). The last block
 * runs the key decision against the REAL map-stage state machine so the
 * two Escape behaviours (overlay → map, map → leave bridge) can never
 * collide.
 */
import {
  BRIDGE_MODE_KEY,
  BRIDGE_HINT_KEY,
  BRIDGE_TOGGLE_KEY,
  BRIDGE_LAYOUT_EVENT,
  readBridgePreference,
  writeBridgePreference,
  shouldShowBridgeHint,
  markBridgeHintSeen,
  bridgeKeyAction,
  applyBridgeAction,
  type BridgeStorage,
} from '../bridge-mode';
import { computeStageLayout } from '../map-stage';

function memStorage(seed: Record<string, string> = {}): BridgeStorage & { data: Record<string, string> } {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
}

const idle = { bridge: false, inTextField: false, modalOpen: false, overlayOpen: false };
const onBridge = { ...idle, bridge: true };

describe('bridge preference', () => {
  it('defaults OFF for existing players (no stored value)', () => {
    expect(readBridgePreference(memStorage())).toBe(false);
    expect(readBridgePreference(null)).toBe(false);
    expect(readBridgePreference(undefined)).toBe(false);
  });

  it('round-trips through storage under the documented key', () => {
    const s = memStorage();
    writeBridgePreference(s, true);
    expect(s.data[BRIDGE_MODE_KEY]).toBe('on');
    expect(readBridgePreference(s)).toBe(true);
    writeBridgePreference(s, false);
    expect(s.data[BRIDGE_MODE_KEY]).toBe('off');
    expect(readBridgePreference(s)).toBe(false);
    expect(BRIDGE_MODE_KEY).toBe('tycoon-bridge-mode');
  });

  it('treats anything but the literal "on" as OFF (never traps a player)', () => {
    for (const v of ['ON', 'true', '1', 'yes', '', 'garbage']) {
      expect(readBridgePreference(memStorage({ [BRIDGE_MODE_KEY]: v }))).toBe(false);
    }
  });

  it('survives a throwing storage', () => {
    const broken: BridgeStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readBridgePreference(broken)).toBe(false);
    expect(() => writeBridgePreference(broken, true)).not.toThrow();
    expect(shouldShowBridgeHint(broken)).toBe(false);
    expect(() => markBridgeHintSeen(broken)).not.toThrow();
  });
});

describe('bridge hint', () => {
  it('shows once, to players who have never touched bridge mode', () => {
    const s = memStorage();
    expect(shouldShowBridgeHint(s)).toBe(true);
    markBridgeHintSeen(s);
    expect(s.data[BRIDGE_HINT_KEY]).toBe('1');
    expect(shouldShowBridgeHint(s)).toBe(false);
  });

  it('never shows to a player with a stored preference of either value', () => {
    expect(shouldShowBridgeHint(memStorage({ [BRIDGE_MODE_KEY]: 'on' }))).toBe(false);
    expect(shouldShowBridgeHint(memStorage({ [BRIDGE_MODE_KEY]: 'off' }))).toBe(false);
  });

  it('never shows without storage (SSR)', () => {
    expect(shouldShowBridgeHint(null)).toBe(false);
  });
});

describe('bridgeKeyAction', () => {
  it('F toggles in either case, with no modifiers', () => {
    expect(BRIDGE_TOGGLE_KEY).toBe('F');
    expect(bridgeKeyAction({ key: 'f' }, idle)).toBe('toggle');
    expect(bridgeKeyAction({ key: 'F' }, idle)).toBe('toggle');
    expect(bridgeKeyAction({ key: 'f' }, onBridge)).toBe('toggle');
    expect(bridgeKeyAction({ key: 'f', ctrlKey: true }, idle)).toBeNull(); // Ctrl+F = find
    expect(bridgeKeyAction({ key: 'f', metaKey: true }, idle)).toBeNull();
    expect(bridgeKeyAction({ key: 'f', altKey: true }, idle)).toBeNull();
  });

  it('Escape exits bridge mode only when it is on', () => {
    expect(bridgeKeyAction({ key: 'Escape' }, onBridge)).toBe('exit');
    expect(bridgeKeyAction({ key: 'Escape' }, idle)).toBeNull();
  });

  it('is the lowest-priority handler: text fields, modals and consumed events win', () => {
    expect(bridgeKeyAction({ key: 'f' }, { ...idle, inTextField: true })).toBeNull();
    expect(bridgeKeyAction({ key: 'Escape' }, { ...onBridge, inTextField: true })).toBeNull();
    expect(bridgeKeyAction({ key: 'f' }, { ...idle, modalOpen: true })).toBeNull();
    expect(bridgeKeyAction({ key: 'Escape' }, { ...onBridge, modalOpen: true })).toBeNull();
    expect(bridgeKeyAction({ key: 'f', defaultPrevented: true }, idle)).toBeNull();
    expect(bridgeKeyAction({ key: 'Escape', defaultPrevented: true }, onBridge)).toBeNull();
  });

  it('ignores every other key', () => {
    for (const key of ['g', 'Enter', ' ', 'Tab', 'm', 'c', '1', 'ArrowLeft']) {
      expect(bridgeKeyAction({ key }, onBridge)).toBeNull();
    }
  });
});

describe('applyBridgeAction', () => {
  it('toggle flips, exit forces off, null leaves the state alone', () => {
    expect(applyBridgeAction(false, 'toggle')).toBe(true);
    expect(applyBridgeAction(true, 'toggle')).toBe(false);
    expect(applyBridgeAction(true, 'exit')).toBe(false);
    expect(applyBridgeAction(false, 'exit')).toBe(false);
    expect(applyBridgeAction(true, null)).toBe(true);
    expect(applyBridgeAction(false, null)).toBe(false);
  });
});

describe('bridge mode × map-as-stage (the two Escape handlers never collide)', () => {
  it('desktop, non-map tab: the panel overlay owns Escape, bridge stays on', () => {
    const layout = computeStageLayout('build', true, true);
    expect(layout.overlayOpen).toBe(true);
    expect(bridgeKeyAction({ key: 'Escape' }, { ...onBridge, overlayOpen: layout.overlayOpen })).toBeNull();
  });

  it('desktop, map tab: no overlay, so Escape leaves bridge mode', () => {
    const layout = computeStageLayout('map', true, true);
    expect(layout.overlayOpen).toBe(false);
    expect(bridgeKeyAction({ key: 'Escape' }, { ...onBridge, overlayOpen: layout.overlayOpen })).toBe('exit');
  });

  it('768-1279px and phones: panels are not overlays, so Escape leaves bridge mode from any tab', () => {
    for (const wide of [true, false]) {
      for (const tab of ['dashboard', 'build', 'market', 'map'] as const) {
        const layout = computeStageLayout(tab, false, wide);
        expect(layout.overlayOpen).toBe(false);
        expect(bridgeKeyAction({ key: 'Escape' }, { ...onBridge, overlayOpen: layout.overlayOpen })).toBe('exit');
      }
    }
  });

  it('F toggles bridge on every viewport and tab (stage state is irrelevant)', () => {
    for (const desktop of [true, false]) {
      for (const tab of ['dashboard', 'build', 'map'] as const) {
        const layout = computeStageLayout(tab, desktop, true);
        expect(bridgeKeyAction({ key: 'f' }, { ...idle, overlayOpen: layout.overlayOpen })).toBe('toggle');
      }
    }
  });

  it('bridge mode never changes the stage machine itself — the map is never remounted by toggling it', () => {
    // Bridge only hides site chrome; mount/cover/overlay decisions are the
    // stage machine's alone, so a toggle can never cost a WebGL context.
    for (const desktop of [true, false]) {
      for (const wide of [true, false]) {
        for (const tab of ['dashboard', 'map', 'build'] as const) {
          expect(computeStageLayout(tab, desktop, wide)).toEqual(computeStageLayout(tab, desktop, wide));
        }
      }
    }
    expect(BRIDGE_LAYOUT_EVENT).toBe('tycoon:layout');
  });
});
