/**
 * @jest-environment node
 *
 * Live-Service Wave LS4 — Corporate Chronicle assembly: shaping/sanitizing a
 * client-submitted CompletedCorporateEra before it's persisted, and parsing
 * it back defensively for the public Chronicle pages. Mirrors
 * corp-report-registry.test.ts's coverage shape.
 */
import {
  sanitizePlainText, eraKey, shapeCorpEraForStorage, parseStoredCorpEra,
  ERA_MEDAL_LABEL, ERA_MEDAL_ICON, type PublishableCorporateEra,
} from '../corp-era-registry';

function baseEra(overrides: Partial<PublishableCorporateEra> = {}): PublishableCorporateEra {
  return {
    eraIndex: 2,
    charterId: 'expansion_era',
    startedAtMs: 1_700_000_000_000,
    endedAtMs: 1_700_000_000_000 + 90 * 24 * 60 * 60 * 1000,
    bracketAtStart: 3,
    medal: 'gold',
    goalScore: 1.1,
    goalActual: 9,
    goalTarget: 8,
    headlineStats: [{ label: 'Net worth growth', value: 5_000_000 }],
    notableEvents: ['Launched a new mining rig'],
    ...overrides,
  };
}

describe('sanitizePlainText', () => {
  it('strips HTML tags entirely', () => {
    expect(sanitizePlainText('<script>alert(1)</script>Hello', 100)).toBe('Hello');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizePlainText(null, 10)).toBe('');
    expect(sanitizePlainText(42, 10)).toBe('');
  });
});

describe('eraKey', () => {
  it('formats a stable, monotonic key from eraIndex', () => {
    expect(eraKey(0)).toBe('E0');
    expect(eraKey(9)).toBe('E9');
  });

  it('clamps negative/non-finite input to E0', () => {
    expect(eraKey(-3)).toBe('E0');
    expect(eraKey(NaN)).toBe('E0');
  });
});

describe('shapeCorpEraForStorage', () => {
  it('preserves valid fields', () => {
    const shaped = shapeCorpEraForStorage(baseEra(), 1000);
    expect(shaped.eraIndex).toBe(2);
    expect(shaped.charterId).toBe('expansion_era');
    expect(shaped.medal).toBe('gold');
    expect(shaped.goalActual).toBe(9);
    expect(shaped.publishedAt).toBe(1000);
  });

  it('sanitizes HTML out of notableEvents and headlineStats labels', () => {
    const shaped = shapeCorpEraForStorage(baseEra({
      notableEvents: ['<script>evil()</script>Milestone hit'],
      headlineStats: [{ label: '<b>Bold</b> stat', value: 1 }],
    }));
    expect(shaped.notableEvents).toEqual(['Milestone hit']);
    expect(shaped.headlineStats[0].label).toBe('Bold stat');
  });

  it('falls back to a safe default charterId/medal for an unrecognized value rather than storing garbage', () => {
    const shaped = shapeCorpEraForStorage(baseEra({
      // @ts-expect-error deliberately invalid for the defensive-fallback test
      charterId: 'not_a_real_charter',
      // @ts-expect-error deliberately invalid for the defensive-fallback test
      medal: 'diamond',
    }));
    expect(shaped.charterId).toBe('expansion_era');
    expect(shaped.medal).toBe('filed');
  });

  it('clamps bracketAtStart into the 1-8 league range', () => {
    expect(shapeCorpEraForStorage(baseEra({ bracketAtStart: 0 })).bracketAtStart).toBe(1);
    expect(shapeCorpEraForStorage(baseEra({ bracketAtStart: 99 })).bracketAtStart).toBe(8);
  });

  it('drops notableEvents past the first 5 and headlineStats past the first 10', () => {
    const manyEvents = Array.from({ length: 10 }, (_, i) => `Event ${i}`);
    const manyStats = Array.from({ length: 20 }, (_, i) => ({ label: `Stat ${i}`, value: i }));
    const shaped = shapeCorpEraForStorage(baseEra({ notableEvents: manyEvents, headlineStats: manyStats }));
    expect(shaped.notableEvents).toHaveLength(5);
    expect(shaped.headlineStats).toHaveLength(10);
  });

  it('clamps non-finite numeric fields to safe defaults instead of throwing', () => {
    const shaped = shapeCorpEraForStorage(baseEra({ goalScore: NaN, goalActual: Infinity, eraIndex: -5 }));
    expect(shaped.goalScore).toBe(0);
    expect(shaped.goalActual).toBe(0);
    expect(shaped.eraIndex).toBe(0);
  });
});

describe('parseStoredCorpEra', () => {
  it('round-trips a shaped era through JSON', () => {
    const shaped = shapeCorpEraForStorage(baseEra(), 2000);
    const parsed = parseStoredCorpEra(JSON.stringify(shaped));
    expect(parsed).not.toBeNull();
    expect(parsed?.medal).toBe('gold');
    expect(parsed?.charterId).toBe('expansion_era');
  });

  it('returns null for invalid JSON', () => {
    expect(parseStoredCorpEra('not json{{{')).toBeNull();
  });

  it('returns null for JSON missing required fields', () => {
    expect(parseStoredCorpEra(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });

  it('returns null for a non-object JSON value', () => {
    expect(parseStoredCorpEra(JSON.stringify('just a string'))).toBeNull();
  });

  it('re-sanitizes on read as defense in depth', () => {
    const raw = JSON.stringify({
      ...shapeCorpEraForStorage(baseEra()),
      notableEvents: ['<img src=x onerror=alert(1)>Sneaky'],
    });
    const parsed = parseStoredCorpEra(raw);
    expect(parsed?.notableEvents).toEqual(['Sneaky']);
  });
});

describe('medal display maps', () => {
  it('has a label and icon for every medal grade', () => {
    for (const medal of ['filed', 'bronze', 'silver', 'gold', 'platinum'] as const) {
      expect(ERA_MEDAL_LABEL[medal]).toBeTruthy();
      expect(ERA_MEDAL_ICON[medal]).toBeTruthy();
    }
  });
});
