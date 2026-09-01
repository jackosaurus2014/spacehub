'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '@/lib/game/formulas';
import type { GameState, GameTab } from '@/lib/game/types';
import { RESOURCE_MAP } from '@/lib/game/resources';
import type { ResourceId } from '@/lib/game/resources';
import { POACH_MIN_NET_WORTH } from '@/lib/game/talent-poaching';
import { FRONTIER_HARD_CAP_NET_WORTH } from '@/lib/game/frontier';
import { COMPETITIVE_TOOL_MAP } from '@/lib/game/competitive-posture';
import { requestSubView } from '@/lib/game/sub-view';
import { playSound } from '@/lib/game/sound-engine';
import PoachLauncher from './PoachLauncher';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RivalComparison {
  netWorthDiffPct: number;
  buildingDiffPct: number;
  researchDiffPct: number;
  serviceDiffPct: number;
  locationsDiffPct: number;
}

interface RivalData {
  companyName: string;
  netWorth: number;
  buildingCount: number;
  serviceCount: number;
  researchCount: number;
  locationsCount: number;
  growthPct: number;
}

interface RivalEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
}

interface RivalAssignment {
  assignmentId: string;
  weekId: number;
  status: string;
  score: number;
  scoreLabel: string;
  scoreColor: string;
  rival: RivalData;
  player: RivalData;
  comparison: RivalComparison;
  trend: number[];
  recentEvents: RivalEvent[];
  createdAt: string;
}

interface RivalsSummary {
  currentStreak: number;
  streakTitle: string | null;
  allTimeRecord: { wins: number; losses: number; draws: number };
  weekTimeRemainingMs: number;
  weekId: number;
}

interface HistoryWeek {
  weekId: number;
  rivals: {
    companyName: string;
    finalScore: number;
    result: string;
  }[];
}

interface RivalsResponse {
  rivals: RivalAssignment[];
  summary: RivalsSummary;
  history: HistoryWeek[];
}

// GET /api/space-tycoon/market/share?all=1 (market-share.ts) — the public
// free-tier top-5 per traded resource, which is how a rival's market share
// is looked up by company name (the rivals API exposes names, not ids).
interface ShareEntryView {
  profileId: string;
  companyName: string | null;
  isNpc: boolean;
  totalVolume: number;
  totalValue: number;
  sharePct: number;
}

interface ResourceShareView {
  resourceSlug: string;
  totalTradedValue: number;
  entries: ShareEntryView[];
}

interface LeversStatus {
  loaded: boolean;
  /** The player has filed at least one poach offer (any status). */
  poached: boolean;
  /** The player has an active price campaign right now (the campaign API
   *  lists active ones only — the closest public signal to "ever"). */
  campaigned: boolean;
}

const LEVERS_HINT_DISMISSED_KEY = 'spacetycoon_rivals_levers_hint_dismissed';

export interface RivalsPanelProps {
  /** Synced game state. Optional — the panel is self-fetching; when present
   *  the Frontier/offense gate uses the same predicate the posture strip
   *  does instead of the net-worth fallback. */
  state?: GameState;
  /** Top-level navigation, for the "declare a price campaign" lever. */
  onNavigate?: (tab: GameTab) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreBarColor(score: number): string {
  if (score >= 85) return 'from-green-500 to-green-400';
  if (score >= 65) return 'from-cyan-500 to-cyan-400';
  if (score >= 51) return 'from-cyan-500/70 to-cyan-400/70';
  if (score >= 36) return 'from-yellow-500/70 to-yellow-400/70';
  if (score >= 16) return 'from-orange-500 to-orange-400';
  return 'from-red-500 to-red-400';
}

function getScoreLabelColor(score: number): string {
  if (score >= 65) return 'text-cyan-300';
  if (score >= 51) return 'text-cyan-400/80';
  if (score === 50) return 'text-slate-300';
  if (score >= 36) return 'text-yellow-400/80';
  if (score >= 16) return 'text-orange-400';
  return 'text-red-400';
}

function getDiffColor(pct: number): string {
  if (pct > 5) return 'text-green-400';
  if (pct < -5) return 'text-red-400';
  return 'text-slate-400';
}

function getDiffArrow(pct: number): string {
  if (pct > 0) return '\u25B2';
  if (pct < 0) return '\u25BC';
  return '\u2500';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Rotating now...';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function trendChar(t: number): { char: string; color: string } {
  if (t > 0) return { char: '\u25B2', color: 'text-green-400' };
  if (t < 0) return { char: '\u25BC', color: 'text-red-400' };
  return { char: '\u2500', color: 'text-slate-600' };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function RivalsPanel({ state, onNavigate }: RivalsPanelProps = {}) {
  const [data, setData] = useState<RivalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  // Lever-discoverability pass (2026-09): market-share lookup is shared by
  // every rival card and fetched once, lazily, on the first "View their
  // market share" click.
  const [shareData, setShareData] = useState<ResourceShareView[] | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [levers, setLevers] = useState<LeversStatus>({ loaded: false, poached: false, campaigned: false });

  const loadShare = useCallback(async () => {
    if (shareData !== null || shareLoading) return;
    setShareLoading(true);
    try {
      const res = await fetch('/api/space-tycoon/market/share?all=1');
      const json = res.ok ? await res.json() : null;
      setShareData(Array.isArray(json?.resources) ? json.resources : []);
    } catch {
      setShareData([]);
    } finally {
      setShareLoading(false);
    }
  }, [shareData, shareLoading]);

  const fetchRivals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/space-tycoon/rivals');
      if (!res.ok) throw new Error('Failed to load rivals');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rivals');
    } finally {
      setLoading(false);
    }
  }, []);

  const assignRivals = useCallback(async () => {
    try {
      setAssigning(true);
      const res = await fetch('/api/space-tycoon/rivals/assign', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to assign rivals');
      // Refresh data after assignment
      await fetchRivals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign rivals');
    } finally {
      setAssigning(false);
    }
  }, [fetchRivals]);

  useEffect(() => {
    fetchRivals();
  }, [fetchRivals]);

  // Has this corporation ever pulled either offense lever? Both GETs are the
  // existing routes; nothing new is computed client-side.
  useEffect(() => {
    let cancelled = false;
    const myName = data?.rivals[0]?.player.companyName ?? state?.companyName ?? null;
    if (!data) return;
    Promise.all([
      fetch('/api/space-tycoon/poach').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/space-tycoon/market/campaign').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([poach, campaign]) => {
      if (cancelled) return;
      const outgoing = Array.isArray(poach?.outgoing) ? poach.outgoing : [];
      const campaigns = Array.isArray(campaign?.campaigns) ? campaign.campaigns : [];
      setLevers({
        loaded: true,
        poached: outgoing.length > 0,
        campaigned: !!myName && campaigns.some((c: { byCompanyName?: string }) => c.byCompanyName === myName),
      });
    });
    return () => { cancelled = true; };
  }, [data, state?.companyName]);

  // Auto-assign on first load if no rivals
  useEffect(() => {
    if (data && data.rivals.length === 0 && !assigning) {
      assignRivals();
    }
  }, [data, assigning, assignRivals]);

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <span className="sr-only">Loading rivals…</span>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="animate-pulse motion-reduce:animate-none space-y-4">
            <div className="h-6 bg-white/[0.06] rounded w-48" />
            <div className="h-4 bg-white/[0.04] rounded w-64" />
            <div className="h-32 bg-white/[0.04] rounded" />
            <div className="h-32 bg-white/[0.04] rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center" role="alert" aria-live="polite">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchRivals}
          className="mt-3 min-h-[44px] px-4 py-2 rounded-lg bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { rivals, summary, history } = data;

  // ─── No rivals state ───────────────────────────────────────────────────
  if (rivals.length === 0) {
    return (
      <div className="space-y-4">
        <div className="hud-frame game-panel-glow p-8 text-center">
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="text-4xl mb-3">{'\u2694\uFE0F'}</div>
          <h3 className="game-heading text-lg font-semibold text-white mb-2">
            No Rivals Yet
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Keep growing your company to get matched with shadow rivals.
            Rivals are assigned based on your Composite Power Score.
          </p>
          <button
            onClick={assignRivals}
            disabled={assigning}
            aria-live="polite"
            className="min-h-[44px] px-5 py-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-50"
          >
            {assigning ? 'Searching...' : 'Find Rivals'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main panel ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="hud-frame game-panel-glow p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="game-heading text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
              Shadow Rivals
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {rivals.length} rival{rivals.length !== 1 ? 's' : ''} assigned
              {' \u00B7 '}Refreshes in {formatCountdown(summary.weekTimeRemainingMs)}
            </p>
          </div>
          <div className="text-right">
            <p className="game-label">
              Week {summary.weekId}
            </p>
          </div>
        </div>
      </div>

      {/* Levers you haven't pulled — one-time, post-Frontier only. */}
      <LeversHintCard
        state={state}
        player={rivals[0].player}
        levers={levers}
        firstRivalName={rivals[0].rival.companyName}
        onNavigate={onNavigate}
      />

      {/* Rival Cards */}
      {rivals.map((rival, index) => (
        <RivalCard
          key={rival.assignmentId}
          rival={rival}
          index={index}
          state={state}
          shareData={shareData}
          shareLoading={shareLoading}
          loadShare={loadShare}
          onNavigate={onNavigate}
        />
      ))}

      {/* Weekly Summary */}
      <div className="hud-frame game-panel p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Weekly Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="game-label">
              Streak
            </p>
            <p className="game-number text-lg font-bold text-cyan-300">
              {summary.currentStreak}W
            </p>
            {summary.streakTitle && (
              <p className="text-[10px] text-indigo-400 mt-0.5">
                {summary.streakTitle}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="game-label">
              Wins
            </p>
            <p className="game-number text-lg font-bold text-green-400">
              {summary.allTimeRecord.wins}
            </p>
          </div>
          <div className="text-center">
            <p className="game-label">
              Losses
            </p>
            <p className="game-number text-lg font-bold text-red-400">
              {summary.allTimeRecord.losses}
            </p>
          </div>
          <div className="text-center">
            <p className="game-label">
              Draws
            </p>
            <p className="game-number text-lg font-bold text-slate-400">
              {summary.allTimeRecord.draws}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Events Feed */}
      {rivals.some((r) => r.recentEvents.length > 0) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Recent Events
          </h3>
          <div className="space-y-2">
            {rivals
              .flatMap((r) => r.recentEvents)
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .slice(0, 8)
              .map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 text-xs"
                >
                  <span
                    className={
                      event.type === 'rival_overtaken'
                        ? 'text-green-400'
                        : event.type === 'rival_passed_you'
                          ? 'text-red-400'
                          : event.type === 'rival_assigned'
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                    }
                  >
                    {event.type === 'rival_overtaken'
                      ? '\u25B2'
                      : event.type === 'rival_passed_you'
                        ? '\u25BC'
                        : event.type === 'rival_assigned'
                          ? '\u25C6'
                          : '\u25CF'}
                  </span>
                  <span className="text-slate-300 flex-1">
                    {event.description}
                  </span>
                  <span className="text-slate-600 whitespace-nowrap">
                    {formatTimeAgo(event.createdAt)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Last Week
          </h3>
          <div className="space-y-2">
            {history[0].rivals.map((hr, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-slate-300">{hr.companyName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-mono">
                    {hr.finalScore}/100
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hr.result === 'win'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : hr.result === 'loss'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}
                  >
                    {hr.result.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-slate-600 text-[10px] text-center">
        Shadow rivals are asynchronous pairings. Your rivals don&apos;t know
        they&apos;re being watched. Scores update every 4 hours.
      </p>
    </div>
  );
}

// ─── Levers hint card (lever-discoverability pass, 2026-09) ─────────────────
// Production telemetry: zero poach offers and zero price campaigns all-time.
// The verbs existed server-side and in two buried forms; nobody found them.
// This card shows ONCE, only past the Protected Frontier, only while the
// player has pulled neither lever, and dismisses permanently.

/** Post-Frontier and offense-qualified. With synced state this is the
 *  posture strip's own predicate; without it, the conservative net-worth
 *  fallback (above both the Frontier hard cap and the offense floor — the
 *  server enforces the real gate either way). */
function offenseEligible(state: GameState | undefined, playerNetWorth: number): boolean {
  if (state) {
    const tool = COMPETITIVE_TOOL_MAP.get('talent_poaching');
    return !!tool && tool.isAvailable(state, Date.now());
  }
  return playerNetWorth >= Math.max(POACH_MIN_NET_WORTH, FRONTIER_HARD_CAP_NET_WORTH);
}

function LeversHintCard({
  state, player, levers, firstRivalName, onNavigate,
}: {
  state?: GameState;
  player: RivalData;
  levers: LeversStatus;
  firstRivalName: string;
  onNavigate?: (tab: GameTab) => void;
}) {
  const [dismissed, setDismissed] = useState(true);
  const [poachOpen, setPoachOpen] = useState(false);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(LEVERS_HINT_DISMISSED_KEY) === 'true'); } catch { setDismissed(false); }
  }, []);

  if (dismissed || !levers.loaded || levers.poached || levers.campaigned) return null;
  if (!offenseEligible(state, player.netWorth)) return null;

  const dismiss = () => {
    playSound('click');
    try { localStorage.setItem(LEVERS_HINT_DISMISSED_KEY, 'true'); } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <section
      aria-labelledby="levers-hint-heading"
      className="hud-frame relative rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-4"
    >
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <h3 id="levers-hint-heading" className="text-sm font-semibold text-amber-200">
          Levers you haven&apos;t pulled
        </h3>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss this hint permanently"
          className="min-h-[44px] px-2 text-[10px] uppercase tracking-wider text-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
        >
          Got it
        </button>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
        You are out of the Protected Frontier and have never poached a rival&apos;s crew or declared a price
        campaign. Both are legitimate economic warfare — every rule is enforced by the server, every act lands on
        the public diplomacy feed, and using neither is a perfectly good strategy. They exist; now you know where.
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={() => { playSound('click'); setPoachOpen(v => !v); }}
          aria-expanded={poachOpen}
          aria-label={`Poach talent from ${firstRivalName}`}
          className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-200 hover:bg-amber-500/25 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
        >
          Poach talent from {firstRivalName}
        </button>
        {onNavigate ? (
          <button
            type="button"
            onClick={() => { playSound('click'); requestSubView('market:campaign'); onNavigate('market'); }}
            aria-label="Declare a price campaign — opens the order book campaign console"
            className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
          >
            Declare a price campaign
          </button>
        ) : (
          <span className="min-h-[44px] inline-flex items-center px-3 rounded-lg text-[11px] text-slate-300 border border-white/10">
            Price campaigns: Markets → Spot &amp; Orders → &ldquo;Declare price campaign&rdquo;
          </span>
        )}
      </div>
      {poachOpen && (
        <div className="mt-3">
          <PoachLauncher state={state} initialTargetName={firstRivalName} defaultOpen onClose={() => setPoachOpen(false)} />
        </div>
      )}
    </section>
  );
}

// ─── Rival Card Sub-Component ───────────────────────────────────────────────

function RivalCard({
  rival,
  index,
  state,
  shareData,
  shareLoading,
  loadShare,
  onNavigate,
}: {
  rival: RivalAssignment;
  index: number;
  state?: GameState;
  shareData: ResourceShareView[] | null;
  shareLoading: boolean;
  loadShare: () => void;
  onNavigate?: (tab: GameTab) => void;
}) {
  const [poachOpen, setPoachOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const name = rival.rival.companyName;
  const shareRows = (shareData || [])
    .map(r => ({ resourceSlug: r.resourceSlug, entry: r.entries.find(e => e.companyName === name) }))
    .filter((r): r is { resourceSlug: string; entry: ShareEntryView } => !!r.entry)
    .sort((a, b) => b.entry.sharePct - a.entry.sharePct);
  const poachId = `rival-poach-${rival.assignmentId}`;
  const shareId = `rival-share-${rival.assignmentId}`;

  return (
    <div className="hud-frame game-card rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      {/* Card Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="game-number text-[10px] text-slate-600">
              #{index + 1}
            </span>
            <span className="text-sm font-semibold text-white">
              {'\u25C6'} {rival.rival.companyName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="game-number text-slate-400">
              {formatMoney(rival.rival.netWorth)}
            </span>
            <span
              className={
                rival.rival.growthPct > 0
                  ? 'text-green-400'
                  : rival.rival.growthPct < 0
                    ? 'text-red-400'
                    : 'text-slate-500'
              }
            >
              {rival.rival.growthPct > 0 ? '\u25B2 +' : rival.rival.growthPct < 0 ? '\u25BC ' : '\u25CF '}
              {rival.rival.growthPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Rivalry Score Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
              {/* Score fill */}
              <div
                className={`game-progress-shimmer absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${getScoreBarColor(
                  rival.score,
                )} transition-all duration-500`}
                style={{ width: `${rival.score}%` }}
              />
              {/* Center marker */}
              <div className="absolute top-0 left-1/2 h-full w-px bg-white/20" />
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-[120px] justify-end">
            <span className="game-number text-xs text-white">
              {rival.score}/100
            </span>
            <span
              className={`text-[10px] ${getScoreLabelColor(rival.score)}`}
            >
              {rival.scoreLabel}
            </span>
          </div>
        </div>

        {/* Trend indicators */}
        {rival.trend.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[10px] text-slate-600 mr-1">Trend:</span>
            {rival.trend.map((t, i) => {
              const { char, color } = trendChar(t);
              return (
                <span key={i} className={`text-[10px] ${color}`}>
                  {char}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions — lever-discoverability pass (2026-09). Both verbs call the
          existing routes; the server enforces every gate. */}
      <div className="px-4 pb-3 flex flex-wrap gap-2" role="group" aria-label={`Actions against ${name}`}>
        <button
          type="button"
          onClick={() => { playSound('click'); setPoachOpen(v => !v); }}
          aria-expanded={poachOpen}
          aria-controls={poachId}
          aria-label={`Poach talent from ${name}`}
          className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
        >
          Poach talent
        </button>
        <button
          type="button"
          onClick={() => { playSound('click'); if (!shareOpen) loadShare(); setShareOpen(v => !v); }}
          aria-expanded={shareOpen}
          aria-controls={shareId}
          aria-label={`View ${name}'s market share`}
          className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
        >
          View their market share
        </button>
      </div>
      <div id={poachId} hidden={!poachOpen} className="px-4 pb-3">
        {poachOpen && (
          <PoachLauncher state={state} initialTargetName={name} defaultOpen onClose={() => setPoachOpen(false)} />
        )}
      </div>
      <div id={shareId} hidden={!shareOpen} className="px-4 pb-3">
        {shareOpen && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.03] p-3">
            <p className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold mb-1.5">{name} — traded market share</p>
            {shareData === null || shareLoading ? (
              <p className="text-[11px] text-slate-500" role="status">Loading market share…</p>
            ) : shareRows.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                {name} does not appear in the public top-5 of any traded market this window. Deeper intel is earned
                (espionage, paid reports), never free.
              </p>
            ) : (
              <table className="w-full text-[11px]" role="table" aria-label={`${name} market share by resource`}>
                <thead>
                  <tr className="text-slate-500 text-left">
                    <th scope="col" className="px-1 py-1 font-medium">Resource</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Share</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Volume</th>
                    <th scope="col" className="px-1 py-1 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {shareRows.map(r => (
                    <tr key={r.resourceSlug} className="border-t border-white/[0.05]">
                      <td className="px-1 py-1 text-white">{RESOURCE_MAP.get(r.resourceSlug as ResourceId)?.name || r.resourceSlug}</td>
                      <td className="px-1 py-1 text-right font-mono font-bold text-emerald-400">{r.entry.sharePct.toFixed(1)}%</td>
                      <td className="px-1 py-1 text-right font-mono text-slate-300">{r.entry.totalVolume.toLocaleString()}</td>
                      <td className="px-1 py-1 text-right font-mono text-slate-300">{formatMoney(r.entry.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {onNavigate && (
              <button
                type="button"
                onClick={() => { playSound('click'); requestSubView('market:analytics'); onNavigate('market'); }}
                className="mt-2 min-h-[44px] px-2.5 rounded-md text-[10px] font-bold border border-white/15 text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                Full market-share intelligence →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Comparison Metrics Grid */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricCompare
            label="Buildings"
            playerVal={rival.player.buildingCount}
            rivalVal={rival.rival.buildingCount}
            diffPct={rival.comparison.buildingDiffPct}
          />
          <MetricCompare
            label="Services"
            playerVal={rival.player.serviceCount}
            rivalVal={rival.rival.serviceCount}
            diffPct={rival.comparison.serviceDiffPct}
          />
          <MetricCompare
            label="Research"
            playerVal={rival.player.researchCount}
            rivalVal={rival.rival.researchCount}
            diffPct={rival.comparison.researchDiffPct}
          />
          <MetricCompare
            label="Locations"
            playerVal={rival.player.locationsCount}
            rivalVal={rival.rival.locationsCount}
            diffPct={rival.comparison.locationsDiffPct}
          />
        </div>

        {/* Net Worth Comparison Row */}
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs">
          <div className="text-slate-400">
            <span className="text-slate-500">You:</span>{' '}
            <span className="game-number text-white">
              {formatMoney(rival.player.netWorth)}
            </span>
            {rival.player.growthPct !== 0 && (
              <span
                className={
                  rival.player.growthPct > 0
                    ? 'text-green-400 ml-1'
                    : 'text-red-400 ml-1'
                }
              >
                ({rival.player.growthPct > 0 ? '+' : ''}
                {rival.player.growthPct.toFixed(1)}%)
              </span>
            )}
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">Them:</span>{' '}
            <span className="game-number text-white">
              {formatMoney(rival.rival.netWorth)}
            </span>
            {rival.rival.growthPct !== 0 && (
              <span
                className={
                  rival.rival.growthPct > 0
                    ? 'text-green-400 ml-1'
                    : 'text-red-400 ml-1'
                }
              >
                ({rival.rival.growthPct > 0 ? '+' : ''}
                {rival.rival.growthPct.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Comparison Sub-Component ────────────────────────────────────────

function MetricCompare({
  label,
  playerVal,
  rivalVal,
  diffPct,
}: {
  label: string;
  playerVal: number;
  rivalVal: number;
  diffPct: number;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-2 text-center">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-center justify-center gap-1.5 text-xs">
        <span className="game-number text-cyan-300">{playerVal}</span>
        <span className="text-slate-600">/</span>
        <span className="game-number text-slate-400">{rivalVal}</span>
      </div>
      <p className={`text-[10px] mt-0.5 ${getDiffColor(diffPct)}`}>
        {diffPct > 0 ? '+' : ''}
        {diffPct.toFixed(0)}% {getDiffArrow(diffPct)}
      </p>
    </div>
  );
}

// ─── Time Formatting ────────────────────────────────────────────────────────

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
