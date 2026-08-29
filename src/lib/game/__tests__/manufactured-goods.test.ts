import { MANUFACTURED_RESOURCE_IDS, MINED_ONLY_RESOURCE_IDS, NO_NPC_CURVE_RESOURCE_IDS, isManufacturedResource } from '../economic-sinks';
import { PRODUCTION_CHAINS, CRAFTED_PRODUCT_IDS, canFabricate, facilityTierFor } from '../production-chains';
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import { getNpcVolumeCap } from '../npc-volume-caps';
import { RESOURCE_MAP } from '../resources';

// 2026-08-29 founder ruling: hardware is manufactured, not mined; it reaches
// the market only when a player or NPC industrial corp lists what they built.
describe('manufactured goods', () => {
  it('are exactly the crafted outputs, and never overlap the mined-only set', () => {
    const crafted = new Set<string>([...CRAFTED_PRODUCT_IDS]);
    expect(new Set(MANUFACTURED_RESOURCE_IDS)).toEqual(crafted);
    for (const id of MANUFACTURED_RESOURCE_IDS) expect(MINED_ONLY_RESOURCE_IDS).not.toContain(id);
    expect(NO_NPC_CURVE_RESOURCE_IDS.length).toBe(MANUFACTURED_RESOURCE_IDS.length + MINED_ONLY_RESOURCE_IDS.length);
  });

  it('every manufactured good has a recipe or a producing building, and is a real resource', () => {
    const recipeOutputs = new Set(PRODUCTION_CHAINS.map((r) => r.outputId));
    const buildingOutputs = new Set(BUILDINGS.flatMap((b) => Object.keys(b.producesPerMonth ?? {})));
    for (const id of MANUFACTURED_RESOURCE_IDS) {
      expect(RESOURCE_MAP.has(id as never)).toBe(true);
      expect(recipeOutputs.has(id) || buildingOutputs.has(id)).toBe(true);
    }
  });

  it('the NPC market maker rests no orders for manufactured goods', () => {
    for (const id of MANUFACTURED_RESOURCE_IDS) expect(getNpcVolumeCap(id)).toBe(0);
    expect(getNpcVolumeCap('iron')).toBeGreaterThan(0);
  });

  it('manufactured goods have no NPC curve supply at all', () => {
    for (const id of MANUFACTURED_RESOURCE_IDS) {
      const def = RESOURCE_MAP.get(id as never)!;
      expect(def.startingSupply).toBe(0);
      expect(def.npcRestockPerHour).toBe(0);
    }
  });
});

describe('fabrication facilities', () => {
  const fabs = BUILDINGS.filter((b) => b.category === 'fabrication_facility');

  it('exist on Earth, in orbit, and on other worlds', () => {
    const locations = new Set(fabs.map((b) => b.requiredLocation));
    expect(locations.has('earth_surface')).toBe(true);
    expect(locations.has('leo')).toBe(true);
    expect(locations.has('lunar_surface')).toBe(true);
    expect(locations.has('mars_surface')).toBe(true);
  });

  it('facility tier gates recipe tier: Earth works runs T1-2, products need off-world, advanced needs T3', () => {
    expect(facilityTierFor({ tier: 1 })).toBe(1);
    expect(facilityTierFor({ tier: 2 })).toBe(1);
    expect(facilityTierFor({ tier: 3 })).toBe(2);
    expect(facilityTierFor({ tier: 4 })).toBe(3);
    const earth = [{ definitionId: 'fabrication_earth', isComplete: true }];
    const lunar = [{ definitionId: 'fabrication_lunar', isComplete: true }];
    const mars = [{ definitionId: 'fabrication_mars', isComplete: true }];
    const unfinished = [{ definitionId: 'fabrication_mars', isComplete: false }];
    expect(canFabricate({ tier: 2 }, earth, BUILDING_MAP)).toBe(true);
    expect(canFabricate({ tier: 3 }, earth, BUILDING_MAP)).toBe(false);
    expect(canFabricate({ tier: 3 }, lunar, BUILDING_MAP)).toBe(true);
    expect(canFabricate({ tier: 4 }, lunar, BUILDING_MAP)).toBe(false);
    expect(canFabricate({ tier: 4 }, mars, BUILDING_MAP)).toBe(true);
    expect(canFabricate({ tier: 1 }, unfinished, BUILDING_MAP)).toBe(false);
    expect(canFabricate({ tier: 1 }, [{ definitionId: 'launch_pad_small', isComplete: true }], BUILDING_MAP)).toBe(false);
  });

  it('every recipe has at least one facility somewhere that can run it', () => {
    for (const r of PRODUCTION_CHAINS) {
      const need = facilityTierFor(r);
      expect(fabs.some((b) => b.tier >= need)).toBe(true);
      expect(isManufacturedResource(r.outputId)).toBe(true);
    }
  });
});
