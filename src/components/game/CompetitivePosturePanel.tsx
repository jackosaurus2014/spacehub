'use client';

// ─── Competitive Posture readout (PvP Discoverability pass, 2026-08) ───────
//
// The compact "where do I stand against the field, and what could I do about
// it right now" strip. Renders next to the Situation Log (Reports → Log) and
// at the head of the Markets hub, because those are the two places a player
// is already thinking about rivals.
//
// Every line is derived from real synced state by competitive-posture.ts.
// When there is nothing honest to say, this panel SAYS SO ("the field is
// quiet") rather than manufacturing urgency — that quiet state is the whole
// reason the honesty rule exists.
//
// Not a nag:
//   • Collapsible, and the collapsed preference persists (localStorage).
//   • Renders nothing at all for a Protected Frontier corporation or during
//     the FTUE chain (deriveCompetitivePosture refuses to be eligible).
//   • Signals are capped at MAX_COMPETITIVE_SIGNALS by the derivation.
//
// Accessibility: a real <section> with a heading, a native disclosure button
// with aria-expanded, 44px targets, status words rather than colour-only
// state, and no animation beyond the browser default.

import { useEffect, useMemo, useState } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import { deriveCompetitivePosture } from '@/lib/game/competitive-posture';
import { requestSubView } from '@/lib/game/sub-view';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from './GameIcon';
import { Concept } from './HoloTip';

const COLLAPSE_KEY = 'spacetycoon_posture_collapsed';

interface Props {
  state: GameState;
  onNavigate: (tab: GameTab) => void;
  /** Compact mode drops the outer framing (used inside another panel). */
  compact?: boolean;
}

export default function CompetitivePosturePanel({ state, onNavigate, compact }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true'); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const posture = useMemo(
    () => deriveCompetitivePosture(state, { nowMs: now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.demandPools, state.laborMarket, state.marketSnapshot, state.orbitalSlotOccupancy,
      state.orbitalSlotLeases, state.offense, state.corporationTier, state.frontierStatus,
      state.completedResearch, state.tutorialStep, now],
  );

  if (!posture.eligible) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    playSound('click');
    try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* private mode */ }
  };

  const offenseTools = posture.availableTools.filter(t => t.posture === 'Offense');

  const body = (
    <div className="space-y-2.5">
      {posture.quiet ? (
        <p className="text-[11px] text-slate-400 leading-relaxed">
          The field is quiet. No rival holds a commanding share of a market you supply, the crew
          market is not tight, no orbital pool you operate in is saturated, and nobody is running
          an economic operation against you.{' '}
          {offenseTools.length > 0
            ? `You currently hold ${offenseTools.length} offensive ${offenseTools.length === 1 ? 'tool' : 'tools'} you have not needed to use — that is a fine place to be.`
            : 'Growing your own book is the whole job right now.'}
        </p>
      ) : (
        <>
          {posture.incoming.length > 0 && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/[0.04] p-2.5">
              <p className="text-[9px] uppercase tracking-wider font-bold text-red-300 mb-1">
                Operations running against you
              </p>
              <ul className="space-y-1">
                {posture.incoming.map(a => (
                  <li key={a.id} className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-bold text-white">{a.label}.</span>{' '}
                    <button
                      type="button"
                      onClick={() => { if (a.subView) requestSubView(a.subView); onNavigate(a.tab); }}
                      className="underline decoration-dotted underline-offset-2 text-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                    >
                      Open the response view
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {posture.signals.length > 0 && (
            <ul className="space-y-1.5" role="list">
              {posture.signals.map(sig => (
                <li
                  key={sig.id}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5"
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5"><GameIcon name={sig.icon} size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status as a literal word — greyscale-safe. */}
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border border-white/15 text-slate-300">
                          {sig.statusLabel}
                        </span>
                        <span className="text-[11px] font-bold text-slate-100">{sig.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{sig.detail}</p>
                      <button
                        type="button"
                        onClick={() => { if (sig.subView) requestSubView(sig.subView); onNavigate(sig.tab); }}
                        className="mt-1.5 min-h-[36px] px-2.5 rounded-md text-[10px] font-bold border border-white/15 text-slate-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
                      >
                        Take me there
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {posture.availableTools.length > 0 && (
        <div className="pt-1 border-t border-white/[0.06]">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1.5">
            Competitive tools your corporation holds
          </p>
          <div className="flex flex-wrap gap-1.5">
            {posture.availableTools.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { if (t.subView) requestSubView(t.subView); onNavigate(t.tab); }}
                title={`${t.posture}: ${t.what}`}
                className="min-h-[36px] px-2 rounded-md text-[10px] font-semibold border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors flex items-center gap-1.5"
              >
                <GameIcon name={t.icon} size={12} />
                {t.name}
                <span className="text-[8px] uppercase tracking-wider text-slate-500">{t.posture}</span>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-600 mt-1.5">
            Using none of these is a valid strategy — solo growth stays fully viable. See{' '}
            <Concept id="price-campaign">price campaigns</Concept>,{' '}
            <Concept id="talent-poaching">talent poaching</Concept> and{' '}
            <Concept id="orbital-slot">orbital slots</Concept> for the full mechanics.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <section
      aria-labelledby="competitive-posture-heading"
      className={compact ? '' : 'rounded-xl border border-white/[0.08] bg-white/[0.015] p-3'}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3
          id="competitive-posture-heading"
          className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5"
        >
          <GameIcon name="swords" size={13} />
          Competitive Posture
        </h3>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="competitive-posture-body"
          className="min-h-[36px] px-2 text-[10px] uppercase tracking-wider text-slate-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded transition-colors"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>
      <div id="competitive-posture-body" hidden={collapsed}>
        {body}
      </div>
    </section>
  );
}
