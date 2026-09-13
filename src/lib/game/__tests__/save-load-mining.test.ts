// ─── Save migration: mining Phase A fields (2026-09-12) ────────────────────
// Additive, no version bump (constants.ts SAVE_VERSION note): an existing
// save gets surveyProbes 0, asteroidIntel {}, and any malformed order on a
// ship is cleared to idle rather than left stuck.

import { getNewGameState, migrateLoadedState } from '../save-load';
import type { GameState } from '../types';

function legacySave(): GameState {
  const s = getNewGameState();
  const { surveyProbes: _p, asteroidIntel: _i, ...rest } = s;
  void _p; void _i;
  return rest as GameState;
}

describe('save-load — mining Phase A migration', () => {
  it('a fresh game starts with no probes and no surveys', () => {
    const s = getNewGameState();
    expect(s.surveyProbes).toBe(0);
    expect(s.asteroidIntel).toEqual({});
  });
  it('defaults the new fields on a pre-Phase-A save', () => {
    const migrated = migrateLoadedState(legacySave())!;
    expect(migrated.surveyProbes).toBe(0);
    expect(migrated.asteroidIntel).toEqual({});
  });
  it('keeps real values and rejects garbage', () => {
    const s = legacySave();
    s.surveyProbes = 3;
    s.asteroidIntel = { ast_2_ne_01: { grade: 1.1, reserve: 900, risk: 0.1, surveyedAtMs: 1, via: 'probe' } };
    const m = migrateLoadedState(s)!;
    expect(m.surveyProbes).toBe(3);
    expect(m.asteroidIntel!.ast_2_ne_01.grade).toBe(1.1);
    const bad = legacySave();
    (bad as unknown as { surveyProbes: unknown }).surveyProbes = -4;
    (bad as unknown as { asteroidIntel: unknown }).asteroidIntel = 'nope';
    const mb = migrateLoadedState(bad)!;
    expect(mb.surveyProbes).toBe(0);
    expect(mb.asteroidIntel).toEqual({});
  });
  it('clears a malformed mining order and leaves a well-formed one alone', () => {
    const s = legacySave();
    s.ships = [
      { instanceId: 'a', definitionId: 'prospector_barge', name: 'A', status: 'mining', currentLocation: 'lunar_orbit', isBuilt: true,
        miningOrder: { id: 'x' } as unknown as NonNullable<GameState['ships']>[number]['miningOrder'] },
      { instanceId: 'b', definitionId: 'prospector_barge', name: 'B', status: 'in_transit', currentLocation: 'leo', isBuilt: true,
        miningOrder: { id: 'y', mode: 'mine', asteroidId: 'ast_2_ne_01', fieldId: 'field_near_earth', parentLocationId: 'lunar_orbit', oreId: 'ore_carbonaceous', fillUnits: 200, thenAction: 'return_store', originId: 'leo', destinationId: 'leo', startedAtMs: 1, arrivesAtMs: 2, miningEndsAtMs: 3, completesAtMs: 4, fuelCost: 1, ratePerHour: 40, surveyed: true, serverAuthoritative: true } },
    ];
    const m = migrateLoadedState(s)!;
    expect(m.ships![0].miningOrder).toBeUndefined();
    expect(m.ships![0].status).toBe('idle');
    expect(m.ships![1].miningOrder?.id).toBe('y');
    expect(m.ships![1].status).toBe('in_transit');
  });
});
