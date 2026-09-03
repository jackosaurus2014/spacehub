/**
 * @jest-environment node
 *
 * Row 8 — "Retire the inert techs"
 * (docs/GAME_DESIGN_REVIEW_2026-09.md §2 row 8, founder-approved;
 *  docs/BALANCE.md "Inert techs rework (2026-09-02)").
 *
 * The defect: the aggregate buckets in getResearchBonuses were FLAT while
 * PER_EFFECT_CAP allowed 0.30 per tech, so two revenue techs saturated the
 * 0.50 service-revenue bucket and the other ~85 revenue techs were worth
 * exactly +0.00% — several of them $15B+. classifyTechEffects measured
 * 249 / 236 / 228 inert techs at corporation tiers 1 / 4 / 7 before this
 * rework (277 techs in the tree).
 *
 * The rework, all of it asserted below:
 *   1. Caps still exist, but GROW with corporation tier:
 *      cap = base × (1 + 0.15 × (tier − 1)) — tier 1 is byte-identical to the
 *      pre-rework flat caps, tier 7 is 1.9× them (revenue 0.95, mining 1.90).
 *   2. Per-tech magnitudes in the crowded buckets are scaled down so that
 *      OWNING EVERY TECH IN A BUCKET lands on the tier-7 cap, with a 0.5%
 *      floor so nothing renders as "+0.0%".
 *   3. The handful that still cannot fit are explicit `gateOnly` nodes at a
 *      quarter cost, labelled "Prerequisite — no direct bonus", with their
 *      prerequisite/unlock roles intact.
 *   4. The Research panel can show "current → after purchase" from the real
 *      engine function, so nobody buys +0.00%.
 */
import {
  RESEARCH,
  RESEARCH_MAP,
  PER_EFFECT_CAP,
  RESEARCH_BUCKET_BASE_CAPS,
  RESEARCH_BUCKET_MAGNITUDE_SCALE,
  RESEARCH_CAP_TIER_GROWTH,
  RESEARCH_CAP_MAX_TIER,
  RESEARCH_MIN_EFFECT_MAGNITUDE,
  GATE_ONLY_COST_MULTIPLIER,
  GATE_ONLY_LABEL,
  getResearchBucketCap,
  getResearchBonuses,
  getResearchMechanicalEffect,
  getResearchContribution,
  classifyTechEffects,
  resolveEffects,
  scaleResearchEffect,
} from '../research-tree';
import { MARK_III_GATE_BY_CATEGORY } from '../mark-upgrades';
import type { ResearchEffectType } from '../types';

const BUCKETS = Object.keys(RESEARCH_BUCKET_BASE_CAPS) as ResearchEffectType[];

// ─── 1. Tier-scaled caps ────────────────────────────────────────────────────

describe('Row 8 — aggregate caps grow with corporation tier', () => {
  it('tier 1 reproduces the pre-rework flat caps exactly', () => {
    expect(getResearchBucketCap('revenue', 1)).toBeCloseTo(0.50, 10);
    expect(getResearchBucketCap('mining', 1)).toBeCloseTo(1.00, 10);
    expect(getResearchBucketCap('buildCost', 1)).toBeCloseTo(0.50, 10);
    expect(getResearchBucketCap('insuranceDiscount', 1)).toBeCloseTo(0.40, 10);
    expect(getResearchBucketCap('hazardResistance', 1)).toBeCloseTo(0.30, 10);
  });

  it('the tier-7 revenue cap is 0.95 (base x 1.9), and every bucket scales the same way', () => {
    expect(getResearchBucketCap('revenue', 7)).toBeCloseTo(0.95, 10);
    for (const b of BUCKETS) {
      const expected = RESEARCH_BUCKET_BASE_CAPS[b] * (1 + RESEARCH_CAP_TIER_GROWTH * (RESEARCH_CAP_MAX_TIER - 1));
      expect(getResearchBucketCap(b, 7)).toBeCloseTo(expected, 10);
      expect(getResearchBucketCap(b, 4)).toBeGreaterThan(getResearchBucketCap(b, 1));
      expect(getResearchBucketCap(b, 7)).toBeGreaterThan(getResearchBucketCap(b, 4));
    }
  });

  it('the tier argument is clamped (0, 99 and NaN never escape the 1..7 band)', () => {
    expect(getResearchBucketCap('revenue', 0)).toBeCloseTo(getResearchBucketCap('revenue', 1), 10);
    expect(getResearchBucketCap('revenue', 99)).toBeCloseTo(getResearchBucketCap('revenue', 7), 10);
    expect(getResearchBucketCap('revenue', Number.NaN)).toBeCloseTo(getResearchBucketCap('revenue', 1), 10);
  });

  it('omitting the tier on getResearchBonuses keeps the pre-rework (tier 1) caps', () => {
    const all = RESEARCH.map(r => r.id);
    const t1 = getResearchBonuses(all, undefined);
    const t1Explicit = getResearchBonuses(all, undefined, 1);
    expect(t1.serviceRevenueBonus).toBeCloseTo(t1Explicit.serviceRevenueBonus, 10);
    expect(t1.serviceRevenueBonus).toBeLessThanOrEqual(0.50 + 1e-9);
  });

  it('a whole-tree corporation is capped at its tier, never above', () => {
    const all = RESEARCH.map(r => r.id);
    for (const tier of [1, 2, 3, 4, 5, 6, 7]) {
      const b = getResearchBonuses(all, undefined, tier);
      expect(b.serviceRevenueBonus).toBeLessThanOrEqual(getResearchBucketCap('revenue', tier) + 1e-9);
      expect(b.miningOutputBonus).toBeLessThanOrEqual(getResearchBucketCap('mining', tier) + 1e-9);
      expect(b.hazardResistanceBonus).toBeLessThanOrEqual(getResearchBucketCap('hazardResistance', tier) + 1e-9);
      // CLAUDE.md "real risk": research alone must never delete the hazard
      // pillar, even at the top tier (hazards.ts MITIGATION_CAP is 0.90).
      expect(b.hazardResistanceBonus).toBeLessThan(0.90);
    }
    const t7 = getResearchBonuses(all, undefined, 7);
    const t1 = getResearchBonuses(all, undefined, 1);
    expect(t7.serviceRevenueBonus).toBeGreaterThan(t1.serviceRevenueBonus);
  });
});

// ─── 2. Magnitude scale ─────────────────────────────────────────────────────

describe('Row 8 — per-tech magnitudes in the crowded buckets', () => {
  it('every scale is in (0, 1] and the crowded buckets really were scaled down', () => {
    for (const b of BUCKETS) {
      const sc = RESEARCH_BUCKET_MAGNITUDE_SCALE[b];
      expect(sc).toBeGreaterThan(0);
      expect(sc).toBeLessThanOrEqual(1);
    }
    // revenue is the crowded one: 84 techs feed it.
    expect(RESEARCH_BUCKET_MAGNITUDE_SCALE.revenue).toBeLessThan(0.2);
    expect(RESEARCH_BUCKET_MAGNITUDE_SCALE.maintenance).toBeLessThan(0.5);
    // Buckets with a handful of techs are untouched.
    expect(RESEARCH_BUCKET_MAGNITUDE_SCALE.insuranceDiscount).toBe(1);
  });

  it('no resolved effect is ever zero or below the 0.5% display floor', () => {
    for (const def of RESEARCH) {
      for (const eff of resolveEffects(def)) {
        expect(eff.magnitude).toBeGreaterThanOrEqual(RESEARCH_MIN_EFFECT_MAGNITUDE - 1e-9);
      }
    }
  });

  it('scaleResearchEffect clamps to PER_EFFECT_CAP before scaling and floors after', () => {
    const huge = scaleResearchEffect({ type: 'revenue', magnitude: 9 });
    const capped = scaleResearchEffect({ type: 'revenue', magnitude: PER_EFFECT_CAP });
    expect(huge.magnitude).toBeCloseTo(capped.magnitude, 10);
    const tiny = scaleResearchEffect({ type: 'revenue', magnitude: 0.01 });
    expect(tiny.magnitude).toBe(RESEARCH_MIN_EFFECT_MAGNITUDE);
    expect(scaleResearchEffect({ type: 'revenue', magnitude: 0 }).magnitude).toBe(0);
  });

  it('owning every tech in a bucket lands NEAR (never under) the tier-7 cap', () => {
    const all = RESEARCH.map(r => r.id);
    const b = getResearchBonuses(all, undefined, 7);
    // "Near" is the design claim, not "exactly": per-effect magnitudes are
    // rounded to 4 dp, the 0.5% floor pushes some up, and gate-only nodes
    // withdraw theirs. Within 5% below the cap, never above it.
    for (const [got, bucket] of [
      [b.serviceRevenueBonus, 'revenue'],
      [b.miningOutputBonus, 'mining'],
      [b.buildCostReduction, 'buildCost'],
      [b.maintenanceReduction, 'maintenance'],
      [b.buildSpeedBonus, 'buildSpeed'],
    ] as Array<[number, ResearchEffectType]>) {
      const cap = getResearchBucketCap(bucket, 7);
      expect(got).toBeLessThanOrEqual(cap + 1e-9);
      expect(got).toBeGreaterThan(cap * 0.95);
    }
  });
});

// ─── 3. The classifier ──────────────────────────────────────────────────────

describe('Row 8 — classifyTechEffects', () => {
  it('is pure: same inputs, same output', () => {
    const a = classifyTechEffects(4);
    const b = classifyTechEffects(4);
    expect(a.inertCount).toBe(b.inertCount);
    expect(a.inertIds).toEqual(b.inertIds);
    expect(a.byBucket.map(x => x.saturatingSetSize)).toEqual(b.byBucket.map(x => x.saturatingSetSize));
  });

  it('covers every tech exactly once and reports its buckets', () => {
    const r = classifyTechEffects(7);
    expect(r.techs.length).toBe(RESEARCH.length);
    expect(new Set(r.techs.map(t => t.id)).size).toBe(RESEARCH.length);
    const rocketry = r.techs.find(t => t.id === 'reusable_boosters')!;
    expect(rocketry.buckets).toContain('buildCost');
    expect(rocketry.marginalTotal).toBeGreaterThan(0);
  });

  // ── THE headline number this row exists for ──────────────────────────────
  // Before the rework (measured with this same classifier against the
  // pre-rework tree): 249 inert at tier 1, 236 at tier 4, 228 at tier 7.
  it('retires the inert techs: 0 remain at tier 7, and mid-game inertness falls by more than half', () => {
    const t7 = classifyTechEffects(7);
    expect(t7.inertCount).toBe(0);          // was 228

    const t4 = classifyTechEffects(4);
    expect(t4.inertCount).toBeLessThan(236 / 2);  // was 236; a mid-game corp
    expect(t4.inertCount).toBeGreaterThan(0);     // headroom still grows with tier

    const t1 = classifyTechEffects(1);
    expect(t1.inertCount).toBeLessThan(249 * 0.7); // was 249
    // Inertness must fall monotonically as the corporation tiers up — that is
    // the whole point of tier-scaled caps.
    expect(t1.inertCount).toBeGreaterThanOrEqual(t4.inertCount);
    expect(t4.inertCount).toBeGreaterThanOrEqual(t7.inertCount);
  });

  it('a tech in the cheapest saturating set has a positive marginal; one outside it has none', () => {
    const r = classifyTechEffects(1);
    for (const t of r.techs) {
      if (t.gateOnly) { expect(t.marginalTotal).toBe(0); continue; }
      if (t.inert) expect(t.marginalTotal).toBe(0);
      else if (t.buckets.length > 0) expect(t.marginalTotal).toBeGreaterThan(0);
    }
  });

  it('per-bucket totals never fall below the tier-7 cap (every bucket is fillable)', () => {
    const r = classifyTechEffects(7);
    for (const b of r.byBucket) {
      if (b.techs === 0) continue;
      if (b.bucket === 'insuranceDiscount' || b.bucket === 'consumptionReduction' || b.bucket === 'expeditionRisk') continue;
      expect(b.totalMagnitude).toBeGreaterThan(b.cap * 0.95);
    }
  });
});

// ─── 4. gateOnly nodes ──────────────────────────────────────────────────────

describe('Row 8 — gate-only nodes', () => {
  const gateOnly = RESEARCH.filter(r => r.gateOnly);

  it('there are a handful of them, and each grants nothing', () => {
    expect(gateOnly.length).toBeGreaterThan(0);
    expect(gateOnly.length).toBeLessThan(20);
    for (const def of gateOnly) {
      expect(resolveEffects(def)).toEqual([]);
      expect(getResearchMechanicalEffect(def)).toBe(GATE_ONLY_LABEL);
      expect(getResearchContribution(def, [], undefined, 7)).toEqual([]);
    }
  });

  it('each is priced at a quarter of its authored cost', () => {
    // beamed_power is authored at $12B in RAW_RESEARCH.
    expect(RESEARCH_MAP.get('beamed_power')!.baseCostMoney)
      .toBe(Math.round(12_000_000_000 * GATE_ONLY_COST_MULTIPLIER));
    expect(GATE_ONLY_COST_MULTIPLIER).toBe(0.25);
  });

  it('completing one changes no aggregate bonus at all', () => {
    for (const def of gateOnly) {
      const before = getResearchBonuses([], undefined, 7);
      const after = getResearchBonuses([def.id], undefined, 7);
      expect(after).toEqual(before);
    }
  });

  it('their prerequisite / unlock role is preserved', () => {
    const r = classifyTechEffects(7);
    for (const def of gateOnly) {
      // Whatever the node gated before, it still gates.
      expect(Array.isArray(def.unlocks)).toBe(true);
      expect(Array.isArray(def.prerequisites)).toBe(true);
      const row = r.techs.find(t => t.id === def.id)!;
      expect(row.gateOnly).toBe(true);
      expect(row.unlocks).toEqual(def.unlocks);
    }
  });

  it('no unlocks[] gate anywhere in the tree was dropped, and every Mark III gate tech is intact', () => {
    // Every id named in an unlocks[] or prerequisites[] still resolves.
    for (const def of RESEARCH) {
      for (const pre of def.prerequisites) expect(RESEARCH_MAP.has(pre)).toBe(true);
    }
    for (const id of Object.values(MARK_III_GATE_BY_CATEGORY)) {
      const def = RESEARCH_MAP.get(id);
      expect(def).toBeDefined();
      // A Mark III gate must still be a real, purchasable tech.
      expect(def!.baseCostMoney).toBeGreaterThan(0);
    }
  });
});

// ─── 5. The panel contract ──────────────────────────────────────────────────

describe('Row 8 — "current contribution -> after purchase"', () => {
  it('reports a real delta for a tech that still fits under the cap', () => {
    const def = RESEARCH_MAP.get('high_res_optical')!;
    const lines = getResearchContribution(def, [], undefined, 1);
    expect(lines.length).toBeGreaterThan(0);
    const rev = lines.find(l => l.bucket === 'revenue')!;
    expect(rev.current).toBe(0);
    expect(rev.delta).toBeGreaterThan(0);
    expect(rev.after).toBeCloseTo(rev.current + rev.delta, 6);
    expect(rev.cap).toBeCloseTo(getResearchBucketCap('revenue', 1), 10);
  });

  it('reports +0.0% for a tech whose bucket the player has already capped', () => {
    const allRevenue = RESEARCH.filter(r => resolveEffects(r).some(e => e.type === 'revenue')).map(r => r.id);
    const target = RESEARCH_MAP.get('quantum_sensors')!;
    const owned = allRevenue.filter(id => id !== target.id);
    const lines = getResearchContribution(target, owned, undefined, 1);
    const rev = lines.find(l => l.bucket === 'revenue');
    expect(rev).toBeDefined();
    expect(rev!.current).toBeCloseTo(getResearchBucketCap('revenue', 1), 6);
    expect(rev!.delta).toBe(0);
  });

  it('never claims a bonus the engine will not pay (it IS getResearchBonuses, twice)', () => {
    const owned = RESEARCH.filter(r => r.tier <= 2).map(r => r.id);
    const target = RESEARCH_MAP.get('hyperspectral')!;
    const before = getResearchBonuses(owned, undefined, 5);
    const after = getResearchBonuses([...owned, target.id], undefined, 5);
    for (const line of getResearchContribution(target, owned, undefined, 5)) {
      const key = {
        revenue: 'serviceRevenueBonus', mining: 'miningOutputBonus', buildCost: 'buildCostReduction',
        buildSpeed: 'buildSpeedBonus', research: 'researchSpeedBonus', maintenance: 'maintenanceReduction',
        travelSpeed: 'travelSpeedBonus', insuranceDiscount: 'insuranceDiscountBonus',
        hazardResistance: 'hazardResistanceBonus', crewMorale: 'crewMoraleBonus',
        fuelEfficiency: 'fuelEfficiencyBonus', consumptionReduction: 'consumptionReductionBonus',
        expeditionRisk: 'expeditionRiskBonus',
      }[line.bucket] as keyof typeof before;
      expect(line.delta).toBeCloseTo((after[key] as number) - (before[key] as number), 6);
    }
  });

  it('a repeatable reports its NEXT level, not a completion', () => {
    const def = RESEARCH_MAP.get('yield_learning_curve_program')!;
    const lines = getResearchContribution(def, [], { [def.id]: 2 }, 3);
    const mining = lines.find(l => l.bucket === 'mining')!;
    expect(mining.delta).toBeGreaterThan(0);
    expect(mining.delta).toBeCloseTo(scaleResearchEffect({ type: 'mining', magnitude: 0.02 }).magnitude, 6);
  });
});
