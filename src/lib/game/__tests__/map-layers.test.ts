/**
 * @jest-environment node
 *
 * Graphics review 2026-09-12 item 5 — the Lanes / Ships / World visibility
 * that MapCommandCenter now owns for both solar renderers.
 */
import { DEFAULT_MAP_LAYERS, MAP_LAYER_ORDER, MAP_LAYER_LABEL, toggleMapLayer } from '../map-layers';

describe('map layers', () => {
  it('every layer defaults ON and has a text label', () => {
    for (const key of MAP_LAYER_ORDER) {
      expect(DEFAULT_MAP_LAYERS[key]).toBe(true);
      expect(MAP_LAYER_LABEL[key].length).toBeGreaterThan(0);
    }
    expect(MAP_LAYER_ORDER).toEqual(['lanes', 'ships', 'contacts', 'world']);
  });

  it('toggle flips exactly one key and never mutates its input', () => {
    const before = { ...DEFAULT_MAP_LAYERS };
    const next = toggleMapLayer(before, 'ships');
    expect(next).toEqual({ lanes: true, ships: false, contacts: true, world: true });
    expect(before).toEqual(DEFAULT_MAP_LAYERS);
    expect(toggleMapLayer(next, 'ships')).toEqual(DEFAULT_MAP_LAYERS);
  });

  // Ship traffic layer (2026-09-13): other corporations' anonymised
  // contacts default ON and toggle independently of "Your ships".
  it('contacts layer defaults ON and toggles independently of ships', () => {
    expect(DEFAULT_MAP_LAYERS.contacts).toBe(true);
    const off = toggleMapLayer(DEFAULT_MAP_LAYERS, 'contacts');
    expect(off).toEqual({ lanes: true, ships: true, contacts: false, world: true });
    expect(off.ships).toBe(true);
    expect(MAP_LAYER_LABEL.contacts).toBe('Contacts');
  });
});
