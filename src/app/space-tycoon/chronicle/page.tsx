import Link from 'next/link';
import type { Metadata } from 'next';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import GameIcon from '@/components/game/GameIcon';
import { resolveIcon, type IconName } from '@/lib/game/icons';
import { getRecentChronicleEntries, getPublishedChronicleCount } from '@/lib/game/public-era-chronicle';
import { ERA_CHARTER_MAP } from '@/lib/game/corporate-eras';
import { ERA_MEDAL_LABEL } from '@/lib/game/corp-era-registry';

// V1: shape-distinct medal (medal vs medal-outline), color is reinforcement
// — same pattern as CorporateEraPanel.tsx's MEDAL_ICON.
const MEDAL_ICON: Record<string, IconName> = {
  platinum: 'medal', gold: 'medal', silver: 'medal', bronze: 'medal', filed: 'medal-outline',
};

// Public, crawlable listing of player-published Corporate Eras — Live-Service
// Wave LS4 (docs/LIVE_SERVICE_2026-08.md §LS4). Opt-in only, mirroring the
// Corporate Registry pattern exactly (see the "Publish to the Chronicle"
// action in the game's Era Charters panel). Server-rendered per request —
// Railway's build container has no DB access, so build-time prerendering
// fails the deploy (same gotcha as the leaderboard/registry pages).
export const dynamic = 'force-dynamic';

const PAGE_URL = `${APP_URL}/space-tycoon/chronicle`;
const PAGE_TITLE = 'Corporate Chronicle — Space Tycoon Eras';
const PAGE_DESCRIPTION =
  'The permanent, public record of chartered eras from Space Tycoon, SpaceNexus’s free multiplayer space economy game — 90-day corporate mandates, medals, and the history each corporation writes for itself.';

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

export default async function CorporateChroniclePage() {
  const [entries, totalCount] = await Promise.all([
    getRecentChronicleEntries(30),
    getPublishedChronicleCount(),
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
          <h1 className="game-heading text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-purple-300">
            Corporate Chronicle
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            {totalCount.toLocaleString()} chartered era{totalCount !== 1 ? 's' : ''} published to the permanent
            record — 90-day corporate mandates, the medal each one earned, and the history every corporation writes
            for itself, one era at a time.
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

        {/* Chronicle list */}
        {entries.length === 0 ? (
          <div className="hud-frame game-panel relative text-center py-16 rounded-xl">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="mb-3 flex justify-center"><GameIcon name="governance" size={40} /></div>
            <h2 className="font-hud text-lg font-semibold text-white mb-1">No Eras Chronicled Yet</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Corporations at Tier 3+ charter 90-day eras from the Governance tab. When one completes, publish it
              here from the Era Charters panel to be the first on the Chronicle.
            </p>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Published corporate eras">
            {entries.map((entry) => {
              const charter = ERA_CHARTER_MAP.get(entry.era.charterId);
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold flex items-center gap-1 shrink-0">
                          <GameIcon name={MEDAL_ICON[entry.era.medal] || 'medal'} size={11} /> {ERA_MEDAL_LABEL[entry.era.medal]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                        {charter ? (
                          <span className="inline-flex items-center gap-1"><GameIcon name={resolveIcon(charter.icon, 'governance')} size={11} /> {charter.name}</span>
                        ) : entry.era.charterId} · Era {entry.era.eraIndex + 1} ·
                        {' '}Published {formatPublishedDate(entry.publishedAt)}
                      </p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-slate-400 font-bold shrink-0">
                      Bracket {entry.era.bracketAtStart}
                    </span>
                  </div>

                  {charter && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      {charter.goalLabel}: {Math.round(entry.era.goalActual).toLocaleString()} / {Math.round(entry.era.goalTarget).toLocaleString()}
                    </p>
                  )}

                  {entry.era.notableEvents.length > 0 && (
                    <p className="mt-1 text-[11px] text-slate-400 truncate">
                      {entry.era.notableEvents.slice(0, 2).join(' · ')}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        <p className="text-slate-600 text-[11px] text-center">
          Eras are published voluntarily by corporation commanders from the in-game Era Charters panel. Company
          names and event titles are player-chosen.{' '}
          <Link href="/space-tycoon/registry" className="text-cyan-500 hover:underline">
            See the Corporate Registry &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
