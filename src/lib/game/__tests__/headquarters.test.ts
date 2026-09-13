/**
 * @jest-environment node
 *
 * CC-1 (docs/COMMAND_CENTER_DESIGN_2026-09-13.md): the headquarters model —
 * stage registry, default, save migration, sync sanitizer, public label.
 */
import {
  HQ_STAGES, HQ_STAGE_MAP, DEFAULT_HQ_STAGE, DEFAULT_HQ_LOCATION,
  defaultHeadquarters, getHeadquarters, isValidHeadquarters, migrateHeadquarters,
  sanitizeHqLocationId, hqLabelForLocationId, hqStagesWithPlates, isHqStageId,
} from '../headquarters';
import { getNewGameState, migrateLoadedState } from '../save-load';
import { LOCATION_MAP } from '../solar-system';
import { CORPORATION_TIERS } from '../corporation-tiers';
import type { GameState } from '../types';

describe('HQ_STAGES registry', () => {
  it('lists the seven-rung ladder from Earth to interstellar, tiers ascending', () => {
    expect(HQ_STAGES[0].id).toBe('earth_ops');
    expect(HQ_STAGES[0].tier).toBe(1);
    expect(HQ_STAGES[HQ_STAGES.length - 1].id).toBe('interstellar_hq');
    for (let i = 1; i < HQ_STAGES.length; i++) expect(HQ_STAGES[i].tier).toBeGreaterThanOrEqual(HQ_STAGES[i - 1].tier);
    const maxTier = Math.max(...CORPORATION_TIERS.map(t => t.tier));
    for (const s of HQ_STAGES) expect(s.tier).toBeLessThanOrEqual(maxTier);
  });

  it('every seat except the interstellar placeholder is a real solar-system location', () => {
    for (const s of HQ_STAGES) {
      if (s.id === 'interstellar_hq') continue;
      expect(LOCATION_MAP.has(s.locationId)).toBe(true);
    }
  });

  it('Earth, the LEO deck and Luna have rendered plates; CC-3 leaves nothing comingSoon', () => {
    expect(hqStagesWithPlates().map(s => s.id)).toEqual(['earth_ops', 'orbital_deck', 'lunar_hq']);
    for (const s of HQ_STAGES) expect(!!s.comingSoon).toBe(false);
    expect(HQ_STAGE_MAP.get('earth_ops')?.plates?.dir).toBe('/game/hq/earth/');
    expect(HQ_STAGE_MAP.get('orbital_deck')?.plates?.dir).toBe('/game/hq/orbital_deck/');
    expect(HQ_STAGE_MAP.get('lunar_hq')?.plates?.dir).toBe('/game/hq/lunar_hq/');
  });

  it('ids are unique and the default is registered', () => {
    expect(new Set(HQ_STAGES.map(s => s.id)).size).toBe(HQ_STAGES.length);
    expect(isHqStageId(DEFAULT_HQ_STAGE)).toBe(true);
    expect(isHqStageId('mars_bar')).toBe(false);
    expect(DEFAULT_HQ_LOCATION).toBe('earth_surface');
  });
});

describe('defaultHeadquarters / getHeadquarters', () => {
  it('founds the corporation at the Earth Operations Center on its createdAt', () => {
    expect(defaultHeadquarters(1_700_000_000_000)).toEqual({ stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: 1_700_000_000_000 });
    expect(defaultHeadquarters(NaN).movedAtMs).toBe(0);
  });

  it('reads a missing or malformed block as the default', () => {
    expect(getHeadquarters({ createdAt: 42 })).toEqual({ stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: 42 });
    expect(getHeadquarters({ createdAt: 42, headquarters: { stage: 'nope', locationId: 'x', movedAtMs: 1 } }).stage).toBe('earth_ops');
    // a stage whose location disagrees with its seat is rejected too
    expect(isValidHeadquarters({ stage: 'lunar_hq', locationId: 'earth_surface', movedAtMs: 1 })).toBe(false);
    expect(isValidHeadquarters({ stage: 'lunar_hq', locationId: 'lunar_surface', movedAtMs: 1 })).toBe(true);
  });

  it('keeps a valid block as-is', () => {
    const hq = { stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: 5 };
    expect(getHeadquarters({ createdAt: 1, headquarters: hq })).toBe(hq);
  });
});

describe('save migration', () => {
  it('a new game is founded on Earth', () => {
    const s = getNewGameState();
    expect(s.headquarters?.stage).toBe('earth_ops');
    expect(s.headquarters?.movedAtMs).toBe(s.createdAt);
  });

  it('an old save with no headquarters gets the Earth default on load', () => {
    const s = getNewGameState();
    delete (s as Partial<GameState>).headquarters;
    const json = JSON.parse(JSON.stringify(s)) as GameState;
    expect(json.headquarters).toBeUndefined();
    const migrated = migrateLoadedState(json);
    expect(migrated).not.toBeNull();
    expect(migrated!.headquarters).toEqual({ stage: 'earth_ops', locationId: 'earth_surface', movedAtMs: s.createdAt });
  });

  it('a tampered headquarters block is replaced, a valid one preserved', () => {
    const bad = getNewGameState();
    (bad as unknown as { headquarters: unknown }).headquarters = { stage: 'interstellar_hq', locationId: 'earth_surface', movedAtMs: -1 };
    expect(migrateHeadquarters(bad).headquarters?.stage).toBe('earth_ops');
    const good = getNewGameState();
    const hq = good.headquarters;
    expect(migrateHeadquarters(good).headquarters).toBe(hq);
  });
});

describe('sanitizeHqLocationId (sync route)', () => {
  it('accepts a registered seat and collapses everything else to Earth', () => {
    expect(sanitizeHqLocationId('earth_surface')).toBe('earth_surface');
    expect(sanitizeHqLocationId('lunar_surface')).toBe('lunar_surface');
    expect(sanitizeHqLocationId('geo')).toBe('earth_surface'); // a real location, not a seat
    expect(sanitizeHqLocationId('<script>')).toBe('earth_surface');
    expect(sanitizeHqLocationId(null)).toBe('earth_surface');
    expect(sanitizeHqLocationId(42)).toBe('earth_surface');
  });
});

describe('hqLabelForLocationId (public pages)', () => {
  it('labels the seat, defaulting to Earth', () => {
    expect(hqLabelForLocationId('earth_surface')).toBe('Earth Operations Center');
    expect(hqLabelForLocationId('leo')).toBe('Orbital Command Deck');
    expect(hqLabelForLocationId(undefined)).toBe('Earth Operations Center');
    expect(hqLabelForLocationId('bogus')).toBe('Earth Operations Center');
  });
});
