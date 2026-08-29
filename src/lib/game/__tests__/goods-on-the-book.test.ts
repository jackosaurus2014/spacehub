/**
 * @jest-environment jsdom
 *
 * Wave E2 "Goods on the Book" (docs/ECONOMY_PVP_2026-08.md §E2).
 * Covers: the 13 crafted-product outputs + the new life_support_pack are
 * first-class RESOURCE_MAP entries and are MINED_ONLY (no NPC production
 * yet); the 7 adopted colony orphan slugs are first-class resources but
 * NOT mined-only (they have real NPC colony production); the order-book
 * NPC maker's zero-cap handling doesn't silently resurrect to the 50
 * default; save-load's V31 one-time craftedProducts→resources merge.
 */
import { RESOURCE_MAP, RESOURCES } from '../resources';
import { CRAFTED_PRODUCT_IDS, getCraftedProductValue, PRODUCTION_CHAINS } from '../production-chains';
import { MINED_ONLY_RESOURCE_IDS, MANUFACTURED_RESOURCE_IDS } from '../economic-sinks';
import { getNewGameState, saveGame, loadGame, deleteSave } from '../save-load';
import { SAVE_KEY } from '../constants';
import type { GameState } from '../types';

const COLONY_ORPHAN_IDS = [
  'ammonia', 'sulfur', 'solar_concentrate', 'organic_compounds',
  'deuterium', 'bio_samples', 'antimatter_precursors',
];

describe('Wave E2 — crafted products promoted to RESOURCE_MAP', () => {
  it('every CRAFTED_PRODUCT_IDS slug (+ new life_support_pack) is a RESOURCE_MAP entry', () => {
    for (const id of CRAFTED_PRODUCT_IDS) {
      expect(RESOURCE_MAP.has(id as never)).toBe(true);
    }
    expect(RESOURCE_MAP.has('life_support_pack' as never)).toBe(true);
  });

  it('crafted-product RESOURCE_MAP entries carry the refined/component/product category tiers', () => {
    const categories = Array.from(new Set(
      [...CRAFTED_PRODUCT_IDS, 'life_support_pack'].map(id => RESOURCE_MAP.get(id as never)?.category),
    ));
    for (const cat of categories) {
      expect(['refined', 'component', 'product']).toContain(cat);
    }
  });

  it('crafted-product baseMarketPrice matches each recipe\'s existing marketValue (no silent repricing)', () => {
    for (const recipe of PRODUCTION_CHAINS) {
      const def = RESOURCE_MAP.get(recipe.outputId as never);
      expect(def).toBeDefined();
      expect(def!.baseMarketPrice).toBe(recipe.marketValue);
    }
  });

  it('every crafted product + life_support_pack is MANUFACTURED (no NPC curve either way)', () => {
    for (const id of [...CRAFTED_PRODUCT_IDS, 'life_support_pack']) {
      expect(MANUFACTURED_RESOURCE_IDS).toContain(id);
      expect(MINED_ONLY_RESOURCE_IDS).not.toContain(id);
    }
  });

  it('getCraftedProductValue still prefers live spot over marketValue now that products carry a slug', () => {
    const recipe = PRODUCTION_CHAINS.find(c => c.id === 'smelt_steel')!;
    const spot = { steel_ingots: 123456 };
    expect(getCraftedProductValue(recipe, spot)).toBe(123456);
    expect(getCraftedProductValue(recipe, {})).toBe(recipe.marketValue);
  });
});

describe('Wave E2 — adopted colony-era orphan slugs', () => {
  it('all 7 orphan slugs are first-class RESOURCE_MAP entries', () => {
    for (const id of COLONY_ORPHAN_IDS) {
      expect(RESOURCE_MAP.has(id as never)).toBe(true);
    }
  });

  it('orphan slugs are NOT mined-only — real NPC colony production exists for them', () => {
    for (const id of COLONY_ORPHAN_IDS) {
      expect(MINED_ONLY_RESOURCE_IDS).not.toContain(id);
    }
  });

  it('orphan slugs have positive startingSupply/npcRestockPerHour (buyable, unlike crafted goods)', () => {
    for (const id of COLONY_ORPHAN_IDS) {
      const def = RESOURCE_MAP.get(id as never)!;
      expect(def.startingSupply).toBeGreaterThan(0);
      expect(def.npcRestockPerHour).toBeGreaterThan(0);
    }
  });
});

describe('Wave E2 — RESOURCES roster integrity', () => {
  it('every RESOURCES entry has a positive base price and min < base < max', () => {
    for (const r of RESOURCES) {
      expect(r.baseMarketPrice).toBeGreaterThan(0);
      expect(r.minPrice).toBeLessThan(r.baseMarketPrice);
      expect(r.maxPrice).toBeGreaterThan(r.baseMarketPrice);
    }
  });

  it('RESOURCE_MAP has no duplicate ids (RESOURCES.length matches map size)', () => {
    expect(RESOURCE_MAP.size).toBe(RESOURCES.length);
  });
});

describe('Wave E2 — save-load V31 craftedProducts → resources migration', () => {
  afterEach(() => deleteSave());

  it('a fresh game has an empty craftedProducts alias', () => {
    const state = getNewGameState();
    expect(state.craftedProducts ?? {}).toEqual({});
  });

  it('merges a pre-V31 craftedProducts stockpile into resources additively, then clears the alias', () => {
    const legacy = getNewGameState() as GameState;
    legacy.resources = { iron: 10, steel_ingots: 4 };
    legacy.craftedProducts = { steel_ingots: 6, aluminum_alloy: 3 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(legacy));

    const loaded = loadGame()!;
    expect(loaded).not.toBeNull();
    // steel_ingots existed in both — additive merge, not overwrite.
    expect(loaded.resources.steel_ingots).toBe(10);
    expect(loaded.resources.aluminum_alloy).toBe(3);
    expect(loaded.resources.iron).toBe(10);
    // Alias cleared after the one-time move.
    expect(loaded.craftedProducts).toEqual({});
  });

  it('is a no-op (idempotent) when craftedProducts is already empty', () => {
    const state = getNewGameState() as GameState;
    state.resources = { iron: 5 };
    state.craftedProducts = {};
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));

    const loaded = loadGame()!;
    expect(loaded.resources).toEqual({ iron: 5 });
    expect(loaded.craftedProducts).toEqual({});
  });
});
