import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SITE_STATS } from '@/lib/site-stats';
import { RESEARCH_CAPABILITIES, RESEARCH_PLAN, getResearchAvailability } from '@/lib/research';
import { RESEARCH_DATASETS, RESEARCH_DATASET_IDS } from '@/lib/research-export';
import { EXPOSURE_COVERAGE_NOTE } from '@/lib/research-exposure';
import ResearchCheckoutButton from './ResearchCheckoutButton';

// The availability flag is read from the environment at request time, and the
// funding/score counts come from the database. The build container reaches
// neither, so this page must never be statically rendered.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SpaceNexus Research — an annual data seat for firms',
  description:
    'Full-history space funding and supply-chain data, portfolio exposure analysis, saved screens with change alerts, Space Score history and a quarterly sector report. An annual seat for investors, corporate strategy and BD teams.',
  alternates: { canonical: 'https://spacenexus.us/research' },
  robots: { index: true, follow: true },
};

const AUDIENCES = [
  {
    who: 'Investors and PE/VC diligence teams',
    use: 'Pull the complete round history for a sector into your own model, screen for the raises that match a thesis, and see what a target company’s supply chain actually depends on before an IC meeting.',
  },
  {
    who: 'Corporate strategy',
    use: 'Track where capital is going quarter by quarter, watch which suppliers your competitors and your own programme share, and get the concentration picture you cannot assemble from press releases.',
  },
  {
    who: 'BD and capture leads',
    use: 'Screen for newly funded companies that just became able to buy what you sell, with a weekly alert that fires only when the list actually changes.',
  },
];

/**
 * The professional buyer's page.
 *
 * Two rules shaped every line of copy here:
 *   1. PRICING TRUTH — every capability bullet is rendered from
 *      RESEARCH_CAPABILITIES, each entry of which names the server file that
 *      enforces it. There is no hand-written feature list on this page.
 *   2. HONESTY ABOUT COVERAGE — the dataset table prints each dataset's own
 *      coverage statement, including the ones that say history is short or the
 *      roster is curated rather than exhaustive. A research buyer who finds a
 *      limit we did not disclose does not renew.
 */
export default async function ResearchPage() {
  const availability = getResearchAvailability();

  // Building it is not launching it. With RESEARCH_TIER_ENABLED off there is no
  // product to describe, so this page does not exist for the public — a
  // redirect rather than notFound(), because notFound() from a matched route
  // still commits a 200 (see route-404-status.test.ts).
  if (!availability.available) {
    redirect('/pricing');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <header className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">
            SpaceNexus Research
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-balance">
            The space industry&rsquo;s data, in a form you can actually model
          </h1>
          <p className="text-slate-300 text-lg max-w-3xl">
            An annual seat for firms. Everything on SpaceNexus stays free to read
            &mdash; Research is the full history, the exports, the portfolio-level
            analysis and the seats that make it usable inside a team.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <ResearchCheckoutButton
              priceYearly={availability.plan.priceYearly}
              totalSeats={availability.plan.totalSeats}
            />
            <p className="text-sm text-slate-400">
              ${availability.plan.priceYearly.toLocaleString()} per year &middot;{' '}
              {availability.plan.totalSeats} named seats &middot; one invoice &middot; no trial
            </p>
          </div>
        </header>

        {/* What is in it */}
        <section aria-labelledby="whats-in-it" className="mb-14">
          <h2 id="whats-in-it" className="text-2xl font-bold text-white mb-5">
            What is in it
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {RESEARCH_CAPABILITIES.map((cap) => (
              <li
                key={cap.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <h3 className="text-white font-semibold mb-2">{cap.label}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{cap.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Who it is for */}
        <section aria-labelledby="who-for" className="mb-14">
          <h2 id="who-for" className="text-2xl font-bold text-white mb-5">
            Who it is for
          </h2>
          <div className="space-y-4">
            {AUDIENCES.map((a) => (
              <div key={a.who} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <h3 className="text-cyan-300 font-semibold mb-1.5">{a.who}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{a.use}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-400">
            Not for enthusiasts. If you are here to follow launches, read the news
            and play Space Tycoon, all of that is free and always will be &mdash;{' '}
            <Link href="/pricing" className="text-cyan-400 underline hover:text-cyan-300">
              see the free and Professional plans
            </Link>
            .
          </p>
        </section>

        {/* Coverage — the honest part */}
        <section aria-labelledby="coverage" className="mb-14">
          <h2 id="coverage" className="text-2xl font-bold text-white mb-2">
            What the data covers, and what it does not
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            Every dataset ships with this statement attached to the file, not just
            printed on this page.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <caption className="sr-only">
                SpaceNexus Research datasets and their coverage limits
              </caption>
              <thead className="bg-slate-900">
                <tr>
                  <th scope="col" className="text-left text-slate-200 font-semibold px-4 py-3 whitespace-nowrap">
                    Dataset
                  </th>
                  <th scope="col" className="text-left text-slate-200 font-semibold px-4 py-3">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody>
                {RESEARCH_DATASET_IDS.map((id) => (
                  <tr key={id} className="border-t border-slate-800 align-top">
                    <th
                      scope="row"
                      className="text-left text-white font-medium px-4 py-3 whitespace-nowrap"
                    >
                      {RESEARCH_DATASETS[id].label}
                    </th>
                    <td className="text-slate-300 px-4 py-3 leading-relaxed min-w-[18rem]">
                      {RESEARCH_DATASETS[id].coverage}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-800 align-top">
                  <th
                    scope="row"
                    className="text-left text-white font-medium px-4 py-3 whitespace-nowrap"
                  >
                    Portfolio exposure
                  </th>
                  <td className="text-slate-300 px-4 py-3 leading-relaxed min-w-[18rem]">
                    {EXPOSURE_COVERAGE_NOTE}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How current */}
        <section aria-labelledby="currency" className="mb-14">
          <h2 id="currency" className="text-2xl font-bold text-white mb-5">
            How current it is
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              [
                'Funding rounds',
                'Updated continuously as rounds are recorded, from SEC filings, company announcements and press coverage. Each row names its source.',
              ],
              [
                'Space Score',
                'Recomputed from the underlying company data and snapshotted once a day. The methodology version travels with every reading.',
              ],
              [
                'Supply chain and BOM risk',
                'Analyst-maintained. Reviewed rather than scraped, so it changes in steps, not continuously.',
              ],
              [
                'Hiring index',
                `Monthly, from a daily crawl of ${SITE_STATS.companies}+ company career pages and 16 ATS boards.`,
              ],
              [
                'Screen alerts',
                'Weekly, and only when your result set actually changed. An unchanged screen sends nothing.',
              ],
              [
                'Quarterly report',
                'Published for completed quarters only. A quarter still running is never served as though it were finished.',
              ],
            ].map(([term, def]) => (
              <div key={term} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                <dt className="text-white font-semibold mb-1.5">{term}</dt>
                <dd className="text-sm text-slate-300 leading-relaxed">{def}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Seats — the part most likely to be misread */}
        <section aria-labelledby="seats" className="mb-14">
          <h2 id="seats" className="text-2xl font-bold text-white mb-4">
            Seats
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 text-sm text-slate-300 leading-relaxed">
            <p>
              One subscription covers {RESEARCH_PLAN.totalSeats} named users: the
              person who pays, plus {RESEARCH_PLAN.totalSeats - 1} colleagues
              invited by email. Invites are single-use and bound to the address
              they were sent to, so forwarding one does not transfer a seat.
            </p>
            <p>
              A seat unlocks the Research workspace &mdash; exports, portfolio
              exposure, screens, Space Score history and the quarterly. To be
              precise about it: a seat is <strong>not</strong> a Professional
              subscription, and it carries no billing authority. Only the account
              that pays can invite or revoke seats.
            </p>
            <p>
              Need more than {RESEARCH_PLAN.totalSeats}?{' '}
              <Link href="/contact" className="text-cyan-400 underline hover:text-cyan-300">
                Talk to us
              </Link>{' '}
              and we will quote the seat count you need.
            </p>
          </div>
        </section>

        {/* Price */}
        <section aria-labelledby="price" className="mb-10">
          <h2 id="price" className="text-2xl font-bold text-white mb-4">
            Price
          </h2>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6">
            <p className="text-3xl font-bold text-white">
              ${availability.plan.priceYearly.toLocaleString()}
              <span className="text-base font-normal text-slate-400"> / year</span>
            </p>
            <p className="text-sm text-slate-300 mt-2">
              Billed annually, invoiced with your billing address and tax ID.
              {availability.plan.totalSeats} named seats included. No trial &mdash;
              the 14-day trial on this site is a Professional trial, and we do not
              pretend otherwise.
            </p>
            <div className="mt-5">
              <ResearchCheckoutButton
                priceYearly={availability.plan.priceYearly}
                totalSeats={availability.plan.totalSeats}
              />
            </div>
          </div>
        </section>

        <p className="text-sm text-slate-400">
          Already a subscriber?{' '}
          <Link href="/research/workspace" className="text-cyan-400 underline hover:text-cyan-300">
            Open the Research workspace
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
