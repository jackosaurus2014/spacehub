import Link from 'next/link';
import type { Metadata } from 'next';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import { formatMoney } from '@/lib/game/formulas';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { getPublicLeaderboard, getPublicCorporationCount } from '@/lib/game/public-leaderboard';

// Public, crawlable snapshot of the live Space Tycoon leaderboard — no login
// required. Data is fetched directly via prisma (not the client-facing
// /api/space-tycoon/leaderboard route) so this page can be server-rendered
// for SEO. Refreshed at most every 5 minutes.
// Rendered per-request: Railway's build container has no database access, so
// build-time prerendering (ISR) fails the deploy. The top-50 query is cheap.
export const dynamic = 'force-dynamic';

const PAGE_URL = `${APP_URL}/space-tycoon/leaderboard`;
const PAGE_TITLE = 'Space Tycoon Leaderboard — Top Corporations';
const PAGE_DESCRIPTION =
  'See the top-ranked corporations in Space Tycoon, SpaceNexus’s free multiplayer space economy game. Live net worth rankings, corporation tiers, and alliances — no login required.';

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

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default async function PublicLeaderboardPage() {
  const [entries, totalCorporations] = await Promise.all([
    getPublicLeaderboard(50),
    getPublicCorporationCount(),
  ]);

  return (
    <div className="min-h-screen bg-black text-white">
      <GameStyles />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link href="/space-tycoon" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            &larr; Space Tycoon
          </Link>
          <h1 className="game-heading text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
            Galactic Leaderboard
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            {totalCorporations.toLocaleString()} corporations are competing across the solar system right now.
            Top {entries.length} by net worth, updated live.
          </p>
          <div>
            <Link
              href="/space-tycoon"
              className="game-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
            >
              🚀 Build your space empire
            </Link>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="hud-frame game-panel overflow-hidden" role="table" aria-label="Top 50 Space Tycoon corporations by net worth">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center gap-3 bg-white/[0.03] px-3 sm:px-4 py-2.5" role="row">
            <span className="game-label w-12" role="columnheader">Rank</span>
            <span className="game-label flex-1" role="columnheader">Corporation</span>
            <span className="game-label hidden sm:block w-28" role="columnheader">Alliance</span>
            <span className="game-label text-right" role="columnheader">Net Worth</span>
          </div>
          <div>
            {entries.length === 0 && (
              <p className="px-4 py-8 text-center text-slate-500 text-sm">
                No corporations have registered yet. Be the first.
              </p>
            )}
            {entries.map((entry) => {
              const tierDef = getTierDef(entry.tier);
              return (
                <Link
                  key={entry.id}
                  href={`/space-tycoon/corp/${entry.id}`}
                  role="row"
                  className="holo-row flex items-center gap-3 border-t border-white/[0.04] px-3 sm:px-4 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="w-12 flex items-center" role="cell">
                    {RANK_MEDAL[entry.rank] ? (
                      <span className="text-xl" title={`Rank #${entry.rank}`} aria-hidden="true">{RANK_MEDAL[entry.rank]}</span>
                    ) : (
                      <span className="game-number text-slate-500 text-xs">#{entry.rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0" role="cell">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{entry.companyName}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full border font-bold"
                        style={{ color: tierDef.color, borderColor: `${tierDef.color}55`, backgroundColor: `${tierDef.color}14` }}
                      >
                        {tierDef.icon} {tierDef.name}
                      </span>
                      {entry.title && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {entry.title}
                        </span>
                      )}
                    </div>
                    {entry.allianceTag && (
                      <span className="sm:hidden text-[10px] text-slate-500">[{entry.allianceTag}] {entry.allianceName}</span>
                    )}
                  </div>
                  <div className="hidden sm:block w-28 text-xs text-slate-400 truncate" role="cell">
                    {entry.allianceTag ? `[${entry.allianceTag}]` : '—'}
                  </div>
                  <div className="text-right" role="cell">
                    <span className="game-number text-sm text-cyan-300">{formatMoney(entry.netWorth)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <p className="text-slate-600 text-[11px] text-center">
          Rankings reflect every registered Space Tycoon corporation, ordered by in-game net worth. Company names are
          player-chosen and already visible in-game to all players. Updated every few minutes.{' '}
          <Link href="/space-tycoon" className="text-cyan-500 hover:underline">Start your own corporation &rarr;</Link>
        </p>
        <p className="text-slate-600 text-[11px] text-center">
          <Link href="/space-tycoon/registry" className="text-cyan-500 hover:underline">Corporate Registry &rarr;</Link>{' '}
          — player-published quarterly reports.
        </p>
      </div>
    </div>
  );
}
