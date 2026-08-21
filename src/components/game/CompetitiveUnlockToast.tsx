'use client';

// ─── "These tools exist" (PvP Discoverability pass, 2026-08) ───────────────
//
// Announces a competitive tool ONCE, at the moment it becomes available,
// where the player is already looking. Deliberately NOT the full-screen
// LeaderMomentOverlay: that surface requires a named speaker, and there is no
// honest in-fiction speaker for "your corporation now qualifies to declare
// price campaigns" — attributing it to a faction leader would be inventing an
// attribution, which this pass is not allowed to do. This is a briefing card,
// so it can also carry what the tool COSTS, when it is RATIONAL, and a button
// that lands on the verb itself.
//
// Anti-nag contract:
//   • One card at a time; the queue is drained by the page, one per dismissal.
//   • Fires exactly once per tool, ever (persistence lives in
//     competitive-posture.reconcileToolAnnouncements + the optional
//     GameState.seenCompetitiveTools field — NOT in this component).
//   • Never auto-dismisses into nothing: it stays until acknowledged, because
//     it is information the player asked for by unlocking the thing.
//   • Never rendered mid-FTUE or for a Protected Frontier corporation — the
//     derivation refuses to produce it in either case.
//
// Accessibility: role="dialog" is deliberately NOT used — this is a
// non-modal, non-blocking announcement, so it must not steal focus or trap
// it. It is an aria-live region with a real heading, reachable in normal tab
// order, dismissible with Escape while focus is inside it, and every piece of
// meaning is a word (the "Offense / Defense / Intelligence" posture chip),
// never a colour.

import { useEffect, useRef } from 'react';
import type { CompetitiveToolDef } from '@/lib/game/competitive-posture';
import { requestSubView } from '@/lib/game/sub-view';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from './GameIcon';
import { Concept } from './HoloTip';

interface Props {
  tool: CompetitiveToolDef | null;
  onDismiss: () => void;
  onNavigate: (tab: string) => void;
}

const POSTURE_FRAME: Record<CompetitiveToolDef['posture'], string> = {
  Offense: 'border-amber-500/30',
  Defense: 'border-emerald-500/30',
  Intelligence: 'border-cyan-500/30',
};

export default function CompetitiveUnlockToast({ tool, onDismiss, onNavigate }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const seenIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tool) return;
    if (seenIdRef.current === tool.id) return;
    seenIdRef.current = tool.id;
    playSound('milestone');
  }, [tool]);

  useEffect(() => {
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const root = rootRef.current;
      if (root && root.contains(document.activeElement)) {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool, onDismiss]);

  if (!tool) return null;

  const go = () => {
    if (tool.subView) requestSubView(tool.subView);
    onNavigate(tool.tab);
    onDismiss();
  };

  return (
    <div
      ref={rootRef}
      className="fixed z-[60] bottom-3 left-1/2 -translate-x-1/2 w-[calc(100vw-1.5rem)] max-w-md sm:left-auto sm:right-4 sm:translate-x-0 sm:bottom-4 animate-reveal-up"
      role="status"
      aria-live="polite"
      aria-label="New competitive tool available"
    >
      <div
        className={`rounded-xl overflow-hidden border ${POSTURE_FRAME[tool.posture]} shadow-2xl`}
        style={{ background: 'var(--bg-elevated, #0a0a1a)' }}
      >
        <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-white/[0.08] bg-white/[0.03]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <GameIcon name="sparkle" size={12} />
            Now available to your corporation
          </span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Dismiss the ${tool.name} briefing`}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
          >
            <GameIcon name="close" size={14} />
          </button>
        </div>

        <div className="px-3.5 py-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <GameIcon name={tool.icon} size={20} />
            <h3 className="text-sm font-bold text-white font-hud">
              {tool.conceptId ? <Concept id={tool.conceptId}>{tool.name}</Concept> : tool.name}
            </h3>
            {/* The posture is a WORD, and the border colour above merely
                echoes it — greyscale and screen readers lose nothing. */}
            <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-white/15 text-slate-300">
              {tool.posture}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-300 mb-2">{tool.what}</p>

          <dl className="space-y-1.5 mb-3">
            <div>
              <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">What it costs</dt>
              <dd className="text-[11px] text-slate-400 leading-relaxed">{tool.cost}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">When it is worth it</dt>
              <dd className="text-[11px] text-slate-400 leading-relaxed">{tool.whenRational}</dd>
            </div>
            <div>
              <dt className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">What the other side can do</dt>
              <dd className="text-[11px] text-slate-400 leading-relaxed">{tool.counterplay}</dd>
            </div>
          </dl>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={go}
              className="flex-1 min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-white/[0.08] border border-white/20 text-white hover:bg-white/[0.14] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
            >
              Show me where
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="min-h-[44px] px-3 rounded-lg text-[11px] font-semibold text-slate-400 border border-white/10 hover:text-white hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
            >
              Not now
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-2">
            Shown once. You are never required to use any of this — solo play stays fully viable.
          </p>
        </div>
      </div>
    </div>
  );
}
