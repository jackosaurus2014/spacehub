import fs from 'fs';
import path from 'path';

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

describe('launch source filter', () => {
  const { isLaunchLibraryId } = jest.requireActual('../charts/data') as typeof import('../charts/data');
  it('accepts Launch Library UUIDs and rejects curated seed ids', () => {
    expect(isLaunchLibraryId('3f2a9b1c-7d4e-4f0a-9b1c-2d3e4f5a6b7c')).toBe(true);
    expect(isLaunchLibraryId('event-1394')).toBe(false);
    expect(isLaunchLibraryId('artemis-ii-mission')).toBe(false);
    expect(isLaunchLibraryId(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The open-jobs chart must agree with /hiring-index (fixed 2026-09)
// ---------------------------------------------------------------------------

/**
 * /chart/open-space-jobs published 22.6k for 31 August 2026 while
 * /hiring-index/2026-08 published 6,733 for the same day and the same metric.
 * The loader grouped CompanyJobSnapshot by date and summed activeJobs across
 * EVERY row - the per-company rows plus the _TOTAL and _PRIVATE_TOTAL
 * sentinels - counting the same postings about three times. The footer then
 * added the plotted values together and called the result "120,763 records".
 *
 * These are source guards rather than data tests: the fix is WHICH ROWS the
 * query asks for, and a query that drifts back to a groupBy over every row
 * would pass any assertion made on mocked output.
 */
describe('open-space-jobs reads the same row the hiring index reads', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/charts/data.ts'), 'utf-8');
  const loader = src.slice(src.indexOf('async function openSpaceJobs'), src.indexOf('async function launchSlipsByWeek'));

  it('filters to the _TOTAL sentinel instead of summing every snapshot row', () => {
    expect(loader).toContain('companyName: TOTAL_SENTINEL');
    expect(loader).not.toContain('groupBy');
    expect(loader).not.toContain('_sum');
  });

  it('imports the sentinel from the module that writes it, so the two cannot drift', () => {
    expect(src).toContain("import { TOTAL_SENTINEL } from '@/lib/hiring-snapshots'");
  });

  it('states its own record count rather than letting the page add the values up', () => {
    expect(loader).toContain('recordCount: rows.length');
  });
});

describe('the funding chart counts only what the published rule counts', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/charts/data.ts'), 'utf-8');
  const loader = src.slice(src.indexOf('async function fundingByMonth'), src.indexOf('/**\n * Open space-industry jobs'));

  it('applies the same space-venture rule the investors release publishes', () => {
    expect(src).toContain("from '@/lib/funding/space-classification'");
    expect(loader).toContain('qualifiesAsSpaceVenture');
  });

  it('tells the reader what it left out', () => {
    expect(loader).toMatch(/IPOs, secondaries, debt and grants excluded/);
  });
});

describe('the chart page never invents a record count', () => {
  it('prints the loader count, not the sum of the plotted values', () => {
    const page = fs.readFileSync(path.join(process.cwd(), 'src/app/chart/[slug]/page.tsx'), 'utf-8');
    expect(page).toContain('recordCount={series.recordCount}');
    expect(page).not.toContain('series.values.reduce');
  });
});
