/**
 * @jest-environment node
 *
 * Flight mode part (b), graphics review item 7 — hull class → model
 * mapping, instance batching from a mixed fixture (own / revealed /
 * anonymous / NPC) and the 2D glyph mapping.
 */
import {
  hullModelFor,
  contactRenderKind,
  batchHullInstances,
  hullGlyphFor,
  hullGlyphPoints,
  HULL_GLYPH,
  HULL_MODEL_IDS,
  HULL_MODEL_URL,
  HULL_ATLAS_URL,
  type HullInstanceInput,
} from '../map-hulls';
import type { ContactHullClass, TrafficContact } from '../ship-traffic';

const ALL_CLASSES: ContactHullClass[] = ['freighter', 'miner', 'survey', 'tanker', 'servicer', 'ark', 'flagship'];

describe('hullModelFor', () => {
  it('maps every contact hull class onto one of the four models', () => {
    for (const c of ALL_CLASSES) expect(HULL_MODEL_IDS).toContain(hullModelFor(c));
    expect(hullModelFor('freighter')).toBe('freighter');
    expect(hullModelFor('tanker')).toBe('freighter');
    expect(hullModelFor('ark')).toBe('freighter');
    expect(hullModelFor('miner')).toBe('miner');
    expect(hullModelFor('survey')).toBe('survey');
    expect(hullModelFor('servicer')).toBe('survey');
    expect(hullModelFor('flagship')).toBe('flagship');
  });
  it('every model has a glb URL under public/game/models and the atlas is shared', () => {
    for (const id of HULL_MODEL_IDS) expect(HULL_MODEL_URL[id]).toBe(`/game/models/hull-${id}.glb`);
    expect(HULL_ATLAS_URL).toMatch(/^\/game\/models\/ship-atlas\.webp$/);
  });
});

describe('contactRenderKind', () => {
  const base: TrafficContact = { id: 'c', hullClass: 'freighter', status: 'holding', locationId: 'leo' };
  it('NPC → slab, intel → revealed hull, otherwise the anonymous marker', () => {
    expect(contactRenderKind({ ...base, npc: true })).toBe('npc');
    expect(contactRenderKind({ ...base, intel: { corpId: 'p', corpName: 'P', cargoSummary: 'Empty hold', destinationId: 'leo' } })).toBe('revealed');
    expect(contactRenderKind(base)).toBe('anonymous');
  });
});

describe('batchHullInstances', () => {
  const fixture: HullInstanceInput[] = [
    { id: 'own-1', hullClass: 'freighter', kind: 'own' },
    { id: 'own-2', hullClass: 'miner', kind: 'own' },
    { id: 'own-3', hullClass: 'tanker', kind: 'own' },
    { id: 'rev-1', hullClass: 'survey', kind: 'revealed' },
    { id: 'rev-2', hullClass: 'flagship', kind: 'revealed' },
    { id: 'anon-1', hullClass: 'miner', kind: 'anonymous' },
    { id: 'anon-2', hullClass: 'flagship', kind: 'anonymous' },
    { id: 'npc-1', hullClass: 'freighter', kind: 'npc' },
  ];
  it('splits own + revealed into per-model hull groups, anonymous and NPC apart, rings for revealed', () => {
    const b = batchHullInstances(fixture);
    expect(b.hulls.freighter.map(i => i.id)).toEqual(['own-1', 'own-3']);
    expect(b.hulls.miner.map(i => i.id)).toEqual(['own-2']);
    expect(b.hulls.survey.map(i => i.id)).toEqual(['rev-1']);
    expect(b.hulls.flagship.map(i => i.id)).toEqual(['rev-2']);
    expect(b.anonymous.map(i => i.id)).toEqual(['anon-1', 'anon-2']);
    expect(b.npc.map(i => i.id)).toEqual(['npc-1']);
    expect(b.rings.map(i => i.id)).toEqual(['rev-1', 'rev-2']);
    expect(b.dropped).toBe(0);
  });
  it('never gives an anonymised contact a hull silhouette (class would leak)', () => {
    const b = batchHullInstances(fixture);
    const hullIds = HULL_MODEL_IDS.flatMap(m => b.hulls[m].map(i => i.id));
    expect(hullIds).not.toContain('anon-1');
    expect(hullIds).not.toContain('anon-2');
    expect(hullIds).not.toContain('npc-1');
  });
  it('honours the render cap in input order and reports the remainder', () => {
    const b = batchHullInstances(fixture, 3);
    expect(b.hulls.freighter.map(i => i.id)).toEqual(['own-1', 'own-3']);
    expect(b.hulls.miner.map(i => i.id)).toEqual(['own-2']);
    expect(b.rings).toHaveLength(0);
    expect(b.dropped).toBe(5);
  });
});

describe('2D glyphs', () => {
  it('each model has a distinct glyph and every glyph is a closed polygon of 4+ points', () => {
    const glyphs = HULL_MODEL_IDS.map(m => HULL_GLYPH[m]);
    expect(new Set(glyphs).size).toBe(HULL_MODEL_IDS.length);
    for (const g of glyphs) {
      const pts = hullGlyphPoints(g);
      expect(pts.length).toBeGreaterThanOrEqual(4);
      // nose is the +x extreme so a heading rotation points it forward
      const maxX = Math.max(...pts.map(p => p[0]));
      expect(pts[0][0]).toBe(maxX);
    }
  });
  it('the freighter keeps the original chevron; classes map through the model', () => {
    expect(hullGlyphFor('freighter')).toBe('chevron');
    expect(hullGlyphFor('tanker')).toBe('chevron');
    expect(hullGlyphFor('miner')).toBe('barge');
    expect(hullGlyphFor('servicer')).toBe('dart');
    expect(hullGlyphFor('flagship')).toBe('delta');
  });
});
