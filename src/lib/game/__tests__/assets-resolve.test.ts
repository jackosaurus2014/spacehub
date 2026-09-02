/**
 * GAME_DESIGN_REVIEW_2026-09 §4 regression: every building category that
 * buildings.ts actually emits must resolve to art that (a) is not the habitat
 * fallback and (b) exists on disk, at every tier 1-5; every ship hull must
 * have an explicit SHIP_ASSETS entry whose file exists, and a borrowed render
 * is only tolerated for hulls listed in SHIP_ART_BACKLOG.
 */
import fs from 'fs';
import path from 'path';
import { BUILDINGS } from '../buildings';
import { SHIPS } from '../ships';
import {
  getBuildingAsset,
  getShipAsset,
  BUILDING_ASSETS,
  BUILDING_FALLBACK_ASSET,
  SHIP_ASSETS,
  SHIP_ART_BACKLOG,
} from '../assets';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const exists = (webPath: string) => fs.existsSync(path.join(PUBLIC_DIR, webPath.replace(/^\//, '')));

describe('building art resolution (§4 mining/fabrication key mismatch)', () => {
  const categories = Array.from(new Set(BUILDINGS.map(b => b.category)));

  it('buildings.ts emits the canonical category names', () => {
    expect(categories).toEqual(expect.arrayContaining(['mining_enterprise', 'fabrication_facility']));
    expect(categories).not.toContain('mining');
    expect(categories).not.toContain('fabrication');
  });

  it.each(categories)('category %s resolves to non-fallback art at every tier and the file exists', (category) => {
    for (let tier = 1; tier <= 5; tier++) {
      const asset = getBuildingAsset(`probe_${category}`, category, tier);
      if ((category as string) !== 'habitat') {
        expect(asset).not.toBe(BUILDING_FALLBACK_ASSET);
      }
      expect(exists(asset)).toBe(true);
    }
  });

  it('mines and fabrication plants get the tiered mineral-extractor / fabrication-plant art', () => {
    expect(getBuildingAsset('mining_lunar_basic', 'mining_enterprise', 1)).toBe('/game/building-mineral-extractor.webp');
    expect(getBuildingAsset('mining_titan', 'mining_enterprise', 4)).toBe('/game/building-mineral-extractor-s4.webp');
    expect(getBuildingAsset('fabrication_earth', 'fabrication_facility', 1)).toBe('/game/building-fabrication-plant.webp');
    expect(getBuildingAsset('fabrication_titan', 'fabrication_facility', 4)).toBe('/game/building-fabrication-plant-s4.webp');
  });

  it('keeps the legacy aliases resolving (old saves / tests)', () => {
    expect(getBuildingAsset('x', 'mining', 2)).toBe('/game/building-mineral-extractor-s2.webp');
    expect(getBuildingAsset('x', 'fabrication', 3)).toBe('/game/building-fabrication-plant-s3.webp');
  });

  it('every flat BUILDING_ASSETS file exists on disk', () => {
    for (const [key, asset] of Object.entries(BUILDING_ASSETS)) {
      expect({ key, ok: exists(asset) }).toEqual({ key, ok: true });
    }
  });

  it('every building definition resolves to an existing file', () => {
    for (const b of BUILDINGS) {
      const asset = getBuildingAsset(b.id, b.category, b.tier);
      expect({ id: b.id, ok: exists(asset) }).toEqual({ id: b.id, ok: true });
    }
  });
});

describe('ship art resolution (§4 servicer tug / fleet tender)', () => {
  it('every hull has an explicit SHIP_ASSETS entry whose file exists', () => {
    for (const ship of SHIPS) {
      expect({ id: ship.id, mapped: ship.id in SHIP_ASSETS }).toEqual({ id: ship.id, mapped: true });
      expect({ id: ship.id, ok: exists(getShipAsset(ship.id)) }).toEqual({ id: ship.id, ok: true });
    }
  });

  it('only backlog-listed hulls borrow another hull\'s render', () => {
    const byAsset = new Map<string, string[]>();
    for (const ship of SHIPS) {
      const asset = SHIP_ASSETS[ship.id];
      byAsset.set(asset, [...(byAsset.get(asset) || []), ship.id]);
    }
    for (const [, ids] of byAsset) {
      if (ids.length <= 1) continue;
      const borrowers = ids.filter(id => id in SHIP_ART_BACKLOG);
      // Exactly one owner; every other sharer must be a declared borrower
      // that names that owner.
      expect(ids.length - borrowers.length).toBe(1);
      const owner = ids.find(id => !(id in SHIP_ART_BACKLOG));
      for (const b of borrowers) expect(SHIP_ART_BACKLOG[b].borrows).toBe(owner);
    }
  });

  it('the maintenance hulls no longer render the cargo shuttle', () => {
    expect(getShipAsset('servicer_tug')).not.toBe(SHIP_ASSETS.cargo_shuttle);
    expect(getShipAsset('fleet_tender')).not.toBe(SHIP_ASSETS.cargo_shuttle);
    expect(Object.keys(SHIP_ART_BACKLOG).sort()).toEqual(['fleet_tender', 'servicer_tug']);
  });
});
