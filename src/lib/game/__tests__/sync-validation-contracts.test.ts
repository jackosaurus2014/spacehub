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

// ─── 2026-09-13: completedDeliveries / completedTimedEvents ──────────────────

import { SYNC_MAX_DELIVERIES, SYNC_MAX_TIMED_EVENTS } from '../sync-validation';

describe('validateSyncEconomics — completedDeliveries', () => {
  const good = { id: 'dlv-the-dominion-2n9c-1a2b', resourceId: 'iron', quantity: 120, paymentMoney: 6_000_000 };

  it('defaults to an empty list when absent', () => {
    const r = validateSyncEconomics({ money: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedDeliveries).toEqual([]);
  });

  it('keeps well-formed claims, dedupes by id', () => {
    const r = validateSyncEconomics({ money: 1, completedDeliveries: [good, { ...good, paymentMoney: 1 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedDeliveries).toEqual([good]);
  });

  it.each([
    ['not an array', { c: 1 }, 'completedDeliveries'],
    ['non-object element', [42], 'completedDeliveries[0]'],
    ['bad id', [{ ...good, id: 'has spaces' }], 'completedDeliveries[0].id'],
    ['bad resource slug', [{ ...good, resourceId: '<x>' }], 'completedDeliveries[0].resourceId'],
    ['NaN quantity', [{ ...good, quantity: Number.NaN }], 'completedDeliveries[0].quantity'],
    ['negative quantity', [{ ...good, quantity: -1 }], 'completedDeliveries[0].quantity'],
    ['missing payment', [{ id: good.id, resourceId: 'iron', quantity: 1 }], 'completedDeliveries[0].paymentMoney'],
    ['payment over the hard cap', [{ ...good, paymentMoney: 1e16 }], 'completedDeliveries[0].paymentMoney'],
  ])('rejects %s with a 400 on the field', (_label, value, field) => {
    const r = validateSyncEconomics({ money: 1, completedDeliveries: value });
    expect(r).toMatchObject({ ok: false, field });
  });

  it('rejects more than the cap', () => {
    const many = Array.from({ length: SYNC_MAX_DELIVERIES + 1 }, (_, i) => ({ ...good, id: `dlv-the-dominion-${i}-x` }));
    expect(validateSyncEconomics({ money: 1, completedDeliveries: many })).toMatchObject({ ok: false, field: 'completedDeliveries' });
  });
});

describe('validateSyncEconomics — completedTimedEvents', () => {
  const good = { id: 'evt:evt_precious_metals:1800000000000', templateId: 'evt_precious_metals', startedAtMs: 1_800_000_000_000, completedAtMs: 1_800_003_600_000, reward: 280_000_000 };

  it('defaults to an empty list when absent', () => {
    const r = validateSyncEconomics({ money: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedTimedEvents).toEqual([]);
  });

  it('keeps well-formed occurrences, dedupes by id', () => {
    const r = validateSyncEconomics({ money: 1, completedTimedEvents: [good, { ...good, reward: 1 }] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.completedTimedEvents).toEqual([good]);
  });

  it.each([
    ['not an array', 'evt:x:1', 'completedTimedEvents'],
    ['non-object element', [null], 'completedTimedEvents[0]'],
    ['bad id', [{ ...good, id: 'no way' }], 'completedTimedEvents[0].id'],
    ['bad template', [{ ...good, templateId: 7 }], 'completedTimedEvents[0].templateId'],
    ['missing startedAtMs', [{ ...good, startedAtMs: undefined }], 'completedTimedEvents[0].startedAtMs'],
    ['timestamp out of range', [{ ...good, completedAtMs: 1e16 }], 'completedTimedEvents[0].startedAtMs'],
    ['infinite reward', [{ ...good, reward: Number.POSITIVE_INFINITY }], 'completedTimedEvents[0].reward'],
    ['negative reward', [{ ...good, reward: -5 }], 'completedTimedEvents[0].reward'],
  ])('rejects %s with a 400 on the field', (_label, value, field) => {
    const r = validateSyncEconomics({ money: 1, completedTimedEvents: value });
    expect(r).toMatchObject({ ok: false, field });
  });

  it('rejects more than the cap', () => {
    const many = Array.from({ length: SYNC_MAX_TIMED_EVENTS + 1 }, (_, i) => ({ ...good, id: `evt:evt_precious_metals:${i}` }));
    expect(validateSyncEconomics({ money: 1, completedTimedEvents: many })).toMatchObject({ ok: false, field: 'completedTimedEvents' });
  });
});
