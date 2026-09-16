import Link from 'next/link';
import DataLicenceNote from '@/components/reports/DataLicenceNote';
import type { ResearchRelease } from '@/lib/research-releases';
import type { ReportTable, ResearchReportEdition } from '@/lib/research-report-types';

/**
 * One edition of a recurring release, rendered.
 *
 * THE PUBLIC / GATED SPLIT LIVES HERE, and it is a deliberate shape:
 *   PUBLIC  — every headline figure, every methodology line, every coverage
 *             limit, and the top rows of every table. The release is citable,
 *             linkable and quotable by people who will never pay us, which is
 *             the entire point of publishing a named franchise.
 *   GATED   — the remaining rows and the CSV/JSON export. That is the form a
 *             firm models against, and it is what the Research seat buys.
 *
 * `hasFullAccess` is resolved SERVER-SIDE by the page from the same
 * authorization the export route uses. This component only renders what it is
 * told; it is never the gate.
 *
 * Accessibility: every table is a real <table> with a caption and column
 * scopes, inside its own horizontally scrolling container so the page body
 * never scrolls sideways on a phone. No figure is conveyed by colour alone.
 */

function fmtCell(value: unknown, numeric?: boolean): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    return numeric ? value.toLocaleString('en-US') : String(value);
  }
  return String(value);
}

/** Money and percentage columns get a shape the eye can scan. */
const USD_KEYS = /Usd$/;
const PERCENT_KEYS = /(Percent|percentChange)$/;

function renderCell(key: string, value: unknown, numeric?: boolean): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (USD_KEYS.test(key)) {
      const abs = Math.abs(value);
      if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    }
    if (PERCENT_KEYS.test(key)) return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }
  return fmtCell(value, numeric);
}

function EditionTable({
  table,
  hasFullAccess,
  exportHref,
  researchAvailable,
}: {
  table: ReportTable;
  hasFullAccess: boolean;
  exportHref: string;
  researchAvailable: boolean;
}) {
  const total = table.rows.length;
  const withheld = hasFullAccess ? 0 : Math.max(0, total - table.publicRowLimit);
  const rows = hasFullAccess ? table.rows : table.rows.slice(0, table.publicRowLimit);

  return (
    <section className="mt-10" aria-labelledby={`table-${table.id}`}>
      <h3 id={`table-${table.id}`} className="text-lg font-bold text-white mb-1">
        {table.label}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed mb-4 max-w-3xl">{table.description}</p>

      {total === 0 ? (
        <p className="text-sm text-slate-400 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          Nothing to report in this table for this edition. An empty table here means we recorded
          nothing, not that nothing happened.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full border-collapse text-sm">
            <caption className="sr-only">
              {table.label}. {table.description}
              {withheld > 0
                ? ` Showing the first ${rows.length} of ${total} rows.`
                : ` ${total} rows.`}
            </caption>
            <thead>
              <tr className="text-left text-slate-400 bg-white/[0.03]">
                {table.columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={`py-2.5 px-3 font-medium whitespace-nowrap ${c.numeric ? 'text-right' : ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-white/[0.07]">
                  {table.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`py-2.5 px-3 ${c.numeric ? 'text-right tabular-nums text-white' : 'text-slate-300'}`}
                    >
                      {renderCell(c.key, row[c.key], c.numeric)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {table.note && <p className="text-xs text-slate-500 mt-3 leading-relaxed max-w-3xl">{table.note}</p>}

      {withheld > 0 && (
        <div className="mt-3 rounded-xl border border-white/15 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-200">
            Showing the first {rows.length} of {total.toLocaleString('en-US')} rows.{' '}
            <strong className="text-white">{withheld} more</strong> in this table, plus every column the
            display leaves out.
          </p>
          {/*
            PRICING TRUTH. The Research tier is behind RESEARCH_TIER_ENABLED and
            defaults to OFF. With the flag off this panel states the row count
            and stops — it must never advertise a product nobody can buy. The
            sentence about the seat appears only when the server says the tier
            is actually available.
          */}
          {researchAvailable && (
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              The complete row set and its CSV and JSON exports are part of a SpaceNexus Research seat. The
              figures above are computed from exactly the same rows, so the summary and the export can never
              disagree.{' '}
              <Link href="/research" className="text-cyan-300 underline hover:text-cyan-200">
                What a Research seat covers
              </Link>
              .
            </p>
          )}
        </div>
      )}

      {hasFullAccess && total > 0 && (
        <p className="text-xs text-slate-500 mt-3">
          <a
            href={`${exportHref}?format=csv&table=${table.id}`}
            className="text-cyan-300 hover:text-cyan-200 underline"
          >
            Download this table as CSV
          </a>{' '}
          &middot; {total.toLocaleString('en-US')} rows
        </p>
      )}
    </section>
  );
}

export default function ReleaseEditionView({
  release,
  edition,
  hasFullAccess,
  researchAvailable,
  unchangedSince,
  retrospective,
}: {
  release: ResearchRelease;
  edition: ResearchReportEdition;
  hasFullAccess: boolean;
  researchAvailable: boolean;
  /** Period label of the last edition with identical numbers, when identical. */
  unchangedSince?: string | null;
  /** True when this edition was computed after the fact, not on the calendar. */
  retrospective?: boolean;
}) {
  const exportHref = release.exportHref(edition.period);

  return (
    <>
      {edition.notice && (
        <aside
          className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4"
          role="note"
          aria-label="Not investment advice"
        >
          <p className="text-sm text-amber-100 font-semibold mb-1">
            For informational purposes only &mdash; not investment advice
          </p>
          <p className="text-sm text-slate-200 leading-relaxed">{edition.notice}</p>
        </aside>
      )}

      {retrospective && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
          <p className="text-sm text-amber-100 font-medium mb-1">Back-computed edition</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            This period closed before the release began publishing on a calendar. The figures are computed
            from the same tables, but this is a back-calculation rather than what we would have published at
            the time. Scheduled editions begin with{' '}
            <strong className="text-white">{release.firstScheduledPeriod}</strong>.
          </p>
        </div>
      )}

      {unchangedSince && (
        <div className="mt-6 rounded-xl border border-slate-500/30 bg-white/[0.03] p-4">
          <p className="text-sm text-white font-medium mb-1">Unchanged since {unchangedSince}</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Every figure in this edition is identical to the previous one, so nothing in the underlying data
            moved. An unchanged period is reported as unchanged rather than dressed up as news.
          </p>
        </div>
      )}

      {edition.empty ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-lg font-bold text-white mb-2">Nothing to report</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {edition.emptyReason ?? 'This edition has no data.'} The edition is published anyway: a period
            where we recorded nothing is an honest release, and a skipped one is not.
          </p>
        </div>
      ) : (
        <>
          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {edition.headline.map((f) => (
              <div key={f.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <dt className="text-xs uppercase tracking-[0.12em] text-slate-400 font-semibold">
                  {f.label}
                </dt>
                <dd className="text-2xl font-bold text-white mt-1.5 tabular-nums">{f.value}</dd>
                {f.detail && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{f.detail}</p>}
              </div>
            ))}
          </dl>

          {edition.tables.map((t) => (
            <EditionTable
              key={t.id}
              table={t}
              hasFullAccess={hasFullAccess}
              exportHref={exportHref}
              researchAvailable={researchAvailable}
            />
          ))}
        </>
      )}

      <section className="mt-14" id="methodology" aria-labelledby="methodology-heading">
        <h2 id="methodology-heading" className="text-xl font-bold text-white mb-3">
          Methodology
        </h2>
        <ul className="space-y-3 max-w-3xl">
          {release.methodology.map((m) => (
            <li key={m} className="text-sm text-slate-400 leading-relaxed flex gap-2">
              <span aria-hidden="true" className="text-slate-600">
                &bull;
              </span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" id="coverage" aria-labelledby="coverage-heading">
        <h2 id="coverage-heading" className="text-xl font-bold text-white mb-1">
          What this edition can and cannot see
        </h2>
        <p className="text-sm text-slate-500 mb-4 max-w-3xl">
          Coverage limits travel with the numbers, here and in every export of them.
        </p>
        <ul className="space-y-3 max-w-3xl">
          {edition.coverage.map((c) => (
            <li key={c} className="text-sm text-slate-400 leading-relaxed flex gap-2">
              <span aria-hidden="true" className="text-slate-600">
                &bull;
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Required attribution. The OGL grants reuse of the Crown-copyright UK
        register ONLY on condition that the source is acknowledged, and the
        rights end automatically without it. It sits next to the coverage
        limits because both answer the same question: where did this come from
        and what is it allowed to be.
      */}
      <DataLicenceNote />
    </>
  );
}
