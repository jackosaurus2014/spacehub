// ─── Money desync fix (2026-09-12): `completedContracts` in the sync body ────

import { validateSyncEconomics, SYNC_MAX_CONTRACTS } from '../sync-validation';

describe('validateSyncEconomics — completedContracts', () => {
  it('defaults to an empty list when absent', () => {
    const r = validateSyncEconomics({ money: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedContracts).toEqual([]);
  });

  it('keeps id-shaped strings, drops non-strings / bad shapes / duplicates', () => {
    const r = validateSyncEconomics({
      money: 1,
      completedContracts: ['c_first_launch', 42, null, 'bad id with spaces', '<script>', 'c_first_launch', 'c_satellite_net'],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedContracts).toEqual(['c_first_launch', 'c_satellite_net']);
  });

  it('rejects a non-array with a 400-shaped error on the field', () => {
    const r = validateSyncEconomics({ money: 1, completedContracts: { c_first_launch: true } });
    expect(r).toMatchObject({ ok: false, field: 'completedContracts' });
  });

  it('truncates to the cap', () => {
    const ids = Array.from({ length: SYNC_MAX_CONTRACTS + 50 }, (_, i) => `c_${i}`);
    const r = validateSyncEconomics({ money: 1, completedContracts: ids });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedContracts).toHaveLength(SYNC_MAX_CONTRACTS);
  });
});
