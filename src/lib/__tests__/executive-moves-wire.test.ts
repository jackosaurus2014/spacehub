/**
 * Executive moves: Google News input + validator loosening (2026-09-10).
 * The pipeline had written nothing for 17 days because our RSS outlets
 * carry almost no appointment headlines (3 in 1,571 articles over 21 days).
 */
import { parseWireItem, isLikelyPersonName, isLikelyTitle, extractMovesFromText } from '../fetchers/executive-moves-fetcher';

describe('Google News wire items', () => {
  it('splits "Headline - Outlet" into title and source and keeps the link', () => {
    const h = parseWireItem({ title: 'Former NGA director Frank Whitworth named president of Satellogic - SpaceNews', link: 'https://example.com/a', pubDate: 'Tue, 08 Sep 2026 12:00:00 GMT' });
    expect(h).toEqual(expect.objectContaining({ title: 'Former NGA director Frank Whitworth named president of Satellogic', source: 'SpaceNews', url: 'https://example.com/a' }));
    expect(h!.publishedAt.toISOString().slice(0, 10)).toBe('2026-09-08');
  });
  it('drops items without a link or with an unparseable date', () => {
    expect(parseWireItem({ title: 'x - y', pubDate: 'Tue, 08 Sep 2026 12:00:00 GMT' })).toBeNull();
    expect(parseWireItem({ title: 'x - y', link: 'https://e.com', pubDate: 'not a date' })).toBeNull();
  });
});

describe('validators', () => {
  it('honorifics do not disqualify a person name', () => {
    expect(isLikelyPersonName('Dr Tidiane Ouattara')).toBe(true);
    expect(isLikelyPersonName('Dr. Renato Krpoun')).toBe(true);
    expect(isLikelyPersonName('Tidiane Ouattara')).toBe(true);
  });
  it('Director General is a role', () => {
    expect(isLikelyTitle('Inaugural Director General')).toBe(true);
    expect(isLikelyTitle('Director-General')).toBe(true);
  });
  it('extracts the Satellogic and L3Harris headlines end to end with a known-org set', () => {
    const known = new Set(['satellogic', 'l3harris']);
    const a = extractMovesFromText('Former NGA director Frank Whitworth named president of Satellogic', '', 'SpaceNews', 'https://e.com/1', known);
    expect(a.some((m) => /Whitworth/.test(m.personName) && /president/i.test(m.toTitle || '') && /Satellogic/i.test(m.toCompany || ''))).toBe(true);
    const b = extractMovesFromText('L3Harris names space sector leader Sam Mehta CEO after Kubasik steps down', '', 'SpaceNews', 'https://e.com/2', known);
    expect(b.length).toBeGreaterThan(0);
  });
});
