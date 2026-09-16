import Link from 'next/link';
import { getResearchAvailability } from '@/lib/research';
import { RESEARCH_RELEASES, latestPeriod, periodLabel } from '@/lib/research-releases';

/**
 * The homepage's route into the recurring releases, and — only while it is for
 * sale — into SpaceNexus Research.
 *
 * Until 2026-09-16 the homepage carried no link to /releases and none to
 * /research: the dated, citable releases and the one page on the site that
 * sells anything were both unreachable from the front door. This is one slim
 * band, below the industry section, not a banner in the hero — the hero is the
 * next launch and stays that way.
 *
 * The Research half is a server-side flag read: with RESEARCH_TIER_ENABLED off
 * (or its Stripe price unset) the band still links the releases and says
 * nothing about a tier nobody can buy.
 */
export default function ResearchBand() {
  const { available, plan } = getResearchAvailability();
  const next = RESEARCH_RELEASES.slice(0, 3).map((r) => ({
    id: r.id,
    title: r.shortTitle,
    href: r.href(latestPeriod(r)),
    period: periodLabel(r.cadence, latestPeriod(r)),
  }));

  return (
    <section className="pb-10 md:pb-16" aria-labelledby="home-releases">
      <div className="container mx-auto px-4">
        <div className="flex items-baseline justify-between gap-4 mb-6 pb-3 border-b border-[var(--line)]">
          <h2 id="home-releases" className="text-[22px] font-semibold text-[var(--ink)]">
            Dated releases, computed from our own rows
          </h2>
          <Link
            href="/releases"
            className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ember)]"
          >
            The release calendar &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {next.map((r) => (
            <Link
              key={r.id}
              href={r.href}
              className="block rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-4 md:p-[18px] hover:border-[var(--line-2)] hover:bg-[var(--elev)] transition-colors"
            >
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
                {r.period}
              </p>
              <p className="text-[15px] font-semibold text-[var(--ink)] mt-1.5">{r.title}</p>
              <p className="text-[12px] text-[var(--ink-3)] mt-1">
                Figures, method and coverage limits, public and citable
              </p>
            </Link>
          ))}
        </div>

        {available && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius-console)] border border-[var(--line)] bg-[var(--surface)] p-4 md:p-[18px]">
            <p className="text-[13px] text-[var(--ink-2)] leading-relaxed">
              <span className="text-[var(--ink)] font-semibold">{plan.name}</span> &mdash; the
              complete row set behind every release, full-history CSV and JSON exports, portfolio
              supply-chain exposure and saved screens. ${plan.priceYearly.toLocaleString()} a year,{' '}
              {plan.totalSeats} named seats.
            </p>
            <Link
              href="/research"
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[var(--line-2)] px-4 text-[13px] font-semibold text-[var(--ink)] hover:border-[var(--ember)] hover:text-[var(--ember)] transition-colors"
            >
              What a Research seat covers &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
