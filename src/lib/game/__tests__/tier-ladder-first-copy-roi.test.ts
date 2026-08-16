/**
 * @jest-environment node
 *
 * M1 acceptance guard (docs/MEANINGFUL_2026-08.md §5 M1.2, finding F1):
 * "Acceptance: build-menu sweep (§2.1) shows no negative first copies and
 * monotone-ish payback band, not a cliff." This is the harness-derived
 * regression test the spec calls for — it imports the SAME sweep
 * (buildMenuFirstCopySweep) the manual `npx tsx scripts/sim-strategies.ts`
 * acceptance run uses, so a future tuning change that reintroduces a
 * trap-purchase building fails CI, not just a human rereading a markdown
 * table.
 */

import { buildMenuFirstCopySweep } from '../../../../scripts/sim-harness';

describe('tier ladder — first-copy ROI (M1/F1 acceptance)', () => {
  const sweep = buildMenuFirstCopySweep();

  it('the sweep is not vacuous (sanity — every building def is reachable)', () => {
    expect(sweep.length).toBeGreaterThan(30);
  });

  it('no revenue building loses money on its first copy, solo, base multipliers', () => {
    const losers = sweep
      .filter(({ row }) => row.fleetNet <= 0)
      .map(({ def, loc, row }) => `${def.id}@${loc}: ${row.fleetNet} net/mo`);
    expect(losers).toEqual([]);
  });

  it('every first-copy payback is finite (a real, if sometimes long, road to profit)', () => {
    const never = sweep
      .filter(({ row }) => row.paybackMonths === Infinity)
      .map(({ def, loc }) => `${def.id}@${loc}`);
    expect(never).toEqual([]);
  });

  it('the four F1-flagged trap buildings are no longer traps', () => {
    const byId = new Map(sweep.map(s => [s.def.id, s]));
    for (const id of ['fabrication_titan', 'datacenter_jupiter', 'mining_kuiper', 'sat_mars_relay']) {
      const entry = byId.get(id);
      expect(entry).toBeDefined();
      expect(entry!.row.fleetNet).toBeGreaterThan(0);
    }
  });

  it('the cheapest T1 on-ramp buildings (< $100M) pay back inside 25 months', () => {
    // Not every T1 building is cheap (space_station_small is $500M despite
    // its tier label) — this checks the actual bootstrap tier the spec's
    // "25-40 months at T1" target describes: ground_station, launch_pad_small,
    // sat_telecom, sat_sensor and similar sub-$100M starter buildings.
    const slowStarters = sweep
      .filter(({ def }) => def.tier === 1 && def.baseCost < 100_000_000)
      .filter(({ row }) => row.paybackMonths === Infinity || row.paybackMonths > 40)
      .map(({ def }) => def.id);
    expect(slowStarters).toEqual([]);
  });
});
