/**
 * @jest-environment node
 */

/**
 * The recurring-release calendar — the guards that keep the franchises honest.
 *
 * Four things are pinned here, each because getting it wrong is a product
 * failure rather than a bug:
 *
 *   1. A RELEASE NEVER PUBLISHES A PERIOD THAT HAS NOT FINISHED. A
 *      half-finished quarter served as though it were done is the fastest way
 *      to lose a research customer.
 *   2. A MISSED RELEASE IS VISIBLE. releaseDueState is the single place that
 *      decision is made, and 'overdue' must be reachable.
 *   3. EVERY RELEASE HAS A COMPUTATION MODULE, A METHODOLOGY AND A GATED
 *      EXPORT. A franchise that advertises what no file computes is exactly
 *      what the pricing-truth rule forbids.
 *   4. THE 404 REGISTRY AGREES WITH THE CALENDAR, so an unknown series or an
 *      unpublished period is a real 404 rather than a soft 200.
 */

import fs from 'fs';
import path from 'path';

import {
  RESEARCH_RELEASES,
  allReleaseIds,
  citationFor,
  dueAtFor,
  getRelease,
  isPeriodKey,
  isPublishedPeriod,
  isRetrospectiveEdition,
  latestPeriod,
  nextPeriod,
  periodEndDate,
  periodLabel,
  periodOf,
  periodRange,
  previousPeriod,
  publishedPeriods,
  releaseDueState,
  seriesReleases,
} from '../research-releases';
import { registryRouteMissing } from '../registry-routes';
import { hashEditionContent, stableHash, fmtShare, pctChange } from '../research-report-types';

// ---------------------------------------------------------------------------
// 1. Period arithmetic
// ---------------------------------------------------------------------------

describe('period keys', () => {
  it('accepts well-formed keys and rejects everything else', () => {
    expect(isPeriodKey('monthly', '2026-08')).toBe(true);
    expect(isPeriodKey('monthly', '2026-13')).toBe(false);
    expect(isPeriodKey('monthly', '2026-00')).toBe(false);
    expect(isPeriodKey('monthly', '2026-8')).toBe(false);
    expect(isPeriodKey('monthly', '2026-Q3')).toBe(false);
    expect(isPeriodKey('quarterly', '2026-Q3')).toBe(true);
    expect(isPeriodKey('quarterly', '2026-Q5')).toBe(false);
    expect(isPeriodKey('quarterly', '2026-03')).toBe(false);
    expect(isPeriodKey('quarterly', '../etc/passwd')).toBe(false);
  });

  it('gives the half-open UTC window for a period', () => {
    const month = periodRange('monthly', '2026-02')!;
    expect(month.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(month.end.toISOString()).toBe('2026-03-01T00:00:00.000Z');

    const quarter = periodRange('quarterly', '2026-Q4')!;
    expect(quarter.start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(quarter.end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('reports the last day INSIDE the period as the as-of date', () => {
    expect(periodEndDate('monthly', '2026-02')).toBe('2026-02-28');
    expect(periodEndDate('monthly', '2024-02')).toBe('2024-02-29'); // leap year
    expect(periodEndDate('quarterly', '2026-Q4')).toBe('2026-12-31');
  });

  it('walks periods in both directions across a year boundary', () => {
    expect(previousPeriod('monthly', '2026-01')).toBe('2025-12');
    expect(nextPeriod('monthly', '2026-12')).toBe('2027-01');
    expect(previousPeriod('quarterly', '2026-Q1')).toBe('2025-Q4');
    expect(nextPeriod('quarterly', '2026-Q4')).toBe('2027-Q1');
  });

  it('labels a period without inventing a format', () => {
    expect(periodLabel('monthly', '2026-08')).toBe('August 2026');
    expect(periodLabel('quarterly', '2026-Q2')).toBe('Q2 2026');
  });

  it('puts a date in the right period', () => {
    expect(periodOf('monthly', new Date('2026-09-14T00:00:00Z'))).toBe('2026-09');
    expect(periodOf('quarterly', new Date('2026-09-14T00:00:00Z'))).toBe('2026-Q3');
    expect(periodOf('quarterly', new Date('2026-10-01T00:00:00Z'))).toBe('2026-Q4');
  });

  it('string comparison orders period keys correctly, which the code relies on', () => {
    expect('2026-08' < '2026-09').toBe(true);
    expect('2025-12' < '2026-01').toBe(true);
    expect('2026-Q1' < '2026-Q2').toBe(true);
    expect('2025-Q4' < '2026-Q1').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. A release never publishes an unfinished period
// ---------------------------------------------------------------------------

describe('which editions exist', () => {
  const NOW = new Date('2026-09-14T12:00:00Z');

  it('never serves the live period for a completed-period release', () => {
    for (const release of RESEARCH_RELEASES) {
      if (release.publishesLivePeriod) continue;
      const current = periodOf(release.cadence, NOW);
      expect(latestPeriod(release, NOW)).not.toBe(current);
      expect(isPublishedPeriod(release, current, NOW)).toBe(false);
    }
  });

  it('serves the live period only for the release that deliberately runs live', () => {
    const live = RESEARCH_RELEASES.filter((r) => r.publishesLivePeriod);
    // Exactly one release opts into this, and it is documented as doing so.
    expect(live.map((r) => r.id)).toEqual(['space-score-top-25']);
    for (const release of live) {
      expect(latestPeriod(release, NOW)).toBe(periodOf(release.cadence, NOW));
    }
  });

  it('refuses periods before the release started', () => {
    for (const release of RESEARCH_RELEASES) {
      const before = previousPeriod(release.cadence, release.earliestPeriod)!;
      expect(isPublishedPeriod(release, before, NOW)).toBe(false);
    }
  });

  it('lists a contiguous archive from the earliest period to the latest', () => {
    for (const release of RESEARCH_RELEASES) {
      const periods = publishedPeriods(release, NOW);
      expect(periods[0]).toBe(release.earliestPeriod);
      expect(periods[periods.length - 1]).toBe(latestPeriod(release, NOW));
      for (let i = 1; i < periods.length; i++) {
        expect(periods[i]).toBe(nextPeriod(release.cadence, periods[i - 1]));
      }
    }
  });

  it('flags editions computed before the release began publishing on a calendar', () => {
    const investors = getRelease('most-active-investors')!;
    expect(isRetrospectiveEdition(investors, '2024-Q2')).toBe(true);
    expect(isRetrospectiveEdition(investors, investors.firstScheduledPeriod)).toBe(false);
  });

  it('every firstScheduledPeriod is inside the published archive', () => {
    for (const release of RESEARCH_RELEASES) {
      expect(release.firstScheduledPeriod >= release.earliestPeriod).toBe(true);
      expect(isPeriodKey(release.cadence, release.firstScheduledPeriod)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. A missed release is visible
// ---------------------------------------------------------------------------

describe('a missed release surfaces rather than passing quietly', () => {
  const launch = getRelease('launch-cadence')!;

  it('is not due until the period has closed plus the grace window', () => {
    // 2026-08 closes on 2026-09-01; graceDays is 5, so on the 3rd it is not
    // yet a miss.
    const state = releaseDueState(launch, null, new Date('2026-09-03T00:00:00Z'));
    expect(state.period).toBe('2026-08');
    expect(state.status).toBe('awaiting-period-end');
    expect(state.daysLate).toBe(0);
  });

  it('goes DUE the moment the grace window closes', () => {
    const state = releaseDueState(launch, null, new Date('2026-09-06T01:00:00Z'));
    expect(state.status).toBe('due');
  });

  it('goes OVERDUE a day later, and counts the days', () => {
    const state = releaseDueState(launch, null, new Date('2026-09-09T00:00:00Z'));
    expect(state.status).toBe('overdue');
    expect(state.daysLate).toBe(3);
  });

  it('is published — and never late — once the ledger holds a row', () => {
    const state = releaseDueState(
      launch,
      new Date('2026-09-05T00:00:00Z'),
      new Date('2026-09-30T00:00:00Z')
    );
    expect(state.status).toBe('published');
    expect(state.daysLate).toBe(0);
  });

  it('always names the next edition and when it falls due', () => {
    const state = releaseDueState(launch, null, new Date('2026-09-09T00:00:00Z'));
    expect(state.nextPeriod).toBe('2026-09');
    expect(state.nextDueAt.toISOString().slice(0, 10)).toBe('2026-10-06');
  });

  it('a live-period release is due from the moment its period OPENS', () => {
    const scores = getRelease('space-score-top-25')!;
    const due = dueAtFor(scores, '2026-Q4')!;
    // Q4 opens 2026-10-01; graceDays 14.
    expect(due.toISOString().slice(0, 10)).toBe('2026-10-15');
  });
});

// ---------------------------------------------------------------------------
// 4. Registry integrity — every claim has a file behind it
// ---------------------------------------------------------------------------

describe('the release registry', () => {
  it('has unique ids and no id that would break a URL', () => {
    const ids = allReleaseIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('names a real module that computes each release', () => {
    for (const release of RESEARCH_RELEASES) {
      expect(fs.existsSync(path.join(process.cwd(), release.computedBy))).toBe(true);
    }
  });

  it('gives every release a methodology and a list of what it computes', () => {
    for (const release of RESEARCH_RELEASES) {
      expect(release.methodology.length).toBeGreaterThanOrEqual(4);
      expect(release.computes.length).toBeGreaterThanOrEqual(3);
      for (const line of release.methodology) expect(line.length).toBeGreaterThan(30);
    }
  });

  it('puts the period in every edition URL, and routes every export through the gate', () => {
    for (const release of RESEARCH_RELEASES) {
      const period = latestPeriod(release, new Date('2026-09-14T12:00:00Z'));
      expect(release.href(period)).toContain(period);
      const exportHref = release.exportHref(period);
      expect(exportHref).toContain(period);
      // /api/research/** is the gated namespace. An export served from
      // anywhere else would be an ungated export.
      expect(exportHref.startsWith('/api/research/')).toBe(true);
    }
  });

  it('the export route it points at actually calls the server-side guard', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/research/reports/[report]/[period]/route.ts'),
      'utf-8'
    );
    expect(src).toContain('requireResearchAccess');
  });

  it('calls no model anywhere in the computation path — the standing product rule', () => {
    const files = [
      'src/lib/research-releases.ts',
      'src/lib/research-report-types.ts',
      'src/lib/research-report-build.ts',
      'src/lib/research-report-investors.ts',
      'src/lib/research-report-launch.ts',
      'src/lib/research-report-supply-chain.ts',
      'src/lib/chart-week-keys.ts',
      'src/lib/chart-week.ts',
    ];
    for (const file of files) {
      const src = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      expect(src).not.toMatch(/from '@\/lib\/ai-models'/);
      expect(src).not.toMatch(/@anthropic-ai/);
      expect(src).not.toMatch(/\bopenai\b/i);
    }
  });

  it('builds a citation a reader can paste into a memo', () => {
    const release = getRelease('launch-cadence')!;
    const citation = citationFor(release, '2026-08', '2026-08-31');
    expect(citation).toContain(release.title);
    expect(citation).toContain('August 2026');
    expect(citation).toContain('2026-08-31');
    expect(citation).toContain('https://spacenexus.us/releases/launch-cadence/2026-08');
  });

  it('only "series" releases render under /releases; the others keep their own pages', () => {
    for (const release of RESEARCH_RELEASES) {
      if (release.surface === 'series') {
        expect(release.href('2026-Q2').startsWith('/releases/')).toBe(true);
      } else {
        expect(release.href('2026-Q2').startsWith('/releases/')).toBe(false);
      }
    }
    expect(seriesReleases().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. The 404 registry agrees with the calendar
// ---------------------------------------------------------------------------

describe('unknown releases and unpublished periods are REAL 404s', () => {
  it('404s an unknown series', () => {
    expect(registryRouteMissing('/releases/not-a-release')).toBe(true);
    expect(registryRouteMissing('/releases/not-a-release/2026-08')).toBe(true);
  });

  it('does not 404 a known series or its published edition', () => {
    expect(registryRouteMissing('/releases/launch-cadence')).toBe(false);
    expect(registryRouteMissing('/releases/launch-cadence/2026-08')).toBe(false);
  });

  it('404s a malformed or pre-history period', () => {
    expect(registryRouteMissing('/releases/launch-cadence/2026-13')).toBe(true);
    expect(registryRouteMissing('/releases/launch-cadence/2019-01')).toBe(true);
    expect(registryRouteMissing('/releases/most-active-investors/2026-08')).toBe(true);
  });

  it('404s an edition URL for a release that is read elsewhere', () => {
    expect(registryRouteMissing('/releases/hiring-index/2026-08')).toBe(true);
    expect(registryRouteMissing('/releases/space-score-top-25/2026-Q3')).toBe(true);
    // ...but the series page itself redirects rather than 404s.
    expect(registryRouteMissing('/releases/hiring-index')).toBe(false);
  });

  it('keeps the franchise segment off /reports, where static pages live', () => {
    // A [series] param directly under /reports would also match the
    // statically rendered /reports/monthly — for the 404 registry AND for the
    // CSP nonce-eligibility matcher. Its own top-level segment avoids both.
    expect(registryRouteMissing('/reports/monthly')).toBe(false);
    expect(registryRouteMissing('/reports/state-of-space-2026')).toBe(false);
    expect(registryRouteMissing('/reports/anything-at-all')).toBe(false);
    expect(
      fs.existsSync(path.join(process.cwd(), 'src/app/reports/[series]'))
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. The shared arithmetic
// ---------------------------------------------------------------------------

describe('report arithmetic refuses to fabricate', () => {
  it('reports no percentage when the denominator is zero', () => {
    expect(fmtShare(3, 0)).toBe('—');
    expect(pctChange(0, 40)).toBeNull();
  });

  it('computes an honest share and an honest change when it can', () => {
    expect(fmtShare(1, 4)).toBe('25.0%');
    expect(pctChange(50, 75)).toBe(50);
    expect(pctChange(50, 25)).toBe(-50);
  });

  it('hashes edition content deterministically and ignores key order', () => {
    const a = stableHash({ b: 1, a: [1, 2, { z: 3, y: 4 }] });
    const b = stableHash({ a: [1, 2, { y: 4, z: 3 }], b: 1 });
    expect(a).toBe(b);
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
  });

  it('an unchanged edition hashes identically, and a changed one does not', () => {
    const headline = [{ label: 'Rounds', value: '12' }];
    const table = {
      id: 't',
      label: 'T',
      description: 'd',
      columns: [{ key: 'a', label: 'A' }],
      rows: [{ a: 1 }],
      publicRowLimit: 10,
    };
    const first = hashEditionContent(headline, [table]);
    const same = hashEditionContent([{ label: 'Rounds', value: '12' }], [{ ...table }]);
    const moved = hashEditionContent(headline, [{ ...table, rows: [{ a: 2 }] }]);
    expect(same).toBe(first);
    expect(moved).not.toBe(first);
  });
});

// ---------------------------------------------------------------------------
// 7. Pricing truth on the public release surfaces
// ---------------------------------------------------------------------------

/**
 * The Research tier is behind RESEARCH_TIER_ENABLED and defaults to OFF, but
 * the release pages are PUBLIC and render regardless of that flag — they are
 * data journalism, not the paid tier. So every sentence on them that mentions
 * the tier has to be conditional on the server saying it is actually buyable,
 * or an unlaunched product ends up advertised on a public page.
 */
describe('nothing public advertises Research unless the server says it is available', () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf-8');

  it('the release hub never mentions the tier at all', () => {
    const src = read('src/app/releases/page.tsx');
    expect(src).not.toMatch(/SpaceNexus Research/);
    expect(src).not.toMatch(/Research (seat|subscriber)/);
    expect(src).not.toContain('href="/research"');
  });

  it('the edition view only names the tier inside a researchAvailable guard', () => {
    const src = read('src/components/reports/ReleaseEditionView.tsx');
    const guard = src.indexOf('{researchAvailable && (');
    expect(guard).toBeGreaterThan(-1);
    // Every mention of the seat sits after the guard opens, inside it.
    for (const match of src.matchAll(/SpaceNexus Research seat|What a Research seat covers/g)) {
      expect(match.index!).toBeGreaterThan(guard);
    }
    // And the accessible caption, which is always rendered, names no product.
    const caption = src.slice(src.indexOf('<caption'), src.indexOf('</caption>'));
    expect(caption).not.toMatch(/Research/);
  });

  it('the release footer note asks the server before naming the tier', () => {
    const src = read('src/components/reports/ReleaseFooterNote.tsx');
    expect(src).toContain('getResearchAvailability');
    const guard = src.indexOf('{researchAvailable && (');
    expect(guard).toBeGreaterThan(-1);
    expect(src.indexOf('Research subscribers')).toBeGreaterThan(guard);
  });

  it('the edition page resolves access on the SERVER, never from the client', () => {
    const src = read('src/app/releases/[series]/[period]/page.tsx');
    expect(src).toContain('resolveResearchAccess');
    expect(src).toContain('getResearchAvailability');
    expect(src).toContain('hasFullAccess');
    // No client component decides what rows are shown.
    expect(src).not.toContain("'use client'");
  });

  it('the public summary and the gated export compute from the same builder', () => {
    const page = read('src/app/releases/[series]/[period]/page.tsx');
    const api = read('src/app/api/research/reports/[report]/[period]/route.ts');
    expect(page).toContain('buildReleaseEdition');
    expect(api).toContain('buildReleaseEdition');
  });
});
