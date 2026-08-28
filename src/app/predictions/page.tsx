import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

// Public front door to Space Tycoon's Prediction Exchange (2026-08-28).
// The board itself lived only inside the game UI, behind sign-in. A casual
// space fan wants to answer "will Starship fly this window?" — so the open
// questions are public, shareable, and one click from staking. Game
// currency only; questions are generated from and resolved against our own
// tracked launch data (src/lib/game/prediction-exchange.ts).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Launch Predictions: Will It Fly This Window? | Space Tycoon',
  description: 'Open prediction questions on real upcoming launches and space stocks — Starship, Falcon 9, New Glenn and more. Stake game credits in Space Tycoon; resolved against live launch data.',
  alternates: { canonical: 'https://spacenexus.us/predictions' },
  openGraph: { title: 'Launch Predictions — Will It Fly This Window?', description: 'Real launches, real outcomes, game stakes. Open questions from the Space Tycoon Prediction Exchange.', type: 'website' },
};

type Option = { id: string; label: string };

function fmt(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
}

export default async function PredictionsPage() {
  const now = new Date();
  const [open, resolved, stakeCounts] = await Promise.all([
    prisma.predictionQuestion.findMany({
      where: { outcomeOptionId: null, closesAt: { gt: now } },
      orderBy: { closesAt: 'asc' },
      take: 30,
      select: { id: true, question: true, options: true, category: true, closesAt: true, sourceHref: true },
    }),
    prisma.predictionQuestion.findMany({
      where: { NOT: { resolvedAt: null } },
      orderBy: { resolvedAt: 'desc' },
      take: 10,
      select: { id: true, question: true, options: true, outcomeOptionId: true, resolvedAt: true, category: true },
    }),
    prisma.predictionStake.groupBy({ by: ['questionId'], _count: { _all: true } }).catch(() => [] as Array<{ questionId: string; _count: { _all: number } }>),
  ]);
  const stakes = new Map(stakeCounts.map((s) => [s.questionId, s._count._all]));

  return (
    <div className="min-h-screen pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-slate-500 pt-8 mb-6">
          <Link href="/" className="hover:text-white/80">Home</Link><span>/</span>
          <Link href="/space-tycoon" className="hover:text-white/80">Space Tycoon</Link><span>/</span>
          <span className="text-slate-400">Predictions</span>
        </nav>
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Will it fly this window?</h1>
          <p className="text-lg text-white/70 leading-relaxed max-w-2xl">
            Real launches, real outcomes, game stakes. Every question below is generated from the live manifest and
            settled against what actually happened. Stake Space Tycoon credits on your call — a correct stake pays 2×.
            No real money, ever.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link href="/space-tycoon" className="btn-primary text-sm py-2 px-4">Play — stake your call</Link>
            <Link href="/mission-control" className="btn-secondary text-sm py-2 px-4">Watch the launches</Link>
          </div>
        </header>

        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Open now · {open.length}</h2>
          {open.length === 0 ? (
            <p className="card p-6 text-slate-400 text-sm">No open questions right now — new ones post as launches enter their windows.</p>
          ) : (
            <div className="space-y-3">
              {open.map((q) => {
                const opts = (q.options as unknown as Option[]) ?? [];
                const n = stakes.get(q.id) ?? 0;
                return (
                  <div key={q.id} className="card p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] uppercase tracking-wider">
                      <span className="px-2 py-0.5 rounded border bg-cyan-500/10 text-cyan-300 border-cyan-500/30">{q.category}</span>
                      <span className="text-slate-500">closes {fmt(q.closesAt)}</span>
                      {n > 0 && <span className="text-slate-500">· {n} stake{n === 1 ? '' : 's'}</span>}
                    </div>
                    <h3 className="text-base font-semibold text-white mb-3">{q.question}</h3>
                    <div className="flex flex-wrap gap-2">
                      {opts.map((o) => (
                        <Link key={o.id} href={`/space-tycoon?tab=predictions&q=${q.id}`} className="px-3 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] text-sm text-white hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-colors">
                          {o.label}
                        </Link>
                      ))}
                      {q.sourceHref && <Link href={q.sourceHref} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white self-center">Track it →</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {resolved.length > 0 && (
          <section className="mb-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Recently settled</h2>
            <div className="space-y-2">
              {resolved.map((q) => {
                const opts = (q.options as unknown as Option[]) ?? [];
                const win = opts.find((o) => o.id === q.outcomeOptionId);
                return (
                  <div key={q.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-sm text-slate-300">{q.question}</span>
                    <span className="text-xs font-semibold text-emerald-300 whitespace-nowrap">{win?.label ?? '—'}{q.resolvedAt ? ` · ${fmt(q.resolvedAt)}` : ''}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-2">How it works</h2>
          <ul className="text-sm text-slate-400 space-y-1.5 list-disc pl-5">
            <li>Questions are generated automatically from launches and stock snapshots the site already tracks — never hand-picked, never fabricated.</li>
            <li>Stakes use Space Tycoon credits from your corporation&apos;s wallet. There is nothing to buy; credits are earned in the game.</li>
            <li>Resolution is automatic against the tracked outcome. A correct stake pays 2×; the ledger is public on your corporation page.</li>
          </ul>
          <p className="text-xs text-slate-500 mt-4">Part of <Link href="/space-tycoon" className="text-cyan-400 hover:text-cyan-300">Space Tycoon</Link>, the economic strategy MMO. Read the <Link href="/space-tycoon/faq" className="text-cyan-400 hover:text-cyan-300">no-pay-to-win policy</Link>.</p>
        </section>
        <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Space Tycoon', href: '/space-tycoon' }, { name: 'Predictions' }]} />
      </div>
    </div>
  );
}
