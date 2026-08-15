'use client';

import { formatMoney } from '@/lib/game/formulas';
import type { OperationsDebrief } from '@/lib/game/debrief';
import { BG_ASSETS } from '@/lib/game/assets';
import { playSound } from '@/lib/game/sound-engine';
import { useModalA11y } from './useModalA11y';

/**
 * OperationsDebriefModal — Live-Service Wave LS2 "Operations Debrief"
 * (docs/LIVE_SERVICE_2026-08.md §LS2 mechanic 1). Replaces WelcomeBackModal
 * as the return-moment presentation: a multi-section digest built from
 * debrief.ts's assembleOperationsDebrief (LS1's AwayLedger + world deltas),
 * tiered by away-duration —
 *
 *   toast   (<30 min):  a small dismissible strip, non-blocking
 *   compact (30m-3d):   the full section modal, standard chrome
 *   full    (3d+):      the same modal, plus a cinematic art/title band that
 *                        reuses CinematicOverlay's .cinematic-* CSS classes
 *                        (GameStyles.tsx) — already prefers-reduced-motion
 *                        safe, so this component needs no motion logic of
 *                        its own.
 *
 * Always ends with up to 3 one-tap recommended actions (debrief.nextActions)
 * — the spec's required close for the return-moment retention beat.
 */

interface OperationsDebriefModalProps {
  debrief: OperationsDebrief;
  onDismiss: () => void;
  onNavigate: (tab: string) => void;
}

function ResourceChips({ resourcesDelta }: { resourcesDelta: Record<string, number> }) {
  const entries = Object.entries(resourcesDelta).filter(([, qty]) => qty > 0).sort(([, a], [, b]) => b - a).slice(0, 4);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {entries.map(([id, qty]) => (
        <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
          {id.replace(/_/g, ' ')}: +{qty.toLocaleString()}
        </span>
      ))}
    </div>
  );
}

export default function OperationsDebriefModal({ debrief, onDismiss, onNavigate }: OperationsDebriefModalProps) {
  const modalRef = useModalA11y<HTMLDivElement>(onDismiss);

  if (debrief.tier === 'toast') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,26rem)] rounded-xl border border-cyan-500/25 bg-[#0a0a1a]/95 backdrop-blur-sm px-4 py-3 shadow-lg game-modal-card"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0" aria-hidden="true">🌙</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold">
              Away {debrief.timeAwayLabel} —
              <span className={debrief.moneyDelta >= 0 ? ' text-green-400' : ' text-red-400'}> {debrief.moneyDelta >= 0 ? '+' : ''}{formatMoney(debrief.moneyDelta)}</span>
            </p>
            {debrief.queueExecuted.length > 0 && (
              <p className="text-slate-400 text-[11px] mt-0.5">{debrief.queueExecuted.length} queued order{debrief.queueExecuted.length === 1 ? '' : 's'} auto-started.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-slate-500 hover:text-white text-xs shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  const cinematic = debrief.cinematic;

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="debrief-title">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm game-modal-backdrop" aria-hidden="true" />

      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl game-modal-card hud-frame"
        style={{ background: 'linear-gradient(180deg, #0f1530 0%, #0a0a1a 100%)' }}
      >
        {/* Header — cinematic art band for the 'full' tier, plain gradient bar otherwise */}
        {cinematic ? (
          <div className="relative h-40 overflow-hidden cinematic-overlay" aria-hidden="true">
            <div className="cinematic-art absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${BG_ASSETS.starfield})` }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(10,10,26,0.55) 65%, rgba(10,10,26,1) 100%)' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 px-4 text-center">
              <span className="text-3xl mb-1">🌙</span>
              <h3 id="debrief-title" className="cinematic-title font-hud text-lg sm:text-xl font-black uppercase text-cyan-300" style={{ textShadow: '0 0 20px rgba(34,211,238,0.8)' }}>
                Operations Debrief
              </h3>
              <p className="cinematic-subtitle text-slate-300 text-xs mt-1">Away for {debrief.timeAwayLabel}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500" aria-hidden="true" />
            <div className="pt-5 px-6 text-center">
              <span className="text-3xl block mb-2" aria-hidden="true">🌙</span>
              <h3 id="debrief-title" className="text-lg font-bold text-white">Operations Debrief</h3>
              <p className="text-slate-400 text-xs mt-1">
                Your empire ran for <span className="text-white font-medium">{debrief.timeAwayLabel}</span> while you were away.
              </p>
            </div>
          </>
        )}

        <div className="p-5 space-y-3">
          {/* Economy */}
          <div className={`rounded-xl p-4 border ${debrief.moneyDelta >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <p className={`text-2xl font-bold font-mono ${debrief.moneyDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {debrief.moneyDelta >= 0 ? '+' : ''}{formatMoney(debrief.moneyDelta)}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              Net while away — {debrief.efficiencyLabel} ({(debrief.efficiencyPct * 100).toFixed(0)}% efficiency)
            </p>
            <ResourceChips resourcesDelta={debrief.resourcesDelta} />
          </div>

          {/* Completed / directives */}
          {(debrief.queueExecuted.length > 0 || debrief.queueSkipped.length > 0 || debrief.directiveFeesCharged > 0) && (
            <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3 text-left space-y-1">
              <p className="text-cyan-300 text-xs font-semibold uppercase tracking-wide">Completed while away</p>
              {debrief.queueExecuted.length > 0 && (
                <p className="text-slate-300 text-xs">🌙 {debrief.queueExecuted.length} queued order{debrief.queueExecuted.length === 1 ? '' : 's'} auto-started: {debrief.queueExecuted.map(q => q.label).slice(0, 3).join(', ')}{debrief.queueExecuted.length > 3 ? '…' : ''}</p>
              )}
              {debrief.queueSkipped.length > 0 && (
                <p className="text-amber-400 text-xs">⚠ {debrief.queueSkipped.length} queued order{debrief.queueSkipped.length === 1 ? '' : 's'} couldn't start.</p>
              )}
              {debrief.directiveActionsSummary.slice(0, 3).map((a, i) => (
                <p key={i} className="text-slate-400 text-[11px]">{a}</p>
              ))}
              {debrief.directiveFeesCharged > 0 && (
                <p className="text-slate-400 text-[11px]">🤖 Standing directives: -{formatMoney(debrief.directiveFeesCharged)} ops overhead</p>
              )}
            </div>
          )}

          {/* Hazards */}
          {debrief.hazardsApplied.length > 0 && (
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 text-left space-y-1">
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wide">Hazards weathered</p>
              {debrief.hazardsApplied.slice(0, 4).map((h, i) => (
                <p key={i} className="text-slate-300 text-[11px]">⚠ {h.summary}</p>
              ))}
            </div>
          )}

          {/* World events */}
          {debrief.worldEvents.length > 0 && (
            <div className="rounded-xl bg-purple-500/5 border border-purple-500/20 p-3 text-left space-y-1">
              <p className="text-purple-300 text-xs font-semibold uppercase tracking-wide">While you were gone</p>
              {debrief.worldEvents.map((e, i) => (
                <p key={i} className="text-slate-300 text-[11px]">{e.icon} {e.label}</p>
              ))}
            </div>
          )}

          {/* Returning Commander */}
          {debrief.isLapsedReturn && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-left space-y-1">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide">🎖 Returning Commander</p>
              <p className="text-slate-200 text-xs">
                Welcome back after {debrief.lapseDays} day{debrief.lapseDays === 1 ? '' : 's'}. You received a {formatMoney(debrief.reentryStipend)} re-entry stipend and a decaying earnings boost.
              </p>
              <p className="text-slate-400 text-[11px]">Complete this week's objectives from the Dashboard to make the most of it.</p>
            </div>
          )}

          {/* Next actions */}
          {debrief.nextActions.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest text-center">Recommended next</p>
              {debrief.nextActions.map(action => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => { playSound('click'); onNavigate(action.tab); onDismiss(); }}
                  className="w-full text-left rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] px-3 py-2 transition-colors"
                >
                  <p className="text-white text-xs font-semibold">{action.label}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{action.reason}</p>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => { playSound('milestone'); onDismiss(); }}
            className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 rounded-xl transition-all mt-2"
          >
            Continue
          </button>

          <p className="text-slate-600 text-[10px] text-center">
            No time cap — longer absences run at a lower rate. Automation research, ops techs, and standing directives raise your away-efficiency ceiling.
          </p>
        </div>
      </div>
    </div>
  );
}
