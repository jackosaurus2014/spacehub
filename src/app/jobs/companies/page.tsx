import type { Metadata } from 'next';
import Link from 'next/link';
import { getJobsByCompany } from '@/lib/jobs-by-company';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

/**
 * /jobs/companies (2026-09-12): every employer with live space-industry
 * roles, ranked by open positions, linking to the filtered board and the
 * company profile. An indexable entry point for "<company> jobs" searches
 * and an internal-link hub for the board, which is days old and has no
 * search impressions yet.
 */
export const revalidate = 1800;

export async function generateMetadata(): Promise<Metadata> {
  let n = 0; let total = 0;
  try { const d = await getJobsByCompany(); n = d.rows.length; total = d.totalActive; } catch { /* static fallback */ }
  const title = n ? `Space Companies Hiring Now: ${n} Employers, ${total.toLocaleString('en-US')} Open Roles` : 'Space Companies Hiring Now';
  const description = 'Every space and aerospace company with open positions on the SpaceNexus jobs board, ranked by live roles: SpaceX, Blue Origin, Rocket Lab, Lockheed Martin, Northrop Grumman and hundreds more. Synced daily from company careers pages.';
  return { title, description, alternates: { canonical: 'https://spacenexus.us/jobs/companies' }, openGraph: { title, description, type: 'website' } };
}

export default async function JobsByCompanyPage() {
  const data = await getJobsByCompany().catch(() => ({ rows: [], totalActive: 0, asOf: new Date() }));
  const top = data.rows.slice(0, 12);
  const rest = data.rows.slice(12);
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <nav className="hidden md:block text-sm text-slate-500 mb-4"><Link href="/jobs" className="hover:text-white">Jobs</Link> / Companies hiring</nav>
        <h1 className="text-3xl font-bold text-white">Space companies hiring now</h1>
        <p className="text-slate-400 mt-2 max-w-3xl">
          {data.rows.length.toLocaleString('en-US')} employers with {data.totalActive.toLocaleString('en-US')} open roles, synced from company careers pages and updated daily. Click a company for its live listings, or see <Link href="/guide/space-industry-salaries" className="text-cyan-300 hover:underline">what these roles pay</Link>.
        </p>

        {top.length > 0 && (
          <section className="mt-8" aria-labelledby="top-heading">
            <h2 id="top-heading" className="text-lg font-semibold text-white mb-3">Largest employers on the board</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {top.map((c) => (
                <li key={c.name} className="card p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/jobs?company=${encodeURIComponent(c.name)}`} className="text-white font-semibold hover:text-cyan-300 block truncate">{c.name}</Link>
                    <div className="text-xs text-slate-500 mt-0.5">{c.remoteCount > 0 ? `${c.remoteCount} remote-friendly` : 'On site'}{c.slug ? <> · <Link href={`/company-profiles/${c.slug}`} className="text-cyan-300 hover:underline">Profile</Link></> : null}</div>
                  </div>
                  <div className="text-right"><div className="text-xl font-semibold text-white tabular-nums">{c.activeCount.toLocaleString('en-US')}</div><div className="text-[11px] text-slate-500">open roles</div></div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {rest.length > 0 && (
          <section className="mt-10" aria-labelledby="all-heading">
            <h2 id="all-heading" className="text-lg font-semibold text-white mb-3">All companies hiring ({data.rows.length.toLocaleString('en-US')})</h2>
            <ul className="columns-1 sm:columns-2 lg:columns-3 gap-6 text-sm">
              {rest.map((c) => (
                <li key={c.name} className="break-inside-avoid flex items-baseline justify-between gap-2 py-1 border-b border-white/[0.05]">
                  <Link href={`/jobs?company=${encodeURIComponent(c.name)}`} className="text-slate-200 hover:text-cyan-300 truncate">{c.name}</Link>
                  <span className="text-slate-500 tabular-nums">{c.activeCount}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.rows.length === 0 && <p className="mt-8 text-slate-400">The board is refreshing; check back in a few minutes.</p>}

        <section className="mt-12 card p-5 text-sm">
          <h2 className="text-white font-semibold mb-1">Hiring for a space role?</h2>
          <p className="text-slate-400">Post directly on SpaceNexus from $125, collect applications here, and pin your listing above the {data.totalActive.toLocaleString('en-US')} synced roles. <Link href="/hire" className="text-cyan-300 hover:underline">See employer plans</Link>.</p>
        </section>
        <p className="text-xs text-slate-500 mt-6">Counts are live as of {data.asOf.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })} UTC. Listings mirror each company&apos;s own careers page.</p>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Jobs', href: '/jobs' }, { name: 'Companies hiring' }]} />
      </div>
    </div>
  );
}
