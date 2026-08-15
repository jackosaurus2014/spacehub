import Link from 'next/link';
import type { Metadata } from 'next';
import { APP_URL } from '@/lib/constants';
import GameStyles from '@/components/game/GameStyles';
import {
  assembleEpochAddress,
  getCurrentRealignmentEpoch,
  getEpochWindow,
  POSTURE_BAND_MIN,
  POSTURE_BAND_MAX,
  type FactionPosture,
  type FactionTrend,
} from '@/lib/game/realignment';
import { FACTION_MAP } from '@/lib/game/factions';

// Public, crawlable Realignment / Epoch Address surface — Live-Service Wave
// LS9 (docs/LIVE_SERVICE_2026-08.md §LS9). Unlike the Chronicle/Registry
// pages, this one needs NO database at all: every value is a pure function
// of the wall clock (realignment.ts's header explains why). Still
// force-dynamic so the page never gets frozen into a stale build-time epoch.
export const dynamic = 'force-dynamic';

const PAGE_URL = `${APP_URL}/space-tycoon/epoch`;
const PAGE_TITLE = 'The Realignment — Space Tycoon Epoch Address';
const PAGE_DESCRIPTION =
  'Space Tycoon’s quarterly world-state address: which faction is ascendant, which is retreating, and how every faction’s posture shifted this epoch — the game’s public roadmap and changelog surface.';

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | SpaceNexus`,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: PAGE_URL, type: 'website' },
  twitter: { card: 'summary_large_image', title: PAGE_TITLE, description: PAGE_DESCRIPTION },
};

const TREND_ICON: Record<FactionTrend, string> = { ascendant: '▲', retreating: '▼', stable: '▬' };
const TREND_LABEL: Record<FactionTrend, string> = { ascendant: 'Ascendant', retreating: 'Retreating', stable: 'Stable' };
// Colorblind-safe: trend is ALWAYS paired with the glyph + text label above,
// never conveyed by color alone (CLAUDE.md accessibility invariant).
const TREND_ACCENT: Record<FactionTrend, string> = {
  ascendant: 'text-emerald-300',
  retreating: 'text-amber-300',
  stable: 'text-slate-400',
};

function formatPct(mult: number): string {
  const pct = Math.round((mult - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function PostureRow({ posture }: { posture: FactionPosture }) {
  const def = FACTION_MAP.get(posture.factionId);
  if (!def) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm ${TREND_ACCENT[posture.trend]}`} aria-hidden="true">{TREND_ICON[posture.trend]}</span>
        <span className={`text-sm font-semibold truncate ${def.theme.accent}`}>{def.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wide ${TREND_ACCENT[posture.trend]} bg-white/5`}>
          {TREND_LABEL[posture.trend]}
        </span>
      </div>
      <div className="flex items-center gap-4 text-[11px] text-slate-400 shrink-0">
        <span>Contracts <span className="game-number text-slate-200 font-mono">{formatPct(posture.contractGenerosityMultiplier)}</span></span>
        <span>Tariffs <span className="game-number text-slate-200 font-mono">{formatPct(posture.tariffStanceMultiplier)}</span></span>
        <span className="hidden sm:inline">Focus <span className="text-slate-300">{posture.procurementFocus.replace(/_/g, ' ')}</span></span>
      </div>
    </div>
  );
}

export default function EpochAddressPage() {
  const currentEpoch = getCurrentRealignmentEpoch();
  const current = assembleEpochAddress(currentEpoch);
  const nextWindow = getEpochWindow(currentEpoch + 1);
  const bandPct = Math.round((POSTURE_BAND_MAX - 1) * 100);
  const bandMinPct = Math.round((POSTURE_BAND_MIN - 1) * 100);

  const archive = [];
  for (let i = 1; i <= 3; i++) {
    const epochIndex = currentEpoch - i;
    if (epochIndex < 0) break;
    archive.push(assembleEpochAddress(epochIndex));
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <GameStyles />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div className="text-center space-y-3">
          <Link href="/space-tycoon" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
            &larr; Space Tycoon
          </Link>
          <h1 className="game-heading text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300">
            The Realignment
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Every ~90 real days the political-economic map shifts. Faction postures move within a published
            ±{bandPct}% band, driven by the epoch&rsquo;s aggregate Accord Senate outcomes and economic seasons —
            never by fiat, never beyond the band shown below.
          </p>
        </div>

        {/* Current Epoch Address */}
        <div className="hud-frame game-panel relative rounded-xl p-5" style={{ background: '#0a0a1a' }}>
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h2 className="font-hud text-lg font-bold text-cyan-300">{current.title}</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 uppercase tracking-wide">
              Live now
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {current.lines.map((line, i) => (
              <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
            ))}
          </div>
          <div className="text-[11px] text-slate-500 mb-4">
            Published band this epoch: <span className="game-number text-slate-300">{bandMinPct}% to +{bandPct}%</span> —
            next Realignment <span className="game-number text-slate-300">{new Date(nextWindow.startMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>.
          </div>
          <div>
            <h3 className="text-[11px] font-hud text-slate-500 uppercase tracking-wide mb-1">Faction postures this epoch</h3>
            {current.postures.map(p => <PostureRow key={p.factionId} posture={p} />)}
          </div>
        </div>

        {/* Archive */}
        {archive.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-hud text-slate-500 uppercase tracking-wide">Recent epochs</h2>
            {archive.map(entry => (
              <div key={entry.epochIndex} className="hud-frame relative rounded-lg p-4 border border-white/10" style={{ background: '#0a0a1a' }}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-200">{entry.title}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(entry.publishedAtMs).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{entry.lines[0]}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/space-tycoon"
            className="game-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm transition-colors"
          >
            🚀 Build your space empire
          </Link>
        </div>
      </div>
    </div>
  );
}
