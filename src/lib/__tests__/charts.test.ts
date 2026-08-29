import { CHART_DEFS, allChartSlugs, chartOfTheWeekSlug, getChartDef, isoWeek } from '../charts/registry';
import { formatValue, niceCeiling, renderBarChartSvg } from '../charts/render';
import { buildChartOfTheWeekSection } from '../newsletter/email-templates';

describe('chart registry', () => {
  it('has unique, url-safe slugs', () => {
    const slugs = allChartSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('computes ISO weeks (2026-01-01 is week 1; 2024-12-30 is week 1 of 2025)', () => {
    expect(isoWeek(new Date('2026-01-01T00:00:00Z'))).toBe(1);
    expect(isoWeek(new Date('2024-12-30T00:00:00Z'))).toBe(1);
    expect(isoWeek(new Date('2026-08-29T12:00:00Z'))).toBe(35);
  });

  it('picks the same chart for Monday and Thursday of one week, and steps with offset', () => {
    const mon = new Date('2026-08-31T08:00:00Z');
    const thu = new Date('2026-09-03T08:00:00Z');
    expect(chartOfTheWeekSlug(mon)).toBe(chartOfTheWeekSlug(thu));
    const seen = new Set(Array.from({ length: CHART_DEFS.length }, (_, i) => chartOfTheWeekSlug(mon, i)));
    expect(seen.size).toBe(CHART_DEFS.length);
  });

  it('getChartDef rejects unknown slugs', () => {
    expect(getChartDef('nope')).toBeUndefined();
    expect(getChartDef('launches-per-month')?.unit).toBe('count');
  });
});

describe('chart rendering', () => {
  it('formats units', () => {
    expect(formatValue(12, 'count')).toBe('12');
    expect(formatValue(2_500_000_000, 'usd')).toBe('$2.5B');
    expect(formatValue(45_000_000, 'usd')).toBe('$45M');
    expect(formatValue(12_345, 'jobs')).toBe('12.3k');
  });

  it('nice ceilings sit at or above the max', () => {
    for (const v of [1, 7, 23, 99, 101, 2_400_000_000]) expect(niceCeiling(v)).toBeGreaterThanOrEqual(v);
    expect(niceCeiling(23)).toBe(25);
    expect(niceCeiling(0)).toBe(1);
  });

  it('renders a self-contained SVG with escaped labels', () => {
    const def = CHART_DEFS[0];
    const svg = renderBarChartSvg(def, { labels: ['Jan', 'Feb <b>'], values: [3, 7] }, { asOf: new Date('2026-08-29T00:00:00Z') });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('Feb &lt;b&gt;');
    expect(svg).not.toContain('<b>');
    expect(svg).toContain('as of 2026-08-29');
    expect(svg).toContain(`spacenexus.us/chart/${def.slug}`);
  });

  it('survives an all-zero series', () => {
    const svg = renderBarChartSvg(CHART_DEFS[0], { labels: ['a', 'b'], values: [0, 0] });
    expect(svg).toContain('</svg>');
  });
});

describe('digest chart slot', () => {
  it('is byte-empty with no chart and links the permalink with one', () => {
    expect(buildChartOfTheWeekSection(null)).toEqual({ html: '', plain: '' });
    const s = buildChartOfTheWeekSection({ slug: 'funding-by-month', title: 'T & co', subtitle: 'S', source: 'Src' });
    expect(s.html).toContain('/chart/funding-by-month');
    expect(s.html).toContain('/api/chart/funding-by-month');
    expect(s.html).toContain('T &amp; co');
    expect(s.plain).toContain('CHART OF THE WEEK');
  });
});
