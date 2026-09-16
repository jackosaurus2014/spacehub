import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { toResearchCsv } from '@/lib/research-export';
import {
  citationFor,
  getRelease,
  latestPeriod,
  periodLabel,
  type ResearchRelease,
} from '@/lib/research-releases';
import { buildReleaseEdition } from '@/lib/research-report-build';
import type { ReportColumn } from '@/lib/research-report-types';

/**
 * Evidence, not adjectives.
 *
 * A $399 buyer who has never heard of us is asked to trust a page full of
 * claims. This section answers the only question that matters before a card
 * comes out: what do the rows actually look like? So it takes a REAL edition of
 * a real recurring release, computed from the live database at request time,
 * and shows the first few rows exactly as they come out of the export --
 * including the CSV text, produced by the same toResearchCsv() and the same
 * column set that /api/research/reports/[report]/[period] serves to a paying
 * seat holder.
 *
 * Nothing here is written by hand, mocked up or illustrative. If the builder
 * cannot produce an edition with rows, this section renders NOTHING rather than
 * inventing a sample -- a fabricated screenshot is worse than no screenshot.
 */

/** How many rows the public sample shows. Small on purpose: it is a sample. */
const SAMPLE_ROWS = 3;

/**
 * Release preference order. The first one whose latest published edition has a
 * table with rows wins. Investors first -- it is the release a diligence team
 * recognises -- with three fallbacks so a quiet quarter in one dataset does not
 * remove the evidence from the page.
 */
const SAMPLE_RELEASE_IDS = [
  'most-active-investors',
  'federal-space-awards',
  'supply-chain-concentration',
  'launch-cadence',
] as const;

export interface ResearchSampleData {
  releaseId: string;
  releaseTitle: string;
  href: string;
  period: string;
  periodLabel: string;
  editionTitle: string;
  asOf: string;
  citation: string;
  tableLabel: string;
  tableDescription: string;
  /** Displayed columns, as the edition page shows them. */
  columns: ReportColumn[];
  /** The first SAMPLE_ROWS rows, untouched. */
  rows: Record<string, unknown>[];
  /** Rows in the complete export for this table. */
  totalRows: number;
  /** Columns in the complete export -- wider than the display table. */
  totalColumns: number;
  /** Real CSV: the export's header line plus the sampled rows. */
  csv: string;
  coverage: string[];
}

async function loadSample(): Promise<ResearchSampleData | null> {
  for (const id of SAMPLE_RELEASE_IDS) {
    const release: ResearchRelease | undefined = getRelease(id);
    if (!release) continue;
    const period = latestPeriod(release);
    try {
      const edition = await buildReleaseEdition(release.id, period);
      const table = edition.tables.find((t) => t.rows.length >= SAMPLE_ROWS);
      if (!table) continue;

      // Exactly the column set the CSV export builds -- every key the rows
      // carry, not just the displayed ones. Copied in shape from
      // src/app/api/research/reports/[report]/[period]/route.ts so the sample
      // and the file a seat holder downloads cannot disagree.
      const columnKeys = Array.from(
        new Set([
          ...table.columns.map((c) => c.key),
          ...table.rows.flatMap((r) => Object.keys(r)),
        ])
      );
      const rows = table.rows.slice(0, SAMPLE_ROWS);

      return {
        releaseId: release.id,
        releaseTitle: release.title,
        href: release.href(period),
        period,
        periodLabel: periodLabel(release.cadence, period),
        editionTitle: edition.title,
        asOf: edition.asOf,
        citation: citationFor(release, period, edition.asOf),
        tableLabel: table.label,
        tableDescription: table.description,
        columns: table.columns,
        rows,
        totalRows: table.rows.length,
        totalColumns: columnKeys.length,
        csv: toResearchCsv(rows, columnKeys),
        coverage: edition.coverage,
      };
    } catch {
      // A release that cannot build is skipped, not surfaced as an error: the
      // page still sells without it.
      continue;
    }
  }
  return null;
}

// Recomputed at most every 30 minutes. The rows move on a monthly and
// quarterly calendar, so a fresher read would buy nothing and cost a full
// edition build on every page view.
const getSample = unstable_cache(loadSample, ['research-sample-v1'], { revalidate: 1800 });

/**
 * Display formatting, deliberately identical to the edition page's own rules
 * (renderCell in src/components/reports/ReleaseEditionView.tsx): dollar columns
 * end in `Usd`, percentage columns end in `Percent` or `percentChange`. It is
 * mirrored rather than imported because that function is a module-private
 * helper in a component file, and a sample that rendered "50" where the edition
 * renders "50.0%" would be a worse advertisement than none. The raw values are
 * printed verbatim in the CSV block directly beneath, so nothing here can hide
 * what the export actually contains.
 */
const USD_KEYS = /Usd$/;
const PERCENT_KEYS = /(Percent|percentChange)$/;

function cellText(key: string, value: unknown, numeric?: boolean): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join('; ');
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    if (USD_KEYS.test(key)) {
      const abs = Math.abs(value);
      if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    }
    if (PERCENT_KEYS.test(key)) return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
    return numeric ? value.toLocaleString('en-US') : String(value);
  }
  return String(value);
}

export default async function ResearchSample() {
  let sample: ResearchSampleData | null = null;
  try {
    sample = await getSample();
  } catch {
    sample = null;
  }
  if (!sample) return null;
  // Bind to a const: the narrowing from the guard above does not survive into
  // the .map() closures below while `sample` is a let.
  const view = sample;

  return (
    <section aria-labelledby="sample" className="mb-14">
      <h2 id="sample" className="text-2xl font-bold text-white mb-2">
        See the actual rows before you pay
      </h2>
      <p className="text-sm text-slate-400 mb-5 max-w-3xl">
        This is not a mock-up. Below is a live extract from{' '}
        <Link href={view.href} className="text-cyan-400 underline hover:text-cyan-300">
          {view.editionTitle}
        </Link>
        , read from our database when this page loaded &mdash; the first {view.rows.length} of{' '}
        {view.totalRows.toLocaleString('en-US')} rows in one of its tables, in the same columns
        and the same CSV a seat holder downloads.
      </p>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-white font-semibold">{view.tableLabel}</h3>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">{view.tableDescription}</p>

        <div className="overflow-x-auto rounded-lg border border-slate-800 mt-4">
          <table className="w-full text-sm">
            <caption className="sr-only">
              {view.tableLabel}. The first {view.rows.length} of{' '}
              {view.totalRows.toLocaleString('en-US')} rows, as a sample of the full export.
            </caption>
            <thead className="bg-slate-900">
              <tr>
                {view.columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={
                      'text-slate-200 font-semibold px-3 py-2.5 whitespace-nowrap ' +
                      (c.numeric ? 'text-right' : 'text-left')
                    }
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-800">
                  {view.columns.map((c) => (
                    <td
                      key={c.key}
                      className={
                        'text-slate-300 px-3 py-2.5 ' +
                        (c.numeric ? 'text-right tabular-nums whitespace-nowrap' : 'text-left')
                      }
                    >
                      {cellText(c.key, row[c.key], c.numeric)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 className="text-white font-semibold text-sm mt-6 mb-1.5">
          The same {view.rows.length} rows as the export delivers them
        </h4>
        <p className="text-xs text-slate-400 mb-2 leading-relaxed">
          Generated by the same function that writes the download, over the same{' '}
          {view.totalColumns} columns &mdash; the file is wider than the table above, because an
          export is the wide version by design.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
          <pre className="text-xs text-slate-300 p-4 leading-relaxed" tabIndex={0}>
            <code>{view.csv}</code>
          </pre>
        </div>

        <p className="text-xs text-slate-400 mt-4 leading-relaxed">
          <span className="text-slate-300 font-medium">Cite it as:</span> {view.citation}
        </p>
        {view.coverage.length > 0 && (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            <span className="text-slate-400 font-medium">What this edition cannot see:</span>{' '}
            {view.coverage[0]}{' '}
            <Link href={view.href} className="text-cyan-400 underline hover:text-cyan-300">
              Full coverage limits
            </Link>
            .
          </p>
        )}
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Every edition of every release is public in this form &mdash; headline figures, methodology,
        coverage limits and the top of each table &mdash; on{' '}
        <Link href="/releases" className="text-cyan-400 underline hover:text-cyan-300">
          the release calendar
        </Link>
        . A seat is the complete row set and its CSV and JSON.
      </p>
    </section>
  );
}
