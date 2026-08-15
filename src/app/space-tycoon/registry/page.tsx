import Link from 'next/link';
import type { Metadata } from 'next';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import GameIcon from '@/components/game/GameIcon';
import { formatMoney } from '@/lib/game/formulas';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { getRecentRegistryReports, getPublishedReportCount } from '@/lib/game/public-registry';

// Public, crawlable listing of player-published quarterly corporate reports.
// Opt-in only — see the "Publish to the SpaceNexus Corporate Registry"
// button in the game's Quarterly Reports panel (ReportsPanel.tsx). Server-
// rendered per request (Railway's build container has no DB access, so
// build-time prerendering fails the deploy — same gotcha as the leaderboard).
export const dynamic = 'force-dynamic';

const PAGE_URL = `${APP_URL}/space-tycoon/registry`;
const PAGE_TITLE = 'Corporate Registry — Space Tycoon Quarterly Reports';
const PAGE_DESCRIPTION =
  'Player-published quarterly corporate reports from Space Tycoon, SpaceNexus’s free multiplayer space economy game — revenue, profit, net worth, and notable events, opt-in and public.';

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | SpaceNexus`,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

function formatPublishedDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default async function CorporateRegistryPage() {
  const [entries, totalCount] = await Promise.all([
    getRecentRegistryReports(30),
    getPublishedReportCount(),
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <GameStyles />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link href="/space-tycoon/leaderboard" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            &larr; Leaderboard
          </Link>
          <h1 className="game-heading text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
            Corporate Registry
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            {totalCount.toLocaleString()} quarterly report{totalCount !== 1 ? 's' : ''} published by Space Tycoon
            corporations, opt-in and public — revenue, profit, net worth, and notable events straight from the
            in-game ledger.
          </p>
          <div>
            <Link
              href="/space-tycoon"
              className="game-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
            >
              <GameIcon name="fleet" size={16} /> Build your space empire
            </Link>
          </div>
        </div>

        {/* Registry list */}
        {entries.length === 0 ? (
          <div className="hud-frame game-panel relative text-center py-16 rounded-xl">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="mb-3 flex justify-center"><GameIcon name="reports" size={40} /></div>
            <h2 className="font-hud text-lg font-semibold text-white mb-1">No Reports Published Yet</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Corporations publish their own quarterly reports from the Reports panel in-game. Be the first on the
              registry.
            </p>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Published quarterly corporate reports">
            {entries.map((entry) => {
              const tierDef = getTierDef(entry.report.corporationTier);
              const positive = entry.report.growthRatePct !== null && entry.report.growthRatePct >= 0;
              return (
                <Link
                  key={entry.id}
                  href={`/space-tycoon/corp/${entry.corpId}`}
                  role="listitem"
                  className="hud-frame game-panel holo-row relative block rounded-xl p-4 hover:bg-white/[0.03] transition-colors"
                >
                  <span className="hud-corner-bl" aria-hidden="true" />
                  <span className="hud-corner-br" aria-hidden="true" />
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-white truncate">{entry.corpName}</h2>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full border font-bold shrink-0"
                          style={{ color: tierDef.color, borderColor: `${tierDef.color}55`, backgroundColor: `${tierDef.color}14` }}
                        >
                          {tierDef.icon} {tierDef.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {entry.quarterLabel} · Published {formatPublishedDate(entry.publishedAt)}
                      </p>
                    </div>
                    {entry.report.growthRatePct !== null && (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                          positive
                            ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                            : 'text-red-300 border-red-500/30 bg-red-500/10'
                        }`}
                      >
                        <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
                        {positive ? '+' : ''}
                        {entry.report.growthRatePct.toFixed(1)}%
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Revenue</p>
                      <p className="game-number text-emerald-300 text-sm font-bold">{formatMoney(entry.report.revenue)}</p>
                    </div>
                    <div className={`rounded-lg border p-2 ${entry.report.profit >= 0 ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Profit</p>
                      <p className={`game-number text-sm font-bold ${entry.report.profit >= 0 ? 'text-cyan-300' : 'text-amber-300'}`}>
                        {formatMoney(entry.report.profit)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-2">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Net Worth</p>
                      <p className="game-number text-purple-300 text-sm font-bold">{formatMoney(entry.report.netWorth)}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <p className="text-[9px] uppercase tracking-wider text-slate-500">Fleet / Buildings</p>
                      <p className="game-number text-white text-sm font-bold">
                        {entry.report.fleetCount} / {entry.report.buildingCount}
                      </p>
                    </div>
                  </div>

                  {entry.report.notableEvents.length > 0 && (
                    <p className="mt-2 text-[11px] text-slate-400 truncate">
                      {entry.report.notableEvents.slice(0, 2).join(' · ')}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <p className="text-slate-600 text-[11px] text-center">
          Reports are published voluntarily by corporation commanders from the in-game Reports panel. Company names
          and event titles are player-chosen.{' '}
          <Link href="/space-tycoon/leaderboard" className="text-cyan-500 hover:underline">
            See the full leaderboard &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
