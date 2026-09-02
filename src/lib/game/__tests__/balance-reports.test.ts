/**
 * @jest-environment node
 *
 * Public quarterly balance reports (docs/POLICY.md "balance review
 * cadence"). Guards: the registry is well-formed, every report's generated
 * Markdown constant matches its docs/ source byte-for-byte (the app cannot
 * read docs/ at runtime, so the two are kept in sync by
 * scripts/generate-balance-report.ts), the POLICY-required contents are
 * present, and every headline figure is actually stated in the body — no
 * number on the index card that the report itself does not carry.
 */
import fs from 'fs';
import path from 'path';
import { BALANCE_REPORTS, getBalanceReport, balanceReportSlugs } from '../balance-reports';

describe('balance-reports registry', () => {
  it('has unique yyyy-qN slugs, newest first, with dated titles', () => {
    const slugs = balanceReportSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^\d{4}-q[1-4]$/);
    const dates = BALANCE_REPORTS.map((r) => r.publishedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const r of BALANCE_REPORTS) {
      expect(r.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.quarter).toMatch(/^\d{4} Q[1-4]$/);
      expect(r.title.length).toBeGreaterThan(10);
      expect(r.summary.length).toBeGreaterThan(80);
      expect(r.headlines.length).toBeGreaterThanOrEqual(4);
      expect(r.faq.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('getBalanceReport resolves known slugs and rejects unknown ones', () => {
    expect(getBalanceReport('2026-q3')?.quarter).toBe('2026 Q3');
    expect(getBalanceReport('1999-q1')).toBeNull();
    expect(getBalanceReport('')).toBeNull();
  });

  it('every generated Markdown constant matches its docs/ source exactly', () => {
    for (const r of BALANCE_REPORTS) {
      const doc = fs.readFileSync(path.join(process.cwd(), r.docPath), 'utf8');
      expect(r.markdown).toBe(doc);
    }
  });

  it('every report carries the POLICY-required contents', () => {
    const required = [
      /median/i,           // median corporate net worth
      /gini/i,             // inequality
      /price stability/i,  // core commodities
      /faction balance/i,
      /retention/i,        // new-player retention
      /P&L distribution/i,
      /methodolog/i,
      /NPC (market )?share/i,
    ];
    for (const r of BALANCE_REPORTS) {
      for (const re of required) expect(r.markdown).toMatch(re);
    }
  });

  it('the 2026 Q3 report links the clock post-mortem and states the D4/D5/D6 changes', () => {
    const r = getBalanceReport('2026-q3')!;
    expect(r.markdown).toContain('/space-tycoon/dev-log');
    expect(r.markdown).toMatch(/Clock unification/);
    expect(r.markdown).toMatch(/D4 Mark-II/);
    expect(r.markdown).toMatch(/D5 flagship/);
    expect(r.markdown).toMatch(/D6 population/);
    // Honesty markers: the live population and the not-yet-measurable items.
    expect(r.markdown).toMatch(/two corporations/i);
    expect(r.markdown).toMatch(/measured next quarter/);
    expect(r.markdown).toMatch(/No balance constant was changed/);
  });

  it('every headline figure is stated in the report body', () => {
    for (const r of BALANCE_REPORTS) {
      for (const h of r.headlines) {
        // Each numeric token of the headline value must appear in the body.
        const tokens = h.value.match(/\d[\d,.]*%?/g) || [];
        for (const t of tokens) {
          expect(r.markdown.includes(t)).toBe(true);
        }
      }
    }
  });
});
