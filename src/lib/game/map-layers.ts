// ─── Map overlay layers (graphics review 2026-09-12, item 5) ────────────────
// The Lanes / Ships / World toggles used to be private state inside each
// solar renderer (SolarMap3D, SolarSystemCanvas), drawn as a button column
// over the map's bottom-right corner — which on phones laid out as three
// full-width bars across the middle of the 2D system. MapCommandCenter now
// owns the visibility and hands it to whichever renderer is mounted, so the
// phone icon strip and the desktop button column drive the same state and
// a renderer swap (3D → 2D on context loss) keeps the player's choices.
// Pure data + helpers; no React.

export interface MapLayerVisibility {
  /** Shipping lanes between unlocked locations (+ the volume layer). */
  lanes: boolean;
  /** Your ships: in-transit arcs and station dots. */
  ships: boolean;
  /** Other corporations' colony claims (needs the live world feed). */
  world: boolean;
}

export type MapLayerKey = keyof MapLayerVisibility;

export const DEFAULT_MAP_LAYERS: MapLayerVisibility = { lanes: true, ships: true, world: true };

export const MAP_LAYER_ORDER: MapLayerKey[] = ['lanes', 'ships', 'world'];

export const MAP_LAYER_LABEL: Record<MapLayerKey, string> = {
  lanes: 'Lanes',
  ships: 'Ships',
  world: 'World',
};

export function toggleMapLayer(v: MapLayerVisibility, key: MapLayerKey): MapLayerVisibility {
  return { ...v, [key]: !v[key] };
}
