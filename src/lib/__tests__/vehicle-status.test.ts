/**
 * @jest-environment node
 *
 * Vehicle status fact sheet (2026-09-07). The sheet exists so pages cannot
 * contradict each other; what can go wrong is an entry that is undated,
 * unsourced, keyed wrongly, or quietly stale. Those are pinned here.
 */
import { VEHICLE_STATUS, getVehicleStatus, statusAgeDays } from '../vehicle-status';
import { LAUNCH_VEHICLES } from '../launch-vehicles-data';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DAY_OR_MONTH = /^\d{4}-\d{2}(-\d{2})?$/;

describe('every entry', () => {
  for (const [key, v] of Object.entries(VEHICLE_STATUS)) {
    it(`${key} is keyed by its slug, dated, sourced, and chronological`, () => {
      expect(v.slug).toBe(key);
      expect(v.asOf).toMatch(ISO_DAY);
      expect(v.sources.length).toBeGreaterThan(0);
      expect(v.headline.length).toBeGreaterThan(20);
      for (const e of v.events) expect(e.date).toMatch(ISO_DAY_OR_MONTH);
      const dates = v.events.map((e) => e.date);
      expect(dates).toEqual(dates.slice().sort());
    });
  }
});

describe('registry alignment', () => {
  it('uses registry ids for vehicles the registry carries', () => {
    const ids = new Set(LAUNCH_VEHICLES.map((v) => v.id));
    const carried = Object.keys(VEHICLE_STATUS).filter((k) => ids.has(k));
    // The point of the sheet is the rockets the site talks about most.
    expect(carried).toEqual(expect.arrayContaining(['new-glenn', 'starship', 'neutron', 'terran-r']));
  });

  it('agrees with the registry on development status', () => {
    for (const v of LAUNCH_VEHICLES) {
      const s = VEHICLE_STATUS[v.id];
      if (!s) continue;
      if (v.status === 'In Development') expect(s.standing).toBe('development');
      if (v.status === 'Retired') expect(s.standing).toBe('retired');
    }
  });
});

describe('staleness', () => {
  it('reports age in whole days from asOf', () => {
    const s = getVehicleStatus('new-glenn')!;
    expect(statusAgeDays(s, new Date(`${s.asOf}T12:00:00Z`))).toBe(0);
    expect(statusAgeDays(s, new Date(new Date(`${s.asOf}T00:00:00Z`).getTime() + 10 * 86_400_000))).toBe(10);
  });

  it('returns null for a vehicle without an entry', () => {
    expect(getVehicleStatus('falcon-9')).toBeNull();
  });
});
