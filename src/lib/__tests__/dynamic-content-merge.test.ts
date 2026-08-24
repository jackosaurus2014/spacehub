/**
 * @jest-environment node
 */
/**
 * mergeCuratedWithDynamic — the firewall between AI-refreshed rows and
 * curated catalogues. Regressions it pins (both were live in production on
 * 2026-08-24): a single dynamic row displacing an entire curated catalogue
 * (space-tourism served exactly one offering), and shapeless rows crashing a
 * typed endpoint (talent-board 500).
 */
import { mergeCuratedWithDynamic } from '../dynamic-content';

interface Item { id?: string; name?: string }
const keyOf = (i: Item) => i?.id;
const isValid = (i: Item) => typeof i?.id === 'string' && typeof i?.name === 'string';

describe('mergeCuratedWithDynamic', () => {
  const seed: Item[] = [
    { id: 'a', name: 'Curated A' },
    { id: 'b', name: 'Curated B' },
  ];

  it('the seed is the floor — a tiny dynamic set cannot displace it', () => {
    const r = mergeCuratedWithDynamic(seed, [{ id: 'z', name: 'New Z' }], keyOf, isValid);
    expect(r.merged.map((i) => i.id).sort()).toEqual(['a', 'b', 'z']);
    expect(r.added).toBe(1);
  });

  it('a valid dynamic item replaces its curated counterpart (freshness wins)', () => {
    const r = mergeCuratedWithDynamic(seed, [{ id: 'a', name: 'Refreshed A' }], keyOf, isValid);
    expect(r.merged.find((i) => i.id === 'a')?.name).toBe('Refreshed A');
    expect(r.updated).toBe(1);
    expect(r.merged).toHaveLength(2);
  });

  it('shapeless rows are rejected, never merged, never fatal', () => {
    const junk = [
      { name: 'no id' },
      {} as Item,
      null as unknown as Item,
      { id: 'ok', name: 'Fine' },
    ];
    const r = mergeCuratedWithDynamic(seed, junk, keyOf, isValid);
    expect(r.rejected).toBe(3);
    expect(r.merged.map((i) => i.id).sort()).toEqual(['a', 'b', 'ok']);
  });

  it('empty dynamic set is a no-op', () => {
    const r = mergeCuratedWithDynamic(seed, [], keyOf, isValid);
    expect(r.merged).toEqual(seed);
    expect(r.updated + r.added + r.rejected).toBe(0);
  });

  it('preserves seed order with appended dynamic items after', () => {
    const r = mergeCuratedWithDynamic(seed, [{ id: 'c', name: 'C' }], keyOf, isValid);
    expect(r.merged.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});
