/**
 * @jest-environment node
 *
 * Meaningful Decisions Wave M3 — demand grows with the economy
 * (docs/MEANINGFUL_2026-08.md §M3, finding F6). Spec acceptance criterion,
 * verbatim: "sim a 50-profile world at active30d=500 — median pool mult
 * must stay ≥ 0.7 (today it slides toward 0.35)."
 *
 * Two layers here, deliberately:
 *  1. `deriveActivityDemand` unit tests (below, "gross-share scaling") are
 *     the SHARP regression guard — they encode F6's literal formula request
 *     ("one unit of capacity adds ~25-35% of its own gross as demand spread
 *     across OTHER categories... never its own") directly, and DO fail
 *     against the old flat-per-building constants (verified by hand against
 *     HEAD before this wave landed). A future retune that shrinks the gross
 *     share back toward a flat/decoupled constant fails these.
 *  2. The population-sweep "median pool mult >= 0.7" tests below are the
 *     spec's literal acceptance wording, run for the record — but note
 *     honestly: in every diversified synthetic population tried (uniform
 *     random building choices across locations, 50-500 profiles), the
 *     per-MARKET median was already >= 0.7 (in fact 1.25, the premium cap)
 *     BEFORE this wave too, because most of the ~88 (location, category)
 *     markets in a diversified population simply never accumulate enough
 *     capacity to saturate — the "slides toward 0.35" dynamic F6 describes
 *     shows up in SUPPLIER-weighted terms (a market dominated by the handful of
 *     buildings every player converges on) or genuinely large populations
 *     tighter than these sweeps model, not in the per-market average. Kept
 *     as a floor/sanity check, not the primary regression guard — see (1).
 */
import { BUILDINGS, BUILDING_MAP } from '../buildings';
import { computePoolAggregates, deriveActivityDemand, type ProfileActivitySummary } from '../demand-pools';
import { computePoolMultiplier, DEMAND_MULT_FLOOR } from '../service-pricing';
import { SERVICE_MAP } from '../services';

describe('F6 gross-share scaling — deriveActivityDemand (the sharp regression guard)', () => {
  it('a high-gross building contributes proportionally MORE derived demand than a low-gross one (not a flat per-building constant)', () => {
    // sat_telecom (LEO Broadband, $3.5M/mo gross) vs mining_titan (Titan
    // Hydrocarbon Harvester, $160M/mo gross) — under the pre-M3 flat
    // per-building constant these contributed the IDENTICAL $500K of power
    // demand each (F6's exact complaint). Post-M3 the bigger building must
    // contribute meaningfully more.
    const smallOnly: ProfileActivitySummary = {
      id: 'small', ships: [], services: [],
      buildings: [{ definitionId: 'sat_telecom', locationId: 'leo', isComplete: true }],
    };
    const bigOnly: ProfileActivitySummary = {
      id: 'big', ships: [], services: [],
      buildings: [{ definitionId: 'mining_titan', locationId: 'saturn_system', isComplete: true }],
    };
    const smallDemand = deriveActivityDemand(smallOnly);
    const bigDemand = deriveActivityDemand(bigOnly);
    const smallTotal = Array.from(smallDemand.values()).reduce((a, b) => a + b, 0);
    const bigTotal = Array.from(bigDemand.values()).reduce((a, b) => a + b, 0);
    expect(bigTotal).toBeGreaterThan(smallTotal * 10); // mining_titan's gross is ~46x sat_telecom's
  });

  it('a building never feeds derived demand into its OWN service category ("a datacenter demands power, never its own compute")', () => {
    const summary: ProfileActivitySummary = {
      id: 'p', ships: [], services: [],
      buildings: [{ definitionId: 'datacenter_orbital', locationId: 'leo', isComplete: true }],
    };
    const demand = deriveActivityDemand(summary);
    expect(demand.get('leo:compute') || 0).toBe(0); // datacenter_orbital's own category
    // but it DOES feed other categories
    const otherTotal = Array.from(demand.entries())
      .filter(([k]) => k !== 'leo:compute')
      .reduce((sum, [, v]) => sum + v, 0);
    expect(otherTotal).toBeGreaterThan(0);
  });

  it('total generic-spread demand from a building is within the spec\'s 25-35% of its own service gross', () => {
    const def = BUILDING_MAP.get('sat_telecom')!;
    const gross = def.enabledServices.reduce((sum, svcId) => sum + (SERVICE_MAP.get(svcId)?.revenuePerMonth || 0), 0);
    const summary: ProfileActivitySummary = {
      id: 'p', ships: [], services: [],
      buildings: [{ definitionId: 'sat_telecom', locationId: 'leo', isComplete: true }],
    };
    const demand = deriveActivityDemand(summary);
    const total = Array.from(demand.values()).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(gross * 0.25 - 1);
    expect(total).toBeLessThanOrEqual(gross * 0.35 + 1);
  });

  it('crewed buildings scale their tourism/telecom/insurance contribution with tier (a headcount proxy), not a flat constant', () => {
    const small: ProfileActivitySummary = {
      id: 'small', ships: [], services: [],
      buildings: [{ definitionId: 'space_station_small', locationId: 'leo', isComplete: true }], // T1
    };
    const big: ProfileActivitySummary = {
      id: 'big', ships: [], services: [],
      buildings: [{ definitionId: 'space_station_jupiter', locationId: 'jupiter_system', isComplete: true }], // T4
    };
    const smallTourism = deriveActivityDemand(small).get('leo:tourism') || 0;
    const bigTourism = deriveActivityDemand(big).get('jupiter_system:tourism') || 0;
    expect(bigTourism).toBeGreaterThan(smallTourism); // T4 > T1 (tier-scaled, not identical)
  });
});

const revenueBuildings = BUILDINGS.filter(
  b => b.enabledServices && b.enabledServices.length > 0 && b.requiredLocation,
);

/** Deterministic LCG — no Math.random, reproducible across CI runs. */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buildPopulation(profileCount: number, seed: number): ProfileActivitySummary[] {
  const rnd = makeRng(seed);
  const profiles: ProfileActivitySummary[] = [];
  for (let p = 0; p < profileCount; p++) {
    const n = 8 + Math.floor(rnd() * 12); // 8-20 buildings — mid/late-game corp
    const buildings: ProfileActivitySummary['buildings'] = [];
    for (let i = 0; i < n; i++) {
      const def = revenueBuildings[Math.floor(rnd() * revenueBuildings.length)];
      buildings.push({ definitionId: def.id, locationId: def.requiredLocation!, isComplete: true });
    }
    const services: ProfileActivitySummary['services'] = [];
    for (const b of buildings) {
      const def = BUILDING_MAP.get(b.definitionId)!;
      for (const svcId of def.enabledServices) services.push({ definitionId: svcId, locationId: b.locationId });
    }
    profiles.push({ id: `p${p}`, buildings, services, ships: [] });
  }
  return profiles;
}

function medianPoolMult(profiles: ProfileActivitySummary[], active30d: number): { median: number; mults: number[] } {
  const aggs = computePoolAggregates(profiles, active30d);
  const mults: number[] = [];
  aggs.forEach(agg => mults.push(computePoolMultiplier(agg.dNpc + agg.dDerived, agg.cSupply)));
  mults.sort((a, b) => a - b);
  return { median: mults[Math.floor(mults.length / 2)], mults };
}

describe('F6 acceptance — 50-profile world at active30d=500', () => {
  it('median pool multiplier across every market stays >= 0.7 (spec: "today it slides toward 0.35")', () => {
    const profiles = buildPopulation(50, 42);
    const { median, mults } = medianPoolMult(profiles, 500);
    expect(mults.length).toBeGreaterThan(20); // sanity: the sweep touched a real number of markets
    expect(median).toBeGreaterThanOrEqual(0.7);
  });

  it('holds across a few different population seeds (not a lucky draw)', () => {
    for (const seed of [1, 7, 999]) {
      const profiles = buildPopulation(50, seed);
      const { median } = medianPoolMult(profiles, 500);
      expect(median).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('never exceeds the demand-pool floor invariant even in an oversaturated market', () => {
    const profiles = buildPopulation(50, 42);
    const { mults } = medianPoolMult(profiles, 500);
    for (const m of mults) expect(m).toBeGreaterThanOrEqual(DEMAND_MULT_FLOOR);
  });

  it('holds at a larger population too (200 profiles, active30d=2000 — past the midpoint toward 10k MAU)', () => {
    const profiles = buildPopulation(200, 7);
    const { median } = medianPoolMult(profiles, 2000);
    expect(median).toBeGreaterThanOrEqual(0.7);
  });
});
