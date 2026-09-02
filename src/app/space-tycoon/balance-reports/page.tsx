import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { BALANCE_REPORTS } from '@/lib/game/balance-reports';

// Public index of the quarterly economic balance reports — the "balance
// review cadence" commitment in docs/POLICY.md, shown rather than asserted.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Tycoon Balance Reports — Quarterly Economic Health',
  description: 'The quarterly public balance reports for Space Tycoon: corporate net worth, inequality (Gini), price stability, flagship paybacks, NPC market share and what is watched next — every figure sourced to the simulation or the live world.',
  alternates: { canonical: 'https://spacenexus.us/space-tycoon/balance-reports' },
  openGraph: { title: 'Space Tycoon Balance Reports', description: 'Quarterly public economic health reports for the Space Tycoon economy.', type: 'website' },
};

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function BalanceReportsIndexPage() {
  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="container mx-auto px-4 py-8 pb-16 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/space-tycoon" className="hover:text-white/80">Space Tycoon</Link><span>/</span>
          <span className="text-slate-400">Balance reports</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Balance reports</h1>
          <p className="text-slate-400">
            Every quarter we publish how the economy is doing: median corporate net worth, inequality, price stability, the distribution of profit and loss, and what we are watching. Every figure is sourced to the balance simulation or the live world, and where something cannot be measured yet the report says so. This is the &ldquo;balance review cadence&rdquo; commitment in the <Link href="/space-tycoon/about" className="text-cyan-400 hover:text-cyan-300">public policy</Link>.
          </p>
        </header>
        <ol className="space-y-6">
          {BALANCE_REPORTS.map((r) => (
            <li key={r.slug} className="card p-5">
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
                <time dateTime={r.publishedAt}>{formatDate(r.publishedAt)}</time>
                <span className="px-1.5 py-0.5 rounded border border-white/[0.08] text-slate-400">{r.quarter}</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                <Link href={`/space-tycoon/balance-reports/${r.slug}`} className="hover:text-cyan-300">{r.title}</Link>
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-3">{r.summary}</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                {r.headlines.map((h) => (
                  <div key={h.label} className="flex items-start gap-2 text-sm">
                    <span className="mt-2 w-1 h-1 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" />
                    <div>
                      <dt className="text-slate-500 text-xs">{h.label} <span className="text-slate-600">({h.source})</span></dt>
                      <dd className="text-slate-300">{h.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <Link href={`/space-tycoon/balance-reports/${r.slug}`} className="text-sm text-cyan-400 hover:text-cyan-300">Read the full report →</Link>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500 mt-8">
          Related: <Link href="/space-tycoon/dev-log" className="text-cyan-400 hover:text-cyan-300">Dev log</Link> · <Link href="/space-tycoon/about" className="text-cyan-400 hover:text-cyan-300">About Space Tycoon</Link> · <Link href="/space-tycoon/leaderboard" className="text-cyan-400 hover:text-cyan-300">Leaderboard</Link>.
        </p>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Tycoon', href: '/space-tycoon' }, { name: 'Balance reports' }]} />
      </div>
    </div>
  );
}
