import Link from 'next/link';

const PUBLISHED_REPORTS = [
  {
    slug: 'space-economy-2026',
    title: 'The Space Economy in 2026',
    description:
      'Comprehensive breakdown of the $630B+ current global space economy: market sizing by sector and region, profiles of the top 50 space companies, investment trends, the regulatory landscape, and growth projections toward $1.8T by 2035.',
    tag: 'Annual Report',
    year: '2026',
  },
  {
    slug: 'state-of-space-2026',
    title: 'State of the Space Industry 2026',
    description:
      'A comprehensive, data-driven analysis of today\'s $630B+ space economy — projected to reach $1.8 trillion by 2035. Market sizing, funding trends, launch data, satellite deployments, and forecasts across every major segment.',
    tag: 'Free Report',
    year: '2026',
  },
  {
    slug: 'monthly',
    title: 'State of Space — Monthly Industry Report',
    description:
      'The monthly State of Space report: launch activity, funding trends, market movers, regulatory developments, technology milestones, and the month ahead. Refreshed automatically each month.',
    tag: 'Monthly',
    year: 'Updated monthly',
  },
];

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-2">
            SpaceNexus Intelligence
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Industry Reports
          </h1>
          <p className="text-slate-400 max-w-2xl">
            In-depth research reports on the space industry — market sizing, company
            landscapes, investment trends, and regulatory developments. Published by the
            SpaceNexus research team.
          </p>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 gap-6">
          {PUBLISHED_REPORTS.map((report) => (
            <Link
              key={report.slug}
              href={`/reports/${report.slug}`}
              className="group block rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all p-6 md:p-8"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide bg-white/10 text-slate-300 px-2.5 py-1 rounded">
                  {report.tag}
                </span>
                <span className="text-xs text-slate-500">{report.year}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-2 group-hover:text-slate-200">
                {report.title}
              </h2>
              <p className="text-slate-400 text-sm md:text-base mb-4">
                {report.description}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-white/80 group-hover:text-white">
                Read the report
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </span>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h3 className="text-lg font-semibold text-white mb-2">More research</h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Looking for company-by-company scorecards? Check out{' '}
            <Link href="/report-cards" className="text-slate-200 underline hover:text-white">
              Report Cards
            </Link>
            . For live data, explore{' '}
            <Link href="/market-intel" className="text-slate-200 underline hover:text-white">
              Market Intelligence
            </Link>{' '}
            or browse the{' '}
            <Link href="/company-profiles" className="text-slate-200 underline hover:text-white">
              Company Directory
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
