'use client';

import { formatMoney } from '@/lib/game/formulas';
import type { AwayLedger } from '@/lib/game/types';
import { playSound } from '@/lib/game/sound-engine';
import { useModalA11y } from './useModalA11y';

interface WelcomeBackModalProps {
  earnings: AwayLedger;
  onCollect: () => void;
}

export default function WelcomeBackModal({ earnings, onCollect }: WelcomeBackModalProps) {
  const modalRef = useModalA11y<HTMLDivElement>(onCollect);
  const hours = Math.floor(earnings.timeAwayMs / 3600000);
  const minutes = Math.floor((earnings.timeAwayMs % 3600000) / 60000);
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const totalResources = Object.values(earnings.resourcesDelta).reduce((a, b) => a + b, 0);
  const topResources = Object.entries(earnings.resourcesDelta)
    .filter(([, qty]) => qty > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="welcome-back-title">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm game-modal-backdrop" aria-hidden="true" />

      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden game-modal-card" style={{ background: 'linear-gradient(180deg, #0f1530 0%, #0a0a1a 100%)' }}>
        <div className="h-1 bg-gradient-to-r from-green-500 via-cyan-500 to-green-500" aria-hidden="true" />

        <div className="p-6 text-center">
          <span className="text-4xl block mb-3" aria-hidden="true">🌙</span>
          <h3 id="welcome-back-title" className="text-xl font-bold text-white mb-1">Welcome Back!</h3>
          <p className="text-slate-400 text-sm mb-5">
            Your empire ran for <span className="text-white font-medium">{timeStr}</span> while you were away.
          </p>

          {/* Earnings */}
          <div className={`rounded-xl p-4 mb-4 border ${earnings.moneyDelta >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <p className={`text-2xl font-bold font-mono mb-1 ${earnings.moneyDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {earnings.moneyDelta >= 0 ? '+' : ''}{formatMoney(earnings.moneyDelta)}
            </p>
            <p className="text-slate-500 text-xs">Net while away — {earnings.efficiencyTierLabel} ({(earnings.effectiveEfficiencyPct * 100).toFixed(0)}% efficiency)</p>
          </div>

          {(earnings.queueExecuted.length > 0 || earnings.directiveFeesCharged > 0) && (
            <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-3 mb-4 text-left">
              {earnings.queueExecuted.length > 0 && (
                <p className="text-cyan-300 text-xs mb-1">
                  🌙 {earnings.queueExecuted.length} queued order{earnings.queueExecuted.length === 1 ? '' : 's'} auto-started
                </p>
              )}
              {earnings.directiveFeesCharged > 0 && (
                <p className="text-slate-400 text-xs">
                  🤖 Standing directives: -{formatMoney(earnings.directiveFeesCharged)} ops overhead
                </p>
              )}
              {earnings.hazardsApplied.length > 0 && (
                <p className="text-amber-400 text-xs mt-1">
                  ⚠ {earnings.hazardsApplied.length} forecasted hazard{earnings.hazardsApplied.length === 1 ? '' : 's'} struck while away
                </p>
              )}
            </div>
          )}

          {/* Resources */}
          {totalResources > 0 && (
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 mb-4">
              <p className="text-amber-400 text-sm font-semibold mb-2">
                +{totalResources.toLocaleString()} resources mined
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {topResources.map(([id, qty]) => (
                  <span key={id} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">
                    {id.replace(/_/g, ' ')}: +{qty}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { playSound('milestone'); onCollect(); }}
            className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 rounded-xl transition-all"
          >
            Collect Earnings
          </button>

          <p className="text-slate-600 text-[10px] mt-3">
            No time cap — longer absences run at a lower rate. Automation research, ops techs, and standing directives raise your away-efficiency ceiling.
          </p>
        </div>
      </div>
    </div>
  );
}
