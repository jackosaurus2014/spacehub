import Link from 'next/link';
import {
  citationFor,
  getRelease,
  periodLabel,
  RELEASE_STATUS_LABEL,
} from '@/lib/research-releases';
import { releaseState } from '@/lib/research-release-log';
import { getResearchAvailability } from '@/lib/research';
import DataLicenceNote from '@/components/reports/DataLicenceNote';

/**
 * The "this is a recurring release" block for the two franchises that are read
 * on their own long-standing pages — the Hiring Index and the Space Score Top
 * 25. It gives them the four things every release on the calendar owes a
 * reader: a citable line, the cadence, when the next edition is due, and the
 * gated export of the rows.
 *
 * Deliberately a small addition to existing pages rather than a second copy of
 * them: two surfaces describing the same data are two surfaces that can
 * disagree.
 */
export default async function ReleaseFooterNote({
  releaseId,
  period,
  asOf,
}: {
  releaseId: string;
  period: string;
  /** YYYY-MM-DD the figures describe. */
  asOf: string;
}) {
  const release = getRelease(releaseId);
  if (!release) return null;

  const state = await releaseState(release);
  const citation = citationFor(release, period, asOf);
  // Pricing truth: the export line names the Research tier only while the
  // server says the tier is actually buyable (RESEARCH_TIER_ENABLED + a
  // configured Stripe price). With the flag off this block says nothing
  // about it.
  const researchAvailable = getResearchAvailability().available;

  return (
    <section className="mt-12" aria-labelledby={`release-note-${releaseId}`}>
      <h2 id={`release-note-${releaseId}`} className="text-xl font-bold text-white mb-3">
        A recurring release
      </h2>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          This is the {release.cadence} <strong className="text-white">{release.title}</strong>. Every
          edition is dated and permanently linkable, and every figure is computed from SpaceNexus data
          rather than written.{' '}
          <Link href="/releases" className="text-cyan-300 hover:text-cyan-200">
            The full release calendar
          </Link>{' '}
          shows where each franchise stands.
        </p>

        <p className="text-sm text-slate-400">
          {state.status === 'overdue' ? (
            <span className="text-amber-300">
              {RELEASE_STATUS_LABEL[state.status]} — the {state.periodLabel} edition was due{' '}
              {state.dueAt.toISOString().slice(0, 10)} and has not been recorded.
            </span>
          ) : (
            <>
              Next edition: {periodLabel(release.cadence, state.nextPeriod)}, due{' '}
              {state.nextDueAt.toISOString().slice(0, 10)}.
            </>
          )}
        </p>

        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 mb-1">Cite this edition</p>
          <p className="text-xs text-slate-300 bg-black/40 border border-white/[0.06] rounded p-2.5 select-all break-words">
            {citation}
          </p>
        </div>

        {researchAvailable && (
          <p className="text-sm text-slate-400">
            The complete row set, every column included, is available as CSV and JSON to SpaceNexus
            Research subscribers:{' '}
            <a
              href={release.exportHref(period)}
              className="text-cyan-300 hover:text-cyan-200 underline"
            >
              export this edition
            </a>
            . The export is computed from exactly the rows behind the tables above, so the page and the
            file can never disagree.
          </p>
        )}
      </div>

      {/*
        The Hiring Index and the Space Score Top 25 read the same
        register-enriched company rows as the series editions, so they owe the
        same acknowledgement. See DataLicenceNote for why it is mandatory.
      */}
      <DataLicenceNote />
    </section>
  );
}
