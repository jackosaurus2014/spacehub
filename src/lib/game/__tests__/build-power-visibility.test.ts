/**
 * @jest-environment node
 *
 * Power visibility (2026-09-13, founder report) — "Energy needs should be more
 * obvious. In the build section for the various satellites it doesn't show any
 * energy needs that I can see. We should warn players about that up front."
 *
 * The measured case: two Lunar Relay Satellites (3 MW each) at lunar_orbit
 * with nothing generating there. getPowerByLocation returns
 * { generated: 0, required: 6, ratio: 0 }, game-engine.ts §1 multiplies every
 * service at that location by that ratio, and both satellites had therefore
 * been earning exactly nothing since they completed — while the Lunar
 * Gateway's build card promised "$25M/mo vs $10M cost = $15M/mo net".
 *
 * Covered here: the preview's power fields at a starved / partial / healthy
 * location, the cure lookup, the Outliner's starved-location notice
 * (appearance, severity, disappearance, id stability under dismissal), and a
 * guard that every powerRequired definition carries the spec caveat.
 */
import { getNewGameState } from '../save-load';
import type { GameState, BuildingInstance } from '../types';
import { BUILDINGS, BUILDING_MAP, findPowerCure, powerSpecCaveat } from '../buildings';
import { computeBuildPreview } from '../build-preview';
import { deriveAttentionItems, deriveAllAttentionItems, dismissNotice, deriveAttentionView } from '../outliner';

const NOW = Date.UTC(2026, 8, 13, 12, 0, 0);

const GATEWAY = BUILDING_MAP.get('space_station_lunar')!;   // 8 MW draw, lunar_orbit
const RELAY = BUILDING_MAP.get('sat_lunar_relay')!;         // 3 MW draw, lunar_orbit
const ARRAY = BUILDING_MAP.get('solar_array_lunar_orbit')!; // +25 MW, lunar_orbit
const SMALL_PAD = BUILDING_MAP.get('launch_pad_small')!;    // earth_surface, no power fields

function built(instanceId: string, definitionId: string, locationId: string, isComplete = true): BuildingInstance {
  return {
    instanceId, definitionId, locationId,
    buildStartDate: { year: 2026, month: 1 },
    completionDate: { year: 2026, month: 1 },
    isComplete, startedAtMs: 0, realDurationSeconds: 1,
  };
}

function stateWith(buildings: BuildingInstance[], overrides: Partial<GameState> = {}): GameState {
  return { ...getNewGameState(), buildings, ...overrides };
}

/** The founder's live save, reduced to what matters: two relays, no power. */
function founderSave(): GameState {
  return stateWith([
    built('r1', 'sat_lunar_relay', 'lunar_orbit'),
    built('r2', 'sat_lunar_relay', 'lunar_orbit'),
  ]);
}

describe('computeBuildPreview: power facts reach the UI', () => {
  it('starved location — reports the before/after balance, scales revenue to zero, and says why', () => {
    const preview = computeBuildPreview(founderSave(), GATEWAY, 'lunar_orbit');

    expect(preview.power.powerRequired).toBe(8);
    expect(preview.power.powerGenerated).toBe(0);
    expect(preview.power.unlimited).toBe(false);
    // Before the build: the two relays' 6 MW, nothing generating.
    expect(preview.power.before).toEqual({ generated: 0, required: 6, ratio: 0 });
    // After: this station's own 8 MW draw is counted — that is the ratio the
    // tick will apply the month it completes.
    expect(preview.power.after).toEqual({ generated: 0, required: 14, ratio: 0 });
    expect(preview.power.revenueScale).toBe(0);
    expect(preview.power.shortfallMW).toBe(14);

    // The projection is scaled by it: zero revenue against real costs.
    expect(preview.projectedRevenueMonthly).toBe(0);
    expect(preview.projectedNetMonthly).toBeLessThan(0);

    const power = preview.lossReasons.find(r => r.kind === 'power');
    expect(power).toBeDefined();
    expect(power!.text).toMatch(/Nothing generates power/);
    expect(power!.text).toMatch(/0%/);
  });

  it('partial coverage — revenue scales by the exact ratio, including this build', () => {
    // One array (+25 MW) against nine relays (27 MW): 25/27 today. Adding a
    // tenth relay takes demand to 30 MW -> 25/30.
    const buildings = [built('a1', 'solar_array_lunar_orbit', 'lunar_orbit')];
    for (let i = 0; i < 9; i++) buildings.push(built(`r${i}`, 'sat_lunar_relay', 'lunar_orbit'));
    const preview = computeBuildPreview(stateWith(buildings), RELAY, 'lunar_orbit');

    expect(preview.power.before).toEqual({ generated: 25, required: 27, ratio: 25 / 27 });
    expect(preview.power.after.generated).toBe(25);
    expect(preview.power.after.required).toBe(30);
    expect(preview.power.after.ratio).toBeCloseTo(25 / 30, 10);
    expect(preview.power.revenueScale).toBeCloseTo(25 / 30, 10);
    expect(preview.power.shortfallMW).toBe(5);
    expect(preview.projectedRevenueMonthly).toBeGreaterThan(0);
  });

  it('healthy location — full revenue scale, no shortfall, no power loss reason', () => {
    const state = stateWith([
      built('a1', 'solar_array_lunar_orbit', 'lunar_orbit'),
      built('r1', 'sat_lunar_relay', 'lunar_orbit'),
    ]);
    const preview = computeBuildPreview(state, GATEWAY, 'lunar_orbit');

    expect(preview.power.before).toEqual({ generated: 25, required: 3, ratio: 1 });
    expect(preview.power.after).toEqual({ generated: 25, required: 11, ratio: 1 });
    expect(preview.power.revenueScale).toBe(1);
    expect(preview.power.shortfallMW).toBe(0);
    expect(preview.lossReasons.some(r => r.kind === 'power')).toBe(false);
  });

  it('a generator build reports its own output and how it repairs the balance', () => {
    const preview = computeBuildPreview(founderSave(), ARRAY, 'lunar_orbit');
    expect(preview.power.powerGenerated).toBe(25);
    expect(preview.power.powerRequired).toBe(0);
    expect(preview.power.before.ratio).toBe(0);
    expect(preview.power.after).toEqual({ generated: 25, required: 6, ratio: 1 });
    expect(preview.power.shortfallMW).toBe(0);
  });

  it('Earth surface is grid-powered: unlimited, never scaled', () => {
    const preview = computeBuildPreview(stateWith([]), SMALL_PAD, 'earth_surface');
    expect(preview.power.unlimited).toBe(true);
    expect(preview.power.revenueScale).toBe(1);
    expect(preview.power.shortfallMW).toBe(0);
    expect(preview.lossReasons.some(r => r.kind === 'power')).toBe(false);
  });
});

describe('findPowerCure', () => {
  it('names the lunar-orbit array for the founder shortfall and reports the research he lacks', () => {
    const cure = findPowerCure('lunar_orbit', 14, [])!;
    expect(cure.def.id).toBe('solar_array_lunar_orbit');
    expect(cure.netPowerGenerated).toBe(25);
    expect(cure.unitsNeeded).toBe(1);
    expect(cure.missingResearch).toEqual(['perovskite_tandem']);
  });

  it('reports no missing research once the player has it', () => {
    const cure = findPowerCure('lunar_orbit', 14, ['perovskite_tandem'])!;
    expect(cure.missingResearch).toEqual([]);
  });

  it('respects requiredLocation — never offers another location\'s generator', () => {
    const leo = findPowerCure('leo', 10, [])!;
    expect(leo.def.requiredLocation).toBe('leo');
    // Cheapest LEO generator wins when neither is researched.
    expect(leo.def.id).toBe('solar_farm_orbital');

    const mars = findPowerCure('mars_surface', 10, [])!;
    expect(mars.def.requiredLocation).toBe('mars_surface');
  });

  it('prefers a generator the player can actually build over a cheaper gated one', () => {
    const cure = findPowerCure('leo', 10, ['fission_surface_power'])!;
    expect(cure.def.id).toBe('nuclear_reactor_leo'); // pricier, but buildable now
    expect(cure.missingResearch).toEqual([]);
  });

  it('counts how many copies the shortfall needs', () => {
    expect(findPowerCure('lunar_orbit', 60, [])!.unitsNeeded).toBe(3); // ceil(60/25)
    expect(findPowerCure('lunar_orbit', 0, [])!.unitsNeeded).toBe(1);
  });

  it('returns null where the catalog has no generator', () => {
    expect(findPowerCure('no_such_location', 10, [])).toBeNull();
  });
});

describe('Attention: a power-starved location', () => {
  const idFor = (loc: string) => `att-power-${loc}`;

  it('surfaces the founder case as CRITICAL, deep-linked to the location, naming the cure', () => {
    const items = deriveAttentionItems(founderSave(), NOW);
    const item = items.find(i => i.id === idFor('lunar_orbit'));
    expect(item).toBeDefined();
    expect(item!.severity).toBe('critical');       // ratio 0 = fully dark
    expect(item!.tab).toBe('map');
    expect(item!.target).toEqual({ kind: 'location', id: 'lunar_orbit' });
    expect(item!.label).toMatch(/Lunar Orbit/);
    expect(item!.detail).toMatch(/0 of 6 MW/);
    expect(item!.detail).toMatch(/Lunar Orbital Solar Array/);
    expect(item!.detail).toMatch(/Perovskite/i);   // the research he still lacks
  });

  it('drops to WARNING when there is partial generation', () => {
    const buildings = [built('a1', 'solar_array_lunar_orbit', 'lunar_orbit')];
    for (let i = 0; i < 10; i++) buildings.push(built(`r${i}`, 'sat_lunar_relay', 'lunar_orbit'));
    const item = deriveAttentionItems(stateWith(buildings), NOW).find(i => i.id === idFor('lunar_orbit'));
    expect(item).toBeDefined();
    expect(item!.severity).toBe('warning');
    expect(item!.detail).toMatch(/25 of 30 MW/);
  });

  it('disappears once generation covers demand', () => {
    const state = stateWith([
      built('r1', 'sat_lunar_relay', 'lunar_orbit'),
      built('r2', 'sat_lunar_relay', 'lunar_orbit'),
      built('a1', 'solar_array_lunar_orbit', 'lunar_orbit'),
    ]);
    expect(deriveAttentionItems(state, NOW).some(i => i.id === idFor('lunar_orbit'))).toBe(false);
  });

  it('ignores a starved site with nothing revenue-earning on it', () => {
    // Life Support Works draws 10 MW but enables no service — nothing is
    // losing revenue, so there is nothing to nag about.
    const state = stateWith([built('l1', 'life_support_works', 'lunar_surface')]);
    expect(deriveAttentionItems(state, NOW).some(i => i.id === idFor('lunar_surface'))).toBe(false);
  });

  it('ignores buildings still under construction', () => {
    const state = stateWith([built('r1', 'sat_lunar_relay', 'lunar_orbit', false)]);
    expect(deriveAttentionItems(state, NOW).some(i => i.id === idFor('lunar_orbit'))).toBe(false);
  });

  it('the id is stable across renders and its dismissal prunes when the deficit clears', () => {
    const state = founderSave();
    const first = deriveAllAttentionItems(state, NOW).find(i => i.id === idFor('lunar_orbit'))!;
    const second = deriveAllAttentionItems(state, NOW + 60_000).find(i => i.id === idFor('lunar_orbit'))!;
    expect(second.id).toBe(first.id);

    // Dismissed -> hidden, but still recorded.
    const dismissed = dismissNotice(state, first, NOW);
    const view = deriveAttentionView(dismissed, NOW);
    expect(view.visible.some(i => i.id === first.id)).toBe(false);
    expect(view.dismissed.some(i => i.id === first.id)).toBe(true);

    // Array goes up -> the condition clears -> the dismissal is pruned, so a
    // FUTURE deficit at the same location surfaces again instead of being
    // muted forever.
    const fixed: GameState = {
      ...dismissed,
      buildings: [...dismissed.buildings, built('a1', 'solar_array_lunar_orbit', 'lunar_orbit')],
    };
    const fixedView = deriveAttentionView(fixed, NOW);
    expect(fixedView.all.some(i => i.id === first.id)).toBe(false);
    expect(fixedView.dismissals[first.id]).toBeUndefined();
    expect(fixedView.dismissalsChanged).toBe(true);
  });
});

describe('spec text convention: best case at full power', () => {
  // The chosen convention (see powerSpecCaveat in buildings.ts): the authored
  // tooltip economics are NOT re-derived to match the live preview — they are
  // labelled explicitly as a best case at full power, consistently, on every
  // definition that draws power.
  const powered = BUILDINGS.filter(b => (b.powerRequired || 0) > 0);

  it('covers every powerRequired building (and the catalog still has some)', () => {
    expect(powered.length).toBeGreaterThan(20);
    for (const def of powered) {
      expect(typeof def.tooltip).toBe('string');
      const caveat = powerSpecCaveat(def.powerRequired!);
      expect(`${def.id}: ${def.tooltip}`).toContain(caveat);
      // It is the tail of the tooltip, so it reads as the closing caveat and
      // never interrupts the authored prose.
      expect(def.tooltip!.endsWith(caveat)).toBe(true);
    }
  });

  it('quotes each building\'s own draw', () => {
    const gateway = BUILDING_MAP.get('space_station_lunar')!;
    expect(gateway.tooltip).toContain('POWER: draws 8 MW');
    expect(gateway.tooltip).toContain('BEST CASE at full power');
    const relay = BUILDING_MAP.get('sat_lunar_relay')!;
    expect(relay.tooltip).toContain('POWER: draws 3 MW');
  });

  it('does not stamp the caveat on buildings that draw no power', () => {
    for (const def of BUILDINGS.filter(b => !b.powerRequired)) {
      expect(def.tooltip || '').not.toContain('POWER: draws');
    }
  });
});
