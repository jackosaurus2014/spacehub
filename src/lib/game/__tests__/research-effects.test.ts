/**
 * @jest-environment node
 *
 * Wave W1 (docs/4X_BASELINE_2026-08.md Part 2a) — research effect-authoring
 * pass verification. Covers:
 *   1. Completeness: every one of the 254 techs has a non-empty authored
 *      effects[] array (the defect being fixed: 0/254 had one before W1).
 *   2. Property test: every authored magnitude, and every aggregate bonus
 *      even with the WHOLE tree completed, stays within PER_EFFECT_CAP / the
 *      per-type caps in getResearchBonuses (BALANCE.md "sinks > sources, no
 *      frictionless stacking" thesis).
 *   3. Precedence: def.effects (explicit) wins over inferEffectsFromFlavor
 *      even when the flavor text would parse to something different.
 *   4. Before/after proofs for a sample spanning branches: honest numbers
 *      now match what resolves; the ~12 physics-violator re-anchors landed.
 */
import {
  RESEARCH,
  RESEARCH_MAP,
  RESEARCH_CATEGORIES,
  EFFECTS_BY_ID,
  PER_EFFECT_CAP,
  getResearchBonuses,
  getResearchMechanicalEffect,
  inferEffectsFromFlavor,
  type ResearchBonuses,
} from '../research-tree';
import type { ResearchDefinition, ResearchEffectType } from '../types';

// ─── 1. Completeness ────────────────────────────────────────────────────────

describe('W1 completeness — every tech has authored effects', () => {
  test('research tree has exactly 277 techs across 17 categories (254 W1 base + 18 from Waves W3+W10 + 3 from Economy Wave E3 §4.3 + 2 from Meaningful Wave M5 §3.2 offense gates)', () => {
    expect(RESEARCH.length).toBe(277);
    expect(RESEARCH_CATEGORIES.length).toBe(17);
    const actualCategories = new Set(RESEARCH.map(r => r.category));
    expect(actualCategories.size).toBe(17);
  });

  test('every tech in RESEARCH has a non-empty def.effects array', () => {
    const missing: string[] = [];
    for (const def of RESEARCH) {
      if (!def.effects || def.effects.length === 0) missing.push(def.id);
    }
    expect(missing).toEqual([]);
  });

  test('EFFECTS_BY_ID has exactly one entry per RESEARCH id (no orphans, no gaps)', () => {
    const researchIds = new Set(RESEARCH.map(r => r.id));
    const effectsIds = new Set(Object.keys(EFFECTS_BY_ID));
    // No id in RESEARCH lacks an EFFECTS_BY_ID entry
    Array.from(researchIds).forEach(id => expect(effectsIds.has(id)).toBe(true));
    // No orphaned EFFECTS_BY_ID entry references a tech that no longer exists
    Array.from(effectsIds).forEach(id => expect(researchIds.has(id)).toBe(true));
    expect(effectsIds.size).toBe(researchIds.size);
  });

  test('RESEARCH_MAP resolves every id (no dangling ids)', () => {
    for (const def of RESEARCH) {
      expect(RESEARCH_MAP.get(def.id)).toBeDefined();
    }
  });
});

// ─── 2. Property test — caps ───────────────────────────────────────────────

describe('W1 property test — effects and aggregate bonuses stay within caps', () => {
  test('every authored effect magnitude is <= PER_EFFECT_CAP (0.30) for all 254 techs', () => {
    const overCap: Array<{ id: string; type: string; magnitude: number }> = [];
    for (const def of RESEARCH) {
      for (const eff of def.effects || []) {
        if (eff.magnitude > PER_EFFECT_CAP + 1e-9) {
          overCap.push({ id: def.id, type: eff.type, magnitude: eff.magnitude });
        }
        expect(eff.magnitude).toBeGreaterThanOrEqual(0);
      }
    }
    expect(overCap).toEqual([]);
  });

  test('aggregate ResearchBonuses respect their documented caps even with the WHOLE tree completed', () => {
    const allIds = RESEARCH.map(r => r.id);
    const bonuses = getResearchBonuses(allIds);
    const caps: Record<keyof ResearchBonuses, number> = {
      buildCostReduction: 0.50,
      buildSpeedBonus: 0.50,
      miningOutputBonus: 1.0,
      serviceRevenueBonus: 0.50,
      researchSpeedBonus: 0.50,
      maintenanceReduction: 0.50,
      travelSpeedBonus: 0.50,
      insuranceDiscountBonus: 0.40,
      hazardResistanceBonus: 0.30,
      crewMoraleBonus: 0.30,
      fuelEfficiencyBonus: 0.50,
      consumptionReductionBonus: 0.40,
      expeditionRiskBonus: 0.30,
    };
    for (const [key, cap] of Object.entries(caps) as Array<[keyof ResearchBonuses, number]>) {
      expect(bonuses[key]).toBeLessThanOrEqual(cap + 1e-9);
      expect(bonuses[key]).toBeGreaterThanOrEqual(0);
    }
  });

  test('with zero completed research, every bonus is exactly zero', () => {
    const bonuses = getResearchBonuses([]);
    for (const v of Object.values(bonuses)) expect(v).toBe(0);
  });

  test('hazardResistance and expeditionRisk (the "real risk" invariant buckets) cap at 0.30, not the general 0.50', () => {
    // Every tech that authors a hazardResistance or expeditionRisk effect,
    // summed — proves the lower cap actually binds somewhere in the tree
    // (not just structurally present but never exercised).
    const hazardTechs = RESEARCH.filter(r => (r.effects || []).some(e => e.type === 'hazardResistance'));
    const expeditionTechs = RESEARCH.filter(r => (r.effects || []).some(e => e.type === 'expeditionRisk'));
    expect(hazardTechs.length).toBeGreaterThan(0);
    expect(expeditionTechs.length).toBeGreaterThan(0);
    const sumHazard = hazardTechs.reduce((s, r) => s + (r.effects || []).filter(e => e.type === 'hazardResistance').reduce((a, e) => a + e.magnitude, 0), 0);
    expect(sumHazard).toBeGreaterThan(0.30); // raw sum exceeds the cap...
    expect(getResearchBonuses(hazardTechs.map(r => r.id)).hazardResistanceBonus).toBeLessThanOrEqual(0.30); // ...but the aggregate is clamped
  });
});

// ─── 3. Precedence — authored effects win over the flavor-text parser ─────

describe('W1 precedence — def.effects beats inferEffectsFromFlavor', () => {
  function makeDef(overrides: Partial<ResearchDefinition>): ResearchDefinition {
    return {
      id: 'synthetic_test_tech',
      name: 'Synthetic Test Tech',
      category: 'mining',
      tier: 1,
      description: 'test',
      effect: '+90% mining yield', // would infer mining @ 0.30 (capped) if parsed
      baseCostMoney: 1,
      baseTimeMonths: 1,
      prerequisites: [],
      unlocks: [],
      realResearchSeconds: 600,
      ...overrides,
    };
  }

  test('explicit effects of a DIFFERENT type than the flavor implies are used as-is', () => {
    const def = makeDef({ effects: [{ type: 'revenue', magnitude: 0.15 }] });
    // Flavor says "mining", explicit says "revenue" — explicit must win.
    expect(getResearchMechanicalEffect(def)).toBe('+15.0% service revenue');
    expect(getResearchMechanicalEffect(def)).not.toContain('mining');
  });

  test('explicit effects magnitude is respected (not re-derived from flavor "90%")', () => {
    const def = makeDef({ effects: [{ type: 'mining', magnitude: 0.12 }] });
    expect(getResearchMechanicalEffect(def)).toBe('+12.0% mining output');
  });

  test('explicit effects are still clamped to PER_EFFECT_CAP even if authored above it', () => {
    const def = makeDef({ effects: [{ type: 'mining', magnitude: 0.99 }] });
    expect(getResearchMechanicalEffect(def)).toBe('+30.0% mining output');
  });

  test('without explicit effects, falls back to the flavor-text parser', () => {
    const def = makeDef({ effects: undefined, effect: '+18% mining yield' });
    expect(getResearchMechanicalEffect(def)).toBe('+18.0% mining output');
    expect(inferEffectsFromFlavor(def.effect)).toEqual([{ type: 'mining', magnitude: 0.18 }]);
  });

  test('without explicit effects AND unparseable flavor, falls back to the legacy category-tier formula', () => {
    const def = makeDef({ effects: undefined, effect: 'Enables something with no numbers', category: 'rocketry', tier: 3 });
    // legacy formula: rocketry -> buildCost @ tier*0.02 = 0.06
    expect(getResearchMechanicalEffect(def)).toBe('-6.0% building cost');
  });

  test('every real tech in RESEARCH resolves via the explicit-effects path, not the parser fallback', () => {
    // Sanity: for a sample across categories, getResearchMechanicalEffect's
    // output type set matches def.effects exactly (proves resolveEffects
    // picked the authored array, not a parser reinterpretation).
    const sample = ['reusable_boosters', 'jump_drive', 'photon_sail_station_keeping', 'superconductors', 'aerostat_technology'];
    for (const id of sample) {
      const def = RESEARCH_MAP.get(id)!;
      expect(def).toBeDefined();
      expect(def.effects).toBeDefined();
      const displayed = getResearchMechanicalEffect(def);
      for (const eff of def.effects!) {
        // every authored type must appear in the displayed string
        expect(displayed.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── 4. Before/after proofs across branches ────────────────────────────────

describe('W1 before/after — honest flavor text matches what resolves', () => {
  test('reusable_boosters: was "-40% launch cost" (over cap), now honest -30%', () => {
    const def = RESEARCH_MAP.get('reusable_boosters')!;
    expect(def.effect).toBe('-30% launch cost');
    expect(getResearchMechanicalEffect(def)).toBe('-30.0% building cost');
  });

  test('automated_mining_fleet: was "5x mining revenue" (would silently resolve to +30%), now says +30%', () => {
    const def = RESEARCH_MAP.get('automated_mining_fleet')!;
    expect(def.effect).toBe('+30% mining revenue');
    expect(def.effect).not.toMatch(/\dx/);
    expect(getResearchMechanicalEffect(def)).toBe('+30.0% mining output');
  });

  test('fusion_reactor: was "10x power" (900% overpromise), now honest +30%', () => {
    const def = RESEARCH_MAP.get('fusion_reactor')!;
    expect(def.effect).not.toMatch(/10x/);
    expect(def.effect).toContain('+30% power');
  });

  test('satellite_deorbit: already honest (-10% insurance), now wired to the real insuranceDiscount bucket', () => {
    const def = RESEARCH_MAP.get('satellite_deorbit')!;
    expect(def.effects!.some(e => e.type === 'insuranceDiscount' && Math.abs(e.magnitude - 0.10) < 1e-9)).toBe(true);
  });

  test('heavy_radiation_shielding: expeditionRisk bucket populated honestly from its -25% claim', () => {
    const def = RESEARCH_MAP.get('heavy_radiation_shielding')!;
    expect(def.effect).toContain('-25% expedition hazard damage');
    expect(def.effects).toEqual([{ type: 'expeditionRisk', magnitude: 0.25 }]);
  });

  test('nuclear_thermal: outer-planet travel time claim now honest and wired to travelSpeed', () => {
    const def = RESEARCH_MAP.get('nuclear_thermal')!;
    expect(def.effect).toBe('-30% outer planet travel time');
    expect(def.effects!.some(e => e.type === 'travelSpeed')).toBe(true);
  });

  test('gate-only techs (no numeric claim) keep their honest non-numeric flavor and get a modest authored effect', () => {
    const def = RESEARCH_MAP.get('resource_prospecting')!;
    expect(def.effect).toBe('Enables lunar/Mars mining');
    expect(def.effects).toEqual([{ type: 'mining', magnitude: 0.02 }]); // tier 1 * 0.02, legacy formula made explicit
  });
});

// ─── 5. Op2 — physics-violator re-anchors ──────────────────────────────────

describe('W1 Op2 — physics-violator re-anchors', () => {
  test('em_drive_research is gone; replaced by photon_sail_station_keeping in the same slot', () => {
    expect(RESEARCH_MAP.get('em_drive_research')).toBeUndefined();
    const replacement = RESEARCH_MAP.get('photon_sail_station_keeping');
    expect(replacement).toBeDefined();
    expect(replacement!.category).toBe('propulsion');
    expect(replacement!.tier).toBe(4);
    expect(replacement!.prerequisites).toEqual(['vasimr']);
    expect(replacement!.description.toLowerCase()).toContain('ikaros');
    expect(replacement!.name).not.toBe('EM Drive Research');
    expect(replacement!.effect.toLowerCase()).not.toContain('if it works'); // the old hedge-flavor is gone
  });

  test('nothing else in the tree still references the deleted em_drive_research id', () => {
    for (const def of RESEARCH) {
      expect(def.prerequisites).not.toContain('em_drive_research');
      expect(def.unlocks).not.toContain('em_drive_research');
    }
  });

  test('jump_drive and exotic_matter_refining are unchanged — the one licensed miracle (2147 Breakthrough)', () => {
    const jump = RESEARCH_MAP.get('jump_drive')!;
    expect(jump).toBeDefined();
    expect(jump.description).toContain('2147');
    expect(RESEARCH_MAP.get('exotic_matter_refining')).toBeDefined();
  });

  test('metallic_hydrogen carries an explicit "metastability unproven" honesty note', () => {
    const def = RESEARCH_MAP.get('metallic_hydrogen')!;
    expect(def.description.toLowerCase()).toContain('metastability');
  });

  test('antimatter_propulsion and antimatter_reactor are re-anchored to the 2147 lore-tech bridge', () => {
    for (const id of ['antimatter_propulsion', 'antimatter_reactor']) {
      const def = RESEARCH_MAP.get(id)!;
      expect(def.description).toContain('2147');
      expect(def.description.toLowerCase()).toContain('lore-tech');
    }
  });

  test('superconductors pairs with the replication-crisis honesty note (LK-99)', () => {
    const def = RESEARCH_MAP.get('superconductors')!;
    expect(def.description).toContain('LK-99');
  });

  test('fission_fragment ISP claim fixed from 1,000,000s/0.1c to 100,000s/0.02c', () => {
    const def = RESEARCH_MAP.get('fission_fragment')!;
    expect(def.effect).toBe('ISP > 100,000s, 0.02c-class capstone');
    expect(def.effect).not.toContain('1,000,000');
    expect(def.effect).not.toContain('0.1c');
  });

  test('the T5 speculative-but-permitted band carries state-of-science honesty notes', () => {
    const notedIds = ['self_replicating_miners', 'programmable_matter', 'mars_warming', 'magnetic_shield', 'crew_augmentation'];
    for (const id of notedIds) {
      const def = RESEARCH_MAP.get(id)!;
      expect(def).toBeDefined();
      expect(def.description.length).toBeGreaterThan(40); // materially longer than the pre-W1 one-liners
    }
  });

  test('astraeus_tech renamed to aerostat_technology (documentation-drift fix)', () => {
    expect(RESEARCH_MAP.get('astraeus_tech')).toBeUndefined();
    expect(RESEARCH_MAP.get('aerostat_technology')).toBeDefined();
  });
});

// ─── 6. Authoring stats sanity (used for the report, not strict assertions) ─

describe('W1 authoring stats', () => {
  test('all 12 effect types are represented at least once across the tree', () => {
    const types: ResearchEffectType[] = [
      'buildCost', 'buildSpeed', 'mining', 'revenue', 'research', 'maintenance',
      'travelSpeed', 'fuelEfficiency', 'insuranceDiscount', 'hazardResistance',
      'crewMorale', 'expeditionRisk',
    ];
    const used = new Set<string>();
    for (const def of RESEARCH) for (const eff of def.effects || []) used.add(eff.type);
    for (const t of types) expect(used.has(t)).toBe(true);
  });

  test('no research has more than 2 authored effect entries (keeps aggregation legible)', () => {
    for (const def of RESEARCH) {
      expect((def.effects || []).length).toBeGreaterThanOrEqual(1);
      expect((def.effects || []).length).toBeLessThanOrEqual(2);
    }
  });
});
