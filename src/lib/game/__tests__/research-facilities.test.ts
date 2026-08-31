import { BUILDING_MAP, checkBuildingCap } from '../buildings';
import { CAPABILITY_CAPS, getGlobalCapabilityBonus } from '../building-capabilities';

// Research-facility family (2026-08-31, Jay): Earth institute capped at 1,
// off-world ladder stacks research speed under the raised 0.20 cap.
describe('research facilities', () => {
  const FAMILY = ['research_institute_earth', 'research_lab_orbital', 'research_station_lunar', 'research_station_mars'];

  it('all four exist, boost research, and sit where they should', () => {
    const locs: Record<string, string> = {
      research_institute_earth: 'earth_surface',
      research_lab_orbital: 'leo',
      research_station_lunar: 'lunar_surface',
      research_station_mars: 'mars_surface',
    };
    for (const id of FAMILY) {
      const def = BUILDING_MAP.get(id)!;
      expect(def).toBeTruthy();
      expect(def.capabilities?.researchSpeed || 0).toBeGreaterThan(0);
      expect(def.requiredLocation).toBe(locs[id]);
      expect(def.enabledServices).toEqual([]); // pure capability, no revenue trap
    }
  });

  it('the Earth institute is capped at one per corporation', () => {
    const earth = BUILDING_MAP.get('research_institute_earth')!;
    expect(earth.maxPerPlayer).toBe(1);
    expect(earth.requiredResearch).toEqual([]); // day-one build
    expect(checkBuildingCap([{ definitionId: 'research_institute_earth' }], earth).allowed).toBe(false);
  });

  it('the family stacks and clamps at the raised 0.20 cap', () => {
    expect(CAPABILITY_CAPS.researchSpeed).toBe(0.2);
    const all = FAMILY.map(id => ({ definitionId: id, isComplete: true }));
    const some = FAMILY.slice(0, 2).map(id => ({ definitionId: id, isComplete: true }));
    expect(getGlobalCapabilityBonus({ buildings: some }, 'researchSpeed')).toBeCloseTo(0.10);
    // full family = 0.23 raw → clamped to the 0.20 cap
    expect(getGlobalCapabilityBonus({ buildings: all }, 'researchSpeed')).toBeCloseTo(0.20);
    // incomplete buildings contribute nothing
    expect(getGlobalCapabilityBonus({ buildings: FAMILY.map(id => ({ definitionId: id, isComplete: false })) }, 'researchSpeed')).toBe(0);
  });
});
