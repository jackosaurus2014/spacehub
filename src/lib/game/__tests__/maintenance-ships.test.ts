import { SHIP_MAP, getTravelTime } from '../ships';

// Maintenance fleet (2026-08-31, Jay): stationed Servicer early, auto-roving
// Fleet Tender mid/late — "repair ships that fly to different orbits" instead
// of one servicer spammed per orbit.
describe('maintenance ships', () => {
  it('the Orbital Servicer is the stationed tier-2 entry', () => {
    const s = SHIP_MAP.get('servicer_tug')!;
    expect(s.role).toBe('maintenance');
    expect(s.autoRove).toBeFalsy();
    expect(s.requiredResearch).toEqual(['on_orbit_servicing']);
  });

  it('the Fleet Tender roves autonomously behind two research nodes', () => {
    const t = SHIP_MAP.get('fleet_tender')!;
    expect(t.role).toBe('maintenance');
    expect(t.autoRove).toBe(true);
    expect(t.tier).toBeGreaterThan(SHIP_MAP.get('servicer_tug')!.tier);
    expect(t.requiredResearch).toEqual(expect.arrayContaining(['on_orbit_servicing', 'self_healing_materials']));
    // roving fuel is priced into upkeep — meaningfully above the servicer
    expect(t.maintenancePerMonth).toBeGreaterThan(SHIP_MAP.get('servicer_tug')!.maintenancePerMonth * 2);
  });

  it('travel time resolves for any pair (fallback keeps auto-rove finite)', () => {
    expect(getTravelTime('leo', 'geo')).toBeGreaterThan(0);
    expect(getTravelTime('nowhere', 'also_nowhere')).toBe(600);
  });
});
