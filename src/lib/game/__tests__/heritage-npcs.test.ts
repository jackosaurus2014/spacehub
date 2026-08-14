/**
 * @jest-environment node
 *
 * Heritage Corporations (site->game integration): real private space
 * unicorns tracked in CompanyProfile spawn lore-safe NPC dossiers for Space
 * Tycoon's Heritage Registry. Covers:
 *  - Determinism: name/blurb/tier/id generation never uses Math.random or
 *    Date.now — identical input always yields identical output, regardless
 *    of call order or how many times it's invoked.
 *  - Derivation correctness: tier scaling from valuation, sector trait
 *    mapping, honest DB-sourced "charter ancestor" line, real-company link.
 *  - Registry-level behavior: cap, valuation-desc ordering, stable tie-break.
 */
import {
  generateHeritageName,
  generateHeritageBlurb,
  mapFocusAreasToTraits,
  tierForValuation,
  getHeritageTierLabel,
  buildCharterAncestorLine,
  deriveHeritageNPC,
  deriveHeritageNPCs,
  type HeritageCompanyInput,
} from '../heritage-npcs';

function makeInput(overrides: Partial<HeritageCompanyInput> = {}): HeritageCompanyInput {
  return {
    slug: 'stoke-space',
    name: 'Stoke Space',
    valuationUsd: 3_500_000_000,
    focusAreas: ['launch_provider'],
    foundedYear: 2019,
    totalFundingUsd: 260_000_000,
    lastFundingRound: 'Series C',
    lastFundingDate: new Date(Date.UTC(2026, 2, 1)),
    lastFundingAmountUsd: 150_000_000,
    ...overrides,
  };
}

describe('generateHeritageName', () => {
  it('is deterministic for the same seed key', () => {
    const a = generateHeritageName('stoke-space');
    const b = generateHeritageName('stoke-space');
    expect(a).toBe(b);
  });

  it('is deterministic across many repeated calls (no hidden mutable state)', () => {
    const first = generateHeritageName('relativity-space');
    for (let i = 0; i < 25; i++) {
      expect(generateHeritageName('relativity-space')).toBe(first);
    }
  });

  it('produces different names for different slugs (low collision, not identical)', () => {
    const names = new Set(
      ['stoke-space', 'relativity-space', 'varda-space', 'k2-space', 'gravitics'].map(
        generateHeritageName,
      ),
    );
    expect(names.size).toBeGreaterThan(1);
  });

  it('has the "Prefix Suffix" shape (two words, lore-consistent)', () => {
    const name = generateHeritageName('impulse-space');
    expect(name.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('never contains Math.random-style non-determinism across process-like reseeding', () => {
    // Simulate "different session" by calling in a different order — pure
    // functions of the seed string must not depend on call sequence.
    const seedA = generateHeritageName('a-company');
    generateHeritageName('b-company');
    generateHeritageName('c-company');
    const seedAAgain = generateHeritageName('a-company');
    expect(seedAAgain).toBe(seedA);
  });
});

describe('generateHeritageBlurb', () => {
  it('is deterministic for the same seed key and trait', () => {
    const a = generateHeritageBlurb('stoke-space', 'Launch Services');
    const b = generateHeritageBlurb('stoke-space', 'Launch Services');
    expect(a).toBe(b);
  });

  it('never names the real company (lore safety — invented flavor only)', () => {
    const blurb = generateHeritageBlurb('stoke-space', 'Launch Services');
    expect(blurb.toLowerCase()).not.toContain('stoke');
  });

  it('embeds the given trait, lowercased, into the sentence', () => {
    const blurb = generateHeritageBlurb('varda-space', 'In-Space Servicing');
    expect(blurb).toContain('in-space servicing');
  });
});

describe('mapFocusAreasToTraits', () => {
  it('maps known legacy focus areas to human-readable labels', () => {
    expect(mapFocusAreasToTraits(['launch_provider'])).toEqual(['Launch Services']);
    expect(mapFocusAreasToTraits(['asteroid_mining'])).toEqual(['Asteroid Prospecting']);
  });

  it('falls back to a title-cased label for unknown focus areas', () => {
    expect(mapFocusAreasToTraits(['some_new_area'])).toEqual(['Some New Area']);
  });

  it('caps at 4 traits', () => {
    const many = [
      'launch_provider', 'satellites', 'lunar', 'mars', 'defense', 'communications',
    ];
    expect(mapFocusAreasToTraits(many)).toHaveLength(4);
  });

  it('falls back to a default when no focus areas are given', () => {
    expect(mapFocusAreasToTraits([])).toEqual(['Commercial Space']);
  });
});

describe('tierForValuation / getHeritageTierLabel', () => {
  it('scales tier with valuation thresholds', () => {
    expect(tierForValuation(1_000_000_000)).toBe(1); // exactly $1B floor
    expect(tierForValuation(1_999_999_999)).toBe(1);
    expect(tierForValuation(2_000_000_000)).toBe(2);
    expect(tierForValuation(4_999_999_999)).toBe(2);
    expect(tierForValuation(5_000_000_000)).toBe(3);
    expect(tierForValuation(9_999_999_999)).toBe(3);
    expect(tierForValuation(10_000_000_000)).toBe(4);
    expect(tierForValuation(19_999_999_999)).toBe(4);
    expect(tierForValuation(20_000_000_000)).toBe(5);
    expect(tierForValuation(100_000_000_000)).toBe(5);
  });

  it('provides a label for every tier 1-5', () => {
    for (let t = 1; t <= 5; t++) {
      expect(getHeritageTierLabel(t)).toEqual(expect.any(String));
      expect(getHeritageTierLabel(t).length).toBeGreaterThan(0);
    }
  });
});

describe('buildCharterAncestorLine (honest, DB-sourced facts only)', () => {
  it('prefers the latest funding round when amount/round/date are all present', () => {
    const line = buildCharterAncestorLine(makeInput());
    expect(line).toBe('Charter ancestor: Stoke Space — raised $150M in a 2026 Series C round.');
  });

  it('falls back to total funding when no latest-round data is available', () => {
    const line = buildCharterAncestorLine(
      makeInput({ lastFundingAmountUsd: null, lastFundingRound: null, lastFundingDate: null }),
    );
    expect(line).toBe('Charter ancestor: Stoke Space — $260M raised to date.');
  });

  it('falls back to valuation when no funding data exists at all', () => {
    const line = buildCharterAncestorLine(
      makeInput({
        lastFundingAmountUsd: null,
        lastFundingRound: null,
        lastFundingDate: null,
        totalFundingUsd: null,
      }),
    );
    expect(line).toBe('Charter ancestor: Stoke Space — private, valued at $3.5B.');
  });

  it('never fabricates a number not present in the input', () => {
    const input = makeInput({ lastFundingAmountUsd: 42_000_000, lastFundingRound: 'Series X' });
    const line = buildCharterAncestorLine(input);
    expect(line).toContain('$42M');
    expect(line).toContain('Series X');
  });
});

describe('deriveHeritageNPC', () => {
  it('is a pure function of its input (same input -> same output)', () => {
    const input = makeInput();
    const a = deriveHeritageNPC(input);
    const b = deriveHeritageNPC({ ...input });
    expect(a).toEqual(b);
  });

  it('builds a lore-safe id from the slug, never the real name', () => {
    const npc = deriveHeritageNPC(makeInput({ slug: 'stoke-space' }));
    expect(npc.id).toBe('heritage-stoke-space');
    expect(npc.name.toLowerCase()).not.toContain('stoke');
  });

  it('links the dossier back to the real company profile page', () => {
    const npc = deriveHeritageNPC(makeInput({ slug: 'varda-space' }));
    expect(npc.dossier.realCompanyHref).toBe('/company-profiles/varda-space');
    expect(npc.dossier.realCompanyName).toBe('Stoke Space');
  });

  it('carries the real company name only in the dossier, not the NPC name', () => {
    const input = makeInput({ name: 'Varda Space Industries', slug: 'varda-space' });
    const npc = deriveHeritageNPC(input);
    expect(npc.dossier.realCompanyName).toBe('Varda Space Industries');
    expect(npc.name).not.toContain('Varda');
  });

  it('derives tier and valuationBillions consistently from valuationUsd', () => {
    const npc = deriveHeritageNPC(makeInput({ valuationUsd: 12_000_000_000 }));
    expect(npc.tier).toBe(4);
    expect(npc.valuationBillions).toBeCloseTo(12, 5);
  });
});

describe('deriveHeritageNPCs (registry-level)', () => {
  const companies: HeritageCompanyInput[] = [
    makeInput({ slug: 'company-a', name: 'Company A', valuationUsd: 5_000_000_000 }),
    makeInput({ slug: 'company-b', name: 'Company B', valuationUsd: 25_000_000_000 }),
    makeInput({ slug: 'company-c', name: 'Company C', valuationUsd: 1_200_000_000 }),
  ];

  it('orders results by valuation descending', () => {
    const npcs = deriveHeritageNPCs(companies);
    expect(npcs.map((n) => n.dossier.realCompanyName)).toEqual([
      'Company B',
      'Company A',
      'Company C',
    ]);
  });

  it('caps the registry at the given size', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeInput({ slug: `company-${i}`, name: `Company ${i}`, valuationUsd: 1_000_000_000 + i }),
    );
    const npcs = deriveHeritageNPCs(many, 20);
    expect(npcs).toHaveLength(20);
  });

  it('breaks valuation ties deterministically by slug', () => {
    const tied: HeritageCompanyInput[] = [
      makeInput({ slug: 'zeta-corp', name: 'Zeta Corp', valuationUsd: 2_000_000_000 }),
      makeInput({ slug: 'alpha-corp', name: 'Alpha Corp', valuationUsd: 2_000_000_000 }),
    ];
    const npcs = deriveHeritageNPCs(tied);
    expect(npcs.map((n) => n.dossier.realCompanyName)).toEqual(['Alpha Corp', 'Zeta Corp']);
  });

  it('is deterministic regardless of input array order', () => {
    const shuffled = [...companies].reverse();
    const a = deriveHeritageNPCs(companies).map((n) => n.id);
    const b = deriveHeritageNPCs(shuffled).map((n) => n.id);
    expect(a).toEqual(b);
  });

  it('produces the same full result set across repeated calls', () => {
    const first = deriveHeritageNPCs(companies);
    const second = deriveHeritageNPCs(companies);
    expect(first).toEqual(second);
  });
});
