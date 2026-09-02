// ─── Space Tycoon: public quarterly balance reports ─────────────────────────
// docs/POLICY.md "Balance review cadence": a quarterly published economic
// health report — median corporate net worth, inequality (Gini), price
// stability of core commodities, faction balance, new-player retention, P&L
// distribution. This registry backs /space-tycoon/balance-reports (index)
// and /space-tycoon/balance-reports/[slug] (the report). Newest first.
//
// Each report's body is the Markdown authored in docs/BALANCE_REPORT_*.md,
// carried as a generated string constant (scripts/generate-balance-report.ts)
// because the deployed app cannot read docs/ at runtime. Headline figures
// are repeated here so the index page and the JSON-LD can show them without
// parsing the Markdown; the guard test checks they appear in the body.

import { BALANCE_REPORT_2026_Q3_MARKDOWN } from './balance-report-2026-q3';

export interface BalanceReportHeadline {
  label: string;
  value: string;
  /** Where the figure comes from — every number is sourced (POLICY). */
  source: 'simulation' | 'live world' | 'shipped constants';
}

export interface BalanceReportFaq {
  q: string;
  a: string;
}

export interface BalanceReport {
  /** URL slug, `yyyy-qN`. */
  slug: string;
  /** Display quarter, e.g. "2026 Q3". */
  quarter: string;
  title: string;
  /** ISO date of publication. */
  publishedAt: string;
  /** One-paragraph summary for the index card and meta description. */
  summary: string;
  headlines: BalanceReportHeadline[];
  /** Plain-text FAQ for the FAQPage JSON-LD (same pattern as /space-tycoon/about). */
  faq: BalanceReportFaq[];
  /** Full report body (GFM Markdown). */
  markdown: string;
  /** Docs path the body is generated from. */
  docPath: string;
}

export const BALANCE_REPORTS: BalanceReport[] = [
  {
    slug: '2026-q3',
    quarter: '2026 Q3',
    title: 'Economic Balance Report — 2026 Q3',
    publishedAt: '2026-09-02',
    summary:
      'The first quarterly balance report: the 50-year balance simulation re-run on the unified game clock with and without Mark-II refits, the D5 flagship payback measured in practice, inequality and tier concentration by decade, the live world’s two corporations and NPC market share, and what is watched next quarter.',
    headlines: [
      { label: 'Year-50 Gini across archetypes', value: '0.730 standard / 0.548 refit-aware', source: 'simulation' },
      { label: 'Top-1 share of wealth at year 50', value: '67% / 39%', source: 'simulation' },
      { label: 'First flagship realised payback', value: '76 game-months (datacenter_jupiter, $20B)', source: 'simulation' },
      { label: 'Money-supply sink coverage', value: '95–104% every decade, both runs', source: 'simulation' },
      { label: 'Live corporations', value: '2 (median net worth $236.9M, Gini 0.289)', source: 'live world' },
      { label: 'NPC share of order-book value, 30 days', value: '100% (no player fills)', source: 'live world' },
      { label: 'Live spot prices within ±20% of base', value: '34 of 35 resources', source: 'live world' },
      { label: 'Balance constants changed', value: 'none', source: 'shipped constants' },
    ],
    faq: [
      {
        q: 'What is a Space Tycoon balance report?',
        a: 'A quarterly, public account of the game economy’s health promised in the Space Tycoon policy: median corporate net worth, inequality (Gini), price stability, faction balance, new-player retention and the distribution of profit and loss, with every figure sourced to either the balance simulation or the live world’s public data.',
      },
      {
        q: 'Where do the numbers come from?',
        a: 'Two places, and each table says which. The 50-year balance simulation (scripts/sim-50yr.ts in the open-source repository) runs eight scripted corporations through 600 game-months on the real engine code. Live figures are read from the public leaderboard and market endpoints on the day of publication. Nothing is estimated; where a figure cannot be measured yet the report says so and states how it will be measured next quarter.',
      },
      {
        q: 'What was the clock defect?',
        a: 'Until 2 September 2026 the engine credited one game-month of income every 60 real seconds while the world calendar advanced one game-month every 6 real hours, so income accrued 360 times faster than the world it was priced in. The tick now follows the calendar and every balance was divided by 360, so nobody’s relative position changed. The full post-mortem is in the dev log.',
      },
      {
        q: 'Did any balance constant change for this report?',
        a: 'No. The report measures the changes shipped on 2 September 2026 (clock unification, Mark-II refits, flagship economics, population gates) and recommends against changing the one constant that would move the largest deviation, because the deviation is the intended research sink being exercised.',
      },
      {
        q: 'Why are there only two corporations in the live figures?',
        a: 'Because that is how many corporations are on the public leaderboard on the day of publication. The report says so rather than inventing a distribution; retention and faction balance are marked “measured next quarter” until the population supports them.',
      },
    ],
    markdown: BALANCE_REPORT_2026_Q3_MARKDOWN,
    docPath: 'docs/BALANCE_REPORT_2026-Q3.md',
  },
];

export function getBalanceReport(slug: string): BalanceReport | null {
  return BALANCE_REPORTS.find((r) => r.slug === slug) ?? null;
}

export function balanceReportSlugs(): string[] {
  return BALANCE_REPORTS.map((r) => r.slug);
}
