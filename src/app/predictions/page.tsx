import type { Metadata } from 'next';
import Link from 'next/link';
import prisma from '@/lib/db';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { PredictionPicker, SettledPickBadge } from '@/components/predictions/PredictionPicker';

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

  // G12: leaderboard over SETTLED stakes only. Threshold-gated (10 settled
  // from 3+ corporations) so it never renders as an empty scoreboard.
  const leaderboard = await (async () => {
    try {
      const settledStakes = await prisma.predictionStake.findMany({
        where: { payout: { not: null } },
        select: { profileId: true, stake: true, payout: true },
      });
      const byProfile = new Map<string, { calls: number; wins: number; net: number }>();
      for (const s of settledStakes) {
        const e = byProfile.get(s.profileId) || { calls: 0, wins: 0, net: 0 };
        e.calls++;
        if ((s.payout ?? 0) > 0) e.wins++;
        e.net += (s.payout ?? 0) - s.stake;
        byProfile.set(s.profileId, e);
      }
      const unlocked = settledStakes.length >= 10 && byProfile.size >= 3;
      let rows: { profileId: string; name: string; calls: number; hitRate: number; net: number }[] = [];
      if (unlocked) {
        const ids = Array.from(byProfile.keys());
        const profiles = await prisma.gameProfile.findMany({ where: { id: { in: ids } }, select: { id: true, companyName: true } });
        const nameOf = new Map(profiles.map((p) => [p.id, p.companyName]));
        rows = Array.from(byProfile.entries())
          .map(([profileId, e]) => ({
            profileId,
            name: nameOf.get(profileId) || 'Unknown corporation',
            calls: e.calls,
            hitRate: Math.round((e.wins / e.calls) * 100),
            net: e.net,
          }))
          .sort((a, b) => b.net - a.net)
          .slice(0, 15);
      }
      return { unlocked, settled: settledStakes.length, rows };
    } catch {
      return { unlocked: false, settled: 0, rows: [] as { profileId: string; name: string; calls: number; hitRate: number; net: number }[] };
    }
  })();

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
            Real launches, real outcomes. Every question below is generated from the live manifest and settled against
            what actually happened. Make your call right here — no account needed — and, if you play Space Tycoon, back it
            with credits for a 2× payout. No real money, ever.
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
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Anyone can call it (no account); credits are staked in the game. */}
                      <PredictionPicker questionId={q.id} options={opts} stakeHref={`/space-tycoon?tab=predictions&q=${q.id}`} />
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
                    <span className="flex items-center gap-2 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                      <SettledPickBadge questionId={q.id} winningOptionId={q.outcomeOptionId} />
                      {win?.label ?? '—'}{q.resolvedAt ? ` · ${fmt(q.resolvedAt)}` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* G12 (2026-09-01): the leaderboard scaffold. Unlocks at a stated
            participation threshold instead of rendering an empty table —
            the empty state IS the invitation (same honesty pattern as
            /launch-slips and /hiring-trends). */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Predictor leaderboard</h2>
          {leaderboard.unlocked ? (
            <div className="card p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Top predictors by settled winnings</caption>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Corporation</th>
                    <th className="py-2 pr-3 text-right">Calls</th>
                    <th className="py-2 pr-3 text-right">Hit rate</th>
                    <th className="py-2 text-right">Net credits</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.rows.map((r, i) => (
                    <tr key={r.profileId} className="border-b border-white/[0.04]">
                      <td className="py-2 pr-3 font-mono text-slate-500">{i + 1}</td>
                      <td className="py-2 pr-3 text-white/90">{r.name}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{r.calls}</td>
                      <td className="py-2 pr-3 text-right font-mono tabular-nums text-slate-300">{r.hitRate}%</td>
                      <td className={`py-2 text-right font-mono tabular-nums ${r.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.net >= 0 ? `+${r.net.toLocaleString()}` : r.net.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-5 text-sm text-slate-400">
              <p>
                The leaderboard lights up once <span className="font-mono text-white">10</span> stakes from{' '}
                <span className="font-mono text-white">3+</span> corporations have settled —{' '}
                <span className="font-mono text-cyan-300">{leaderboard.settled}</span> settled so far. Every question
                above resolves against real launches; the first corporations to call them right will own this table.{' '}
                <Link href="/space-tycoon" className="text-cyan-300 hover:underline">Stake your first call →</Link>
              </p>
            </div>
          )}
        </section>

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
