'use client';

// ─── Story Chapter banner (Live-Service Wave LS8) ───────────────────────────
// docs/LIVE_SERVICE_2026-08.md §LS8: "chapter banner/progress in the
// narrative/events surface." Self-contained, self-polling (same pattern as
// WorldEventsBanner/MissionCalendarPanel) — reads local save state for act
// progress (instant, no network needed) and polls the server-backed finale
// participation count for the "N corporations answered the call" readout
// and, once the finale window closes, hands the count to
// `onResolveEpilogue` so the caller can apply chapters.ts's
// resolveChapterEpilogue exactly once per chapter cycle.

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { CHAPTER_MAP, getCurrentChapterInstance } from '@/lib/game/chapters';
import { usePrefersReducedMotion } from '@/hooks/useWorldState';

const POLL_MS = 5 * 60 * 1000; // matches WorldEventsBanner/MissionCalendarPanel
const TICK_MS = 30 * 1000; // countdown refresh — text only, no animation

interface ChapterStatusResponse {
  success?: boolean;
  cycleIndex: number;
  chapterId: string;
  participationCount: number;
  finaleWindow: { startMs: number; endMs: number };
  finaleOpen: boolean;
  finaleClosed: boolean;
  hasParticipated: boolean;
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return 'now';
  const totalMinutes = Math.floor(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function StoryChapterBanner({
  state,
  onResolveEpilogue,
}: {
  state: GameState;
  /** Called (at most once per chapter cycle) once the finale window has
   *  closed and a real participation count is available — the caller
   *  applies chapters.ts's resolveChapterEpilogue and updates state. */
  onResolveEpilogue?: (participationCount: number) => void;
}) {
  const [status, setStatus] = useState<ChapterStatusResponse | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const reducedMotion = usePrefersReducedMotion();
  const resolvedCycleRef = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/space-tycoon/chapters');
        if (!res.ok) return;
        const json = (await res.json()) as ChapterStatusResponse;
        if (cancelled) return;
        setStatus(json);
      } catch {
        // Best-effort — the banner falls back to local-only countdown math
        // (getCurrentChapterInstance below) until the next successful poll.
      }
    }
    void poll();
    const interval = setInterval(() => { void poll(); }, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const cur = state.storyChapters?.current;
  const history = state.storyChapters?.history || [];

  // Resolve the epilogue exactly once per cycle, as soon as a real
  // participation count is available for a finale that's actually closed.
  useEffect(() => {
    if (!status || !onResolveEpilogue) return;
    if (!cur || cur.status !== 'active') return;
    if (!status.finaleClosed || status.cycleIndex !== cur.cycleIndex) return;
    const def = CHAPTER_MAP.get(cur.chapterId);
    if (!def || cur.actIndex < def.acts.length) return;
    if (cur.flags?.epilogueResolved) return;
    if (resolvedCycleRef.current === cur.cycleIndex) return;
    resolvedCycleRef.current = cur.cycleIndex;
    onResolveEpilogue(status.participationCount);
  }, [status, cur, onResolveEpilogue]);

  if (!cur) return null;
  const def = CHAPTER_MAP.get(cur.chapterId);
  if (!def) return null;

  const inst = getCurrentChapterInstance(nowMs);
  const finaleWindow = status && status.cycleIndex === cur.cycleIndex ? status.finaleWindow : inst.finaleWindow;
  const finaleOpen = status && status.cycleIndex === cur.cycleIndex ? status.finaleOpen : inst.finaleOpen;
  const finaleClosed = status && status.cycleIndex === cur.cycleIndex ? status.finaleClosed : inst.finaleClosed;
  const participationCount = status && status.cycleIndex === cur.cycleIndex ? status.participationCount : 0;

  const actsDone = Math.min(cur.actIndex, def.acts.length);
  const atFinale = cur.actIndex >= def.acts.length;

  let statusLine: string;
  if (cur.status === 'completed') {
    statusLine = 'Resolved — see the finale outcome in your event log.';
  } else if (finaleOpen) {
    statusLine = `Finale open now — closes in ${formatCountdown(finaleWindow.endMs - nowMs)}`;
  } else if (atFinale && finaleClosed) {
    statusLine = 'Finale window closed — awaiting resolution.';
  } else if (atFinale) {
    statusLine = `Finale opens in ${formatCountdown(finaleWindow.startMs - nowMs)}`;
  } else {
    statusLine = `Act ${cur.actIndex + 1} of ${def.acts.length} underway`;
  }

  const lastCompleted = history.length > 0 ? history[history.length - 1] : null;
  const progressPct = ((actsDone + (cur.status === 'completed' ? 1 : atFinale && finaleOpen ? 0.5 : 0)) / (def.acts.length + 1)) * 100;

  return (
    <div
      className={`relative rounded-lg px-3 py-2.5 hud-frame border border-violet-500/25 bg-violet-500/[0.03] ${reducedMotion ? '' : 'game-card'}`}
      role="status"
      aria-live="polite"
      aria-label={`Story Chapter: ${def.name}`}
    >
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center gap-2.5">
        <span className="text-lg shrink-0" aria-hidden="true">{def.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="game-label text-violet-300">Story Chapter</span>
            <span className="text-slate-200 text-sm font-semibold truncate">{def.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{statusLine}</div>
        </div>
        {participationCount > 0 && (
          <div className="text-[10px] text-violet-300 shrink-0 font-hud uppercase tracking-wide text-right">
            {participationCount} answered
          </div>
        )}
      </div>
      <div
        className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden mt-2"
        role="progressbar"
        aria-valuenow={Math.round(progressPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${def.name} progress`}
      >
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      {lastCompleted && (
        <div className="text-[10px] text-slate-500 italic mt-1.5">
          Last chapter — {lastCompleted.chapterName}: {lastCompleted.finaleSuccess ? 'Resolved' : 'Setback'}
        </div>
      )}
    </div>
  );
}
