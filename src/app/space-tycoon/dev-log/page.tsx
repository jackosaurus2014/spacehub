import type { Metadata } from 'next';
import Link from 'next/link';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { GAME_DEVLOG, DEVLOG_TAG_LABEL } from '@/lib/game/devlog';

// Public dev log: the "live-service" claim, shown rather than asserted.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Space Tycoon Dev Log — What Changed and Why',
  description: 'The running record of Space Tycoon updates: economy changes, balance passes, world epochs and content waves, dated and explained.',
  alternates: { canonical: 'https://spacenexus.us/space-tycoon/dev-log' },
  openGraph: { title: 'Space Tycoon Dev Log', description: 'Economy changes, balance passes, world epochs and content waves — dated and explained.', type: 'website' },
};

export default function SpaceTycoonDevLogPage() {
  return (
    <div className="min-h-screen bg-[#050510]">
      <div className="container mx-auto px-4 py-8 pb-16 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/space-tycoon" className="hover:text-white/80">Space Tycoon</Link><span>/</span>
          <span className="text-slate-400">Dev log</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dev log</h1>
          <p className="text-slate-400">What changed in the game, when, and why. Economy changes are called out because in this game the economy is the content.</p>
        </header>
        <ol className="space-y-6">
          {GAME_DEVLOG.map((e) => (
            <li key={e.date + e.title} className="card p-5">
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
                <time dateTime={e.date}>{new Date(e.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time>
                <span className="px-1.5 py-0.5 rounded border border-white/[0.08] text-slate-400">{DEVLOG_TAG_LABEL[e.tag]}</span>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">{e.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-3">{e.summary}</p>
              <ul className="space-y-1.5">
                {e.changes.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-slate-400"><span className="mt-2 w-1 h-1 rounded-full bg-cyan-400 flex-shrink-0" aria-hidden="true" />{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="text-xs text-slate-500 mt-8">Design principles and public policy: <Link href="/space-tycoon/about" className="text-cyan-400 hover:text-cyan-300">About Space Tycoon</Link> · <Link href="/space-tycoon/faq" className="text-cyan-400 hover:text-cyan-300">FAQ</Link> · quarterly <Link href="/space-tycoon/balance-reports" className="text-cyan-400 hover:text-cyan-300">balance reports</Link>.</p>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Tycoon', href: '/space-tycoon' }, { name: 'Dev log' }]} />
      </div>
    </div>
  );
}
