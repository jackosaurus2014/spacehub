import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import GameIcon, { type GameIconGlow } from '@/components/game/GameIcon';
import { getSealedSeasonChronicle } from '@/lib/game/public-season-chronicle';

// Public, crawlable Season Chronicle page for one concluded season —
// Live-Service Wave LS7 (docs/LIVE_SERVICE_2026-08.md §LS7: "public read
// route + /space-tycoon/seasons/[n] archive page (SEO + acquisition like
// the public leaderboard)"). Server-rendered per request — Railway's build
// container has no DB access, so build-time prerendering fails the deploy
// (same gotcha as the leaderboard/registry/chronicle pages).
export const dynamic = 'force-dynamic';

// V1: shape (medal) + visible "#N" text always render together — color
// (RANK_GLOW) is reinforcement only, never the sole rank signal.
const RANK_GLOW: Record<number, GameIconGlow> = { 1: 'amber', 2: 'cyan', 3: 'purple' };

interface PageProps {
  params: Promise<{ n: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { n } = await params;
  const seasonNumber = parseInt(n, 10);
  const record = Number.isFinite(seasonNumber) ? await getSealedSeasonChronicle(seasonNumber) : null;

  const pageUrl = `${APP_URL}/space-tycoon/seasons/${n}`;
  const title = record
    ? `${record.title} Chronicle — Space Tycoon`
    : `Season ${n} — Space Tycoon Chronicle`;
  const description = record
    ? `${record.themeName} super-cycle. ${record.participantCount.toLocaleString()} corporations competed — see the final standings, alliance charter outcomes, and market history from Space Tycoon, SpaceNexus's free multiplayer space economy game.`
    : `Season ${n} of Space Tycoon's permanent Season Chronicle archive.`;

  return {
    title: `${title} | SpaceNexus`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: { title, description, url: pageUrl, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SeasonChroniclePage({ params }: PageProps) {
  const { n } = await params;
  const seasonNumber = parseInt(n, 10);
  if (!Number.isFinite(seasonNumber)) notFound();

  const record = await getSealedSeasonChronicle(seasonNumber);

  return (
    <div className="min-h-screen bg-black text-white">
      <GameStyles />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <Link href="/space-tycoon/leaderboard" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            &larr; Leaderboard
          </Link>
          <h1 className="game-heading text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-lime-300 to-cyan-300">
            {record ? record.title : `Season ${seasonNumber}`}
          </h1>
          {record && (
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {record.themeIcon} <span className="text-lime-300 font-medium">{record.themeName} Super-Cycle</span> &middot;{' '}
              {record.participantCount.toLocaleString()} corporation{record.participantCount !== 1 ? 's' : ''} competed
            </p>
          )}
          <div>
            <Link
              href="/space-tycoon"
              className="game-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
            >
              <GameIcon name="fleet" size={16} /> Build your space empire
            </Link>
          </div>
        </div>

        {!record ? (
          <div className="hud-frame game-panel relative text-center py-16 rounded-xl">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <p className="text-slate-400 text-sm">
              Season {seasonNumber} hasn&apos;t concluded yet, or its Chronicle hasn&apos;t been sealed.
              Check the <Link href="/space-tycoon/leaderboard" className="text-cyan-400 hover:text-cyan-300 underline">live leaderboard</Link> for the current standings.
            </p>
          </div>
        ) : (
          <>
            {/* Theme description */}
            <div className="hud-frame game-panel relative p-5 rounded-xl border border-lime-500/25 bg-lime-500/5">
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
              <h2 className="text-white text-sm font-bold mb-2">Economic Super-Cycle</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                {record.notableEvents[0] || record.themeName}
              </p>
              {record.themeHeadlines.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {record.themeHeadlines.map(h => (
                    <span key={h} className="px-2 py-1 rounded-full text-xs font-medium border border-white/10 bg-white/5 text-slate-300">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Top placements */}
            <div className="hud-frame game-panel overflow-hidden rounded-xl" role="table" aria-label={`Season ${seasonNumber} top placements`}>
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
              <div className="flex items-center gap-3 bg-white/[0.03] px-3 sm:px-4 py-2.5" role="row">
                <span className="game-label w-12" role="columnheader">Rank</span>
                <span className="game-label flex-1" role="columnheader">Corporation</span>
                <span className="game-label text-right" role="columnheader">Score</span>
              </div>
              {record.topPlacements.length === 0 ? (
                <p className="px-4 py-8 text-center text-slate-500 text-sm">No participants placed this season.</p>
              ) : (
                record.topPlacements.map(p => (
                  <div key={p.rank} role="row" className="flex items-center gap-3 px-3 sm:px-4 py-3 border-t border-white/5">
                    <span role="cell" className="w-12 flex items-center gap-1">
                      {RANK_GLOW[p.rank] ? <GameIcon name="medal" size={17} glow={RANK_GLOW[p.rank]} /> : null}
                      <span className="game-number text-sm">#{p.rank}</span>
                    </span>
                    <div role="cell" className="flex-1 min-w-0">
                      <span className="text-white font-medium truncate block">{p.companyName}</span>
                      {p.title && <span className="text-purple-400 text-xs">{p.title}</span>}
                    </div>
                    <span role="cell" className="text-right text-slate-300 font-mono text-sm">
                      {Math.round(p.totalScore).toLocaleString()} pts
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Alliance charter outcomes */}
            {record.allianceOutcomes.length > 0 && (
              <div className="hud-frame game-panel relative p-5 rounded-xl">
                <span className="hud-corner-bl" aria-hidden="true" />
                <span className="hud-corner-br" aria-hidden="true" />
                <h2 className="text-white text-sm font-bold mb-3">Alliance Charter Outcomes</h2>
                <div className="flex flex-wrap gap-2">
                  {record.allianceOutcomes.map((a, i) => (
                    <span
                      key={`${a.allianceTag}_${i}`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-teal-500/30 bg-teal-500/10 text-teal-300"
                    >
                      [{a.allianceTag}] {a.allianceName} &middot; {a.charterType} &middot; {a.grade || 'incomplete'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Season navigation */}
            <div className="flex items-center justify-between text-sm">
              {seasonNumber > 1 ? (
                <Link href={`/space-tycoon/seasons/${seasonNumber - 1}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  &larr; Season {seasonNumber - 1}
                </Link>
              ) : <span />}
              <Link href={`/space-tycoon/seasons/${seasonNumber + 1}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Season {seasonNumber + 1} &rarr;
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
