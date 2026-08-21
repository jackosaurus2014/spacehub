'use client';

// ─── "Someone is doing it to me" (PvP Discoverability pass, 2026-08) ───────
//
// M5 shipped victim telemetry, but its only surface was a Situation Log row
// on the Reports tab — a player who never opens Reports could lose a 48-hour
// counteroffer window without the game ever putting it in front of them. A
// log entry is the right permanent record; it is NOT an adequate alert for an
// attack with a clock on it.
//
// This layer is that alert: a persistent, high-contrast banner anchored under
// the resource bar, rendered from competitive-posture.deriveIncomingAttacks
// (which reads the same sync-delivered offense snapshot the Situation Log
// does — no new state, no new mechanic, no new network call).
//
// Copy discipline: the counterplay text is the MEASURED one from
// docs/BALANCE.md Pass 8 Q3/Q5 — spreading into an uncrowded market beat
// every alternative in every simulated era, mothballing was a −19% net-worth
// trap for a small miner, and retaliating with the same tools cost the
// defender ($1.35B) more than the aggressor ($265M). The alert must not
// imply otherwise.
//
// Not a nag: each alert is dismissible and the dismissal persists per
// attack id, the record stays in the Situation Log either way, and nothing
// renders at all for a Protected Frontier corporation (it cannot be targeted)
// or during the FTUE chain.
//
// Accessibility: role="alert" + aria-live="assertive" ONLY for the 'act'
// urgency (a running decision window); 'aware' items are polite. Urgency is
// carried as a literal word, the countdown as text, and every control is a
// 44px keyboard-reachable target.

import { useEffect, useMemo, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { deriveIncomingAttacks, type IncomingAttack } from '@/lib/game/competitive-posture';
import { isOnboardingActive } from '@/lib/game/onboarding';
import { requestSubView } from '@/lib/game/sub-view';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from './GameIcon';

const DISMISS_KEY = 'spacetycoon_dismissed_attack_alerts';
/** Refresh cadence for the countdown text. Text only — no animation, so this
 *  costs nothing on a phone and is unaffected by reduced-motion. */
const TICK_MS = 30_000;
/** Never stack more than this — an alert wall is a nag. */
const MAX_VISIBLE = 2;

function readDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'closing now';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

const KIND_ICON: Record<IncomingAttack['kind'], 'workforce' | 'trending-down' | 'market' | 'fleet'> = {
  poach: 'workforce',
  price_campaign: 'trending-down',
  cornering: 'market',
  toll: 'fleet',
};

interface Props {
  state: GameState;
  onNavigate: (tab: string) => void;
}

export default function CompetitiveAlertLayer({ state, onNavigate }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [announcedIds, setAnnouncedIds] = useState<string[]>([]);

  useEffect(() => { setDismissed(readDismissed()); }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const attacks = useMemo(
    () => (isOnboardingActive(state) ? [] : deriveIncomingAttacks(state, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.offense, state.resources, state.activeServices, state.frontierStatus, state.tutorialStep, now],
  );

  const visible = attacks.filter(a => !dismissed.includes(a.id)).slice(0, MAX_VISIBLE);

  // One audible ack the first time a given attack appears. Sound is
  // reinforcement only — the banner text is the record.
  useEffect(() => {
    const fresh = visible.filter(a => !announcedIds.includes(a.id));
    if (fresh.length === 0) return;
    playSound('notification');
    setAnnouncedIds(ids => [...ids, ...fresh.map(a => a.id)]);
  }, [visible.map(a => a.id).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = Array.from(new Set([...dismissed, id])).slice(-50);
    setDismissed(next);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };

  return (
    <div className="px-2 sm:px-4 pt-2 space-y-2">
      {visible.map(a => {
        const urgent = a.urgency === 'act';
        return (
          <div
            key={a.id}
            role={urgent ? 'alert' : 'status'}
            aria-live={urgent ? 'assertive' : 'polite'}
            className={`rounded-xl border p-3 ${
              urgent
                ? 'border-red-500/40 bg-red-500/[0.07]'
                : 'border-amber-500/30 bg-amber-500/[0.05]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5"><GameIcon name={KIND_ICON[a.kind]} size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                  {/* Meaning as a WORD first — never colour alone. */}
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/20 text-white">
                    {urgent ? 'Decision required' : 'Under economic attack'}
                  </span>
                  {a.respondByMs !== undefined && (
                    <span className="text-[10px] font-hud text-slate-300">
                      {formatCountdown(a.respondByMs - now)}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-white leading-snug">{a.label}</p>
                <p className="text-[11px] text-slate-300 leading-relaxed mt-1">{a.detail}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (a.subView) requestSubView(a.subView);
                      onNavigate(a.tab);
                    }}
                    className="min-h-[44px] px-3 rounded-lg text-[11px] font-bold bg-white/[0.1] border border-white/25 text-white hover:bg-white/[0.16] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
                  >
                    {urgent ? 'Respond now' : 'Open the market view'}
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(a.id)}
                    className="min-h-[44px] px-3 rounded-lg text-[11px] font-semibold text-slate-400 border border-white/10 hover:text-white hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 mt-1.5">
                  Dismissing hides this banner only — the entry stays in your Situation Log.
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
